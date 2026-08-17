export function TickBox({
  checked,
  label,
  onChange,
  className = "",
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  className?: string;
}) {
  return (
    <input
      aria-label={label}
      type="checkbox"
      checked={checked}
      className={`${className} task-checkbox ${checked ? "done" : ""}`}
      onChange={() => onChange()}
    />
  );
}
