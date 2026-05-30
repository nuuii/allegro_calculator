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
        console.log(`Skopiowano EAN: ${ean}`);
      });
    }
  };

  return (
    <div style={{ 
      background: "#121218", 
      borderRadius: "12px", 
      padding: "1.25rem", 
      border: "1px solid #1e1e26", 
      width: "100%",
      maxWidth: "1140px",
      margin: "1.5rem auto 0"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "1rem"
      }}>
        <div style={{ fontSize: "0.68rem", color: "#6a6a82", fontWeight: 600, textTransform: "uppercase" }}>
          REJESTR WYCEN PRZYGOTOWANYCH DO EKSPORTU ({savedCalculations.length})
        </div>
        {savedCalculations.length > 0 && (
          <button 
            onClick={handleExportToExcel} 
            style={{ 
              background: "#f5a623", 
              color: "#0d0d11", 
              border: "none", 
              borderRadius: "4px", 
              padding: "0.35rem 0.75rem", 
              fontSize: "0.72rem", 
              fontWeight: 600, 
              cursor: "pointer", 
              fontFamily: "inherit"
            }}
          >
            📥 EKSPORTUJ DO PLIKU XLSX (EXCEL)
          </button>
        )}
      </div>

      {savedCalculations.length === 0 ? (
        <div style={{ 
          color: "#4a4a5e", 
          fontSize: "0.75rem", 
          textAlign: "center", 
          padding: "2rem 0" 
        }}>
          Brak pozycji w rejestrze. Kliknij zielony przycisk wyżej, aby utworzyć arkusz zbiorczy.
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
            <table className="calc-table">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th>EAN / SKU</th>
                  <th>Dostawca</th>
                  <th>Utworzył</th>
                  <th>Ilość</th>
                  <th>Oferta Brutto</th>
                  <th>Zakup</th>
                  <th>Wpływ Netto</th>
                  <th>Zysk Czysty</th>
                  <th>Marża</th>
                  <th style={{ width: "60px" }}></th>
                </tr>
              </thead>
              <tbody>
                {savedCalculations.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td 
                      style={{ 
                        color: "#6a6a82", 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted'
                      }} 
                      onClick={() => handleEanClick(item.ean)} 
                      title="Kliknij, aby skopiować EAN"
                    >
                      {item.ean}
                    </td>
                    <td style={{ color: "#8a8a9e" }}>{item.supplier}</td>
                    <td style={{ color: "#f5a623", fontSize: "0.75rem", fontWeight: 500 }}>👤 {item.createdBy || '—'}</td>
                    <td style={{ color: "#a5a5b5" }}>{item.quantity ? item.quantity : "—"}</td>
                    <td>{formatPLN(item.offerPrice)}</td>
                    <td style={{ color: "#a5a5b5" }}>{item.currency !== "PLN" ? `${item.purchaseCost} ${item.currency}` : formatPLN(item.purchaseCost)}</td>
                    <td style={{ color: "#f5a623" }}>{formatPLN(item.income)}</td>
                    <td style={{ 
                      color: item.profit > 0 ? "#4ecb71" : "#e05555", 
                      fontWeight: 700 
                    }}>
                      {formatPLN(item.profit)}
                    </td>
                    <td style={{ 
                      color: item.margin > 0 ? "#4ecb71" : "#e05555", 
                      fontWeight: 700 
                    }}>
                      {formatPct(item.margin)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleEditItem(item)} 
                        style={{ 
                          background: "transparent", 
                          border: "none", 
                          color: "#f5a623", 
                          cursor: "pointer", 
                          fontSize: "0.85rem",
                          padding: "0.25rem",
                          marginRight: "0.25rem"
                        }}
                        title="Edytuj"
                      >
                        ✎
                      </button>
                      <button 
                        onClick={() => handleRemoveFromList(item.id)} 
                        style={{ 
                          background: "transparent", 
                          border: "none", 
                          color: "#4a4a5e", 
                          cursor: "pointer", 
                          fontSize: "0.85rem",
                          padding: "0.25rem"
                        }}
                        title="Usuń"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pasek akcji z przyciskiem zapisu */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            paddingTop: '1.25rem', 
            borderTop: '1px solid #1e1e26'
          }}>
            <button
              onClick={onSaveWholeOffer}
              style={{
                background: 'linear-gradient(135deg, #4ecb71, #2a9d47)',
                color: '#0d0d11',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 6px 18px rgba(40, 167, 69, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => e.target.style.boxShadow = '0 8px 24px rgba(40, 167, 69, 0.3)'}
              onMouseOut={e => e.target.style.boxShadow = '0 6px 18px rgba(40, 167, 69, 0.2)'}
            >
              ☁️ ZAPISZ ZESTAWIENIE W CHMURZE
            </button>
          </div>
        </>
      )}
    </div>
  );
}