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
    <div className="results-register">
      <div className="results-register__header">
        <div className="results-register__title">
          REJESTR WYCEN PRZYGOTOWANYCH DO EKSPORTU ({savedCalculations.length})
        </div>
        {savedCalculations.length > 0 && (
          <button 
            onClick={handleExportToExcel} 
            className="table-action table-action--export"
          >
            📥 EKSPORTUJ DO PLIKU XLSX (EXCEL)
          </button>
        )}
      </div>

      {savedCalculations.length === 0 ? (
        <div className="results-register__empty">
          Dodaj produkty przyciskiem "Dodaj do zestawienia". Gdy lista będzie gotowa, zapisz całe zestawienie w chmurze.
        </div>
      ) : (
        <>
          <div className="table-scroll">
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
                    <td className="cell-text cell-product">{item.name}</td>
                    <td 
                      className="cell-text cell-copy"
                      onClick={() => handleEanClick(item.ean)} 
                      title="Kliknij, aby skopiować EAN"
                    >
                      {item.ean}
                    </td>
                    <td className="cell-text cell-muted">{item.supplier}</td>
                    <td className="cell-text cell-author">👤 {item.createdBy || '—'}</td>
                    <td className="cell-number cell-muted">{item.quantity ? item.quantity : "—"}</td>
                    <td className="cell-number">{formatPLN(item.offerPrice)}</td>
                    <td className="cell-number cell-muted">{item.currency !== "PLN" ? `${item.purchaseCost} ${item.currency}` : formatPLN(item.purchaseCost)}</td>
                    <td className="cell-number cell-accent">{formatPLN(item.income)}</td>
                    <td style={{ 
                      color: item.profit > 0 ? "#4ecb71" : "#e05555", 
                      fontWeight: 700 
                    }} className="cell-number cell-strong">
                      {formatPLN(item.profit)}
                    </td>
                    <td style={{ 
                      color: item.margin > 0 ? "#4ecb71" : "#e05555", 
                      fontWeight: 700 
                    }} className="cell-number cell-strong">
                      {formatPct(item.margin)}
                    </td>
                    <td className="cell-actions">
                      <button 
                        onClick={() => handleEditItem(item)} 
                        className="icon-action icon-action--edit"
                        title="Edytuj"
                      >
                        ✎
                      </button>
                      <button 
                        onClick={() => handleRemoveFromList(item.id)} 
                        className="icon-action icon-action--remove"
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

          <div className="mobile-calculation-list">
            {savedCalculations.map(item => (
              <article className="mobile-calculation-card" key={`mobile-${item.id}`}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.ean} · {item.supplier}</span>
                </div>
                <div className="mobile-calculation-card__metrics">
                  <div>
                    <span>Oferta</span>
                    <strong>{formatPLN(item.offerPrice)}</strong>
                  </div>
                  <div>
                    <span>Zysk</span>
                    <strong className={item.profit >= 0 ? "positive-value" : "negative-value"}>{formatPLN(item.profit)}</strong>
                  </div>
                  <div>
                    <span>Marża</span>
                    <strong className={item.margin >= 0 ? "positive-value" : "negative-value"}>{formatPct(item.margin)}</strong>
                  </div>
                </div>
                <div className="mobile-calculation-card__actions">
                  <button onClick={() => handleEditItem(item)} className="table-action">Edytuj</button>
                  <button onClick={() => handleRemoveFromList(item.id)} className="secondary-action secondary-action--danger">Usuń</button>
                </div>
              </article>
            ))}
          </div>

          {/* Pasek akcji z przyciskiem zapisu */}
          <div className="results-register__footer">
            <button
              onClick={onSaveWholeOffer}
              className="save-offer-button"
            >
              ☁️ ZAPISZ CAŁE ZESTAWIENIE
            </button>
          </div>
        </>
      )}
    </div>
  );
}
