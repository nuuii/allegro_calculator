import React from "react";
import { Field, ResultRow } from "../components/Ui";

export default function CalculatorPage({
  prodName,
  setProdName,
  prodEan,
  setProdEan,
  offerPrice,
  setOfferPrice,
  purchaseCost,
  setPurchaseCost,
  quantity,
  setQuantity,
  allegroDiscounted,
  setAllegroDiscounted,
  supplierName,
  setSupplierName,
  purchaseCurrency,
  setPurchaseCurrency,
  allegro,
  setAllegro,
  vat,
  setVat,
  includeDelivery,
  setIncludeDelivery,
  ratesLoading,
  currentRate,
  eanLoading,
  edgeConfig,
  result,
  isPositive,
  isNegative,
  editingId,
  savedCalculations,
  handleFindCheapestOffer,
  handleEditItem,
  handleCancelEdit,
  handleAddToList,
  handleRemoveFromList,
  handleExportToExcel,
  onSaveWholeOffer,
  currencies,
  vatOptions,
  formatPLN,
  formatPct
}) {
  return (
    <div className="workspace-grid">
      <div style={{ background: "#121218", borderRadius: "12px", padding: "1.25rem", border: "1px solid #1e1e26", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <Field
            label="Dostawca / Hurtownia"
            value={supplierName}
            onChange={setSupplierName}
            placeholder="Nazwa dostawcy lub hurtowni"
          />
        </div>

        <div style={{ height: "1px", background: "#1e1e26" }} />

        <div>
          <Field label="Kod EAN" value={prodEan} onChange={setProdEan} placeholder="np. 590123..." />

          {edgeConfig.isScraperActive ? (
            <button
              type="button"
              onClick={handleFindCheapestOffer}
              disabled={eanLoading}
              style={{
                width: "100%",
                marginTop: "0.6rem",
                background: "#1e1e28",
                border: "1px solid #f5a623",
                color: "#f5a623",
                borderRadius: "6px",
                padding: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: eanLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s"
              }}
            >
              {eanLoading ? (
                <span><span className="spin" style={{ marginRight: "0.4rem" }}>⟳</span> Trwa scrapowanie cen przez Apify...</span>
              ) : (
                "🔍 Sprawdź Allegro po EAN"
              )}
            </button>
          ) : (
            <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: '#220f0f', border: '1px solid #e05555', borderRadius: '6px', color: '#e05555', fontSize: '0.75rem', textAlign: 'center' }}>
              ⚠️ Scraper jest obecnie niedostępny. Wprowadź dane ręcznie.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "0.75rem", alignItems: "start", marginTop: "0.75rem" }}>
            <Field label="Nazwa produktu" value={prodName} onChange={setProdName} placeholder="np. Słuchawki X" />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <label style={{ fontSize: "0.68rem", color: "#6a6a82", fontWeight: 500 }}>Ilość (szt.)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                style={{ width: "100%", background: "#1e1e28", border: "1px solid #2d2d3d", borderRadius: "6px", color: "#e8e4d9", fontSize: "0.95rem", fontFamily: "inherit", padding: "0.5rem", height: "42px" }}
              />
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "#1e1e26" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Field label="Cena oferty brutto" value={offerPrice} onChange={setOfferPrice} placeholder="np. 89,99" />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "0.68rem", color: "#6a6a82", marginBottom: "0.3rem", fontWeight: 500 }}>KOSZT ZAKUPU</label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="text"
                inputMode="decimal"
                value={purchaseCost}
                onChange={e => setPurchaseCost(e.target.value)}
                placeholder="Cena"
                style={{ flex: 1, background: "#1e1e28", border: "1px solid #2d2d3d", borderRadius: "6px", color: "#e8e4d9", fontSize: "0.95rem", fontFamily: "inherit", padding: "0.5rem" }}
              />
              <select
                value={purchaseCurrency}
                onChange={e => setPurchaseCurrency(e.target.value)}
                style={{ background: "#1e1e28", border: "1px solid #2d2d3d", borderRadius: "6px", color: "#f5a623", fontSize: "0.85rem", fontFamily: "inherit", padding: "0.5rem", cursor: "pointer" }}
              >
                {currencies.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", background: "#161622", padding: "0.5rem", borderRadius: "6px" }}>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {currencies.map(c => (
              <button
                key={c.code}
                className="cur-btn"
                onClick={() => setPurchaseCurrency(c.code)}
                style={{ background: purchaseCurrency === c.code ? "#f5a623" : "#22222e", color: purchaseCurrency === c.code ? "#0d0d11" : "#8a8a9e", borderRadius: "4px", padding: "0.15rem 0.4rem", fontSize: "0.68rem", fontWeight: 500 }}
              >
                {c.code}
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.68rem" }}>
            {ratesLoading ? <span style={{ color: "#6a6a82" }}><span className="spin">⟳</span> API...</span> : currentRate && purchaseCurrency !== "PLN" ? (
              <span style={{ color: "#4ecb71" }}>1 {purchaseCurrency} = {currentRate.toFixed(4)} zł</span>
            ) : <span style={{ color: "#4a4a5e" }}>Baza: PLN</span>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.95fr 0.85fr", gap: "0.75rem", alignItems: "start" }}>
          <div>
            <label style={{ fontSize: "0.68rem", color: "#6a6a82", display: "block", marginBottom: "0.3rem" }}>PROWIZJA %</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="text"
                  value={allegro}
                  onChange={e => setAllegro(e.target.value)}
                  style={{ width: "56px", background: "#1e1e28", border: "1px solid #2d2d3d", borderRadius: "6px", color: "#f5a623", fontSize: "0.95rem", padding: "0.5rem", textAlign: "center", fontFamily: "inherit" }}
                />
                <span style={{ color: "#f5a623", fontWeight: 700 }}>%</span>
              </div>
              <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                {[5, 10, 15].map(v => (
                  <button key={v} onClick={() => setAllegro(String(v))} style={{ background: "#22222e", color: "#8a8a9e", border: "none", borderRadius: "5px", fontSize: "0.72rem", padding: "0.45rem 0.6rem", cursor: "pointer" }}>{v}%</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginTop: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setAllegroDiscounted(v => !v)}
                style={{ background: allegroDiscounted ? "linear-gradient(135deg, #4ecb71, #2a9d47)" : "#22222e", color: allegroDiscounted ? "#0d0d11" : "#8a8a9e", border: "none", borderRadius: "6px", fontSize: "0.75rem", padding: "0.55rem 0.85rem", cursor: "pointer", minWidth: "148px" }}
              >
                {allegroDiscounted ? "50% RABAT" : "Rabat 50%"}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.68rem", color: "#6a6a82", display: "block", marginBottom: "0.3rem" }}>VAT</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "0.35rem" }}>
              {vatOptions.map(v => (
                <button key={v} onClick={() => setVat(v)} style={{ background: vat === v ? "linear-gradient(135deg, #f5a623, #f0623a)" : "#22222e", color: vat === v ? "#0d0d11" : "#8a8a9e", border: "none", borderRadius: "5px", padding: "0.55rem 0", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>{v}%</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.68rem", color: "#6a6a82", display: "block", marginBottom: "0.3rem" }}>DOSTAWA</label>
            <button
              type="button"
              onClick={() => setIncludeDelivery(v => !v)}
              style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#161622", padding: "0.75rem 0.65rem", borderRadius: "8px", border: "1px solid #2d2d3d", cursor: "pointer" }}
            >
              <span style={{ fontSize: "0.72rem", color: "#6a6a82", lineHeight: 1 }}>DOSTAWA 2%</span>
              <span style={{ fontSize: "0.9rem", color: includeDelivery ? "#4ecb71" : "#e05555", fontWeight: 700, marginTop: "0.25rem" }}>{includeDelivery ? "TAK" : "NIE"}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: "#121218", borderRadius: "12px", padding: "1.25rem", border: result ? (isPositive ? "1px solid #1a3a22" : isNegative ? "1px solid #3a1a1a" : "1px solid #1e1e26") : "1px solid #1e1e26", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {!result ? (
          <div style={{ color: "#4a4a5e", fontSize: "0.85rem", textAlign: "center", margin: "auto 0" }}>
            Wprowadź cenę oferty po lewej stronie, aby zobaczyć natychmiastowy podgląd marży.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.08em", color: "#6a6a82", marginBottom: "0.5rem" }}>STRUKTURA FINANSOWA</div>
              <ResultRow label="Cena netto ze sprzedaży" value={formatPLN(result.netto)} dimmed />
              <ResultRow label={`Prowizja Allegro (${allegro}%)`} value={"− " + formatPLN(result.allegroFee)} negative />
              <ResultRow label="Logistyka InPost" value={"− " + formatPLN(result.shipping)} negative />
              {includeDelivery && <ResultRow label="Obsługa dostawy 2%" value={"− " + formatPLN(result.deliveryCost)} negative />}
              {result.costPLN && <ResultRow label="Koszt zakupu (Przeliczony)" value={formatPLN(result.costPLN)} dimmed />}

              <div style={{ borderTop: "1px solid #1e1e26", marginTop: "0.5rem", paddingTop: "0.4rem" }}>
                <ResultRow label="Wpływ na konto (Netto)" value={formatPLN(result.income)} accent />
              </div>
            </div>

            {result.profit !== undefined && (
              <div style={{ background: isPositive ? "#0f2214" : isNegative ? "#220f0f" : "#161622", borderRadius: "8px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.65rem", color: "#6a6a82", display: "block" }}>CZYSTY ZYSK</span>
                  <span style={{ fontSize: "1.4rem", fontWeight: 800, color: isPositive ? "#4ecb71" : isNegative ? "#e05555" : "#e8e4d9" }}>
                    {isPositive ? "+" : ""}{formatPLN(result.profit)}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.65rem", color: "#6a6a82", display: "block" }}>MARŻA ZWROTU</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 700, color: isPositive ? "#4ecb71" : isNegative ? "#e05555" : "#e8e4d9" }}>
                    {formatPct(result.margin)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleAddToList}
                style={{ flex: 1, background: "linear-gradient(135deg, #4ecb71 0%, #2a9d47 100%)", border: "none", borderRadius: "6px", color: "#0d0d11", fontSize: "0.88rem", fontWeight: 600, padding: "0.6rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                {editingId ? "✓ AKTUALIZUJ WYCENĘ" : "＋ ZAPISZ DO LISTY ZBIORCZEJ"}
              </button>
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  style={{ background: "#1e1e28", border: "1px solid #e05555", color: "#e05555", borderRadius: "6px", fontSize: "0.88rem", fontWeight: 600, padding: "0.6rem", cursor: "pointer", fontFamily: "inherit", minWidth: "100px" }}
                >
                  ✕ ANULUJ
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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
                    <td style={{ color: "#6a6a82" }}>{item.ean}</td>
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
    </div>
  );
}
