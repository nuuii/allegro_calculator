import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { method } = req;
    const { id } = req.query;

    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return res.status(500).json({ success: false, error: 'Brak zmiennych KV w Vercel.' });
    }

    // GET: Pobierz wszystkie zapisane oferty grupowe
    if (method === 'GET') {
      const offers = await kv.get('saved_offers') || [];
      return res.status(200).json({ success: true, data: offers });
    }

    // POST: Zapisz nową całą ofertę (zbiorczą tabelę)
    if (method === 'POST') {
      const { offerName, items, createdBy } = req.body;
      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Tabela produktów jest pusta.' });
      }

      const offers = await kv.get('saved_offers') || [];
      const newOffer = {
        id: Date.now(),
        offerName: offerName?.trim() || `Oferta ${offers.length + 1}`,
        items,
        createdBy: createdBy || 'Anonim',
        createdAt: new Date().toISOString()
      };

      offers.unshift(newOffer);
      await kv.set('saved_offers', offers);

      return res.status(201).json({ success: true, data: newOffer });
    }

    // DELETE: Usuwanie całej oferty o danym ID
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ success: false, error: 'Brak ID' });
      let offers = await kv.get('saved_offers') || [];
      offers = offers.filter(o => o.id !== parseInt(id));
      await kv.set('saved_offers', offers);
      return res.status(200).json({ success: true, message: 'Oferta usunięta.' });
    }

    return res.status(405).json({ success: false, error: 'Metoda niedozwolona' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
