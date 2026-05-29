// AKCJA 2: Przeszukiwanie Allegro po EAN za pomocą parseforge~allegro-scraper
  if (ean) {
    const apifyToken = process.env.APIFY_TOKEN;

    if (!apifyToken) {
      return res.status(500).json({ success: false, error: 'Brak tokenu APIFY_TOKEN w konfiguracji serwera.' });
    }

    try {
      // Wywołujemy nowy endpoint synchroniczny zgodnie z wklejoną specyfikacją OpenAPI
      const response = await axios.post(
        `https://api.apify.com/v2/acts/parseforge~allegro-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          // Struktura wejściowa zbieżna ze schematem inputSchema tego aktora
          searchQuery: ean.trim(), 
          maxItems: 10 // Ograniczamy pobieranie do 10 ofert, aby skrócić czas i zaoszczędzić limity
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // Aktor potrzebuje czasu na zebranie danych rynkowych
        }
      );

      const items = response.data;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(404).json({ success: false, error: 'Nie znaleziono ofert na Allegro dla podanego kodu EAN.' });
      }

      // Filtrujemy i oczyszczamy zwrócone przez scraper ceny
      // Większość listujących scraperów zwraca pole 'price' lub 'pricePln' lub 'currentPrice'
      const validItems = items.map(item => {
        let rawPrice = item.price || item.currentPrice || item.pricePln;
        if (rawPrice) {
          if (typeof rawPrice === 'string') {
            // Czyszczenie tekstu (np. "89,90 zł" -> "89.90")
            rawPrice = rawPrice.replace(/[^0-9.,]/g, '').replace(',', '.');
          }
          return {
            title: item.title || item.name || `Produkt EAN: ${ean}`,
            price: parseFloat(rawPrice)
          };
        }
        return null;
      }).filter(item => item && !isNaN(item.price));

      if (validItems.length === 0) {
        return res.status(404).json({ success: false, error: 'Znaleziono wyniki, ale struktura cen nie dała się odczytać.' });
      }

      // Sortujemy oferty od najtańszej do najdroższej
      validItems.sort((a, b) => a.price - b.price);

      const cheapestItem = validItems[0];

      return res.status(200).json({
        success: true,
        title: cheapestItem.title,
        price: cheapestItem.price.toFixed(2)
      });

    } catch (error) {
      console.error('Parseforge Scraper Error:', error.message);
      return res.status(500).json({ success: false, error: 'Problem z działaniem bota Parseforge lub przekroczono limit czasu.' });
    }
  }