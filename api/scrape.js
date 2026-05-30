import axios from 'axios';
import { get } from '@vercel/edge-config';

export default async function handler(req, res) {
  // Gwarantowane nagłówki CORS dla Twojego frontendu w React
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Obsługa żądania wstępnego (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, ean } = req.query;

  // =========================================================================
  // AKCJA 1: Pobieranie kursów walut (Rozwiązuje błąd CORS z Frankfurter API)
  // =========================================================================
  if (action === 'rates') {
    try {
      // 1. Pobieramy kursy walut
      const response = await axios.get('https://api.frankfurter.app/latest?base=PLN&symbols=EUR,USD,GBP,CHF,CZK,RON,CNY', {
        timeout: 8000 // 8 sekund na pobranie
      });
      
      // 2. Pobieramy konfigurację z Edge Config
      let smartThreshold = 44.99;
      let isScraperActive = true;
      
      try {
        const edgeSmartThreshold = await get('smartThreshold');
        const edgeScraperActive = await get('isScraperActive');
        
        if (edgeSmartThreshold !== undefined && edgeSmartThreshold !== null) {
          smartThreshold = edgeSmartThreshold;
        }
        if (edgeScraperActive !== undefined && edgeScraperActive !== null) {
          isScraperActive = edgeScraperActive;
        }
      } catch (edgeError) {
        // Edge Config niedostępny — używamy domyślnych wartości
        console.warn('Edge Config niedostępny, używamy domyślnych wartości:', edgeError.message);
      }
      
      // 3. Zwracamy kursy + konfigurację
      return res.status(200).json({
        ...response.data,
        config: {
          smartThreshold,
          isScraperActive
        }
      });
    } catch (error) {
      console.error('Błąd pobierania walut:', error.message);
      return res.status(500).json({ error: 'Nie udało się pobrać kursów walut przez serwer proxy.' });
    }
  }

  // =========================================================================
  // AKCJA 2: Przeszukiwanie Allegro po EAN (Integracja z parseforge~allegro-scraper)
  // =========================================================================
  if (ean) {
    const apifyToken = process.env.APIFY_TOKEN;

    if (!apifyToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Brak tokenu APIFY_TOKEN w konfiguracji środowiska serwera Vercel.' 
      });
    }

    try {
      // Wywołujemy synchroniczny endpoint bota Parseforge z Twojej specyfikacji OpenAPI
      const response = await axios.post(
        `https://api.apify.com/v2/acts/parseforge~allegro-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          searchQuery: ean.trim(), // Przekazujemy czysty EAN do dedykowanego pola wyszukiwarki bota
          maxItems: 1             // Pobieramy tylko 10 ofert, by skrócić czas wykonania
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 55000 // Dajemy botowi do 55 sekund na przeklikanie i ominięcie zabezpieczeń Allegro
        }
      );

      const items = response.data;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Scraper zakończył pracę, ale nie znalazł żadnych aktywnych ofert na Allegro dla tego EAN.' 
        });
      }

      // Filtrujemy i mapujemy wyniki, szukając poprawnych kluczy cenowych
      const validItems = items.map(item => {
        let rawPrice = item.price || item.currentPrice || item.pricePln || item.priceWithShipping;
        if (rawPrice) {
          if (typeof rawPrice === 'string') {
            // Czyszczenie formatu waluty (np. "129,99 zł" -> "129.99")
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
        return res.status(404).json({ 
          success: false, 
          error: 'Znaleziono oferty, ale nie udało się z nich poprawnie wyciągnąć danych o cenach.' 
        });
      }

      // Sortujemy zebrane profesjonalnie oferty od najtańszej do najdroższej
      validItems.sort((a, b) => a.price - b.price);

      // Pobieramy najtańszą ofertę (pierwszą z góry)
      const cheapestItem = validItems[0];

      return res.status(200).json({
        success: true,
        title: cheapestItem.title,
        price: cheapestItem.price.toFixed(2)
      });

    } catch (error) {
      console.error('Błąd integracji z Apify:', error.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Problem z uruchomieniem lub odpowiedzią bota Apify (Timeout / Zły token).' 
      });
    }
  }

  // Fallback w razie wywołania bez parametrów
  return res.status(400).json({ error: 'Niepoprawne żądanie systemu proxy. Wybierz akcję lub podaj kod EAN.' });
}