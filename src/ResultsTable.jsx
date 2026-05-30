import React from 'react';

export default function ResultsTable({
  savedCalculations,
  handleExportToExcel,
  onSaveWholeOffer,
  handleEditItem,
  handleRemoveFromList,
  formatPLN,
  formatPct,
}) {
  const handleEanClick = (ean) => {
    if (ean && ean !== '—') {
      navigator.clipboard.writeText(ean).then(() => {
        // Opcjonalnie: można dodać powiadomienie o skopiowaniu
        console.log(`Skopiowano EAN: ${ean}`);
      });
    }
  };

  return (
    <div style={{ background: "#121218", borderRadius: "12px", padding: "1.25rem", border: "1px solid #1e1e26", width: "100%", gridColumn: "1 / -1", marginTop: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.68rem", color: "#6a6a82", fontWeight: 500 }}>
          REJESTR WYCEN PRZYGOTOWANYCH DO EKSPORTU ({savedCalculations.length})
        </div>
        {savedCalculations.length > 0 && (
          <button onClick={handleExportToExcel} style={{ background: "#f5a623", color: "#0d0d11", border: "none", borderRadius: "4px", padding: "0.35rem 0.75rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            📥 EKSPORTUJ DO PLIKU XLSX (EXCEL)
          </button>
        )}
      </div>

      {savedCalculations.length === 0 ? (
        <div style={{ color: "#4a4a5e", fontSize: "0.75rem", textAlign: "center", padding: "2rem 0" }}>
          Brak pozycji w rejestrze. Kliknij zielony przycisk wyżej, aby utworzyć arkusz zbiorczy.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="calc-table">
            <thead>
              <tr>
                <th>Produkt</th><th>EAN / SKU</th><th>Dostawca</th><th>Utworzył</th><th>Ilość</th><th>Oferta Brutto</th><th>Zakup</th><th>Wpływ Netto</th><th>Zysk Czysty</th><th>Marża</th><th style={{ width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {savedCalculations.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ color: "#6a6a82", cursor: 'pointer' }} onClick={() => handleEanClick(item.ean)} title="Kliknij, aby skopiować EAN">{item.ean}</td>
                  <td style={{ color: "#8a8a9e" }}>{item.supplier}</td>
                  <td style={{ color: "#f5a623", fontSize: "0.75rem", fontWeight: 500 }}>👤 {item.createdBy || '—'}</td>
                  <td style={{ color: "#a5a5b5" }}>{item.quantity ? item.quantity : "—"}</td>
                  <td>{formatPLN(item.offerPrice)}</td>
                  <td style={{ color: "#a5a5b5" }}>{item.currency !== "PLN" ? `${item.purchaseCost} ${item.currency}` : formatPLN(item.purchaseCost)}</td>
                  <td style={{ color: "#f5a623" }}>{formatPLN(item.income)}</td>
                  <td style={{ color: item.profit > 0 ? "#4ecb71" : "#e05555", fontWeight: 500 }}>{formatPLN(item.profit)}</td>
                  <td style={{ color: item.margin > 0 ? "#4ecb71" : "#e05555", fontWeight: 500 }}>{formatPct(item.margin)}</td>
                  <td style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button onClick={() => handleEditItem(item)} style={{ background: "transparent", border: "none", color: "#f5a623", cursor: "pointer", fontSize: "0.85rem" }}>✎</button>
                    <button onClick={() => handleRemoveFromList(item.id)} style={{ background: "transparent", border: "none", color: "#4a4a5e", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={onSaveWholeOffer}
              style={{
                background: 'linear-gradient(135deg, #4ecb71 0%, #28a745 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(40, 167, 69, 0.2)'
              }}
            >
              ☁️ Zapisz całą ofertę w chmurze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}