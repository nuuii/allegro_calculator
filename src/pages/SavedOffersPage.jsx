import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const OfferSetCard = ({ offerSet, onLoad, onDelete, onExport, formatPLN, isNew, hasDraftCalculations }) => {
  const totalProfit = offerSet.items.reduce((sum, item) => sum + (item.profit || 0) * (item.quantity || 1), 0);
  const totalValue = offerSet.items.reduce((sum, item) => sum + (item.offerPrice || 0) * (item.quantity || 1), 0);

  return (
    <div className={`saved-offer-card ${isNew ? "is-new" : ""}`}>
      <div>
        <div className="saved-offer-card__title-row">
          <h3 style={{ margin: 0, color: "#f5a623", fontSize: "1.1rem", fontFamily: "'Syne', sans-serif" }}>{offerSet.name}</h3>
          {isNew && <span className="fresh-badge">NOWO ZAPISANE</span>}
        </div>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#6a6a82" }}>
          Utworzono: {new Date(offerSet.createdAt).toLocaleString()} przez <strong style={{ color: "#8a8a9e" }}>{offerSet.createdBy}</strong>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", background: "#161622", padding: "0.75rem", borderRadius: "8px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#6a6a82" }}>POZYCJI</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#e8e4d9" }}>{offerSet.items.length}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#6a6a82" }}>WARTOŚĆ OFERT</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#e8e4d9" }}>{formatPLN(totalValue)}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#6a6a82" }}>SZACOWANY ZYSK</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: totalProfit > 0 ? "#4ecb71" : "#e05555" }}>{formatPLN(totalProfit)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <Link
          to="/"
          onClick={(event) => {
            const loaded = onLoad(offerSet);
            if (!loaded) event.preventDefault();
          }}
          style={{ flex: 1, textAlign: 'center', background: "linear-gradient(135deg, #4ecb71, #2a9d47)", border: "none", borderRadius: "6px", color: "#0d0d11", fontSize: "0.8rem", fontWeight: 600, padding: "0.5rem", cursor: "pointer", textDecoration: 'none' }}
        >
          ✏️ Wczytaj i edytuj
        </Link>
        <button onClick={() => onExport(offerSet)} style={{ background: "#22222e", border: "1px solid #2d2d3d", color: "#8a8a9e", borderRadius: "6px", fontSize: "0.8rem", padding: "0.5rem", cursor: "pointer" }}>
          📄 Pobierz Excel
        </button>
        <button onClick={() => onDelete(offerSet.id)} style={{ background: "#22222e", border: "1px solid #e05555", color: "#e05555", borderRadius: "6px", fontSize: "0.8rem", padding: "0.5rem", cursor: "pointer" }}>
          🗑️ Usuń
        </button>
      </div>
      {hasDraftCalculations && (
        <div className="saved-offer-card__warning">
          Wczytanie zastąpi obecną niezapisaną listę w kalkulatorze.
        </div>
      )}
    </div>
  );
};

export default function SavedOffersPage({ savedOffers, onLoad, onDelete, onExport, formatPLN, newlySavedOfferId, hasDraftCalculations }) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('newest');

  const visibleOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...(savedOffers || [])]
      .filter(offerSet => {
        if (!normalizedQuery) return true;
        return `${offerSet.name} ${offerSet.createdBy}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortMode === 'profit') {
          const profitA = a.items.reduce((sum, item) => sum + (item.profit || 0) * (item.quantity || 1), 0);
          const profitB = b.items.reduce((sum, item) => sum + (item.profit || 0) * (item.quantity || 1), 0);
          return profitB - profitA;
        }
        if (sortMode === 'value') {
          const valueA = a.items.reduce((sum, item) => sum + (item.offerPrice || 0) * (item.quantity || 1), 0);
          const valueB = b.items.reduce((sum, item) => sum + (item.offerPrice || 0) * (item.quantity || 1), 0);
          return valueB - valueA;
        }
        if (sortMode === 'name') {
          return a.name.localeCompare(b.name, 'pl');
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [savedOffers, query, sortMode]);

  if (!savedOffers || savedOffers.length === 0) {
    return (
      <div style={{ width: '100%', maxWidth: '1140px', textAlign: 'center', background: '#121218', border: '1px solid #1e1e26', borderRadius: '12px', padding: '3rem' }}>
        <h2 style={{ margin: 0, color: '#6a6a82' }}>Brak zapisanych zestawień</h2>
        <p style={{ color: '#4a4a5e', marginTop: '0.5rem' }}>
          Przejdź do <Link to="/" style={{ color: '#f5a623' }}>Kalkulatora</Link>, aby stworzyć i zapisać swoje pierwsze zestawienie ofert.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1140px' }}>
      <div style={{ marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #1e1e26' }}>
        <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", color: '#e8e4d9', fontWeight: 700 }}>Zapisane Zestawienia Ofert</h2>
        <p style={{ margin: '0.25rem 0 0', color: '#8a8a9e', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Zarządzaj swoimi zapisanymi listami produktów. Możesz je wczytać do edycji, pobrać jako plik Excel lub usunąć.
        </p>
      </div>

      <div className="saved-offers-toolbar">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Szukaj po nazwie lub autorze"
          className="saved-offers-search"
        />
        <select value={sortMode} onChange={e => setSortMode(e.target.value)} className="saved-offers-sort">
          <option value="newest">Najnowsze</option>
          <option value="profit">Największy zysk</option>
          <option value="value">Największa wartość</option>
          <option value="name">Nazwa A-Z</option>
        </select>
      </div>

      {visibleOffers.length === 0 ? (
        <div className="results-register__empty">Nie znaleziono ofert pasujących do wyszukiwania.</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
        {visibleOffers.map(offerSet => (
          <OfferSetCard
            key={offerSet.id}
            offerSet={offerSet}
            onLoad={onLoad}
            onDelete={onDelete}
            onExport={onExport}
            formatPLN={formatPLN}
            isNew={offerSet.id === newlySavedOfferId}
            hasDraftCalculations={hasDraftCalculations}
          />
        ))}
      </div>
    </div>
  );
}
