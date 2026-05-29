import React from "react";

export function Field({ label, value, onChange, placeholder, note }) {
  return (
    <div style={{ marginBottom: "0.8rem" }}>
      <label style={{ fontSize: "0.68rem", letterSpacing: "0.08em", color: "#6a6a82", display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
        {label?.toUpperCase()}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "#1e1e28",
          border: "1px solid #2d2d3d",
          borderRadius: "6px",
          color: "#e8e4d9",
          fontSize: "0.95rem",
          fontFamily: "inherit",
          padding: "0.5rem 0.75rem",
        }}
      />
      {note && <div style={{ fontSize: "0.65rem", color: "#3a3a4e", marginTop: "0.2rem" }}>{note}</div>}
    </div>
  );
}

export function ResultRow({ label, value, negative, accent, dimmed }) {
  return (
    <div className="row-result">
      <span style={{ fontSize: "0.75rem", color: dimmed ? "#5a5a6e" : "#8a8a9e" }}>{label}</span>
      <span style={{
        fontSize: "0.85rem",
        fontWeight: accent ? 600 : 400,
        color: negative ? "#e05555" : accent ? "#f5a623" : dimmed ? "#5a5a6e" : "#e8e4d9",
      }}>{value}</span>
    </div>
  );
}

export default { Field, ResultRow };
