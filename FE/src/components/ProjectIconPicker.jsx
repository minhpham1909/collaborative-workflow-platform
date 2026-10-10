import { workspaceText } from '../lib/workspace-text.js';
import Icon from "./Icon.jsx";
export const projectIcons = [
  ["folder", "Chung"],
  ["palette", "Thiết kế"],
  ["code", "Kỹ thuật"],
  ["megaphone", "Marketing"],
  ["layers", "Design System"],
  ["document", "Tài liệu"],
];
export default function ProjectIconPicker({ value, onChange, disabled, locale = "vi" }) {
  const t = value => workspaceText(value, locale);
  return (
    <fieldset className="project-icon-picker" disabled={disabled}>
      <legend>{t("Biểu tượng Dự án")}</legend>
      <div>
        {projectIcons.map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-label={t(label)}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
          >
            <Icon name={key} />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
