import { useState, useCallback, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { ProfileAuthScreen, ChangePinModal, ProfileManagementModal } from "./components/AuthModals";
import CalculatorPage from "./pages/CalculatorPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SavedOffersPage from "./pages/SavedOffersPage";
import { useAuth } from './AuthContext.jsx';
import { useApp } from './AppContext.jsx';
import './App.css';

// --- CONSTANTS & HELPERS ---
const CURRENCIES = [
  { code: "PLN", symbol: "zł", flag: "🇵🇱" }, { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "USD", symbol: "$", flag: "🇺🇸" }, { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "CHF", symbol: "Fr", flag: "🇨🇭" }, { code: "CZK", symbol: "Kč", flag: "🇨🇿" },
  { code: "RON", symbol: "lei", flag: "🇷🇴" }, { code: "CNY", symbol: "¥", flag: "🇨🇳" },
];

const SHIPPING_TIERS = [
  { max: 29.99, cost: 0 }, { max: 44.99, cost: 1.59 }, { max: 64.99, cost: 3.09 },
  { max: 99.99, cost: 4.99 }, { max: 149.99, cost: 7.59 }, { max: Infinity, cost: 9.99 },
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

function AppContent() {
  const { rates, ratesLoading, edgeConfig, fetchRatesData, setToast } = useApp();
  const { activeProfile, logout } = useAuth();
  const location = useLocation();

  const [prodName, setProdName] = useState("");
  const [prodEan, setProdEan] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [allegroDiscounted, setAllegroDiscounted] = useState(false);
  const [supplierName, setSupplierName] = useState(() => localStorage.getItem("calcallegro_supplier") || "");
  const [purchaseCurrency, setPurchaseCurrency] = useState(() => localStorage.getItem("calcallegro_currency") || "PLN");
  const [allegro, setAllegro] = useState(() => localStorage.getItem("calcallegro_allegro") || "10");
  const [vat, setVat] = useState(() => {
    const savedVat = localStorage.getItem("calcallegro_vat");
    return savedVat ? parseInt(savedVat, 10) : 23;
  });
  const [includeDelivery, setIncludeDelivery] = useState(true);
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [savedOffers, setSavedOffers] = useState(() => {
    const saved = localStorage.getItem('calcallegro_saved_offers');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingId, setEditingId] = useState(null);
  const [eanLoading, setEanLoading] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  
  const activeTab = location.pathname === '/saved' ? 'oferty' : 'kalkulator';

  useEffect(() => {
    fetchRatesData();
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [fetchRatesData]);

  useEffect(() => { localStorage.setItem("calcallegro_supplier", supplierName); }, [supplierName]);
  useEffect(() => { localStorage.setItem("calcallegro_currency", purchaseCurrency); }, [purchaseCurrency]);
  useEffect(() => { localStorage.setItem("calcallegro_allegro", allegro); }, [allegro]);
  useEffect(() => { localStorage.setItem("calcallegro_vat", vat.toString()); }, [vat]);
  useEffect(() => {
    localStorage.setItem('calcallegro_saved_offers', JSON.stringify(savedOffers));
  }, [savedOffers]);


  const costInPLN = useCallback(() => {
    const cost = parseFloat(purchaseCost.replace(",", "."));
    if (isNaN(cost) || cost <= 0) return null;
    return cost * (rates[purchaseCurrency] || 1);
  }, [purchaseCost, purchaseCurrency, rates]);

  const calculate = useCallback(() => {
    const price = parseFloat(offerPrice.replace(",", "."));
    if (!price || isNaN(price)) return null;
    const vatRate = vat / 100;
    const shipping = getShippingCost(price);
    const allegroFee = price * (parseFloat(allegro.replace(",", ".")) / 100) * (allegroDiscounted ? 0.5 : 1);
    const deliveryCost = includeDelivery ? price * 0.02 : 0;
    const income = (price - (allegroFee + shipping + deliveryCost)) / (1 + vatRate);
    const netto = price / (1 + vatRate);
    const costPLN = costInPLN();
    if (costPLN === null) return { income, shipping, allegroFee, deliveryCost, netto };
    const costPlus2 = costPLN * 1.02;
    const profit = income - costPlus2;
    return { income, shipping, allegroFee, deliveryCost, netto, costPLN, costPlus2, profit, margin: profit / costPlus2 };
  }, [offerPrice, allegro, vat, includeDelivery, costInPLN, allegroDiscounted]);

  const result = calculate();
  const isPositive = result && result.profit > 0;
  const isNegative = result && result.profit < 0;
  const currentRate = rates[purchaseCurrency];

  const handleFindCheapestOffer = async () => {
    if (!prodEan.trim()) {
      alert("Wpisz kod EAN");
      return;
    }
    setEanLoading(true);
    try {
      const response = await fetch(`/api/scrape?ean=${encodeURIComponent(prodEan.trim())}`);
      const data = await response.json();
      if (data.success) {
        setProdName(data.title);
        setOfferPrice(data.price.replace(".", ","));
      } else {
        alert("Błąd: " + data.error);
      }
    } catch {
      alert("Błąd połączenia ze skryptem.");
    } finally {
      setEanLoading(false);
    }
  };
  
  const handleEditItem = (item) => {
    setProdName(item.name);
    setProdEan(item.ean === "—" ? "" : item.ean);
    setOfferPrice(item.offerPrice.toString().replace(".", ","));
    setPurchaseCost(item.purchaseCost.toString().replace(".", ","));
    setPurchaseCurrency(item.currency);
    setQuantity(item.quantity.toString());
    setAllegroDiscounted(item.allegroDiscounted);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setProdName(""); setProdEan(""); setOfferPrice(""); setPurchaseCost(""); setQuantity("1"); setAllegroDiscounted(false);
  };

  const handleAddToList = () => {
    if (!offerPrice) return;
    const newItem = {
      id: editingId || Date.now(),
      name: prodName.trim() || "Produkt bez nazwy",
      ean: prodEan.trim() || "—",
      supplier: supplierName.trim() || "—",
      quantity: parseInt(quantity, 10) || 1,
      allegroDiscounted,
      offerPrice: parseFloat(offerPrice.replace(",", ".")) || 0,
      purchaseCost: purchaseCost ? parseFloat(purchaseCost.replace(",", ".")) : 0,
      currency: purchaseCurrency,
      exchangeRate: purchaseCurrency !== "PLN" ? currentRate : 1,
      costPLN: result?.costPLN || 0,
      allegroFee: result?.allegroFee || 0,
      shipping: result?.shipping || 0,
      income: result?.income || 0,
      profit: result?.profit || 0,
      margin: result?.margin || 0,
      createdBy: activeProfile?.name || 'Anonim',
      vat
    };

    if (editingId) {
      setSavedCalculations(prev => prev.map(item => item.id === editingId ? newItem : item));
      setEditingId(null);
    } else {
      setSavedCalculations(prev => [newItem, ...prev]);
    }
    setProdName(""); setProdEan(""); setOfferPrice(""); setPurchaseCost(""); setQuantity("1"); setAllegroDiscounted(false);
  };
  
  const handleRemoveFromList = (id) => {
    setSavedCalculations(prev => prev.filter(item => item.id !== id));
    if (editingId === id) handleCancelEdit();
  };
  
  const handleExportToExcel = () => {
    if (savedCalculations.length === 0 || !window.XLSX) return;
    const XLSX = window.XLSX;
    const headers = [
      "Lp.", "Nazwa produktu", "Ilość", "EAN / SKU", "Dostawca",
      "Cena oferty (Brutto PLN)", "Stawka VAT (%)", "Prowizja obniżona",
      "Koszt zakupu (Waluta)", "Waluta zakupu", "Kurs waluty",
      "Koszt zakupu (PLN)", "Prowizja Allegro (PLN)", "Koszt wysyłki (PLN)",
      "Wpływ operacyjny (Netto PLN)", "Zysk czysty (PLN)", "Marża"
    ];
    const dataForExcel = savedCalculations.map((item, index) => ({
      "Lp.": index + 1,
      "Nazwa produktu": item.name,
      "Ilość": !isNaN(item.quantity) ? item.quantity : null,
      "EAN / SKU": item.ean,
      "Dostawca": item.supplier,
      "Cena oferty (Brutto PLN)": typeof item.offerPrice === 'number' ? item.offerPrice : Number(item.offerPrice) || 0,
      "Stawka VAT (%)": item.vat,
      "Prowizja obniżona": item.allegroDiscounted ? "TAK" : "NIE",
      "Koszt zakupu (Waluta)": typeof item.purchaseCost === 'number' ? item.purchaseCost : Number(item.purchaseCost) || 0,
      "Waluta zakupu": item.currency,
      "Kurs waluty": item.exchangeRate ? Math.round(item.exchangeRate * 10000) / 10000 : 1,
      "Koszt zakupu (PLN)": item.costPLN || 0,
      "Prowizja Allegro (PLN)": item.allegroFee || 0,
      "Koszt wysyłki (PLN)": item.shipping || 0,
      "Wpływ operacyjny (Netto PLN)": item.income || 0,
      "Zysk czysty (PLN)": typeof item.profit === 'number' ? item.profit : (item.profit ? Number(item.profit) : null),
      "Marża": typeof item.margin === 'number' ? item.margin : (item.margin ? Number(item.margin) : null)
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kalkulacje Allegro');
    XLSX.writeFile(workbook, `Kalkulacje_Allegro.xlsx`);
  };

  const handleSaveWholeOffer = () => {
    if (savedCalculations.length === 0) {
      setToast({ message: "Lista kalkulacji jest pusta. Dodaj przynajmniej jeden produkt.", type: 'error', visible: true });
      return;
    }
    const offerName = prompt(`Podaj nazwę dla tego zestawienia ofert:`, `Zestawienie z ${new Date().toLocaleDateString()}`);
    if (offerName && offerName.trim()) {
      const newOfferSet = {
        id: Date.now(),
        name: offerName.trim(),
        createdAt: new Date().toISOString(),
        createdBy: activeProfile?.name || 'Anonim',
        items: savedCalculations
      };
      setSavedOffers(prev => [newOfferSet, ...prev]);
      setSavedCalculations([]); // Wyczyść listę po zapisaniu
      setToast({ message: `Zapisano zestawienie "${offerName}"`, type: 'success', visible: true });
    }
  };

  const handleLoadOfferSet = (offerSet) => {
    setSavedCalculations(offerSet.items);
    setToast({ message: `Wczytano zestawienie "${offerSet.name}" do kalkulatora.`, type: 'success', visible: true });
  };

  const handleDeleteOfferSet = (offerSetId) => {
    if (window.confirm("Czy na pewno chcesz usunąć to zestawienie? Tej operacji nie można cofnąć.")) {
      setSavedOffers(prev => prev.filter(set => set.id !== offerSetId));
      setToast({ message: "Zestawienie zostało usunięte.", type: 'info', visible: true });
    }
  };

  const handleExportOfferSet = (offerSet) => {
    handleExportToExcel(offerSet.items); // Używamy istniejącej funkcji, przekazując odpowiednie dane
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#0d0d11", fontFamily: "'DM Mono', monospace", color: "#e8e4d9", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      <nav style={{ display: "flex", gap: "2rem", background: "#121218", border: "1px solid #1e1e26", padding: "0.75rem 2rem", borderRadius: "10px", width: "100%", maxWidth: "1140px", marginBottom: "1.5rem", alignItems: "center" }}>
        <strong style={{ color: "#f5a623", fontFamily: "'Syne', sans-serif" }}>Allegro Calc v2</strong>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link to="/" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem", fontWeight: activeTab === 'kalkulator' ? 700 : 400 }}>
            🧮 Kalkulator
          </Link>
          <Link to="/saved" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem", fontWeight: activeTab === 'oferty' ? 700 : 400 }}>
            📂 Zapisane oferty
          </Link>
          <Link to="/analityka" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem" }}>
            📊 Analityka
          </Link>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <button onClick={logout} title="Zablokuj" style={{ background: '#22222e', border: 'none', color: '#f5a623', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>🔒</button>
          <button onClick={() => setShowChangePinModal(true)} title="Zmień PIN" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>⚙️</button>
          <button onClick={() => setShowProfileModal(true)} title="Profile" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>👤</button>
        </div>
      </nav>

      {activeProfile && (
        <div style={{ width: "100%", maxWidth: "1140px", textAlign: "right", paddingRight: "0.5rem", marginBottom: "0.5rem", fontSize: "0.8rem", color: "#8a8a9e" }}>
          Zalogowany profil: <strong style={{ color: "#f5a623" }}>{activeProfile.name}</strong>
        </div>
      )}

      <Routes>
        <Route path="/" element={
          <CalculatorPage
            prodName={prodName} setProdName={setProdName} prodEan={prodEan} setProdEan={setProdEan}
            offerPrice={offerPrice} setOfferPrice={setOfferPrice} purchaseCost={purchaseCost} setPurchaseCost={setPurchaseCost}
            quantity={quantity} setQuantity={setQuantity} allegroDiscounted={allegroDiscounted} setAllegroDiscounted={setAllegroDiscounted}
            supplierName={supplierName} setSupplierName={setSupplierName} purchaseCurrency={purchaseCurrency} setPurchaseCurrency={setPurchaseCurrency}
            allegro={allegro} setAllegro={setAllegro} vat={vat} setVat={setVat} includeDelivery={includeDelivery} setIncludeDelivery={setIncludeDelivery}
            ratesLoading={ratesLoading} currentRate={currentRate} eanLoading={eanLoading} edgeConfig={edgeConfig} result={result}
            isPositive={isPositive} isNegative={isNegative} editingId={editingId} savedCalculations={savedCalculations}
            handleFindCheapestOffer={handleFindCheapestOffer} handleEditItem={handleEditItem} handleCancelEdit={handleCancelEdit}
            handleAddToList={handleAddToList} handleRemoveFromList={handleRemoveFromList} handleExportToExcel={handleExportToExcel}
            onSaveWholeOffer={handleSaveWholeOffer}
            currencies={CURRENCIES} vatOptions={VAT_OPTIONS} formatPLN={formatPLN} formatPct={formatPct}
          />
        } />
        <Route path="/saved" element={
          <SavedOffersPage
            savedOffers={savedOffers}
            onLoad={handleLoadOfferSet}
            onDelete={handleDeleteOfferSet}
            onExport={handleExportOfferSet}
            formatPLN={formatPLN}
          />
        } />
        <Route path="/analityka" element={<AnalyticsPage />} />
      </Routes>

      {showChangePinModal && <ChangePinModal onClose={() => setShowChangePinModal(false)} />}
      {showProfileModal && <ProfileManagementModal onClose={() => setShowProfileModal(false)} />}
    </div>
  );
}


export default function App() {
  const { isUnlocked } = useAuth();

  if (!isUnlocked) {
    return <ProfileAuthScreen />;
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}
