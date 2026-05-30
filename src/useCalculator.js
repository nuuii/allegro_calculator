import { useState, useCallback, useEffect } from 'react';

const LOCAL_STORAGE_KEYS = {
  SUPPLIER: 'calcallegro_supplier',
  CURRENCY: 'calcallegro_currency',
  ALLEGRO_FEE: 'calcallegro_allegro',
  VAT: 'calcallegro_vat',
};

const SHIPPING_TIERS = [
  { max: 29.99, cost: 0 }, { max: 44.99, cost: 1.59 }, { max: 64.99, cost: 3.09 },
  { max: 99.99, cost: 4.99 }, { max: 149.99, cost: 7.59 }, { max: Infinity, cost: 9.99 },
];

function getShippingCost(price) {
  for (const tier of SHIPPING_TIERS) {
    if (price <= tier.max) return tier.cost;
  }
  return 9.99;
}

export function useCalculator({ rates, activeProfile }) {
  // Input states
  const [prodName, setProdName] = useState("");
  const [prodEan, setProdEan] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [allegroDiscounted, setAllegroDiscounted] = useState(false);

  // Configuration states from localStorage
  const [supplierName, setSupplierName] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.SUPPLIER) || "");
  const [purchaseCurrency, setPurchaseCurrency] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENCY) || "PLN");
  const [allegro, setAllegro] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.ALLEGRO_FEE) || "10");
  const [vat, setVat] = useState(() => {
    const savedVat = localStorage.getItem(LOCAL_STORAGE_KEYS.VAT);
    return savedVat ? parseInt(savedVat, 10) : 23;
  });
  const [includeDelivery, setIncludeDelivery] = useState(true);

  // List & editing states
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Persist configuration to localStorage
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.SUPPLIER, supplierName); }, [supplierName]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENCY, purchaseCurrency); }, [purchaseCurrency]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.ALLEGRO_FEE, allegro); }, [allegro]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.VAT, vat.toString()); }, [vat]);

  // Calculation logic
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
  const currentRate = rates[purchaseCurrency];

  // Handlers
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
    // Reset form
    setProdName("");
    setProdEan("");
    setOfferPrice("");
    setPurchaseCost("");
    setQuantity("1");
    setAllegroDiscounted(false);
  };

  const handleRemoveFromList = (id) => {
    setSavedCalculations(prev => prev.filter(item => item.id !== id));
    if (editingId === id) handleCancelEdit();
  };

  const handleResetSavedCalculations = () => {
    setSavedCalculations([]);
    handleCancelEdit();
  };

  const handleLoadSavedCalculations = (items) => {
    if (!Array.isArray(items)) return;
    setSavedCalculations(items.map(item => ({ ...item })));
    setEditingId(null);
  };
  return {
    // State & Setters
    prodName, setProdName, prodEan, setProdEan, offerPrice, setOfferPrice,
    purchaseCost, setPurchaseCost, quantity, setQuantity, allegroDiscounted, setAllegroDiscounted,
    supplierName, setSupplierName, purchaseCurrency, setPurchaseCurrency, allegro, setAllegro,
    vat, setVat, includeDelivery, setIncludeDelivery, savedCalculations, editingId,
    // Derived values
    result, currentRate,
    // Handlers
    handleEditItem, handleCancelEdit, handleAddToList, handleRemoveFromList, handleResetSavedCalculations, handleLoadSavedCalculations,
  };
}