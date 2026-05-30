import { useState, useCallback, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { ProfileAuthScreen, ChangePinModal, ProfileManagementModal } from "./components/AuthModals";
import CalculatorPage from "./pages/CalculatorPage";
import AnalyticsPage from "./pages/AnalyticsPage";

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

const LOCAL_STORAGE_KEYS = {
  PROFILES: 'calcallegro_profiles',
  ACTIVE_PROFILE_ID: 'calcallegro_active_profile_id',
}

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

// Podkomponent wewnętrzny obsługujący nasłuchiwanie linków i renderowanie stron
function AppContent({
  prodName, setProdName, prodEan, setProdEan, offerPrice, setOfferPrice,
  purchaseCost, setPurchaseCost, quantity, setQuantity, allegroDiscounted, setAllegroDiscounted,
  supplierName, setSupplierName, purchaseCurrency, setPurchaseCurrency, allegro, setAllegro,
  vat, setVat, includeDelivery, setIncludeDelivery, ratesLoading, currentRate, eanLoading,
  edgeConfig, result, isPositive, isNegative, editingId, savedCalculations, setSavedCalculations,
  handleFindCheapestOffer, handleEditItem, handleCancelEdit, handleAddToList, handleRemoveFromList,
  handleExportToExcel, hashPin, profiles, saveProfiles, activeProfile, setIsUnlocked,
  showChangePinModal, setShowChangePinModal, handleOpenChangePin, handleCloseChangePin,
  changeCurrentPin, setChangeCurrentPin, changeNewPin, setChangeNewPin, changeConfirmPin, setChangeConfirmPin,
  showProfileModal, setShowProfileModal, selectedProfileId, setSelectedProfileId, profileSwitchPin, setProfileSwitchPin, handleSwitchProfile,
  savedOffers, setSavedOffers, fetchSavedOffers, handleSaveWholeOfferToCloud, handleDeleteOffer, handleExportOfferToExcel, handleCopyEAN
}) {
  const location = useLocation();
  const activeTab = location.pathname === '/saved' ? 'oferty' : 'kalkulator';

  // Automatyczne odświeżenie danych w chmurze przy zmianie podstrony na /saved
  useEffect(() => {
    if (location.pathname === '/saved') {
      fetchSavedOffers();
    }
  }, [location.pathname]);

  const handleApplyChangePin = async () => {
    if (!changeCurrentPin || !changeNewPin) return alert('Wypełnij pola PIN');
    if (changeNewPin.length < 4) return alert('Nowy PIN musi mieć min. 4 cyfry');
    if (changeNewPin !== changeConfirmPin) return alert('Nowe PINy nie są zgodne');
    if (!activeProfile) return alert('Brak aktywnego profilu');

    const currentHash = await hashPin(changeCurrentPin);
    if (currentHash !== activeProfile.pinHash) return alert('Błędny bieżący PIN');

    const newHash = await hashPin(changeNewPin);

    const nextProfiles = profiles.map(p => p.id === activeProfile.id ? { ...p, pinHash: newHash } : p);
    saveProfiles(nextProfiles);

    setShowChangePinModal(false);
    setChangeCurrentPin(''); setChangeNewPin(''); setChangeConfirmPin('');
    alert('PIN został pomyślnie zmieniony.');
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#0d0d11", fontFamily: "'DM Mono', monospace", color: "#e8e4d9", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      {/* Menu górne */}
      <nav style={{ display: "flex", gap: "2rem", background: "#121218", border: "1px solid #1e1e26", padding: "0.75rem 2rem", borderRadius: "10px", width: "100%", maxWidth: "1140px", marginBottom: "1.5rem", alignItems: "center" }}>
        <strong style={{ color: "#f5a623", fontFamily: "'Syne', sans-serif" }}>Allegro Calc v2</strong>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link to="/" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem", fontWeight: activeTab === 'kalkulator' ? 700 : 400 }}>
            🖩 Kalkulator
          </Link>
          <Link to="/saved" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem", fontWeight: activeTab === 'oferty' ? 700 : 400 }}>
            📂 Zapisane oferty
          </Link>
          <Link to="/analityka" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem" }}>
            📊 Analityka
          </Link>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setIsUnlocked(false)} title="Zablokuj" style={{ background: '#22222e', border: 'none', color: '#f5a623', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>🔒</button>
          <button onClick={handleOpenChangePin} title="Zmień PIN" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>⚙️</button>
          <button onClick={() => setShowProfileModal(true)} title="Profile" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>👤</button>
        </div>
      </nav>

      {/* Górny podpis autora */}
      {activeProfile && (
        <div style={{ width: "100%", maxWidth: "1140px", textAlign: "right", paddingRight: "0.5rem", marginBottom: "0.5rem", fontSize: "0.8rem", color: "#8a8a9e" }}>
          Zalogowany profil: <strong style={{ color: "#f5a623" }}>{activeProfile.name}</strong>
        </div>
      )}

      {/* Swapping widoków przez React Router */}
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
            onSaveWholeOffer={() => handleSaveWholeOfferToCloud(savedCalculations)}
            currencies={CURRENCIES} vatOptions={VAT_OPTIONS} formatPLN={formatPLN} formatPct={formatPct}
          />
        } />

        <Route path="/saved" element={
          <div style={{ width: '100%', maxWidth: '1140px', padding: '1.25rem', background: '#121218', borderRadius: '12px', border: '1px solid #1e1e26', color: '#e8e4d9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#f5a623' }}>📂 Zapisane oferty</h2>
                <p style={{ margin: '0.35rem 0 0', color: '#8a8a9e' }}>Przeglądaj pełne historyczne zestawienia i pobieraj je po nazwie oferty.</p>
              </div>
              <Link to="/" style={{ background: '#22222e', border: '1px solid #2d2d3d', borderRadius: '8px', padding: '0.75rem 1rem', color: '#e8e4d9', cursor: 'pointer', textDecoration: 'none' }}>
                ← Wróć do kalkulatora
              </Link>
            </div>

            {savedOffers.length === 0 ? (
              <div style={{ color: '#6a6a82', padding: '2rem', textAlign: 'center', border: '1px dashed #2d2d3d', borderRadius: '12px' }}>
                Brak zapisanych ofert w chmurze. Zapisz swoją pierwszą ofertę z poziomu kalkulatora.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {savedOffers.map((offer) => (
                  <div key={offer.id} style={{ background: '#161622', border: '1px solid #2d2d3d', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>📋 {offer.offerName}</h3>
                        <div style={{ color: '#8a8a9e', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                          Utworzono: {new Date(offer.createdAt).toLocaleString('pl-PL')} | Autor: <strong style={{ color: '#f5a623' }}>{offer.createdBy}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleExportOfferToExcel(offer)} style={{ background: '#f5a623', color: '#0d0d11', border: 'none', borderRadius: '8px', padding: '0.7rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                          📥 Eksportuj
                        </button>
                        <button onClick={() => handleDeleteOffer(offer.id)} style={{ background: '#e05555', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.7rem 1rem', cursor: 'pointer' }}>
                          🗑️ Usuń
                        </button>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                      <table className="calc-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Produkt</th><th>EAN / SKU</th><th>Dostawca</th><th>Ilość</th><th>Cena</th><th>Zysk</th><th>Marża</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offer.items.map((item, index) => (
                            <tr key={index}>
                              <td style={{ fontWeight: 500 }}>{item.name}</td>
                              <td onClick={() => handleCopyEAN(item.ean)} style={{ cursor: item.ean !== '—' ? 'pointer' : 'default', color: item.ean !== '—' ? '#f5a623' : '#6a6a82', fontWeight: item.ean !== '—' ? 600 : 400 }}>
                                {item.ean}
                              </td>
                              <td>{item.supplier}</td>
                              <td>{item.quantity} szt.</td>
                              <td style={{ fontWeight: 500 }}>{formatPLN(item.offerPrice)}</td>
                              <td style={{ color: item.profit > 0 ? '#4ecb71' : '#e05555', fontWeight: 500 }}>{formatPLN(item.profit)}</td>
                              <td style={{ color: item.margin > 0 ? '#4ecb71' : '#e05555', fontWeight: 500 }}>{formatPct(item.margin)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        } />
        <Route path="/analityka" element={<AnalyticsPage />} />
      </Routes>

      {/* Modale pomocnicze */}
      {showChangePinModal && <ChangePinModal changeCurrentPin={changeCurrentPin} setChangeCurrentPin={setChangeCurrentPin} changeNewPin={changeNewPin} setChangeNewPin={setChangeNewPin} changeConfirmPin={changeConfirmPin} setChangeConfirmPin={setChangeConfirmPin} handleApplyChangePin={handleApplyChangePin} handleCloseChangePin={handleCloseChangePin} />}
      {showProfileModal && <ProfileManagementModal selectedProfileId={selectedProfileId} setSelectedProfileId={setSelectedProfileId} profiles={profiles} profileSwitchPin={profileSwitchPin} setProfileSwitchPin={setProfileSwitchPin} handleSwitchProfile={handleSwitchProfile} setShowProfileModal={setShowProfileModal} />}
    </div>
  );
}

export default function App() {
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
  const [rates, setRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [savedOffers, setSavedOffers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [eanLoading, setEanLoading] = useState(false);

  const ACCESS_KEYS = [
    'ac_7f9K2mX4pQzN9bW1vR8tY3cX6eJ5dL0a', 'ac_4bE9nV1wX7zM3qQ8rT2pY6cX5eL1kS0j',
    'ac_9mK4pL2zX7wN1vR8tY3cX6eJ5dB0aS9f', 'ac_2zX7wN1vR8tY3cX6eJ5dL0aS9fM4pK2m',
    'ac_8tY3cX6eJ5dL0aS9fM4pK2mX7wN1vR2p', 'ac_5dL0aS9fM4pK2mX7wN1vR8tY3cX6eJ1k',
    'ac_1vR8tY3cX6eJ5dL0aS9fM4pK2mX7wN3q', 'ac_6eJ5dL0aS9fM4pK2mX7wN1vR8tY3cX7z',
    'ac_3cX6eJ5dL0aS9fM4pK2mX7wN1vR8tY9b', 'ac_M4pK2mX7wN1vR8tY3cX6eJ5dL0aS9f1v',
    'ac_X7wN1vR8tY3cX6eJ5dL0aS9fM4pK2m4b', 'ac_aS9fM4pK2mX7wN1vR8tY3cX6eJ5dL0a9m',
    'ac_7zM3qQ8rT2pY6cX5eL1kS0j4bE9nV1w', 'ac_2pY6cX5eL1kS0j4bE9nV1wX7zM3qQ8r',
    'ac_eL1kS2p9Y6L0aS9fM4pK2mX7wN1vR8tY3cX6eJ5',
    'ac_V1wX7zM3qQ8rT2pY6cX5eL1kS0j4bE9n',
    'ac_qQ8rT2pY6cX5eL1kS0j4bE9nV1wX7zM3', 'ac_S0j4bE9nV1wX7zM3qQ8rT2pY6cX5eL1k',
    'ac_N9bW1vR8tY3cX6eJ5dL0a7f9K2mX4pQz', 'ac_3cX6eJ5dL0a7f9K2mX4pQzN9bW1vR8tY',
    'ac_dL0a7f9K2mX4pQzN9bW1vR8tY3cX6eJ5', 'ac_X4pQzN9bW1vR8tY3cX6eJ5dL0a7f9K2m',
    'ac_vR8tY3cX6eJ5dL0a7f9K2mX4pQzN9bW1', 'ac_K2mX4pQzN9vR8tY3cX6eJ5dL0a7f9',
    'ac_9bW1vR8tY3cX6eJ5dL0a7f9K2mX4pQz'
  ];

  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILES);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_PROFILE_ID) || '');
  const [profileAuthMode, setProfileAuthMode] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILES);
    return saved && JSON.parse(saved).length ? 'login' : 'signup';
  });
  const [selectedProfileId, setSelectedProfileId] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (saved) return saved;
    return profiles[0]?.id || '';
  });

  const [profileName, setProfileName] = useState("");
  const [profilePin, setProfilePin] = useState("");
  const [profilePinConfirm, setProfilePinConfirm] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [profileSwitchPin, setProfileSwitchPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [changeCurrentPin, setChangeCurrentPin] = useState("");
  const [changeNewPin, setChangeNewPin] = useState("");
  const [changeConfirmPin, setChangeConfirmPin] = useState("");

  const [edgeConfig, setEdgeConfig] = useState({ smartThreshold: 44.99, isScraperActive: true });
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  const activeProfile = profiles.find(profile => profile.id === activeProfileId) || null;

  const saveProfiles = (nextProfiles) => {
    setProfiles(nextProfiles);
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILES, JSON.stringify(nextProfiles));
  };

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_PROFILE_ID, activeProfileId);
    }
  }, [activeProfileId]);

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

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

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => { localStorage.setItem("calcallegro_supplier", supplierName); }, [supplierName]);
  useEffect(() => { localStorage.setItem("calcallegro_currency", purchaseCurrency); }, [purchaseCurrency]);
  useEffect(() => { localStorage.setItem("calcallegro_allegro", allegro); }, [allegro]);
  useEffect(() => { localStorage.setItem("calcallegro_vat", vat.toString()); }, [vat]);

  const fetchRatesData = useCallback(() => {
    setRatesLoading(true);
    fetch("/api/scrape?action=rates")
      .then(r => {
        if (!r.ok) throw new Error('Network response was not ok');
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
        if (data.config) setEdgeConfig(data.config);
        setRatesLoading(false);
      })
      .catch(() => {
        setRates({ PLN: 1, EUR: 4.27, USD: 3.92, GBP: 5.02, CHF: 4.38, CZK: 0.173, RON: 0.86, CNY: 0.541 });
        setRatesLoading(false);
      });
  }, []);

  useEffect(() => { fetchRatesData(); }, [fetchRatesData]);

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

  const hashPin = async (pin) => {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(pin));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateProfile = async () => {
    const name = profileName.trim();
    const key = accessKey.trim();
    if (!name) return alert('Podaj nazwę profilu');
    if (!profilePin || profilePin.length < 4) return alert('PIN musi mieć co najmniej 4 cyfry');
    if (profilePin !== profilePinConfirm) return alert('PINy nie są zgodne');
    if (!ACCESS_KEYS.includes(key)) return alert('Nieprawidłowy klucz dostępu');
    if (profiles.some(p => p.accessKey === key)) return alert('Ten klucz dostępu został już użyty');

    const hash = await hashPin(profilePin);
    const newProfile = { id: Date.now().toString(), name, pinHash: hash, accessKey: key, createdAt: new Date().toISOString() };
    saveProfiles([newProfile, ...profiles]);
    setActiveProfileId(newProfile.id);
    setSelectedProfileId(newProfile.id);
    setIsUnlocked(true);
  };

  const handleLoginProfile = async () => {
    const profile = profiles.find(p => p.id === selectedProfileId);
    if (profile && (await hashPin(loginPin)) === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setLoginPin('');
    } else {
      alert('Nieprawidłowy PIN');
    }
  };

  const handleSwitchProfile = async (profileId, pin) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile && (await hashPin(pin)) === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setShowProfileModal(false);
      setProfileSwitchPin('');
    } else {
      alert('Nieprawidłowy PIN profilu');
    }
  };

  const handleOpenChangePin = () => setShowChangePinModal(true);
  const handleCloseChangePin = () => {
    setShowChangePinModal(false);
    setChangeCurrentPin('');
    setChangeNewPin('');
    setChangeConfirmPin('');
  };

  const fetchSavedOffers = async () => {
    try {
      const res = await fetch('/api/calculations');
      const json = await res.json();
      if (json.success) setSavedOffers(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWholeOfferToCloud = async (itemsList) => {
    if (!itemsList || itemsList.length === 0) {
      return alert('Tabela kalkulacji jest pusta. Dodaj produkty.');
    }
    const offerName = prompt('Wpisz nazwę dla tej kalkulacji/oferty:');
    if (offerName === null) return;

    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerName,
          items: itemsList,
          createdBy: activeProfile?.name || 'Anonim'
        })
      });
      const json = await res.json();
      if (json.success) {
        setToast({ message: 'Cała oferta została zapisana w chmurze!', type: 'success', visible: true });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
        fetchSavedOffers();
      } else {
        alert('Błąd zapisu: ' + json.error);
      }
    } catch (err) {
      alert('Błąd połączenia z serwerem.');
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ofertę z chmury?')) return;
    try {
      const res = await fetch(`/api/calculations?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setSavedOffers(prev => prev.filter(o => o.id !== id));
    } catch {
      alert('Nie udało się usunąć oferty.');
    }
  };

  const handleExportOfferToExcel = (offer) => {
    if (!window.XLSX) return;
    const XLSX = window.XLSX;
    const headers = ['Lp.', 'Nazwa produktu', 'Ilość', 'EAN / SKU', 'Dostawca', 'Cena oferty (Brutto PLN)', 'Stawka VAT (%)', 'Prowizja obniżona', 'Koszt zakupu (Waluta)', 'Waluta zakupu', 'Kurs waluty', 'Koszt zakupu (PLN)', 'Prowizja Allegro (PLN)', 'Koszt wysyłki (PLN)', 'Wpływ operacyjny (Netto PLN)', 'Zysk czysty (PLN)', 'Marża'];
    
    const dataForExcel = offer.items.map((item, index) => ({
      'Lp.': index + 1, 'Nazwa produktu': item.name, 'Ilość': item.quantity, 'EAN / SKU': item.ean, 'Dostawca': item.supplier,
      'Cena oferty (Brutto PLN)': item.offerPrice, 'Stawka VAT (%)': item.vat, 'Prowizja obniżona': item.allegroDiscounted ? 'TAK' : 'NIE',
      'Koszt zakupu (Waluta)': item.purchaseCost, 'Waluta zakupu': item.currency, 'Kurs waluty': item.exchangeRate,
      'Koszt zakupu (PLN)': item.costPLN, 'Prowizja Allegro (PLN)': item.allegroFee, 'Koszt wysyłki (PLN)': item.shipping,
      'Wpływ operacyjny (Netto PLN)': item.income, 'Zysk czysty (PLN)': item.profit, 'Marża': item.margin
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Oferta');
    XLSX.writeFile(workbook, `Oferta_${offer.offerName}.xlsx`);
  };

  const handleCopyEAN = (ean) => {
    if (ean === '—') return;
    navigator.clipboard.writeText(ean).then(() => {
      setToast({ message: `EAN ${ean} skopiowany!`, type: 'success', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000);
    });
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

  if (!isUnlocked) {
    return (
      <ProfileAuthScreen
        profileAuthMode={profileAuthMode} setProfileAuthMode={setProfileAuthMode} profiles={profiles}
        selectedProfileId={selectedProfileId} setSelectedProfileId={setSelectedProfileId} loginPin={loginPin}
        setLoginPin={setLoginPin} handleLoginProfile={handleLoginProfile} profileName={profileName}
        setProfileName={setProfileName} profilePin={profilePin} setProfilePin={setProfilePin}
        profilePinConfirm={profilePinConfirm} setProfilePinConfirm={setProfilePinConfirm} accessKey={accessKey}
        setAccessKey={setAccessKey} handleCreateProfile={handleCreateProfile}
      />
    );
  }

  return (
    <Router>
      <AppContent
        prodName={prodName} setProdName={setProdName} prodEan={prodEan} setProdEan={setProdEan}
        offerPrice={offerPrice} setOfferPrice={setOfferPrice} purchaseCost={purchaseCost} setPurchaseCost={setPurchaseCost}
        quantity={quantity} setQuantity={setQuantity} allegroDiscounted={allegroDiscounted} setAllegroDiscounted={setAllegroDiscounted}
        supplierName={supplierName} setSupplierName={setSupplierName} purchaseCurrency={purchaseCurrency} setPurchaseCurrency={setPurchaseCurrency}
        allegro={allegro} setAllegro={setAllegro} vat={vat} setVat={setVat} includeDelivery={includeDelivery} setIncludeDelivery={setIncludeDelivery}
        ratesLoading={ratesLoading} currentRate={currentRate} eanLoading={eanLoading} edgeConfig={edgeConfig} result={result}
        isPositive={isPositive} isNegative={isNegative} editingId={editingId} savedCalculations={savedCalculations} setSavedCalculations={setSavedCalculations}
        handleFindCheapestOffer={handleFindCheapestOffer} handleEditItem={handleEditItem} handleCancelEdit={handleCancelEdit}
        handleAddToList={handleAddToList} handleRemoveFromList={handleRemoveFromList} handleExportToExcel={handleExportToExcel}
        hashPin={hashPin} profiles={profiles} saveProfiles={saveProfiles} activeProfile={activeProfile} setIsUnlocked={setIsUnlocked}
        showChangePinModal={showChangePinModal} setShowChangePinModal={setShowChangePinModal} handleOpenChangePin={handleOpenChangePin} handleCloseChangePin={handleCloseChangePin}
        changeCurrentPin={changeCurrentPin} setChangeCurrentPin={setChangeCurrentPin} changeNewPin={changeNewPin} setChangeNewPin={setChangeNewPin} changeConfirmPin={changeConfirmPin} setChangeConfirmPin={setChangeConfirmPin}
        showProfileModal={showProfileModal} setShowProfileModal={setShowProfileModal} selectedProfileId={selectedProfileId} setSelectedProfileId={setSelectedProfileId} profileSwitchPin={profileSwitchPin} setProfileSwitchPin={setProfileSwitchPin} handleSwitchProfile={handleSwitchProfile}
        savedOffers={savedOffers} setSavedOffers={setSavedOffers} fetchSavedOffers={fetchSavedOffers} handleSaveWholeOfferToCloud={handleSaveWholeOfferToCloud} handleDeleteOffer={handleDeleteOffer} handleExportOfferToExcel={handleExportOfferToExcel} handleCopyEAN={handleCopyEAN}
      />
    </Router>
  );
}
