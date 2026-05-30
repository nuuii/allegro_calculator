export function Field({ label, value, onChange, placeholder, note }) {
  return (
    <div className="field-control">
      <label className="form-label">
        {label?.toUpperCase()}
      </label>
      <input
        className="form-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {note && <div className="field-note">{note}</div>}
    </div>
  );
}

export function ResultRow({ label, value, negative, accent, dimmed }) {
  const displayValue = negative && value && value !== "—"
    ? `− ${String(value).replace(/^[-−]\s*/, "")}`
    : value;

  return (
    <div className="row-result">
      <span style={{ color: dimmed ? "#5a5a6e" : "#8a8a9e" }}>{label}</span>
      <span style={{
        color: negative ? "#e05555" : accent ? "#f5a623" : dimmed ? "#5a5a6e" : "#e8e4d9",
        fontWeight: accent ? 600 : 400,
      }}>{displayValue}</span>
    </div>
  );
}

export default { Field, ResultRow };
