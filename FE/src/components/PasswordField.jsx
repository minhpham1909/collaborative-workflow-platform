import { useState } from "react";
import FormField from "./FormField.jsx";
import Icon from "./Icon.jsx";

export default function PasswordField({ label, hint, error, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} hint={hint} error={error}>
      {(props) => (
        <div className="password-control">
          <input
            {...inputProps}
            {...props}
            type={visible ? "text" : "password"}
          />
          <button
            type="button"
            disabled={inputProps.disabled}
            aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLocaleLowerCase("vi")}`}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            <Icon name={visible ? "eye-off" : "eye"} />
          </button>
        </div>
      )}
    </FormField>
  );
}
