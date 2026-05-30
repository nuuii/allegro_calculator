export default function ResultRow({ label, value, negative, accent, dimmed }) {
  const displayValue = negative && value && value !== "—"
    ? `− ${String(value).replace(/^[-−]\s*/, "")}`
    : value;

  return (
    <div className="row-result">
      <span style={{ fontSize: "0.75rem", color: dimmed ? "#5a5a6e" : "#8a8a9e" }}>{label}</span>
      <span style={{
        fontSize: "0.85rem",
        fontWeight: accent ? 600 : 400,
        color: negative ? "#e05555" : accent ? "#f5a623" : dimmed ? "#5a5a6e" : "#e8e4d9",
      }}>{displayValue}</span>
    </div>
  );
}
