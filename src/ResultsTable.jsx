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
              <tr>{/* Ulepszone nagłówki z wyrównaniem i stylami */}
                <th style={{ textAlign: 'left', minWidth: '200px' }}>Produkt</th>
                <th style={{ textAlign: 'left', minWidth: '140px' }}>EAN / SKU</th>
                <th style={{ textAlign: 'left', minWidth: '120px' }}>Dostawca</th>
                <th style={{ textAlign: 'left', minWidth: '100px' }}>Utworzył</th>
                <th style={{ textAlign: 'right', minWidth: '60px' }}>Ilość</th>
                <th style={{ textAlign: 'right', minWidth: '120px' }}>Oferta Brutto</th>
                <th style={{ textAlign: 'right', minWidth: '120px' }}>Zakup</th>
                <th style={{ textAlign: 'right', minWidth: '120px' }}>Wpływ Netto</th>
                <th style={{ textAlign: 'right', minWidth: '120px' }}>Zysk Czysty</th>
                <th style={{ textAlign: 'right', minWidth: '100px' }}>Marża</th>
                <th style={{ width: "60px" }}></th>{/* Pusty nagłówek dla przycisków akcji */}
              </tr>
            </thead>
            <tbody>
              {savedCalculations.map(item => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ textAlign: 'left', color: "#6a6a82", cursor: 'pointer' }} onClick={() => handleEanClick(item.ean)} title="Kliknij, aby skopiować EAN">{item.ean}</td>
                  <td style={{ textAlign: 'left', color: "#8a8a9e" }}>{item.supplier}</td>
                  <td style={{ textAlign: 'left', color: "#f5a623", fontSize: "0.75rem", fontWeight: 500 }}>👤 {item.createdBy || '—'}</td>
                  <td style={{ textAlign: 'right', color: "#a5a5b5" }}>{item.quantity ? item.quantity : "—"}</td>
                  <td style={{ textAlign: 'right' }}>{formatPLN(item.offerPrice)}</td>
                  <td style={{ textAlign: 'right', color: "#a5a5b5" }}>{item.currency !== "PLN" ? `${item.purchaseCost} ${item.currency}` : formatPLN(item.purchaseCost)}</td>
                  <td style={{ textAlign: 'right', color: "#f5a623" }}>{formatPLN(item.income)}</td>
                  <td style={{ textAlign: 'right', color: item.profit > 0 ? "#4ecb71" : "#e05555", fontWeight: 700 }}>{formatPLN(item.profit)}</td>
                  <td style={{ textAlign: 'right', color: item.margin > 0 ? "#4ecb71" : "#e05555", fontWeight: 700 }}>{formatPct(item.margin)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => handleEditItem(item)} style={{ background: "transparent", border: "none", color: "#f5a623", cursor: "pointer", fontSize: "0.85rem" }}>✎</button>
                    <button onClick={() => handleRemoveFromList(item.id)} style={{ background: "transparent", border: "none", color: "#4a4a5e", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Przeniesiony i ostylowany przycisk zapisu */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #1e1e26' }}>
            <button
              onClick={onSaveWholeOffer}
              style={{
                background: 'linear-gradient(135deg, #4ecb71, #2a9d47)',
                color: '#0d0d11',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(40, 167, 69, 0.2)'
              }}
            >
              ☁️ ZAPISZ ZESTAWIENIE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}