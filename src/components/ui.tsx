import {
  AlertTriangle,
  ArrowDownUp,
  ChevronDown,
  Inbox,
  LoaderCircle,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useLanguage } from "../context/LanguageContext";
import { formatIqdInput, normalizeIqdInput } from "../lib/format";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  icon: Icon,
  loading,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: LucideIcon; loading?: boolean }) {
  return (
    <button className={`button button--${variant} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <LoaderCircle className="spin" /> : Icon ? <Icon /> : null}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

export function Modal({ open, onClose, title, eyebrow, children, footer, size = "medium" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "small" | "medium" | "large";
}) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={dialogRef}>
        <header className="modal-header">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id="modal-title">{title}</h2></div>
          <IconButton label={t("Close")} onClick={onClose}><X /></IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Delete", busy = false }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title={title} size="small">
      <div className="confirm-message"><span><AlertTriangle /></span><p>{description}</p></div>
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button variant="danger" loading={busy} onClick={onConfirm}>{t(confirmLabel)}</Button></div>
    </Modal>
  );
}

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}{error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}</label>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input textarea ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="select-wrap"><select className={`input select ${className}`} {...props}>{children}</select><ChevronDown /></span>;
}

export function MoneyInput({ currency, ...props }: InputHTMLAttributes<HTMLInputElement> & { currency: string }) {
  if (currency === "IQD") {
    const { value, onChange, ...inputProps } = props;
    return <span className="money-input money-input--iqd" dir="ltr"><Input type="text" inputMode="numeric" pattern="[0-9.]*" value={formatIqdInput(value)} onChange={(event) => { event.currentTarget.value = normalizeIqdInput(event.currentTarget.value); onChange?.(event); }} {...inputProps} /><span>IQD</span></span>;
  }
  return <span className="money-input" dir="ltr"><span>{currency}</span><Input type="number" min="0.01" step="0.01" inputMode="decimal" {...props} /></span>;
}

export function ColorInput({ value, onChange, label = "Color" }: { value: string; onChange: (value: string) => void; label?: string }) {
  const { t } = useLanguage();
  const id = useId();
  const colors = ["#2DAA79", "#477EEA", "#6F7DFF", "#14A6A6", "#EE8D5A", "#E65B65", "#C86BDD", "#D29B32"];
  return <div className="field"><span className="field-label">{t(label)}</span><div className="color-picker" id={id}>{colors.map((color) => <button key={color} type="button" className={value === color ? "active" : ""} style={{ backgroundColor: color }} aria-label={`${t("Color")} ${color}`} onClick={() => onChange(color)} />)}<label className="custom-color" style={{ backgroundColor: value }}><input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={t("Color")} /></label></div></div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

export function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const { t } = useLanguage();
  return <label className="search-input"><Search /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={t(placeholder)} aria-label={t(placeholder)} />{value && <button onClick={() => onChange("")} aria-label={t("Clear search")}><X /></button>}</label>;
}

export function SortSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  const { t } = useLanguage();
  return <label className="sort-select"><ArrowDownUp /><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={t("Sort order")}>{children}</select><ChevronDown /></label>;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span><Icon /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) { return <span className={`skeleton ${className}`} />; }

export function PageSkeleton() {
  return <div className="page"><div className="skeleton-heading"><Skeleton /><Skeleton /><Skeleton /></div><div className="stat-grid">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="skeleton-card" />)}</div><div className="content-grid"><Skeleton className="skeleton-panel" /><Skeleton className="skeleton-panel" /></div></div>;
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "positive" | "negative" | "neutral" | "warning" }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
