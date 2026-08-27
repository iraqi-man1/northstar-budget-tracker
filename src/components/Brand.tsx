export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      {!compact && <span className="brand-name">northstar<span>.</span></span>}
    </div>
  );
}
