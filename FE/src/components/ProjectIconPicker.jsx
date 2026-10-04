import Icon from "./Icon.jsx";
export const projectIcons = [
  ["folder", "Chung"],
  ["palette", "Thiết kế"],
  ["code", "Kỹ thuật"],
  ["megaphone", "Marketing"],
  ["layers", "Design System"],
  ["document", "Tài liệu"],
];
export default function ProjectIconPicker({ value, onChange, disabled }) {
  return (
    <fieldset className="project-icon-picker" disabled={disabled}>
      <legend>Biểu tượng Dự án</legend>
      <div>
        {projectIcons.map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-label={label}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
          >
            <Icon name={key} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
