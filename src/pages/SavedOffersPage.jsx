import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const OfferSetCard = ({ offerSet, onLoad, onDelete, onExport, formatPLN, isNew, hasDraftCalculations }) => {
  const totalProfit = offerSet.items.reduce((sum, item) => sum + (item.profit || 0) * (item.quantity || 1), 0);
  const totalValue = offerSet.items.reduce((sum, item) => sum + (item.offerPrice || 0) * (item.quantity || 1), 0);

  return (
    <div className={`saved-offer-card ${isNew ? "is-new" : ""}`}>
      <div>
        <div className="saved-offer-card__title-row">
          <h3>{offerSet.name}</h3>
          {isNew && <span className="fresh-badge">NOWO ZAPISANE</span>}
        </div>
        <p className="saved-offer-card__meta">
          Utworzono: {new Date(offerSet.createdAt).toLocaleString()} przez <strong>{offerSet.createdBy}</strong>
        </p>
        <p className="saved-offer-card__meta">
          Dostawca: <strong>{offerSet.supplierName || 'Nie podano'}</strong>
        </p>
      </div>

      <div className="saved-offer-card__stats">
        <div>
          <span>Pozycji</span>
          <strong>{offerSet.items.length}</strong>
        </div>
        <div>
          <span>Wartość ofert</span>
          <strong>{formatPLN(totalValue)}</strong>
        </div>
        <div>
          <span>Szacowany zysk</span>
          <strong className={totalProfit > 0 ? "positive-value" : "negative-value"}>{formatPLN(totalProfit)}</strong>
        </div>
      </div>

      <div className="saved-offer-card__actions">
        <Link
          to="/"
          onClick={(event) => {
            const loaded = onLoad(offerSet);
            if (!loaded) event.preventDefault();
          }}
          className="primary-action primary-action--compact"
        >
          Wczytaj i edytuj
        </Link>
        <button onClick={() => onExport(offerSet)} className="secondary-action">
          Pobierz Excel
        </button>
        <button onClick={() => onDelete(offerSet.id)} className="secondary-action secondary-action--danger">
          Usuń
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
      <div className="empty-state-panel">
        <h2>Brak zapisanych zestawień</h2>
        <p>
          Przejdź do <Link to="/">Kalkulatora</Link>, aby stworzyć i zapisać swoje pierwsze zestawienie ofert.
        </p>
      </div>
    );
  }

  return (
    <div className="saved-offers-page">
      <div className="page-heading">
        <h2>Zapisane zestawienia ofert</h2>
        <p>
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

      <div className="saved-offers-grid">
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
