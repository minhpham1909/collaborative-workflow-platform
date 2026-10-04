import { useId, useState } from "react";
import RichEditor from "./RichEditor.jsx";

// Keep short descriptions visible; long documents can be read in full on demand.
export default function DescriptionPreview({ value, label, limit }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const text = value?.plainText ?? "";
  const long = text.length > 280 || text.split("\n").length > 3;
  return (
    <div className="description-preview">
      {long && !expanded && <p className="description-excerpt">{text}</p>}
      <div id={panelId} hidden={long && !expanded}>
        {(!long || expanded) && (
          <RichEditor readOnly value={value} label={label} limit={limit} />
        )}
      </div>
      {long && (
        <button
          type="button"
          className="description-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((old) => !old)}
        >
          {expanded ? "Thu gọn mô tả" : "Đọc toàn bộ mô tả"}
        </button>
      )}
    </div>
  );
}
