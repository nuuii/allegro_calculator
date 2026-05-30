import { lazy, Suspense, useRef, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from './AuthContext.jsx';
import { useApp } from './AppContext.jsx';
import { useCalculator } from './useCalculator.js';
import './App.css';

const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SavedOffersPage = lazy(() => import("./pages/SavedOffersPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfileAuthScreen = lazy(() =>
  import("./components/AuthModals").then(module => ({ default: module.ProfileAuthScreen }))
);
const ChangePinModal = lazy(() =>
  import("./components/AuthModals").then(module => ({ default: module.ChangePinModal }))
);
const ProfileManagementModal = lazy(() =>
  import("./components/AuthModals").then(module => ({ default: module.ProfileManagementModal }))
);

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

const normalizeOfferSet = (offerSet) => ({
  ...offerSet,
  name: offerSet.name || offerSet.offerName || 'Zestawienie bez nazwy',
  offerName: offerSet.offerName || offerSet.name || 'Zestawienie bez nazwy',
  supplierName: offerSet.supplierName || resolveOfferSupplier(offerSet.items || []),
  items: Array.isArray(offerSet.items) ? offerSet.items : [],
});

function resolveOfferSupplier(items) {
  if (!Array.isArray(items)) return '';
  const suppliers = items
    .map(item => item.supplier)
    .filter(supplier => supplier && supplier !== '—')
    .map(supplier => supplier.trim())
    .filter(Boolean);
  const uniqueSuppliers = [...new Set(suppliers.map(supplier => supplier.toLowerCase()))];
  if (uniqueSuppliers.length === 0) return '';
  if (uniqueSuppliers.length === 1) return suppliers[0];
  return 'Wielu dostawców';
}

function LazyFallback({ compact = false }) {
  return (
    <div className={compact ? "lazy-fallback lazy-fallback--compact" : "lazy-fallback"}>
      Ładowanie...
    </div>
  );
}

function AppContent() {
  const { rates, ratesLoading, edgeConfig, fetchRatesData, toast, setToast } = useApp();
  const { profiles, activeProfile, isAdmin, logout } = useAuth();
  const location = useLocation();

  const calc = useCalculator({ rates, activeProfile, setToast });
  const navigate = useNavigate();

  const [savedOffers, setSavedOffers] = useState(() => {
    const saved = localStorage.getItem('calcallegro_saved_offers');
    return saved ? JSON.parse(saved).map(normalizeOfferSet) : [];
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showSaveOfferModal, setShowSaveOfferModal] = useState(false);
  const [offerPendingLoad, setOfferPendingLoad] = useState(null);
  const [offerPendingDeleteId, setOfferPendingDeleteId] = useState(null);
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const [newlySavedOfferId, setNewlySavedOfferId] = useState(null);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [eanLoading, setEanLoading] = useState(false);
  const saveOfferInFlightRef = useRef(false);

  const activeTab = location.pathname === '/saved' ? 'oferty' : location.pathname === '/ustawienia' ? 'ustawienia' : 'kalkulator';

  useEffect(() => {
    // Pobierz zapisane oferty z API (jeśli dostępne)
    const fetchSaved = async () => {
      try {
        const res = await fetch('/api/calculations');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setSavedOffers(json.data.map(normalizeOfferSet));
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
      setToast({ message: "Wpisz kod EAN przed sprawdzeniem Allegro.", type: 'error', visible: true });
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
        setToast({ message: `Błąd scrapera: ${data.error}`, type: 'error', visible: true });
      }
    } catch {
      setToast({ message: "Błąd połączenia ze scraperem.", type: 'error', visible: true });
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

  const openSaveWholeOfferModal = () => {
    if (calc.savedCalculations.length === 0) {
      setToast({ message: "Lista kalkulacji jest pusta. Dodaj przynajmniej jeden produkt.", type: 'error', visible: true });
      return;
    }
    setShowSaveOfferModal(true);
  };

  const resetOfferDraft = () => {
    calc.handleResetSavedCalculations();
    setEditingOfferId(null);
    localStorage.removeItem('calcallegro_saved_calculations');
  };

  const handleSaveWholeOffer = async (offerName) => {
    if (isSavingOffer || saveOfferInFlightRef.current) return;
    if (calc.savedCalculations.length === 0) {
      setToast({ message: "Lista kalkulacji jest pusta. Dodaj przynajmniej jeden produkt.", type: 'error', visible: true });
      return;
    }
    if (offerName && offerName.trim()) {
      saveOfferInFlightRef.current = true;
      const newOfferSet = {
        id: editingOfferId || Date.now(),
        name: offerName.trim(),
        createdAt: new Date().toISOString(),
        createdBy: activeProfile?.name || 'Anonim',
        supplierName: resolveOfferSupplier(calc.savedCalculations),
        items: calc.savedCalculations
      };
      
      try {
        setIsSavingOffer(true);
        // Wysyłamy do chmury (przekazujemy oczekiwane pola)
        const payload = {
          id: newOfferSet.id,
          offerName: newOfferSet.name,
          items: newOfferSet.items,
          createdBy: newOfferSet.createdBy,
          supplierName: newOfferSet.supplierName,
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
        if (resJson.success === false) {
          throw new Error(resJson.error || 'Błąd podczas zapisywania do chmury');
        }
        const saved = normalizeOfferSet(resJson.data || newOfferSet);

        // Natychmiast czyścimy lokalny bufor po potwierdzonym sukcesie zapisu.
        resetOfferDraft();

        if (editingOfferId) {
          setSavedOffers(prev => prev.map(offer => Number(offer.id) === Number(editingOfferId) ? saved : offer));
          setEditingOfferId(null);
        } else {
          setSavedOffers(prev => [saved, ...prev]);
        }
        setNewlySavedOfferId(saved.id);
        setShowSaveOfferModal(false);

        setToast({ message: `Zestawienie "${saved.name}" zostało pomyślnie zapisane w chmurze!`, type: 'success', visible: true });
        navigate('/saved');
      } catch (error) {
        console.error('Błąd zapisu:', error);
        setToast({ message: `Nie udało się zapisać w chmurze. Lokalna lista nie została wyczyszczona. ${error.message}`, type: 'error', visible: true });
      } finally {
        saveOfferInFlightRef.current = false;
        setIsSavingOffer(false);
      }
    }
  };

  const loadOfferSetIntoCalculator = (offerSet) => {
    if (!offerSet) return false;
    if (calc.handleLoadSavedCalculations) {
      calc.handleLoadSavedCalculations(offerSet.items || []);
    }
    setEditingOfferId(offerSet.id);
    setToast({ message: `Wczytano zestawienie "${offerSet.name}".`, type: 'success', visible: true });
    navigate('/');
    return true;
  };

  const handleLoadOfferSet = (offerSet) => {
    if (!offerSet) return false;
    if (calc.savedCalculations.length > 0) {
      setOfferPendingLoad(offerSet);
      return false;
    }
    return loadOfferSetIntoCalculator(offerSet);
  };

  const requestDeleteOfferSet = (offerSetId) => {
    setOfferPendingDeleteId(offerSetId);
  };

  const handleDeleteOfferSet = async (offerSetId) => {
    try {
      const res = await fetch(`/api/calculations?id=${encodeURIComponent(offerSetId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Błąd przy usuwaniu');
      setSavedOffers(prev => prev.filter(set => Number(set.id) !== Number(offerSetId)));
      if (Number(editingOfferId) === Number(offerSetId)) setEditingOfferId(null);
      setOfferPendingDeleteId(null);
      setToast({ message: "Zestawienie zostało usunięte.", type: 'info', visible: true });
    } catch (err) {
      console.error('Błąd usuwania:', err);
      setToast({ message: `Błąd: ${err.message}`, type: 'error', visible: true });
    }
  };

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/" className="app-brand" aria-label="ProfitDesk">
          <span className="app-brand__mark">AC</span>
          <span>
            <strong>Allegro Calc v2</strong>
            <small>Kalkulator ofert i marż</small>
          </span>
        </Link>

        <nav className="app-nav" aria-label="Główna nawigacja">
          <Link to="/" className={`app-nav__link ${activeTab === 'kalkulator' ? 'is-active' : ''}`}>
            Kalkulator
          </Link>
          <Link to="/saved" className={`app-nav__link ${activeTab === 'oferty' ? 'is-active' : ''}`}>
            Zapisane oferty
          </Link>
          <Link to="/analityka" className={`app-nav__link ${location.pathname === '/analityka' ? 'is-active' : ''}`}>
            Analityka
          </Link>
        </nav>

        <div className="app-actions">
          {activeProfile && (
            <button type="button" className="profile-pill" onClick={() => setShowProfileModal(true)}>
              <span>{activeProfile.name.slice(0, 1).toUpperCase()}</span>
              {activeProfile.name}
              {isAdmin && <strong>Admin</strong>}
            </button>
          )}
          <Link to="/ustawienia" title="Ustawienia" className={`icon-shell-button ${activeTab === 'ustawienia' ? 'is-active' : ''}`}>
            Ustawienia
          </Link>
          <button type="button" onClick={logout} title="Zablokuj" className="icon-shell-button">
            Zablokuj
          </button>
        </div>
      </header>

      <main className="app-main">

      <Suspense fallback={<LazyFallback />}>
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
              onSaveWholeOffer={openSaveWholeOfferModal}
              currencies={CURRENCIES} vatOptions={VAT_OPTIONS} formatPLN={formatPLN} formatPct={formatPct}
            />
          } />
          <Route path="/saved" element={
            <SavedOffersPage
              savedOffers={savedOffers}
              onLoad={handleLoadOfferSet}
              onDelete={requestDeleteOfferSet}
              onExport={(set) => handleExportToExcel(set.items)}
              formatPLN={formatPLN}
              newlySavedOfferId={newlySavedOfferId}
              hasDraftCalculations={calc.savedCalculations.length > 0}
            />
          } />
          <Route path="/analityka" element={<AnalyticsPage />} />
          <Route path="/ustawienia" element={
            <SettingsPage
              profiles={profiles} activeProfile={activeProfile} edgeConfig={edgeConfig} onLogout={logout}
            />} />
        </Routes>
      </Suspense>

      <Suspense fallback={<LazyFallback compact />}>
        {showChangePinModal && <ChangePinModal onClose={() => setShowChangePinModal(false)} />}
        {showProfileModal && <ProfileManagementModal onClose={() => setShowProfileModal(false)} />}
      </Suspense>
      {showSaveOfferModal && (
        <SaveOfferModal
          items={calc.savedCalculations}
          activeProfile={activeProfile}
          onClose={() => setShowSaveOfferModal(false)}
          onSave={handleSaveWholeOffer}
          isSaving={isSavingOffer}
          formatPLN={formatPLN}
          supplierName={resolveOfferSupplier(calc.savedCalculations)}
        />
      )}
      {offerPendingLoad && (
        <ReplaceDraftModal
          offerSet={offerPendingLoad}
          onClose={() => setOfferPendingLoad(null)}
          onConfirm={() => {
            const offerSet = offerPendingLoad;
            setOfferPendingLoad(null);
            loadOfferSetIntoCalculator(offerSet);
          }}
        />
      )}
      {offerPendingDeleteId !== null && (
        <DeleteOfferModal
          offerSet={savedOffers.find(offerSet => offerSet.id === offerPendingDeleteId)}
          onClose={() => setOfferPendingDeleteId(null)}
          onConfirm={() => handleDeleteOfferSet(offerPendingDeleteId)}
        />
      )}
      {toast.visible && (
        <div className={`app-toast app-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
      </main>
    </div>
  );
}

function DeleteOfferModal({ offerSet, onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-offer-title">
      <div className="save-offer-modal save-offer-modal--compact">
        <div className="save-offer-modal__header">
          <div>
            <h3 id="delete-offer-title">Usunąć zestawienie?</h3>
            <p>Oferta "{offerSet?.name || 'bez nazwy'}" zostanie usunięta z chmury. Tej akcji nie da się cofnąć.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>Anuluj</button>
          <button type="button" className="secondary-action secondary-action--danger" onClick={onConfirm}>Usuń zestawienie</button>
        </div>
      </div>
    </div>
  );
}

function ReplaceDraftModal({ offerSet, onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="replace-draft-title">
      <div className="save-offer-modal save-offer-modal--compact">
        <div className="save-offer-modal__header">
          <div>
            <h3 id="replace-draft-title">Zastąpić listę roboczą?</h3>
            <p>W kalkulatorze są niezapisane pozycje. Wczytanie zestawienia "{offerSet.name}" zastąpi obecną lokalną listę.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>Wróć</button>
          <button type="button" className="secondary-action secondary-action--danger" onClick={onConfirm}>Wczytaj mimo to</button>
        </div>
      </div>
    </div>
  );
}

function SaveOfferModal({ items, activeProfile, onClose, onSave, isSaving, formatPLN, supplierName }) {
  const [offerName, setOfferName] = useState(`Zestawienie z ${new Date().toLocaleDateString()}`);
  const totalValue = items.reduce((sum, item) => sum + (item.offerPrice || 0) * (item.quantity || 1), 0);
  const totalProfit = items.reduce((sum, item) => sum + (item.profit || 0) * (item.quantity || 1), 0);

  const handleSubmit = () => {
    if (!offerName.trim() || isSaving) return;
    onSave(offerName.trim());
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="save-offer-title">
      <div className="save-offer-modal">
        <div className="save-offer-modal__header">
          <div>
            <h3 id="save-offer-title">Zapisz całe zestawienie</h3>
            <p>Pakiet produktów trafi do chmury Vercel KV i pojawi się w zapisanych ofertach.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={isSaving}>×</button>
        </div>

        <label className="modal-label" htmlFor="offer-name">Nazwa zestawienia</label>
        <input
          id="offer-name"
          className="modal-input"
          value={offerName}
          onChange={e => setOfferName(e.target.value)}
          autoFocus
        />

        <div className="save-summary-grid">
          <div>
            <span>Pozycji</span>
            <strong>{items.length}</strong>
          </div>
          <div>
            <span>Wartość ofert</span>
            <strong>{formatPLN(totalValue)}</strong>
          </div>
          <div>
            <span>Szacowany zysk</span>
            <strong className={totalProfit >= 0 ? "positive-value" : "negative-value"}>{formatPLN(totalProfit)}</strong>
          </div>
          <div>
            <span>Autor</span>
            <strong>{activeProfile?.name || 'Anonim'}</strong>
          </div>
          <div>
            <span>Dostawca</span>
            <strong>{supplierName || 'Nie podano'}</strong>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose} disabled={isSaving}>Anuluj</button>
          <button type="button" className="save-offer-button" onClick={handleSubmit} disabled={!offerName.trim() || isSaving}>
            {isSaving ? "Zapisywanie..." : "☁️ Zapisz w chmurze"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { isUnlocked } = useAuth();

  if (!isUnlocked) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <ProfileAuthScreen />
      </Suspense>
    );
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}
