import React from 'react';
import { Link } from 'react-router-dom';

const OfferSetCard = ({ offerSet, onLoad, onDelete, onExport, formatPLN }) => {
  const totalProfit = offerSet.items.reduce((sum, item) => sum + (item.profit || 0) * (item.quantity || 1), 0);
  const totalValue = offerSet.items.reduce((sum, item) => sum + (item.offerPrice || 0) * (item.quantity || 1), 0);

  return (
    <div style={{ background: "#121218", border: "1px solid #1e1e26", borderRadius: "12px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <h3 style={{ margin: 0, color: "#f5a623", fontSize: "1.1rem", fontFamily: "'Syne', sans-serif" }}>{offerSet.name}</h3>
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
        <Link to="/" onClick={() => onLoad(offerSet)} style={{ flex: 1, textAlign: 'center', background: "linear-gradient(135deg, #4ecb71, #2a9d47)", border: "none", borderRadius: "6px", color: "#0d0d11", fontSize: "0.8rem", fontWeight: 600, padding: "0.5rem", cursor: "pointer", textDecoration: 'none' }}>
          ✏️ Wczytaj i edytuj
        </Link>
        <button onClick={() => onExport(offerSet)} style={{ background: "#22222e", border: "1px solid #2d2d3d", color: "#8a8a9e", borderRadius: "6px", fontSize: "0.8rem", padding: "0.5rem", cursor: "pointer" }}>
          📄 Pobierz Excel
        </button>
        <button onClick={() => onDelete(offerSet.id)} style={{ background: "#22222e", border: "1px solid #e05555", color: "#e05555", borderRadius: "6px", fontSize: "0.8rem", padding: "0.5rem", cursor: "pointer" }}>
          🗑️ Usuń
        </button>
      </div>
    </div>
  );
};

export default function SavedOffersPage({ savedOffers, onLoad, onDelete, onExport, formatPLN }) {
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
        <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif" }}>Zapisane Zestawienia Ofert</h2>
        <p style={{ margin: '0.25rem 0 0', color: '#6a6a82', fontSize: '0.9rem' }}>
          Zarządzaj swoimi zapisanymi listami produktów. Możesz je wczytać do edycji, pobrać jako plik Excel lub usunąć.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
        {savedOffers.map(offerSet => (
          <OfferSetCard
            key={offerSet.id}
            offerSet={offerSet}
            onLoad={onLoad}
            onDelete={onDelete}
            onExport={onExport}
            formatPLN={formatPLN}
          />
        ))}
      </div>
    </div>
  );
}