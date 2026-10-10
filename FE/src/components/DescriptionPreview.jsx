import { workspaceText } from '../lib/workspace-text.js';
import { useId, useState } from "react";
import RichEditor from "./RichEditor.jsx";

// Keep short descriptions visible; long documents can be read in full on demand.
export default function DescriptionPreview({ value, label, limit, locale = "vi" }) {
  const t = (value, values) => workspaceText(value, locale, values);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const text = value?.plainText ?? "";
  const long = text.length > 280 || text.split("\n").length > 3;
  return (
    <div className="description-preview">
      {long && !expanded && <p className="description-excerpt">{text}</p>}
      <div
        id={panelId}
        hidden={long && !expanded}
        className={long ? "description-full" : undefined}
        role={long && expanded ? "region" : undefined}
        aria-label={long && expanded ? t("{name} — nội dung đầy đủ", { name: label }) : undefined}
        aria-describedby={long && expanded ? `${panelId}-hint` : undefined}
        tabIndex={long && expanded ? 0 : undefined}
      >
        {(!long || expanded) && (
          <RichEditor locale={locale} readOnly value={value} label={label} limit={limit} />
        )}
      </div>
      {long && expanded && (
        <p id={`${panelId}-hint`} className="muted description-scroll-hint">
          {t("Cuộn trong khung để đọc toàn bộ nội dung.")}
        </p>
      )}
      {long && (
        <button
          type="button"
          className="description-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((old) => !old)}
        >
          {expanded ? t("Thu gọn mô tả") : t("Đọc toàn bộ mô tả")}
        </button>
      )}
    </div>
  );
}
