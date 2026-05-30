/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useContext, useEffect } from 'react';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [rates, setRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);
  const [edgeConfig, setEdgeConfig] = useState({ smartThreshold: 44.99, isScraperActive: true });
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  const fetchRatesData = useCallback(() => {
    setRatesLoading(true);
    setRatesError(null);
    fetch("/api/scrape?action=rates")
      .then(r => {
        if (!r.ok) throw new Error('Network response was not ok');
        return r.json();
      })
      .then(data => {
        const converted = { PLN: 1 };
        for (const [cur, rate] of Object.entries(data.rates)) {
          converted[cur] = 1 / rate;
        }
        setRates(converted);
        setRatesDate(data.date);
        if (data.config) setEdgeConfig(data.config);
      })
      .catch(() => {
        setRatesError("Błąd kursów walut (Tryb Offline)");
        setRates({ PLN: 1, EUR: 4.27, USD: 3.92, GBP: 5.02, CHF: 4.38, CZK: 0.173, RON: 0.86, CNY: 0.541 });
      })
      .finally(() => {
        setRatesLoading(false);
      });
  }, []);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const value = { rates, ratesLoading, ratesError, ratesDate, fetchRatesData, edgeConfig, toast, setToast };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
