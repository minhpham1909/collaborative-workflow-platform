import { useId } from "react";

export default function FormField({ label, hint, error, children }) {
  const id = useId();
  const help = `${id}-help`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-describedby": help,
        "aria-invalid": Boolean(error),
      })}
      <p
        id={help}
        className={error ? "field-message error" : "field-message"}
        role={error ? "alert" : undefined}
      >
        {error || hint || "\u00a0"}
      </p>
    </div>
  );
}
