import { useState, useCallback, useEffect } from "react";

const SHIPPING_TIERS = [
  { max: 29.99, cost: 0 },
  { max: 44.99, cost: 1.59 },
  { max: 64.99, cost: 3.09 },
  { max: 99.99, cost: 4.99 },
  { max: 149.99, cost: 7.59 },
  { max: Infinity, cost: 9.99 },
];

const CURRENCIES = [
  { code: "PLN", symbol: "zł", flag: "🇵🇱" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "CHF", symbol: "Fr", flag: "🇨🇭" },
  { code: "CZK", symbol: "Kč", flag: "🇨🇿" },
  { code: "RON", symbol: "lei", flag: "🇷🇴" },
  { code: "CNY", symbol: "¥", flag: "🇨🇳" },
];

const VAT_OPTIONS = [5, 8, 23];

function getShippingCost(price) {
  for (const tier of SHIPPING_TIERS) {
    if (price <= tier.max) return tier.cost;
  }
  return 9.99;
}

function formatPLN(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return val.toFixed(2).replace(".", ",") + " zł";
}

function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return (val * 100).toFixed(2).replace(".", ",") + " %";
}

function Field({ label, value, onChange, placeholder, note }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#5a5a6e", display: "block", marginBottom: "0.4rem" }}>
        {label.toUpperCase()}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "#1e1e28",
          border: "1px solid #3a3a48",
          borderRadius: "8px",
          color: "#e8e4d9",
          fontSize: "1.05rem",
          fontFamily: "inherit",
          padding: "0.6rem 0.9rem",
        }}
      />
      {note && <div style={{ fontSize: "0.65rem", color: "#3a3a4e", marginTop: "0.25rem" }}>{note}</div>}
    </div>
  );
}

function ResultRow({ label, value, negative, accent, dimmed }) {
  return (
    <div className="row-result">
      <span style={{ fontSize: "0.78rem", color: dimmed ? "#5a5a6e" : "#8a8a9e" }}>{label}</span>
      <span style={{
        fontSize: "0.85rem",
        fontWeight: accent ? 500 : 400,
        color: negative ? "#c04040" : accent ? "#f5a623" : dimmed ? "#5a5a6e" : "#e8e4d9",
      }}>{value}</span>
    </div>
  );
}

