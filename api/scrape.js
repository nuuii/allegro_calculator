import axios from 'axios';

export default async function handler(req, res) {
  // Obsługa CORS dla frontendu
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, ean } = req.query;

  // AKCJA 1: Pobieranie kursów walut (Ominięcie blokady CORS serwisu Frankfurter)
  if (action === 'rates') {
    try {
      const response = await axios.get('https://api.frankfurter.app/latest?base=PLN&symbols=EUR,USD,GBP,CHF,CZK,RON,CNY', {
        timeout: 5000
      });
      return res.status(200).json(response.data);
    } catch (error) {
      return res.status(500).json({ error: 'Nie udało się pobrać kursów walut z API' });
    }
  }

  // AKCJA 2: Scrapowanie danych z Apify po kodzie EAN
  if (ean) {
    const apifyToken = process.env.APIFY_TOKEN;

    if (!apifyToken) {
      return res.status(500).json({ success: false, error: 'Brak tokenu APIFY_TOKEN w konfiguracji serwera.' });
    }

    try {
      const targetUrl = `https://allegro.pl/listing?string=${encodeURIComponent(ean)}`;

      // Wywołanie aktora na Apify
      const response = await axios.post(
        `https://api.apify.com/v2/acts/e-commerce~allegro-product-detail-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
        { startUrls: [targetUrl] },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // Zwiększony timeout na czas pracy bota
        }
      );

      const items = response.data;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(404).json({ success: false, error: 'Brak ofert dla tego kodu EAN.' });
      }

      const validItems = items.filter(item => item.price && !isNaN(parseFloat(item.price.toString().replace(',', '.'))));

      if (validItems.length === 0) {
        return res.status(404).json({ success: false, error: 'Nie udało się odczytać cen z pobranych ofert.' });
      }

      // Sortowanie od najtańszej oferty
      validItems.sort((a, b) => {
        const priceA = parseFloat(a.price.toString().replace(',', '.'));
        const priceB = parseFloat(b.price.toString().replace(',', '.'));
        return priceA - priceB;
      });

      const cheapestItem = validItems[0];
      const productName = cheapestItem.title || cheapestItem.name || `Produkt EAN: ${ean}`;
      const rawPrice = cheapestItem.price.toString().replace(',', '.');

      return res.status(200).json({
        success: true,
        title: productName,
        price: parseFloat(rawPrice).toFixed(2)
      });

    } catch (error) {
      console.error('Apify Error:', error.message);
      return res.status(500).json({ success: false, error: 'Błąd scrapera Apify lub przekroczony czas połączenia.' });
    }
  }

  return res.status(400).json({ error: 'Niepoprawne żądanie. Wybierz akcję lub podaj EAN.' });
}