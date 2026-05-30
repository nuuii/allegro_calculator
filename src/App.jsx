import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { ProfileAuthScreen, ChangePinModal, ProfileManagementModal } from "./components/AuthModals";
import CalculatorPage from "./pages/CalculatorPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SavedOffersPage from "./pages/SavedOffersPage";
import SettingsPage from "./pages/SettingsPage";
import { useAuth } from './AuthContext.jsx';
import { useApp } from './AppContext.jsx';
import { useCalculator } from './useCalculator.js';
import './App.css';

const CURRENCIES = [
  { code: "PLN", symbol: "zł", flag: "🇵🇱" }, { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "USD", symbol: "$", flag: "🇺🇸" }, { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "CHF", symbol: "Fr", flag: "🇨🇭" }, { code: "CZK", symbol: "Kč", flag: "🇨🇿" },
  { code: "RON", symbol: "lei", flag: "🇷🇴" }, { code: "CNY", symbol: "¥", flag: "🇨🇳" },
];

const VAT_OPTIONS = [5, 8, 23];

const formatPLN = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return value.toFixed(2).replace(".", ",") + " zł";
};

const formatPct = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return (value * 100).toFixed(2).replace(".", ",") + " %";
};

function AppContent() {
  const { rates, ratesLoading, edgeConfig, fetchRatesData, setToast } = useApp();
  const { profiles, activeProfile, logout } = useAuth();
  const location = useLocation();

  const calc = useCalculator({ rates, activeProfile });
  const navigate = useNavigate();

  const [savedOffers, setSavedOffers] = useState(() => {
    const saved = localStorage.getItem('calcallegro_saved_offers');
    return saved ? JSON.parse(saved) : [];
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [eanLoading, setEanLoading] = useState(false);

  const activeTab = location.pathname === '/saved' ? 'oferty' : location.pathname === '/ustawienia' ? 'ustawienia' : 'kalkulator';

  useEffect(() => {
    // Pobierz zapisane oferty z API (jeśli dostępne)
    const fetchSaved = async () => {
      try {
        const res = await fetch('/api/calculations');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setSavedOffers(json.data);
          }
        }
      } catch (err) {
        console.warn('Nie udało się pobrać zapisanych ofert:', err.message || err);
      }
    };
    fetchSaved();

    fetchRatesData();
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [fetchRatesData]);

  useEffect(() => {
    localStorage.setItem('calcallegro_saved_offers', JSON.stringify(savedOffers));
  }, [savedOffers]);

  const handleFindCheapestOffer = async () => {
    if (!calc.prodEan.trim()) {
      alert("Wpisz kod EAN");
      return;
    }
    setEanLoading(true);
    try {
      const response = await fetch(`/api/scrape?ean=${encodeURIComponent(calc.prodEan.trim())}`);
      const data = await response.json();
      if (data.success) {
        calc.setProdName(data.title);
        calc.setOfferPrice(data.price.replace(".", ","));
      } else {
        alert("Błąd: " + data.error);
      }
    } catch {
      alert("Błąd połączenia ze skryptem.");
    } finally {
      setEanLoading(false);
    }
  };
  
  const handleExportToExcel = (calculationsList) => {
    if (!calculationsList || calculationsList.length === 0 || !window.XLSX) return;
    const XLSX = window.XLSX;
    const headers = [
      "Lp.", "Nazwa produktu", "Ilość", "EAN / SKU", "Dostawca",
      "Cena oferty (Brutto PLN)", "Stawka VAT (%)", "Prowizja obniżona",
      "Koszt zakupu (Waluta)", "Waluta zakupu", "Kurs waluty",
      "Koszt zakupu (PLN)", "Prowizja Allegro (PLN)", "Koszt wysyłki (PLN)",
      "Wpływ operacyjny (Netto PLN)", "Zysk czysty (PLN)", "Marża"
    ];
    const dataForExcel = calculationsList.map((item, index) => ({
      "Lp.": index + 1,
      "Nazwa produktu": item.name,
      "Ilość": !isNaN(item.quantity) ? item.quantity : null,
      "EAN / SKU": item.ean,
      "Dostawca": item.supplier,
      "Cena oferty (Brutto PLN)": item.offerPrice || 0,
      "Stawka VAT (%)": item.vat,
      "Prowizja obniżona": item.allegroDiscounted ? "TAK" : "NIE",
      "Koszt zakupu (Waluta)": item.purchaseCost || 0,
      "Waluta zakupu": item.currency,
      "Kurs waluty": item.exchangeRate ? Math.round(item.exchangeRate * 10000) / 10000 : 1,
      "Koszt zakupu (PLN)": item.costPLN || 0,
      "Prowizja Allegro (PLN)": item.allegroFee || 0,
      "Koszt wysyłki (PLN)": item.shipping || 0,
      "Wpływ operacyjny (Netto PLN)": item.income || 0,
      "Zysk czysty (PLN)": item.profit || 0,
      "Marża": item.margin || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kalkulacje Allegro');
    XLSX.writeFile(workbook, `Kalkulacje_Allegro.xlsx`);
  };

  const handleSaveWholeOffer = async () => {
    if (calc.savedCalculations.length === 0) {
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
        items: calc.savedCalculations
      };
      
      try {
        // Wysyłamy do chmury (przekazujemy oczekiwane pola)
        const payload = {
          offerName: newOfferSet.name,
          items: newOfferSet.items,
          createdBy: newOfferSet.createdBy,
        };

        const response = await fetch('/api/calculations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || 'Błąd podczas zapisywania do chmury');
        }

        const resJson = await response.json();
        const saved = resJson.data || newOfferSet;

        // Dodajemy do lokalnej listy (użyj odpowiedzi z serwera jeśli jest)
        setSavedOffers(prev => [saved, ...prev]);

        // Czyścimy lokalna liste wycen w kalkulatorze
        calc.handleResetSavedCalculations();

        setToast({ message: `Zestawienie "${offerName}" zostało pomyślnie zapisane w chmurze!`, type: 'success', visible: true });
      } catch (error) {
        console.error('Błąd zapisu:', error);
        setToast({ message: `Błąd: ${error.message}`, type: 'error', visible: true });
      }
    }
  };

  const handleLoadOfferSet = (offerSet) => {
    if (!offerSet) return;
    // Załaduj elementy do hooka kalkulatora i przejdź do ekranu kalkulatora
    if (calc.handleLoadSavedCalculations) {
      calc.handleLoadSavedCalculations(offerSet.items || []);
    }
    setToast({ message: `Wczytano zestawienie "${offerSet.name}".`, type: 'success', visible: true });
    navigate('/');
  };

  const handleDeleteOfferSet = async (offerSetId) => {
    if (!window.confirm("Czy na pewno chcesz usunąć to zestawienie?")) return;
    try {
      const res = await fetch(`/api/calculations?id=${encodeURIComponent(offerSetId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Błąd przy usuwaniu');
      setSavedOffers(prev => prev.filter(set => set.id !== offerSetId));
      setToast({ message: "Zestawienie zostało usunięte.", type: 'info', visible: true });
    } catch (err) {
      console.error('Błąd usuwania:', err);
      setToast({ message: `Błąd: ${err.message}`, type: 'error', visible: true });
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#0d0d11", fontFamily: "'DM Mono', monospace", color: "#e8e4d9", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      <nav style={{ display: "flex", gap: "2rem", background: "#121218", border: "1px solid #1e1e26", padding: "0.75rem 2rem", borderRadius: "10px", width: "100%", maxWidth: "1140px", marginBottom: "1.5rem", alignItems: "center" }}>
        <strong style={{ color: "#f5a623", fontFamily: "'Syne', sans-serif" }}>Allegro Calc v2</strong>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link to="/" style={{ color: activeTab === 'kalkulator' ? '#e8e4d9' : '#6a6a82', textDecoration: "none", fontSize: "0.85rem", fontWeight: activeTab === 'kalkulator' ? 700 : 400 }}>
            🧮 Kalkulator
          </Link>
          <Link to="/saved" style={{ color: activeTab === 'oferty' ? '#e8e4d9' : '#6a6a82', textDecoration: "none", fontSize: "0.85rem", fontWeight: activeTab === 'oferty' ? 700 : 400 }}>
            📂 Zapisane oferty
          </Link>
          <Link to="/analityka" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem" }}>
            📊 Analityka
          </Link>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <button onClick={logout} title="Zablokuj" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#f5a623', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>🔒</button>
          <Link to="/ustawienia" title="Ustawienia" style={{ background: activeTab === 'ustawienia' ? '#f5a623' : '#22222e', color: activeTab === 'ustawienia' ? '#0d0d11' : '#8a8a9e', border: '1px solid #2d2d3d', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>⚙️</Link>
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
            prodName={calc.prodName} setProdName={calc.setProdName}
            prodEan={calc.prodEan} setProdEan={calc.setProdEan}
            offerPrice={calc.offerPrice} setOfferPrice={calc.setOfferPrice}
            purchaseCost={calc.purchaseCost} setPurchaseCost={calc.setPurchaseCost}
            quantity={calc.quantity} setQuantity={calc.setQuantity}
            allegroDiscounted={calc.allegroDiscounted} setAllegroDiscounted={calc.setAllegroDiscounted}
            supplierName={calc.supplierName} setSupplierName={calc.setSupplierName}
            purchaseCurrency={calc.purchaseCurrency} setPurchaseCurrency={calc.setPurchaseCurrency}
            allegro={calc.allegro} setAllegro={calc.setAllegro}
            vat={calc.vat} setVat={calc.setVat}
            includeDelivery={calc.includeDelivery} setIncludeDelivery={calc.setIncludeDelivery}
            ratesLoading={ratesLoading} currentRate={calc.currentRate} eanLoading={eanLoading} edgeConfig={edgeConfig} result={calc.result}
            isPositive={calc.result?.profit > 0} isNegative={calc.result?.profit < 0} editingId={calc.editingId} savedCalculations={calc.savedCalculations}
            handleFindCheapestOffer={handleFindCheapestOffer} handleEditItem={calc.handleEditItem} handleCancelEdit={calc.handleCancelEdit}
            handleAddToList={calc.handleAddToList} handleRemoveFromList={calc.handleRemoveFromList} 
            handleExportToExcel={() => handleExportToExcel(calc.savedCalculations)}
            onSaveWholeOffer={handleSaveWholeOffer}
            currencies={CURRENCIES} vatOptions={VAT_OPTIONS} formatPLN={formatPLN} formatPct={formatPct}
          />
        } />
        <Route path="/saved" element={
          <SavedOffersPage
            savedOffers={savedOffers}
            onLoad={handleLoadOfferSet}
            onDelete={handleDeleteOfferSet}
            onExport={(set) => handleExportToExcel(set.items)}
            formatPLN={formatPLN}
          />
        } />
        <Route path="/analityka" element={<AnalyticsPage />} />
        <Route path="/ustawienia" element={
          <SettingsPage
            profiles={profiles} activeProfile={activeProfile} edgeConfig={edgeConfig} onLogout={logout}
          />} />
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