export default function KalkulatorAllegro() {
  const [offerPrice, setOfferPrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("PLN");
  const [allegro, setAllegro] = useState("10");
  const [vat, setVat] = useState(23);
  const [includeDelivery, setIncludeDelivery] = useState(true);

  const [rates, setRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);

  const fetchRatesData = useCallback(() => {
    setRatesLoading(true);
    setRatesError(null);
    fetch("https://api.frankfurter.app/latest?base=PLN&symbols=EUR,USD,GBP,CHF,CZK,RON,CNY")
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => {
        const converted = {};
        for (const [cur, rate] of Object.entries(data.rates)) {
          converted[cur] = 1 / rate;
        }
        converted["PLN"] = 1;
        setRates(converted);
        setRatesDate(data.date);
        setRatesLoading(false);
      })
      .catch(() => {
        setRatesError("Nie udało się pobrać aktualnych kursów — używam przybliżonych");
        setRates({ PLN: 1, EUR: 4.27, USD: 3.92, GBP: 5.02, CHF: 4.38, CZK: 0.173, RON: 0.86, CNY: 0.541 });
        setRatesLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRatesData();
  }, [fetchRatesData]);

  const costInPLN = useCallback(() => {
    const cost = parseFloat(purchaseCost.replace(",", "."));
    if (isNaN(cost) || cost <= 0) return null;
    const rate = rates[purchaseCurrency] || 1;
    return cost * rate;
  }, [purchaseCost, purchaseCurrency, rates]);

  const calculate = useCallback(() => {
    const price = parseFloat(offerPrice.replace(",", "."));
    if (!price || isNaN(price)) return null;

    const vatRate = vat / 100;
    const allegroRate = parseFloat(allegro.replace(",", ".")) / 100;
    
    const shipping = getShippingCost(price);
    const allegroFee = price * allegroRate;
    const deliveryCost = includeDelivery ? price * 0.02 : 0;

    const totalCostsBrutto = allegroFee + shipping + deliveryCost;
    const incomeBrutto = price - totalCostsBrutto;
    
    const income = incomeBrutto / (1 + vatRate); 
    const netto = price / (1 + vatRate);

    const costPLN = costInPLN();
    if (costPLN === null) {
      return { income, shipping, allegroFee, deliveryCost, netto };
    }

    const costPlus2 = costPLN * 1.02;
    const profit = income - costPlus2;
    const margin = profit / costPlus2;
    const grossMargin = profit / price;

    return {
      income, shipping, allegroFee, deliveryCost, netto,
      costPLN, costPlus2, profit, margin, grossMargin,
    };
  }, [offerPrice, allegro, vat, includeDelivery, costInPLN]);

  const result = calculate();
  const isPositive = result && result.profit > 0;
  const isNegative = result && result.profit < 0;
  const currentRate = rates[purchaseCurrency];

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      background: "#0f0f13",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e8e4d9",
      padding: "2rem 1rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        
        /* Gwarancja braku białych pasków i tła na pełnym oknie */
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          background-color: #0f0f13;
        }

        * { box-sizing: border-box; }
        input:focus, select:focus { outline: none; }
        .pill { cursor: pointer; transition: all 0.15s; }
        .pill:hover { opacity: 0.85; }
        .toggle-track { transition: background 0.2s; }
        .row-result { border-bottom: 1px solid #2a2a32; padding: 0.5rem 0; display: flex; justify-content: space-between; align-items: center; }
        .row-result:last-child { border-bottom: none; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fadeup { animation: fadeUp 0.3s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; display: inline-block; }
        .cur-btn { border: none; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .cur-btn:hover { transform: translateY(-1px); }
        select option { background: #1e1e28; color: #e8e4d9; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(1.8rem, 5vw, 3rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          background: "linear-gradient(135deg, #f5a623 0%, #f0623a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>KALKULATOR</div>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(1.8rem, 5vw, 3rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: "#e8e4d9",
        }}>MARŻY ALLEGRO</div>
        <div style={{ color: "#5a5a6e", fontSize: "0.78rem", marginTop: "0.5rem", letterSpacing: "0.1em" }}>
          PROWIZJE · VAT · WYSYŁKA · KURSY WALUT · ZYSK
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Inputs card */}
        <div style={{ background: "#16161e", borderRadius: "16px", padding: "1.5rem", border: "1px solid #2a2a36" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#5a5a6e", marginBottom: "1.2rem" }}>
            DANE PRODUKTU
          </div>

          <Field label="Cena oferty (zł)" value={offerPrice} onChange={setOfferPrice} placeholder="np. 89,99" />

          {/* Koszt zakupu z wyborem waluty */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#5a5a6e", display: "block", marginBottom: "0.4rem" }}>
              KOSZT ZAKUPU
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                inputMode="decimal"
                value={purchaseCost}
                onChange={e => setPurchaseCost(e.target.value)}
                placeholder={`np. ${purchaseCurrency === "PLN" ? "45,00" : purchaseCurrency === "EUR" ? "10,50" : "15,00"}`}
                style={{
                  flex: 1,
                  background: "#1e1e28",
                  border: "1px solid #3a3a48",
                  borderRadius: "8px",
                  color: "#e8e4d9",
                  fontSize: "1.05rem",
                  fontFamily: "inherit",
                  padding: "0.6rem 0.9rem",
                }}
              />
              <select
                value={purchaseCurrency}
                onChange={e => setPurchaseCurrency(e.target.value)}
                style={{
                  background: "#1e1e28",
                  border: "1px solid #3a3a48",
                  borderRadius: "8px",
                  color: "#f5a623",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  fontWeight: 500,
                  padding: "0.5rem 0.6rem",
                  cursor: "pointer",
                  minWidth: "80px",
                }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            </div>

            {purchaseCurrency !== "PLN" && (
              <div style={{ marginTop: "0.45rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem" }}>
                {ratesLoading ? (
                  <span style={{ color: "#5a5a6e" }}><span className="spin">⟳</span> Pobieranie kursu...</span>
                ) : currentRate ? (
                  <>
                    <span style={{ background: "#1e1e28", border: "1px solid #2a3a2a", borderRadius: "5px", padding: "0.15rem 0.5rem", color: "#4ecb71", fontSize: "0.72rem" }}>
                      1 {purchaseCurrency} = {currentRate.toFixed(4)} PLN
                    </span>
                    {purchaseCost && costInPLN() && (
                      <span style={{ color: "#8a8a9e" }}>= {formatPLN(costInPLN())}</span>
                    )}
                    {ratesDate && <span style={{ color: "#3a3a4e", marginLeft: "auto" }}>kurs z {ratesDate}</span>}
                  </>
                ) : ratesError ? (
                  <span style={{ color: "#c04040" }}>{ratesError}</span>
                ) : null}
              </div>
            )}
          </div>

          {/* Currency quick-select pills */}
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                className="cur-btn"
                onClick={() => setPurchaseCurrency(c.code)}
                style={{
                  background: purchaseCurrency === c.code ? "linear-gradient(135deg,#f5a623,#f0623a)" : "#22222e",
                  color: purchaseCurrency === c.code ? "#0f0f13" : "#5a5a6e",
                  borderRadius: "6px",
                  padding: "0.2rem 0.55rem",
                  fontSize: "0.72rem",
                  fontWeight: purchaseCurrency === c.code ? 500 : 400,
                  border: purchaseCurrency === c.code ? "none" : "1px solid #2a2a36",
                }}
              >
                {c.flag} {c.code}
              </button>
            ))}
            <button
              className="cur-btn pill"
              onClick={fetchRatesData}
              title="Odśwież kursy"
              style={{
                background: "#22222e",
                color: "#5a5a6e",
                borderRadius: "6px",
                padding: "0.2rem 0.55rem",
                fontSize: "0.72rem",
                border: "1px solid #2a2a36",
                marginLeft: "auto",
              }}
            >
              {ratesLoading ? <span className="spin">⟳</span> : "⟳"} kursy
            </button>
          </div>

          {/* Prowizja */}
          <div style={{ marginBottom: "0.4rem", fontSize: "0.7rem", letterSpacing: "0.12em", color: "#5a5a6e" }}>
            PROWIZJA ALLEGRO
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="text"
              inputMode="decimal"
              value={allegro}
              onChange={e => setAllegro(e.target.value)}
              style={{
                width: "80px",
                background: "#1e1e28",
                border: "1px solid #3a3a48",
                borderRadius: "8px",
                color: "#f5a623",
                fontSize: "1.1rem",
                fontFamily: "inherit",
                fontWeight: 500,
                padding: "0.45rem 0.7rem",
                textAlign: "center",
              }}
            />
            <span style={{ color: "#5a5a6e", fontSize: "0.9rem" }}>%</span>
            <div style={{ display: "flex", gap: "0.4rem", marginLeft: "0.4rem", flexWrap: "wrap" }}>
              {[5, 8, 10, 12, 15].map(v => (
                <button key={v} className="pill" onClick={() => setAllegro(String(v))}
                  style={{
                    background: parseFloat(allegro) === v ? "#f5a623" : "#2a2a36",
                    color: parseFloat(allegro) === v ? "#0f0f13" : "#8a8a9e",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.75rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}>{v}%</button>
              ))}
            </div>
          </div>
        </div>

        {/* VAT + Dostawa */}
        <div style={{
          background: "#16161e",
          borderRadius: "16px",
          padding: "1.5rem",
          border: "1px solid #2a2a36",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
        }}>
          <div>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#5a5a6e", marginBottom: "0.8rem" }}>STAWKA VAT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {VAT_OPTIONS.map(v => (
                <button key={v} className="pill" onClick={() => setVat(v)}
                  style={{
                    background: vat === v ? "linear-gradient(135deg, #f5a623, #f0623a)" : "#2a2a36",
                    color: vat === v ? "#0f0f13" : "#8a8a9e",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 0.8rem",
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    fontWeight: vat === v ? 500 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                  }}>
                  {v}% VAT
                  {v === 23 && <span style={{ fontSize: "0.65rem", marginLeft: "0.4rem", opacity: 0.7 }}>standard</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#5a5a6e", marginBottom: "0.8rem" }}>KOSZT DOSTAWY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8a8a9e", lineHeight: 1.4 }}>
                Doliczyć 2% kosztu dostawy?
              </div>
              <div className="pill" onClick={() => setIncludeDelivery(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginTop: "0.3rem", cursor: "pointer", userSelect: "none" }}
              >
                <div className="toggle-track" style={{
                  width: "44px", height: "24px", borderRadius: "12px",
                  background: includeDelivery ? "#f5a623" : "#2a2a36",
                  position: "relative", flexShrink: 0,
                }}>
                  <div style={{
                    position: "absolute", top: "3px",
                    left: includeDelivery ? "23px" : "3px",
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: includeDelivery ? "#0f0f13" : "#5a5a6e",
                    transition: "left 0.2s",
                  }} />
                </div>
                <span style={{ fontSize: "0.85rem", color: includeDelivery ? "#f5a623" : "#5a5a6e", fontWeight: includeDelivery ? 500 : 400 }}>
                  {includeDelivery ? "TAK" : "NIE"}
                </span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "#3a3a4e", lineHeight: 1.4 }}>
                {includeDelivery ? "2% ceny oferty doliczone" : "Nie wliczany"}
              </div>
            </div>
          </div>
        </div>

        {/* Wyniki */}
        {result && (
          <div className="fadeup" style={{
            background: "#16161e",
            borderRadius: "16px",
            padding: "1.5rem",
            border: isPositive ? "1px solid #2a4a2e" : isNegative ? "1px solid #4a2a2a" : "1px solid #2a2a36",
          }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#5a5a6e", marginBottom: "1rem" }}>
              WYNIKI KALKULACJI
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <ResultRow label="Cena netto (po VAT)" value={formatPLN(result.netto)} dimmed />
              <ResultRow label={`Prowizja Allegro (${allegro}%)`} value={"− " + formatPLN(result.allegroFee)} negative />
              <ResultRow label="Wysyłka InPost" value={"− " + formatPLN(result.shipping)} negative />
              {includeDelivery && (
                <ResultRow label="Koszt dostawy 2%" value={"− " + formatPLN(result.deliveryCost)} negative />
              )}
              {result.costPLN && purchaseCurrency !== "PLN" && (
                <ResultRow
                  label={`Koszt zakupu (${purchaseCost} ${purchaseCurrency} × ${currentRate?.toFixed(4)})`}
                  value={formatPLN(result.costPLN)}
                  dimmed
                />
              )}
              <div style={{ borderTop: "1px solid #2a2a36", paddingTop: "0.6rem", marginTop: "0.3rem" }}>
                <ResultRow label="Wpływ do nas (Zysk operacyjny Netto)" value={formatPLN(result.income)} accent />
              </div>
            </div>

            {result.profit !== undefined && (
              <div style={{
                background: isPositive ? "#1a2e1c" : isNegative ? "#2e1a1a" : "#1e1e28",
                borderRadius: "10px",
                padding: "1rem 1.2rem",
                marginTop: "0.5rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#5a5a6e", marginBottom: "0.3rem" }}>
                      ZYSK / STRATA CZYSTA
                    </div>
                    <div style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      color: isPositive ? "#4ecb71" : isNegative ? "#e05555" : "#e8e4d9",
                      lineHeight: 1,
                    }}>
                      {isPositive ? "+" : ""}{formatPLN(result.profit)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#5a5a6e", marginTop: "0.3rem" }}>
                      po koszcie zakupu (+2% kapitał: {formatPLN(result.costPlus2)})
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#5a5a6e", marginBottom: "0.3rem" }}>
                      MARŻA
                    </div>
                    <div style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: isPositive ? "#4ecb71" : isNegative ? "#e05555" : "#e8e4d9",
                    }}>
                      {formatPct(result.margin)}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#3a3a4e", marginTop: "0.15rem" }}>
                      marża brutto: {formatPct(result.grossMargin)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        {result && (
          <div style={{
            background: "#13131a",
            borderRadius: "10px",
            padding: "0.8rem 1rem",
            border: "1px solid #22222e",
            fontSize: "0.7rem",
            color: "#3a3a50",
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#f5a623" }}>📦</span>
              <span>Wysyłka InPost: <span style={{ color: "#5a5a6e" }}>{formatPLN(result.shipping)}</span> dla ceny {offerPrice} zł</span>
            </div>
            {purchaseCurrency !== "PLN" && currentRate && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#4ecb71" }}>💱</span>
                <span>Kurs {purchaseCurrency}/PLN: <span style={{ color: "#5a5a6e" }}>{currentRate.toFixed(4)}</span>
                  {ratesDate && <span style={{ marginLeft: "0.4rem", color: "#2a2a4e" }}>({ratesDate})</span>}
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: "0.65rem", color: "#2a2a3a", letterSpacing: "0.05em", paddingBottom: "1rem" }}>
          Kursy walut: frankfurter.app (ECB) · Matematyka skorygowana o podatki ze sprzedaży
        </div>
      </div>
    </div>
  );
}