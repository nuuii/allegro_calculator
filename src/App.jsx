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
  const [editingId, setEditingId] = useState(null);
  
  // Nowy stan dla ładowania zapytania do Apify
  const [eanLoading, setEanLoading] = useState(false);
  const ACCESS_KEYS = [
    'ac_7f9K2mX4pQzN9bW1vR8tY3cX6eJ5dL0a',
    'ac_4bE9nV1wX7zM3qQ8rT2pY6cX5eL1kS0j',
    'ac_9mK4pL2zX7wN1vR8tY3cX6eJ5dB0aS9f',
    'ac_2zX7wN1vR8tY3cX6eJ5dL0aS9fM4pK2m',
    'ac_8tY3cX6eJ5dL0aS9fM4pK2mX7wN1vR2p',
    'ac_5dL0aS9fM4pK2mX7wN1vR8tY3cX6eJ1k',
    'ac_1vR8tY3cX6eJ5dL0aS9fM4pK2mX7wN3q',
    'ac_6eJ5dL0aS9fM4pK2mX7wN1vR8tY3cX7z',
    'ac_3cX6eJ5dL0aS9fM4pK2mX7wN1vR8tY9b',
    'ac_M4pK2mX7wN1vR8tY3cX6eJ5dL0aS9f1v',
    'ac_X7wN1vR8tY3cX6eJ5dL0aS9fM4pK2m4b',
    'ac_aS9fM4pK2mX7wN1vR8tY3cX6eJ5dL0a9m',
    'ac_7zM3qQ8rT2pY6cX5eL1kS0j4bE9nV1w',
    'ac_2pY6cX5eL1kS0j4bE9nV1wX7zM3qQ8r',
    'ac_eL1kS0j4bE9nV1wX7zM3qQ8rT2pY6cX5',
    'ac_V1wX7zM3qQ8rT2pY6cX5eL1kS0j4bE9n',
    'ac_qQ8rT2pY6cX5eL1kS0j4bE9nV1wX7zM3',
    'ac_S0j4bE9nV1wX7zM3qQ8rT2pY6cX5eL1k',
    'ac_N9bW1vR8tY3cX6eJ5dL0a7f9K2mX4pQz',
    'ac_3cX6eJ5dL0a7f9K2mX4pQzN9bW1vR8tY',
    'ac_dL0a7f9K2mX4pQzN9bW1vR8tY3cX6eJ5',
    'ac_X4pQzN9bW1vR8tY3cX6eJ5dL0a7f9K2m',
    'ac_vR8tY3cX6eJ5dL0a7f9K2mX4pQzN9bW1',
    'ac_K2mX4pQzN9bW1vR8tY3cX6eJ5dL0a7f9',
    'ac_9bW1vR8tY3cX6eJ5dL0a7f9K2mX4pQz'
  ];
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('calcallegro_profiles');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('calcallegro_active_profile_id') || '');
  const [profileAuthMode, setProfileAuthMode] = useState(() => {
    const saved = localStorage.getItem('calcallegro_profiles');
    return saved && JSON.parse(saved).length ? 'login' : 'signup';
  });
  const [selectedProfileId, setSelectedProfileId] = useState(() => {
    const saved = localStorage.getItem('calcallegro_active_profile_id');
    if (saved) return saved;
    const profilesSaved = localStorage.getItem('calcallegro_profiles');
    const parsed = profilesSaved ? JSON.parse(profilesSaved) : [];
    return parsed[0]?.id || '';
  });
  const [profileName, setProfileName] = useState('');
  const [profilePin, setProfilePin] = useState('');
  const [profilePinConfirm, setProfilePinConfirm] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [profileSwitchPin, setProfileSwitchPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [changeCurrentPin, setChangeCurrentPin] = useState('');
  const [changeNewPin, setChangeNewPin] = useState('');
  const [changeConfirmPin, setChangeConfirmPin] = useState('');

  const activeProfile = profiles.find(profile => profile.id === activeProfileId) || null;

  const saveProfiles = (nextProfiles) => {
    setProfiles(nextProfiles);
    localStorage.setItem('calcallegro_profiles', JSON.stringify(nextProfiles));
  };

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem('calcallegro_active_profile_id', activeProfileId);
    }
  }, [activeProfileId]);

  // Edge Config
  const [edgeConfig, setEdgeConfig] = useState({ smartThreshold: 44.99, isScraperActive: true });
  
  // Vercel KV - cloud calculations
  const [cloudCalculations, setCloudCalculations] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [useCloudStorage, setUseCloudStorage] = useState(false);
  const [showCloudPanel, setShowCloudPanel] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

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
      
      // Pobieramy konfigurację z Edge Config
      if (data.config) {
        setEdgeConfig(data.config);
      }
      
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
    const allegroFee = price * allegroRate * (allegroDiscounted ? 0.5 : 1);
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
    setProdName("");
    setProdEan("");
    setOfferPrice("");
    setPurchaseCost("");
    setQuantity("1");
    setAllegroDiscounted(false);
  };

  const handleAddToList = () => {
    if (!offerPrice) return;

    const newItem = {
      id: editingId || Date.now(),
      name: prodName.trim() || "Produkt bez nazwy",
      ean: prodEan.trim() || "—",
      supplier: supplierName.trim() || "—",
      quantity: !isNaN(parseInt(quantity, 10)) ? parseInt(quantity, 10) : 1,
      allegroDiscounted: allegroDiscounted,
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

    if (editingId) {
      setSavedCalculations(prev => prev.map(item => item.id === editingId ? newItem : item));
      if (useCloudStorage) {
        updateCloudCalculation(editingId, newItem);
      }
      setEditingId(null);
    } else {
      setSavedCalculations(prev => [newItem, ...prev]);
      if (useCloudStorage) {
        saveCalculationToCloud(newItem);
      }
    }
    setProdName("");
    setProdEan("");
    setOfferPrice("");
    setPurchaseCost("");
    setQuantity("1");
    setAllegroDiscounted(false);
  };

  const handleRemoveFromList = (id) => {
    setSavedCalculations(prev => prev.filter(item => item.id !== id));
    if (useCloudStorage) {
      deleteCloudCalculation(id);
    }
    if (editingId === id) handleCancelEdit();
  };

  // Profile auth handlers
  const handleCreateProfile = async () => {
    const name = profileName.trim();
    const key = accessKey.trim();
    if (!name) return alert('Podaj nazwę profilu');
    if (!profilePin || profilePin.length < 4) return alert('PIN musi mieć co najmniej 4 cyfry');
    if (profilePin !== profilePinConfirm) return alert('PINy nie są zgodne');
    if (!ACCESS_KEYS.includes(key)) return alert('Nieprawidłowy klucz dostępu');
    if (profiles.some(p => p.accessKey === key)) return alert('Ten klucz dostępu został już użyty');

    const hash = await hashPin(profilePin);
    const newProfile = {
      id: Date.now().toString(),
      name,
      pinHash: hash,
      accessKey: key,
      createdAt: new Date().toISOString(),
    };
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
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  };

  const handleLoginProfile = async () => {
    const profile = profiles.find(p => p.id === selectedProfileId);
    if (!profile) return alert('Wybierz profil');
    if (!loginPin || loginPin.length < 4) return alert('Podaj PIN do profilu');

    const hash = await hashPin(loginPin);
    if (hash === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setLoginPin('');
      setToast({ message: `Zalogowano jako ${profile.name}`, type: 'success', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
    } else {
      alert('Nieprawidłowy PIN');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
  };

  const handleSwitchProfile = async (profileId, pin) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return alert('Wybierz profil');
    if (!pin || pin.length < 4) return alert('Podaj PIN wybranego profilu');
    const hash = await hashPin(pin);
    if (hash === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setShowProfileModal(false);
      setToast({ message: `Przełączono na profil ${profile.name}`, type: 'success', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
    } else {
      alert('Nieprawidłowy PIN profilu');
    }
  };

  // Hashing helper using Web Crypto (SHA-256 -> hex)
  const hashPin = async (pin) => {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.error('Hashing failed', e);
      return null;
    }
  };

  const handleOpenChangePin = () => setShowChangePinModal(true);
  const handleCloseChangePin = () => {
    setShowChangePinModal(false);
    setChangeCurrentPin(''); setChangeNewPin(''); setChangeConfirmPin('');
  };

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
    handleCloseChangePin();
    setToast({ message: 'PIN został zmieniony', type: 'success', visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  };

  // Vercel KV Cloud Storage functions
  const fetchCloudCalculations = async () => {
    setCloudLoading(true);
    try {
      const res = await fetch('/api/calculations');
      const json = await res.json();
      if (json.success) {
        setCloudCalculations(json.data);
      }
    } catch (err) {
      console.error('Błąd pobierania wycen z chmury:', err);
    } finally {
      setCloudLoading(false);
    }
  };

  const saveCalculationToCloud = async (calculation) => {
    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculation })
      });
      const json = await res.json();
      if (json.success) {
        setCloudCalculations(prev => [json.data, ...prev]);
        return json.data;
      }
    } catch (err) {
      console.error('Błąd zapisywania wyceny:', err);
    }
  };

  const updateCloudCalculation = async (id, updates) => {
    try {
      const res = await fetch(`/api/calculations?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculation: updates })
      });
      const json = await res.json();
      if (json.success) {
        setCloudCalculations(prev => prev.map(c => c.id === id ? json.data : c));
        return json.data;
      }
    } catch (err) {
      console.error('Błąd aktualizacji wyceny:', err);
    }
  };

  const deleteCloudCalculation = async (id) => {
    try {
      const res = await fetch(`/api/calculations?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setCloudCalculations(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Błąd usuwania wyceny:', err);
    }
  };

  const handleSaveCurrentToCloud = async () => {
    if (!result) return alert('Brak obliczeń do zapisu');

    const calc = {
      name: prodName.trim() || 'Produkt bez nazwy',
      ean: prodEan.trim() || '—',
      supplier: supplierName.trim() || '—',
      quantity: !isNaN(parseInt(quantity, 10)) ? parseInt(quantity, 10) : 1,
      allegroDiscounted: allegroDiscounted,
      offerPrice: parseFloat(offerPrice.replace(',', '.')) || 0,
      purchaseCost: purchaseCost ? parseFloat(purchaseCost.replace(',', '.')) : 0,
      currency: purchaseCurrency,
      exchangeRate: purchaseCurrency !== 'PLN' ? currentRate : 1,
      costPLN: result.costPLN || 0,
      allegroFee: result.allegroFee || 0,
      shipping: result.shipping || 0,
      income: result.income || 0,
      profit: result.profit || 0,
      margin: result.margin || 0,
      vat: vat
    };

    const saved = await saveCalculationToCloud(calc);
    if (saved) {
      // Add to local savedCalculations list so user sees it in register
      setSavedCalculations(prev => [saved, ...prev]);
      setToast({ message: 'Wycena zapisana w chmurze', type: 'success', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
    } else {
      setToast({ message: 'Błąd zapisu do chmury', type: 'error', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
    }
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

    // Przyjazne szerokości kolumn
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 36 }, { wch: 8 }, { wch: 14 }, { wch: 18 },
      { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 10 }
    ];

    // Zamroź pierwszy wiersz (nagłówki) i dodaj autofilter
    worksheet['!freeze'] = { ySplit: 1 };
    worksheet['!autofilter'] = { ref: worksheet['!ref'] };

    // Ustaw formaty liczb dla odpowiednich kolumn
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

  // Jeśli aplikacja zablokowana — pokaż ekran logowania/profilu
  if (!isUnlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d11', color: '#e8e4d9', padding: '1.5rem' }}>
        <div style={{ width: 520, maxWidth: '96%', background: '#121218', border: '1px solid #1e1e26', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f5a623' }}>{profileAuthMode === 'signup' ? 'Utwórz profil' : 'Wybierz profil'}</h2>
          <p style={{ color: '#6a6a82', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {profiles.length === 0
              ? 'Zacznij od utworzenia profilu. Potrzebny jest ważny klucz dostępu.'
              : profileAuthMode === 'signup'
                ? 'Utwórz nowy profil, podając nazwę, PIN i ważny klucz dostępu.'
                : 'Wybierz profil i wprowadź PIN, aby odblokować aplikację.'}
          </p>

          {profiles.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setProfileAuthMode('login')}
                style={{ flex: 1, background: profileAuthMode === 'login' ? '#f5a623' : '#22222e', border: 'none', color: profileAuthMode === 'login' ? '#0d0d11' : '#8a8a9e', borderRadius: 6, padding: '0.65rem', cursor: 'pointer' }}
              >
                Logowanie
              </button>
              <button
                onClick={() => setProfileAuthMode('signup')}
                style={{ flex: 1, background: profileAuthMode === 'signup' ? '#f5a623' : '#22222e', border: 'none', color: profileAuthMode === 'signup' ? '#0d0d11' : '#8a8a9e', borderRadius: 6, padding: '0.65rem', cursor: 'pointer' }}
              >
                Nowy profil
              </button>
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {profileAuthMode === 'login' && profiles.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {profiles.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      style={{
                        background: selectedProfileId === profile.id ? '#f5a623' : '#1e1e28',
                        color: selectedProfileId === profile.id ? '#0d0d11' : '#e8e4d9',
                        border: '1px solid #2d2d3d',
                        borderRadius: 8,
                        padding: '0.85rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      {profile.name}
                      <div style={{ fontSize: '0.75rem', color: selectedProfileId === profile.id ? '#0d0d11' : '#8a8a9e', marginTop: '0.25rem' }}>
                        PIN-protected
                      </div>
                    </button>
                  ))}
                </div>

                <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={loginPin}
                  onChange={e => setLoginPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="4-cyfrowy PIN"
                  style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                />

                <button
                  onClick={handleLoginProfile}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #4ecb71, #2a9d47)', border: 'none', borderRadius: 6, color: '#0d0d11', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Zaloguj się
                </button>
              </>
            ) : (
              <>
                <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Nazwa profilu</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="np. Kasia, Magda, Biznes"
                  style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={profilePin}
                      onChange={e => setProfilePin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="4-cyfrowy PIN"
                      style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Powtórz PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={profilePinConfirm}
                      onChange={e => setProfilePinConfirm(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Powtórz PIN"
                      style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                    />
                  </div>
                </div>

                <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Klucz dostępu</label>
                <input
                  type="text"
                  value={accessKey}
                  onChange={e => setAccessKey(e.target.value)}
                  placeholder="ac_..."
                  style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                />

                <div style={{ color: '#6a6a82', fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                  Klucz dostępu otrzymasz od administratora. Wpisz go w polu powyżej.
                </div>
                <button
                  onClick={handleCreateProfile}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #4ecb71, #2a9d47)', border: 'none', borderRadius: 6, color: '#0d0d11', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Utwórz profil
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Toast notification UI
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleLock} title="Zablokuj aplikację" style={{ background: '#22222e', border: 'none', color: '#f5a623', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit' }}>🔒</button>
            <button onClick={handleOpenChangePin} title="Zmień PIN" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit' }}>⚙️</button>
            <button onClick={() => setShowProfileModal(true)} title="Zarządzaj profilami" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit' }}>👤</button>
            <button onClick={() => { setShowCloudPanel(!showCloudPanel); if (!showCloudPanel) fetchCloudCalculations(); }} title="Panel wycen w chmurze" style={{ background: '#22222e', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit' }}>☁️</button>
          </div>
        </div>
        <p style={{ color: "#4a4a5e", fontSize: "0.7rem", margin: "0.2rem 0 0 0", letterSpacing: "0.08em" }}>
          SYSTEM OPERACYJNY WYCENY PRODUKTÓW · AUTOSAVE ACTIVE
        </p>
        {activeProfile && (
          <p style={{ color: "#8a8a9e", fontSize: "0.75rem", margin: "0.35rem 0 0 0" }}>
            Zalogowany profil: <strong style={{ color: "#f5a623" }}>{activeProfile.name}</strong>
          </p>
        )}
      </div>

      {showChangePinModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ width: 480, maxWidth: '96%', background: '#121218', border: '1px solid #1e1e26', borderRadius: 12, padding: '1rem' }}>
            <h3 style={{ margin: 0, color: '#f5a623' }}>Zmień PIN</h3>
            <p style={{ color: '#6a6a82', marginTop: '0.35rem' }}>Podaj obecny PIN, a następnie nowy PIN (min. 4 cyfry).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem' }}>
              <input type="password" inputMode="numeric" placeholder="Bieżący PIN" value={changeCurrentPin} onChange={e => setChangeCurrentPin(e.target.value.replace(/[^0-9]/g, ''))} style={{ padding: '0.5rem', borderRadius: 6, background: '#1e1e28', border: '1px solid #2d2d3d', color: '#e8e4d9' }} />
              <input type="password" inputMode="numeric" placeholder="Nowy PIN" value={changeNewPin} onChange={e => setChangeNewPin(e.target.value.replace(/[^0-9]/g, ''))} style={{ padding: '0.5rem', borderRadius: 6, background: '#1e1e28', border: '1px solid #2d2d3d', color: '#e8e4d9' }} />
              <input type="password" inputMode="numeric" placeholder="Powtórz nowy PIN" value={changeConfirmPin} onChange={e => setChangeConfirmPin(e.target.value.replace(/[^0-9]/g, ''))} style={{ padding: '0.5rem', borderRadius: 6, background: '#1e1e28', border: '1px solid #2d2d3d', color: '#e8e4d9' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={handleApplyChangePin} style={{ flex: 1, background: 'linear-gradient(135deg,#4ecb71,#2a9d47)', border: 'none', padding: '0.6rem', borderRadius: 6, color: '#0d0d11', fontWeight: 700 }}>Zmień PIN</button>
              <button onClick={handleCloseChangePin} style={{ background: '#22222e', border: '1px solid #2d2d3d', padding: '0.6rem', borderRadius: 6, color: '#8a8a9e' }}>Anuluj</button>
            </div>
          </div>
        </div>
      )}

      {showCloudPanel && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}>
          <div style={{ width: '90vw', maxWidth: 900, maxHeight: '80vh', background: '#121218', border: '1px solid #1e1e26', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#f5a623' }}>☁️ Wyceny w chmurze (Vercel KV)</h3>
              <button onClick={() => setShowCloudPanel(false)} style={{ background: 'transparent', border: 'none', color: '#8a8a9e', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8a8a9e', cursor: 'pointer' }}>
                <input type="checkbox" checked={useCloudStorage} onChange={e => setUseCloudStorage(e.target.checked)} />
                Synchronizuj lokalne wyceny do chmury przy zapisie
              </label>
            </div>

            {cloudLoading ? (
              <div style={{ textAlign: 'center', color: '#6a6a82' }}>⟳ Ładowanie wycen...</div>
            ) : cloudCalculations.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#4a4a5e' }}>Brak wycen w chmurze. Włącz synchronizację powyżej i zapisz wycenę.</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {cloudCalculations.map(calc => (
                  <div key={calc.id} style={{ background: '#1e1e26', border: '1px solid #2d2d3d', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e8e4d9', fontWeight: 500 }}>{calc.name}</div>
                        <div style={{ color: '#8a8a9e', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          EAN: {calc.ean} | Ilość: {calc.quantity} | Cena: {formatPLN(calc.offerPrice)}
                        </div>
                        <div style={{ color: calc.profit > 0 ? '#4ecb71' : '#e05555', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          Zysk: {formatPLN(calc.profit)} | Marża: {formatPct(calc.margin)}
                        </div>
                        <div style={{ color: '#6a6a82', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                          {calc.createdAt ? new Date(calc.createdAt).toLocaleString('pl-PL') : 'Brak daty'}
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteCloudCalculation(calc.id)} 
                        style={{ background: 'transparent', border: 'none', color: '#e05555', cursor: 'pointer', fontSize: '1.2rem' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1100 }}>
          <div style={{ width: '90vw', maxWidth: 520, background: '#121218', border: '1px solid #1e1e26', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f5a623' }}>Profile</h3>
                <div style={{ color: '#6a6a82', fontSize: '0.8rem' }}>Wybierz profil i wpisz jego PIN, aby przełączyć konto.</div>
              </div>
              <button onClick={() => { setShowProfileModal(false); setProfileSwitchPin(''); }} style={{ background: 'transparent', border: 'none', color: '#8a8a9e', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {profiles.length === 0 ? (
                <div style={{ color: '#4a4a5e' }}>Brak dostępnych profili. Utwórz nowy profil, aby kontynuować.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Profil</label>
                    <select
                      value={selectedProfileId}
                      onChange={e => setSelectedProfileId(e.target.value)}
                      style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                    >
                      {profiles.map(profile => (
                        <option key={profile.id} value={profile.id}>{profile.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>PIN profilu</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={profileSwitchPin}
                      onChange={e => setProfileSwitchPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="4-cyfrowy PIN"
                      style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                    />
                  </div>
                  <button
                    onClick={() => handleSwitchProfile(selectedProfileId, profileSwitchPin)}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #4ecb71, #2a9d47)', border: 'none', borderRadius: 6, color: '#0d0d11', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Przełącz profil
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
              placeholder="Nazwa dostawcy lub hurtowni" 
            />
          </div>

          <div style={{ height: "1px", background: "#1e1e26" }} />

          {/* Sekcja Identyfikacji Towaru */}
          <div>
            <Field label="Kod EAN" value={prodEan} onChange={setProdEan} placeholder="np. 590123..." />

            {/* Przycisk wywołujący automatyczne szukanie przez Apify — wyświetlany tylko gdy scraper aktywny */}
            {edgeConfig.isScraperActive && (
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
                <span><span className="spin" style={{ marginRight: "0.4rem" }}>⟳</span> Trwa scrapowanie cen przez Apify (szacowany czas: 15-40s)...</span>
              ) : (
                "🔍 Sprawdź Allegro po EAN"
              )}
            </button>
            )}
            {!edgeConfig.isScraperActive && (
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
                  placeholder="1"
                  style={{ width: "100%", background: "#1e1e28", border: "1px solid #2d2d3d", borderRadius: "6px", color: "#e8e4d9", fontSize: "0.95rem", fontFamily: "inherit", padding: "0.5rem", height: "42px" }}
                />
              </div>
            </div>
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
                    <button
                      key={v}
                      onClick={() => setAllegro(String(v))}
                      style={{ background: "#22222e", color: "#8a8a9e", border: "none", borderRadius: "5px", fontSize: "0.72rem", padding: "0.45rem 0.6rem", cursor: "pointer" }}
                    >
                      {v}%
                    </button>
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
                {VAT_OPTIONS.map(v => (
                  <button
                    key={v}
                    onClick={() => setVat(v)}
                    style={{ background: vat === v ? "linear-gradient(135deg, #f5a623, #f0623a)" : "#22222e", color: vat === v ? "#0d0d11" : "#8a8a9e", border: "none", borderRadius: "5px", padding: "0.55rem 0", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    {v}%
                  </button>
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

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleAddToList}
                  style={{ flex: 1, background: "linear-gradient(135deg, #4ecb71 0%, #2a9d47 100%)", border: "none", borderRadius: "6px", color: "#0d0d11", fontSize: "0.88rem", fontWeight: 600, padding: "0.6rem", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {editingId ? "✓ AKTUALIZUJ WYCENĘ" : "＋ ZAPISZ DO LISTY ZBIORCZEJ"}
                </button>
                <button
                  onClick={handleSaveCurrentToCloud}
                  disabled={!result}
                  style={{ background: '#1e1e28', border: '1px solid #2d2d3d', color: '#8a8a9e', borderRadius: '6px', fontSize: '0.88rem', padding: '0.6rem', cursor: result ? 'pointer' : 'not-allowed', fontFamily: 'inherit', minWidth: '160px' }}
                >
                  ☁️ ZAPISZ W CHMURZE
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
                  <th>Ilość</th>
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
                    <td style={{ color: "#a5a5b5" }}>{item.quantity ? item.quantity : "—"}</td>
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
                    <td style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button 
                        onClick={() => handleEditItem(item)}
                        style={{ background: "transparent", border: "none", color: "#f5a623", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.4rem" }}
                        title="Edytuj wycenę"
                      >
                        ✎
                      </button>
                      <button 
                        onClick={() => handleRemoveFromList(item.id)}
                        style={{ background: "transparent", border: "none", color: "#4a4a5e", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.4rem" }}
                        title="Usuń wycenę"
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