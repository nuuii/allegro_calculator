import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method } = req;
    const { id } = req.query;

    // GET /api/calculations — pobierz wszystkie wyceny dla użytkownika
    if (method === 'GET') {
      const calculations = await kv.get('calculations') || [];
      return res.status(200).json({ success: true, data: calculations });
    }

    // POST /api/calculations — zapisz nową wycenę
    if (method === 'POST') {
      const { calculation } = req.body;
      if (!calculation) return res.status(400).json({ success: false, error: 'Brak danych wyceny' });

      const calculations = await kv.get('calculations') || [];
      const newCalc = { ...calculation, id: Date.now(), createdAt: new Date().toISOString() };
      calculations.push(newCalc);
      await kv.set('calculations', calculations, { ex: 365 * 24 * 60 * 60 }); // TTL 1 rok
      
      return res.status(201).json({ success: true, data: newCalc });
    }

    // PUT /api/calculations?id=X — zaktualizuj wycenę
    if (method === 'PUT') {
      if (!id) return res.status(400).json({ success: false, error: 'Brak ID wyceny' });
      
      const { calculation } = req.body;
      const calculations = await kv.get('calculations') || [];
      const index = calculations.findIndex(c => c.id === parseInt(id));
      
      if (index === -1) return res.status(404).json({ success: false, error: 'Wycena nie znaleziona' });
      
      calculations[index] = { ...calculations[index], ...calculation, updatedAt: new Date().toISOString() };
      await kv.set('calculations', calculations, { ex: 365 * 24 * 60 * 60 });
      
      return res.status(200).json({ success: true, data: calculations[index] });
    }

    // DELETE /api/calculations?id=X — usuń wycenę
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ success: false, error: 'Brak ID wyceny' });
      
      let calculations = await kv.get('calculations') || [];
      calculations = calculations.filter(c => c.id !== parseInt(id));
      await kv.set('calculations', calculations, { ex: 365 * 24 * 60 * 60 });
      
      return res.status(200).json({ success: true, message: 'Wycena usunięta' });
    }

    return res.status(405).json({ success: false, error: 'Metoda niedozwolona' });
  } catch (error) {
    console.error('Błąd obsługi wycen:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
