import { useState, useCallback, useEffect } from "react";
import { Field, ResultRow } from "./components/Ui";

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

// `Field` and `ResultRow` are combined in `src/components/Ui.jsx`

export default function KalkulatorAllegro() {
  const [prodName, setProdName] = useState("");
  const [prodEan, setProdEan] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");

  const [supplierName, setSupplierName] = useState(() => localStorage.getItem("calcallegro_supplier") || "");
  const [purchaseCurrency, setPurchaseCurrency] = useState(() => localStorage.getItem("calcallegro_currency") || "PLN");
  const [allegro, setAllegro] = useState(() => localStorage.getItem("calcallegro_allegro") || "10");
  const [vat, setVat] = useState(() => {
    const savedVat = localStorage.getItem("calcallegro_vat");
    return savedVat ? parseInt(savedVat, 10) : 23;
  });

  const [includeDelivery, setIncludeDelivery] = useState(true);
  const [rates, setRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);
  const [savedCalculations, setSavedCalculations] = useState([]);
  
  // Nowy stan dla ładowania zapytania do Apify
  const [eanLoading, setEanLoading] = useState(false);

  // Funkcja komunikująca się z Twoim serwerem /api/scrape.js
  const handleFindCheapestOffer = async () => {
    if (!prodEan.trim()) {
      alert("Wpisz kod EAN, aby rozpocząć przeszukiwanie Allegro.");
      return;
    }

    setEanLoading(true);
    try {
      const response = await fetch(`/api/scrape?ean=${encodeURIComponent(prodEan.trim())}`);
      const data = await response.json();

      if (data.success) {
        // Automatyczne przypisanie nazwy produktu z najtańszej oferty
        setProdName(data.title);
        // Konwersja kropki z API na przecinek rynkowy dla Twoich filtrów wejściowych
        setOfferPrice(data.price.replace(".", ","));
      } else {
        alert("Błąd wyszukiwania: " + data.error);
      }
    } catch (err) {
      alert("Wystąpił błąd podczas próby połączenia z wewnętrznym skryptem scrapującym.");
    } finally {
      setEanLoading(false);
    }
  };

  useEffect(() => { localStorage.setItem("calcallegro_supplier", supplierName); }, [supplierName]);
  useEffect(() => { localStorage.setItem("calcallegro_currency", purchaseCurrency); }, [purchaseCurrency]);
  useEffect(() => { localStorage.setItem("calcallegro_allegro", allegro); }, [allegro]);
  useEffect(() => { localStorage.setItem("calcallegro_vat", vat.toString()); }, [vat]);

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const fetchRatesData = useCallback(() => {
  setRatesLoading(true);
  setRatesError(null);
  
  // Zapytanie kierujemy do naszego backendu na Vercelu z parametrem action=rates
  fetch("/api/scrape?action=rates")
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
      setRatesError("Błąd kursów walut (Tryb Offline)");
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

  const handleAddToList = () => {
    if (!offerPrice) return;

    const newItem = {
      id: Date.now(),
      name: prodName.trim() || "Produkt bez nazwy",
      ean: prodEan.trim() || "—",
      supplier: supplierName.trim() || "—",
      offerPrice: parseFloat(offerPrice.replace(",", ".")),
      purchaseCost: purchaseCost ? parseFloat(purchaseCost.replace(",", ".")) : 0,
      currency: purchaseCurrency,
      exchangeRate: purchaseCurrency !== "PLN" ? currentRate : 1,
      costPLN: result.costPLN || 0,
      allegroFee: result.allegroFee,
      shipping: result.shipping,
      income: result.income,
      profit: result.profit || 0,
      margin: result.margin || 0,
      vat: vat
    };

    setSavedCalculations(prev => [newItem, ...prev]);
    setProdName("");
    setProdEan("");
    setOfferPrice("");
    setPurchaseCost("");
  };

  const handleRemoveFromList = (id) => {
    setSavedCalculations(prev => prev.filter(item => item.id !== id));
  };

  const handleExportToExcel = () => {
    if (savedCalculations.length === 0 || !window.XLSX) return;

    const dataForExcel = savedCalculations.map((item, index) => ({
      "Lp.": index + 1,
      "Nazwa produktu": item.name,
      "EAN / SKU": item.ean,
      "Dostawca": item.supplier,
      "Cena oferty (Brutto PLN)": item.offerPrice,
      "Stawka VAT (%)": item.vat,
      "Koszt zakupu (Waluta)": item.purchaseCost,
      "Waluta zakupu": item.currency,
      "Kurs waluty": item.exchangeRate ? Math.round(item.exchangeRate * 10000) / 10000 : 1,
      "Koszt zakupu (PLN)": item.costPLN ? Math.round(item.costPLN * 100) / 100 : 0,
      "Prowizja Allegro (PLN)": Math.round(item.allegroFee * 100) / 100,
      "Koszt wysyłki (PLN)": item.shipping,
      "Wpływ operacyjny (Netto PLN)": Math.round(item.income * 100) / 100,
      "Zysk czysty (PLN)": item.profit ? Math.round(item.profit * 100) / 100 : "—",
      "Marża (%)": item.margin ? Math.round(item.margin * 10000) / 100 : "—"
    }));

    const worksheet = window.XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Kalkulacje Allegro");
    window.XLSX.writeFile(workbook, `Kalkulacje_Allegro_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      background: "#0d0d11",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e8e4d9",
      padding: "1.5rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        
        html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; background-color: #0d0d11; }
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: none; border-color: #f5a623 !important; }
        .pill { cursor: pointer; transition: all 0.15s; }
        .pill:hover { opacity: 0.85; }
        .row-result { border-bottom: 1px solid #1e1e26; padding: 0.45rem 0; display: flex; justify-content: space-between; align-items: center; }
        .row-result:last-child { border-bottom: none; }
        .spin { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cur-btn { border: none; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        select option { background: #16161e; color: #e8e4d9; }

        .workspace-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.5rem;
          width: 100%;
          max-width: 1140px;
        }

        .calc-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left; }
        .calc-table th { background: #121218; color: #6a6a82; padding: 0.75rem 0.6rem; font-weight: 500; border-bottom: 1px solid #22222e; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.05em; }
        .calc-table td { padding: 0.75rem 0.6rem; border-bottom: 1px solid #161622; color: #e8e4d9; }
        .calc-table tr:hover { background: #14141c; }

        @media (max-width: 850px) {
          .workspace-grid { grid-template-columns: 1fr; gap: 1rem; }
        }
      `}</style>

      {/* Kompaktowy Header */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: 0,
          background: "linear-gradient(135deg, #f5a623 0%, #f0623a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>KALKULATOR MARŻY ALLEGRO</h1>
        <p style={{ color: "#4a4a5e", fontSize: "0.7rem", margin: "0.2rem 0 0 0", letterSpacing: "0.08em" }}>
          SYSTEM OPERACYJNY WYCENY PRODUKTÓW · AUTOSAVE ACTIVE
        </p>
      </div>

      {/* Główny obszar roboczy - podział na 2 kolumny */}
      <div className="workspace-grid">
        
        {/* LEWA KOLUMNA: Wszystkie Inputy */}
        <div style={{ background: "#121218", borderRadius: "12px", padding: "1.25rem", border: "1px solid #1e1e26", display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Sekcja Kontrahenta */}
          <div>
            <Field 
              label="Dostawca / Hurtownia" 
              value={supplierName} 
              onChange={setSupplierName} 
              placeholder="Nazwa dostawcy (zostanie zapamiętana)" 
            />
          </div>

          <div style={{ height: "1px", background: "#1e1e26" }} />

          {/* Sekcja Identyfikacji Towaru */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <Field label="Nazwa produktu" value={prodName} onChange={setProdName} placeholder="np. Słuchawki X" />
              <Field label="Kod EAN / SKU" value={prodEan} onChange={setProdEan} placeholder="np. 590123..." />
            </div>
            
            {/* Przycisk wywołujący automatyczne szukanie przez Apify */}
            <button
              type="button"
              onClick={handleFindCheapestOffer}
              disabled={eanLoading}
              style={{
                width: "100%",
                marginTop: "0.2rem",
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
                <span><span className="spin" style={{ marginRight: "0.4rem" }}>⟳</span> Trwa scrapowanie cen przez Apify (szacowany czas: 15-40s)...</span>
              ) : (
                "🔍 Skonfiguruj produkt: Znajdź najtańszą cenę na Allegro po EAN"
              )}
            </button>
          </div>

          <div style={{ height: "1px", background: "#1e1e26" }} />

          {/* Dane Finansowe i Waluta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <Field label="Cena oferty brutto" value={offerPrice} onChange={setOfferPrice} placeholder="np. 89,99" />
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.68rem", letterSpacing: "0.08em", color: "#6a6a82", marginBottom: "0.3rem", fontWeight: 500 }}>KOSZT ZAKUPU</label>
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
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Kursy walut i szybki wybór */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", background: "#161622", padding: "0.5rem", borderRadius: "6px" }}>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {CURRENCIES.map(c => (
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

          {/* Prowizje, VAT i Logistyka obok siebie */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "0.75rem", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.68rem", color: "#6a6a82", display: "block", marginBottom: "0.3rem" }}>PROWIZJA %</label>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <input type="text" value={allegro} onChange={e => setAllegro(e.target.value)} style={{ width: "50px", background: "#1e1e28", border: "1px solid #2d2d3d", borderRadius: "6px", color: "#f5a623", fontSize: "0.95rem", padding: "0.5rem", textAlign: "center", fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: "0.15rem" }}>
                  {[5, 10, 15].map(v => (
                    <button key={v} onClick={() => setAllegro(String(v))} style={{ background: "#22222e", color: "#8a8a9e", border: "none", borderRadius: "4px", fontSize: "0.65rem", padding: "0.2rem 0.35rem", cursor: "pointer" }}>{v}%</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.68rem", color: "#6a6a82", display: "block", marginBottom: "0.3rem" }}>VAT</label>
              <div style={{ display: "flex", gap: "0.2rem" }}>
                {VAT_OPTIONS.map(v => (
                  <button key={v} onClick={() => setVat(v)} style={{ flex: 1, background: vat === v ? "linear-gradient(135deg, #f5a623, #f0623a)" : "#22222e", color: vat === v ? "#0d0d11" : "#8a8a9e", border: "none", borderRadius: "5px", padding: "0.5rem 0", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>{v}%</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#161622", padding: "0.4rem 0.5rem", borderRadius: "6px", justifyContent: "center", height: "36px", cursor: "pointer" }} onClick={() => setIncludeDelivery(v => !v)}>
              <span style={{ fontSize: "0.6rem", color: "#6a6a82", lineHeight: 1 }}>DOSTAWA 2%</span>
              <span style={{ fontSize: "0.8rem", color: includeDelivery ? "#4ecb71" : "#e05555", fontWeight: 700, marginTop: "0.1rem" }}>{includeDelivery ? "TAK" : "NIE"}</span>
            </div>
          </div>

        </div>

        {/* PRAWA KOLUMNA: Karta Wyników */}
        <div style={{ 
          background: "#121218", 
          borderRadius: "12px", 
          padding: "1.25rem", 
          border: result ? (isPositive ? "1px solid #1a3a22" : isNegative ? "1px solid #3a1a1a" : "1px solid #1e1e26") : "1px solid #1e1e26",
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "space-between" 
        }}>
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

              {/* Box Czystego Zysku */}
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

              <button
                onClick={handleAddToList}
                style={{ width: "100%", background: "linear-gradient(135deg, #4ecb71 0%, #2a9d47 100%)", border: "none", borderRadius: "6px", color: "#0d0d11", fontSize: "0.88rem", fontWeight: 600, padding: "0.6rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                ＋ ZAPISZ DO LISTY ZBIORCZEJ
              </button>
            </div>
          )}
        </div>

      </div>

      {/* DOLNA SEKCJA: Tabela Zapisanych Kalkulacji */}
      <div style={{ background: "#121218", borderRadius: "12px", padding: "1.25rem", border: "1px solid #1e1e26", width: "100%", maxWidth: "1140px", marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", letterSpacing: "0.08em", color: "#6a6a82", fontWeight: 500 }}>
            REJESTR WYCEN PRZYGOTOWANYCH DO EKSPORTU ({savedCalculations.length})
          </div>
          {savedCalculations.length > 0 && (
            <button
              onClick={handleExportToExcel}
              style={{ background: "#f5a623", color: "#0d0d11", border: "none", borderRadius: "4px", padding: "0.35rem 0.75rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
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
                  <th>Produkt</th>
                  <th>EAN / SKU</th>
                  <th>Dostawca</th>
                  <th>Oferta Brutto</th>
                  <th>Zakup</th>
                  <th>Wpływ Netto</th>
                  <th>Zysk Czysty</th>
                  <th>Marża</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {savedCalculations.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td style={{ color: "#6a6a82" }}>{item.ean}</td>
                    <td style={{ color: "#8a8a9e" }}>{item.supplier}</td>
                    <td>{formatPLN(item.offerPrice)}</td>
                    <td style={{ color: "#a5a5b5" }}>
                      {item.currency !== "PLN" ? `${item.purchaseCost} ${item.currency}` : formatPLN(item.purchaseCost)}
                    </td>
                    <td style={{ color: "#f5a623" }}>{formatPLN(item.income)}</td>
                    <td style={{ color: item.profit > 0 ? "#4ecb71" : "#e05555", fontWeight: 500 }}>
                      {formatPLN(item.profit)}
                    </td>
                    <td style={{ color: item.margin > 0 ? "#4ecb71" : "#e05555", fontWeight: 500 }}>
                      {formatPct(item.margin)}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleRemoveFromList(item.id)}
                        style={{ background: "transparent", border: "none", color: "#4a4a5e", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}