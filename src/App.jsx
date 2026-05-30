import { useState, useCallback, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { ProfileAuthScreen, ChangePinModal, ProfileManagementModal } from "./components/AuthModals";
import { useCalculator } from "./hooks/useCalculator";
import CalculatorPage from "./pages/CalculatorPage";
import AnalyticsPage from "./pages/AnalyticsPage";

// --- CONSTANTS & HELPERS ---
const CURRENCIES = [
  { code: "PLN", symbol: "zł", flag: "🇵🇱" }, { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "USD", symbol: "$", flag: "🇺🇸" }, { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "CHF", symbol: "Fr", flag: "🇨🇭" }, { code: "CZK", symbol: "Kč", flag: "🇨🇿" },
  { code: "RON", symbol: "lei", flag: "🇷🇴" }, { code: "CNY", symbol: "¥", flag: "🇨🇳" },
];

const VAT_OPTIONS = [5, 8, 23];

const LOCAL_STORAGE_KEYS = {
  PROFILES: 'calcallegro_profiles',
  ACTIVE_PROFILE_ID: 'calcallegro_active_profile_id',
}

function formatPLN(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return val.toFixed(2).replace(".", ",") + " zł";
}

function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return (val * 100).toFixed(2).replace(".", ",") + " %";
}

// --- MAIN APP COMPONENT ---
export default function App() {
  // Global App State
  const [rates, setRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);
  const [savedOffers, setSavedOffers] = useState([]);
  const [eanLoading, setEanLoading] = useState(false);
  
  const { pathname } = useLocation();
  const activeTab = pathname === '/saved' ? 'oferty' : 'kalkulator';

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
    const profilesSaved = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILES);
    const parsed = profilesSaved ? JSON.parse(profilesSaved) : [];
    return parsed[0]?.id || '';
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

  // Calculator Logic Hook
  const calculator = useCalculator({ rates, activeProfile });

  // Destructure for convenience, especially for finding the cheapest offer
  const { prodEan, setProdEan, setProdName, setOfferPrice } = calculator;

  // Re-assigning to a new variable to avoid conflict in `handleFindCheapestOffer`
  const calculatorProdEan = calculator.prodEan;

  const handleFindCheapestOffer = async () => {
    if (!calculatorProdEan.trim()) {
      setToast({ message: 'Wpisz kod EAN, aby wyszukać ofertę', type: 'error', visible: true });
      return;
    }
    setEanLoading(true);
    try {
      const response = await fetch(`/api/scrape?ean=${encodeURIComponent(calculatorProdEan.trim())}`);
      const data = await response.json();
      if (data.success) {
        setProdName(data.title);
        setOfferPrice(data.price.replace(".", ","));
      } else {
        setToast({ message: `Błąd: ${data.error}`, type: 'error', visible: true });
      }
    } catch (error) {
      setToast({ message: 'Błąd połączenia z serwerem proxy.', type: 'error', visible: true });
    } finally {
      setEanLoading(false);
    }
  };

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
        if (data.config) setEdgeConfig(data.config);
        setRatesLoading(false);
      })
      .catch(() => {
        setRatesError("Błąd kursów walut (Tryb Offline)");
        setRates({ PLN: 1, EUR: 4.27, USD: 3.92, GBP: 5.02, CHF: 4.38, CZK: 0.173, RON: 0.86, CNY: 0.541 });
        setRatesLoading(false);
      });
  }, []);

  useEffect(() => { fetchRatesData(); }, [fetchRatesData]);

  const hashPin = async (pin) => {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(pin));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateProfile = async () => {
    const name = profileName.trim();
    const key = accessKey.trim();
    if (!name) {
      setToast({ message: 'Podaj nazwę profilu', type: 'error', visible: true }); return;
    }
    if (!profilePin || profilePin.length < 4) {
      setToast({ message: 'PIN musi mieć co najmniej 4 cyfry', type: 'error', visible: true }); return;
    }
    if (profilePin !== profilePinConfirm) {
      setToast({ message: 'PINy nie są zgodne', type: 'error', visible: true }); return;
    }
    // TODO: Key validation should be done on the server side.
    const hash = await hashPin(profilePin);
    const newProfile = { id: Date.now().toString(), name, pinHash: hash, accessKey: key, createdAt: new Date().toISOString() };
    const nextProfiles = [newProfile, ...profiles];
    saveProfiles(nextProfiles);
    setActiveProfileId(newProfile.id);
    setSelectedProfileId(newProfile.id);
    setIsUnlocked(true);
    setProfileAuthMode('login');
    setProfileName('');
    setProfilePin('');
    setProfilePinConfirm('');
    setAccessKey('');
    setToast({ message: `Profil ${name} został utworzony`, type: 'success', visible: true });
  };

  const handleLoginProfile = async () => {
    const profile = profiles.find(p => p.id === selectedProfileId);
    if (!profile) {
      setToast({ message: 'Wybierz profil do zalogowania', type: 'error', visible: true }); return;
    }
    if (!loginPin || loginPin.length < 4) {
      setToast({ message: 'Podaj prawidłowy PIN do profilu', type: 'error', visible: true }); return;
    }
    const hash = await hashPin(loginPin);
    if (hash === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setLoginPin('');
      setToast({ message: `Zalogowano jako ${profile.name}`, type: 'success', visible: true });
    } else {
      alert('Nieprawidłowy PIN');
    }
  };

  const handleSwitchProfile = async (profileId, pin) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      setToast({ message: 'Nie znaleziono wybranego profilu', type: 'error', visible: true }); return;
    }
    if (!pin || pin.length < 4) {
      setToast({ message: 'Podaj PIN do profilu, na który chcesz się przełączyć', type: 'error', visible: true }); return;
    }
    const hash = await hashPin(pin);
    if (hash === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setShowProfileModal(false);
      setProfileSwitchPin('');
      setToast({ message: `Przełączono na profil ${profile.name}`, type: 'success', visible: true });
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

  const handleApplyChangePin = async () => {
    if (!changeCurrentPin || !changeNewPin) {
      setToast({ message: 'Wypełnij wszystkie pola PIN', type: 'error', visible: true }); return;
    }
    if (changeNewPin.length < 4) {
      setToast({ message: 'Nowy PIN musi mieć co najmniej 4 cyfry', type: 'error', visible: true }); return;
    }
    if (changeNewPin !== changeConfirmPin) {
      setToast({ message: 'Nowe PINy nie są zgodne', type: 'error', visible: true }); return;
    }
    if (!activeProfile) {
      setToast({ message: 'Brak aktywnego profilu do zmiany PINu', type: 'error', visible: true }); return;
    }

    // 1. Sprawdzamy czy obecny PIN jest poprawny
    const currentHash = await hashPin(changeCurrentPin);
    if (currentHash !== activeProfile.pinHash) { setToast({ message: 'Błędny bieżący PIN', type: 'error', visible: true }); return; }

    // 2. Generujemy nowy hash czekając na wynik (await!)
    const newHash = await hashPin(changeNewPin);

    // 3. Zapisujemy zaktualizowaną listę profilów
    const nextProfiles = profiles.map(p => p.id === activeProfile.id ? { ...p, pinHash: newHash } : p);
    saveProfiles(nextProfiles);

    setShowChangePinModal(false);
    setChangeCurrentPin('');
    setChangeNewPin('');
    setChangeConfirmPin('');

    setToast({ message: 'PIN został pomyślnie zmieniony', type: 'success', visible: true });
  };

  const fetchSavedOffers = async () => {
    try {
      const res = await fetch('/api/calculations');
      const json = await res.json();
      if (json.success) {
        setSavedOffers(json.data);
      }
    } catch (err) {
      console.error('Błąd pobierania zapisanych ofert z chmury:', err);
    }
  };

  const handleSaveWholeOfferToCloud = async (itemsList) => {
    if (!itemsList || itemsList.length === 0) {
      setToast({ message: 'Tabela kalkulacji jest pusta. Dodaj produkty.', type: 'error', visible: true }); return;
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
        fetchSavedOffers();
      } else {
        setToast({ message: `Błąd zapisu: ${json.error}`, type: 'error', visible: true });
      }
    } catch (err) {
      console.error('Błąd zapisu całej oferty:', err);
      setToast({ message: 'Błąd połączenia z serwerem. Spróbuj ponownie.', type: 'error', visible: true });
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm('Czy na pewno chcesz trwale usunąć tę ofertę z chmury?')) return;
    try {
      const res = await fetch(`/api/calculations?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSavedOffers(prev => prev.filter(offer => offer.id !== id));
      }
    } catch (err) {
      console.error('Błąd usuwania oferty:', err);
      setToast({ message: 'Nie udało się usunąć oferty.', type: 'error', visible: true });
    }
  };

  const handleExportOfferToExcel = (offer) => {
    if (!window.XLSX) {
      setToast({ message: 'Biblioteka XLSX jest niedostępna. Odśwież stronę.', type: 'error', visible: true });
      return;
    }
    const XLSX = window.XLSX;
    const headers = ['Lp.', 'Nazwa produktu', 'Ilość', 'EAN / SKU', 'Dostawca', 'Cena oferty (Brutto PLN)', 'Stawka VAT (%)', 'Prowizja obniżona', 'Koszt zakupu (Waluta)', 'Waluta zakupu', 'Kurs waluty', 'Koszt zakupu (PLN)', 'Prowizja Allegro (PLN)', 'Koszt wysyłki (PLN)', 'Wpływ operacyjny (Netto PLN)', 'Zysk czysty (PLN)', 'Marża'];
    
    const dataForExcel = offer.items.map((item, index) => ({
      'Lp.': index + 1,
      'Nazwa produktu': item.name,
      'Ilość': !isNaN(item.quantity) ? item.quantity : null,
      'EAN / SKU': item.ean,
      'Dostawca': item.supplier,
      'Cena oferty (Brutto PLN)': typeof item.offerPrice === 'number' ? item.offerPrice : Number(item.offerPrice) || 0,
      'Stawka VAT (%)': item.vat,
      'Prowizja obniżona': item.allegroDiscounted ? 'TAK' : 'NIE',
      'Koszt zakupu (Waluta)': typeof item.purchaseCost === 'number' ? item.purchaseCost : Number(item.purchaseCost) || 0,
      'Waluta zakupu': item.currency,
      'Kurs waluty': item.exchangeRate ? Math.round(item.exchangeRate * 10000) / 10000 : 1,
      'Koszt zakupu (PLN)': item.costPLN || 0,
      'Prowizja Allegro (PLN)': item.allegroFee || 0,
      'Koszt wysyłki (PLN)': item.shipping || 0,
      'Wpływ operacyjny (Netto PLN)': item.income || 0,
      'Zysk czysty (PLN)': typeof item.profit === 'number' ? item.profit : (item.profit ? Number(item.profit) : null),
      'Marża': typeof item.margin === 'number' ? item.margin : (item.margin ? Number(item.margin) : null)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel, { header: headers });
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 36 }, { wch: 8 }, { wch: 14 }, { wch: 18 },
      { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 10 }
    ];
    worksheet['!freeze'] = { ySplit: 1 };
    worksheet['!autofilter'] = { ref: worksheet['!ref'] };
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const colIndex = (name) => headers.indexOf(name);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const setFmt = (colName, fmt) => {
        const C = colIndex(colName);
        if (C < 0) return;
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[addr];
        if (cell && typeof cell.v === 'number') cell.z = fmt;
      };
      setFmt('Cena oferty (Brutto PLN)', '#,##0.00');
      setFmt('Koszt zakupu (PLN)', '#,##0.00');
      setFmt('Prowizja Allegro (PLN)', '#,##0.00');
      setFmt('Koszt wysyłki (PLN)', '#,##0.00');
      setFmt('Wpływ operacyjny (Netto PLN)', '#,##0.00');
      setFmt('Zysk czysty (PLN)', '#,##0.00');
      setFmt('Kurs waluty', '#,##0.0000');
      setFmt('Marża', '0.00%');
      setFmt('Ilość', '0');
      setFmt('Stawka VAT (%)', '0');
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Oferta: ' + offer.offerName.slice(0, 20));
    XLSX.writeFile(workbook, `Oferta_${offer.offerName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCopyEAN = (ean) => {
    if (ean === '—') return;
    navigator.clipboard.writeText(ean).then(() => {
      setToast({ message: `EAN ${ean} skopiowany do schowka!`, type: 'success', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000);
    });
  };

  const handleExportToExcel = () => {
    if (calculator.savedCalculations.length === 0 || !window.XLSX) return;
    const XLSX = window.XLSX;
    const headers = [
      "Lp.", "Nazwa produktu", "Ilość", "EAN / SKU", "Dostawca",
      "Cena oferty (Brutto PLN)", "Stawka VAT (%)", "Prowizja obniżona",
      "Koszt zakupu (Waluta)", "Waluta zakupu", "Kurs waluty",
      "Koszt zakupu (PLN)", "Prowizja Allegro (PLN)", "Koszt wysyłki (PLN)",
      "Wpływ operacyjny (Netto PLN)", "Zysk czysty (PLN)", "Marża"
    ];
    const dataForExcel = calculator.savedCalculations.map((item, index) => ({
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
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 36 }, { wch: 8 }, { wch: 14 }, { wch: 18 },
      { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 10 }
    ];
    worksheet['!freeze'] = { ySplit: 1 };
    worksheet['!autofilter'] = { ref: worksheet['!ref'] };
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const colIndex = (name) => headers.indexOf(name);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const setFmt = (colName, fmt) => {
        const C = colIndex(colName);
        if (C < 0) return;
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[addr];
        if (cell && typeof cell.v === 'number') cell.z = fmt;
      };
      setFmt('Cena oferty (Brutto PLN)', '#,##0.00');
      setFmt('Koszt zakupu (PLN)', '#,##0.00');
      setFmt('Prowizja Allegro (PLN)', '#,##0.00');
      setFmt('Koszt wysyłki (PLN)', '#,##0.00');
      setFmt('Wpływ operacyjny (Netto PLN)', '#,##0.00');
      setFmt('Zysk czysty (PLN)', '#,##0.00');
      setFmt('Kurs waluty', '#,##0.0000');
      setFmt('Marża', '0.00%');
      setFmt('Ilość', '0');
      setFmt('Stawka VAT (%)', '0');
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kalkulacje Allegro');
    XLSX.writeFile(workbook, `Kalkulacje_Allegro_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (!isUnlocked) {
    return <ProfileAuthScreen />;
  }

  const Toast = () => {
    if (!toast.visible) return null;
    const bg = toast.type === 'success' ? '#1a3a22' : toast.type === 'error' ? '#3a1a1a' : '#161622';
    const color = toast.type === 'success' ? '#4ecb71' : toast.type === 'error' ? '#e05555' : '#e8e4d9';
    return (
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: bg, color, padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #22222e', zIndex: 2000 }}>
        {toast.message}
      </div>
    );
  };

  return (
    <Router>
      <div style={{ minHeight: "100vh", width: "100%", background: "#0d0d11", fontFamily: "'DM Mono', monospace", color: "#e8e4d9", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <nav style={{ display: "flex", gap: "2rem", background: "#121218", border: "1px solid #1e1e26", padding: "0.75rem 2rem", borderRadius: "10px", width: "100%", maxWidth: "1140px", marginBottom: "1.5rem", alignItems: "center" }}>
          <strong style={{ color: "#f5a623", fontFamily: "'Syne', sans-serif" }}>Allegro Calc v2</strong>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link
              to="/"
              style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem", fontWeight: pathname === '/' ? 700 : 400 }}
            >
              🖩 Kalkulator
            </Link>
            <Link
              to="/saved"
              onClick={() => fetchSavedOffers()}
              style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem", fontWeight: pathname === '/saved' ? 700 : 400 }}
            >
              📂 Zapisane oferty
            </Link>
            <Link to="/analityka" style={{ color: "#e8e4d9", textDecoration: "none", fontSize: "0.85rem" }}>📊 Analityka</Link>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setIsUnlocked(false)} title="Zablokuj" style={{ background: '#22222e', border: 'none', color: '#f5a623', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>🔒</button>
            <button onClick={handleOpenChangePin} title="Zmień PIN" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>⚙️</button>
            <button onClick={() => setShowProfileModal(true)} title="Profile" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>👤</button>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
              <CalculatorPage
                {...calculator}
                ratesLoading={ratesLoading}
                eanLoading={eanLoading}
                edgeConfig={edgeConfig}
                isPositive={calculator.result && calculator.result.profit > 0}
                isNegative={calculator.result && calculator.result.profit < 0}
                handleFindCheapestOffer={handleFindCheapestOffer}
                handleExportToExcel={handleExportToExcel}
                onSaveWholeOffer={() => handleSaveWholeOfferToCloud(calculator.savedCalculations)}
                currencies={CURRENCIES}
                vatOptions={VAT_OPTIONS}
                formatPLN={formatPLN}
                formatPct={formatPct}
              />
          } />
          <Route path="/saved" element={
              <div style={{ width: '100%', maxWidth: '1140px', padding: '1.25rem', background: '#121218', borderRadius: '12px', border: '1px solid #1e1e26', color: '#e8e4d9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#f5a623' }}>📂 Zapisane oferty</h2>
                    <p style={{ margin: '0.35rem 0 0', color: '#8a8a9e' }}>Przeglądaj pełne historyczne zestawienia i pobieraj je po nazwie oferty.</p>
                  </div>
                  <Link
                    to="/"
                    style={{ background: '#22222e', border: '1px solid #2d2d3d', borderRadius: '8px', padding: '0.75rem 1rem', color: '#e8e4d9', cursor: 'pointer', textDecoration: 'none' }}
                  >
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
                            <h3 style={{ margin: 0, color: '#fff' }}>{offer.offerName}</h3>
                            <div style={{ color: '#8a8a9e', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                              Utworzono: {new Date(offer.createdAt).toLocaleString('pl-PL')} | Autor: <strong style={{ color: '#f5a623' }}>{offer.createdBy}</strong>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleExportOfferToExcel(offer)}
                              style={{ background: '#f5a623', color: '#0d0d11', border: 'none', borderRadius: '8px', padding: '0.7rem 1rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                              📥 Eksportuj
                            </button>
                            <button
                              onClick={() => handleDeleteOffer(offer.id)}
                              style={{ background: '#e05555', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.7rem 1rem', cursor: 'pointer' }}
                            >
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
                                  <td>{item.name}</td>
                                  <td
                                    onClick={() => handleCopyEAN(item.ean)}
                                    style={{ cursor: item.ean !== '—' ? 'pointer' : 'default', color: item.ean !== '—' ? '#f5a623' : '#6a6a82', fontWeight: item.ean !== '—' ? 600 : 400 }}
                                  >
                                    {item.ean}
                                  </td>
                                  <td>{item.supplier}</td>
                                  <td>{item.quantity}</td>
                                  <td>{formatPLN(item.offerPrice)}</td>
                                  <td style={{ color: item.profit > 0 ? '#4ecb71' : '#e05555' }}>{formatPLN(item.profit)}</td>
                                  <td style={{ color: item.margin > 0 ? '#4ecb71' : '#e05555' }}>{formatPct(item.margin)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>} 
          />
          <Route path="/analityka" element={<AnalyticsPage />} />
        </Routes>

        {showChangePinModal && (
          <ChangePinModal
            changeCurrentPin={changeCurrentPin}
            setChangeCurrentPin={setChangeCurrentPin}
            changeNewPin={changeNewPin}
            setChangeNewPin={setChangeNewPin}
            changeConfirmPin={changeConfirmPin}
            setChangeConfirmPin={setChangeConfirmPin}
            handleApplyChangePin={handleApplyChangePin}
            handleCloseChangePin={handleCloseChangePin}
          />
        )}

        {showProfileModal && (
          <ProfileManagementModal
            selectedProfileId={selectedProfileId}
            setSelectedProfileId={setSelectedProfileId}
            profiles={profiles}
            profileSwitchPin={profileSwitchPin}
            setProfileSwitchPin={setProfileSwitchPin}
            handleSwitchProfile={handleSwitchProfile}
            setShowProfileModal={setShowProfileModal}
          />
        )}

        <Toast />

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
          .workspace-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; width: 100%; max-width: 1140px; }
          .calc-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left; }
          .calc-table th { background: #121218; color: #6a6a82; padding: 0.75rem 0.6rem; font-weight: 500; border-bottom: 1px solid #22222e; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.05em; }
          .calc-table td { padding: 0.75rem 0.6rem; border-bottom: 1px solid #161622; color: #e8e4d9; }
          .calc-table tr:hover { background: #14141c; }
          @media (max-width: 850px) { .workspace-grid { grid-template-columns: 1fr; gap: 1rem; } }
        `}</style>
      </div>
    </Router>
  );
}
