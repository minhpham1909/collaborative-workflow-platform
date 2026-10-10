import { homeText } from '../lib/home-text.js';
import Icon from "./Icon.jsx";
import { Children, Fragment, cloneElement, useId, useState } from "react";
function flattenFields(children, prefix = "filter") {
  return Children.toArray(children).flatMap((item, index) => {
    const key = `${prefix}-${index}`;
    return item.type === Fragment
      ? flattenFields(item.props.children, key)
      : [cloneElement(item, { key })];
  });
}
export default function FilterPanel({
  children,
  locale = "vi",
  compact = false,
  sortLabel = "Mới tạo trước",
  advancedLabel = "Bộ lọc",
}) {
  const t = value => homeText(value, locale);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (compact) {
    const items = flattenFields(children);
    const isSearch = (item) =>
      Children.toArray(item.props?.children).some(
        (child) => child.props?.type === "search",
      );
    const firstSelect = items.find((item) =>
      Children.toArray(item.props?.children).some(
        (child) => child.type === "select",
      ),
    );
    const primary = items.filter(
      (item) =>
        isSearch(item) || item.type === "button" || item === firstSelect,
    );
    const advanced = items.filter((item) => !primary.includes(item));
    const count = advanced.filter(
      (item) =>
        item.props?.filterActive ??
        Children.toArray(item.props?.children).some(
          (field) =>
            (field.props?.checked || field.props?.value) &&
            (field.type !== "select" ||
              field.props.value !==
                Children.toArray(field.props.children)[0]?.props?.value),
        ),
    ).length;
    return (
      <section
        className="filter-panel compact-filter"
        aria-label={t("Bộ lọc danh sách")}
      >
        <div className="filters compact-filter-bar">
          {primary}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
          >
            <Icon name="filter" />
            {advancedLabel}{count ? ` (${count})` : ""}
          </button>
          <span className="filter-sort">{t("Sắp xếp:")} {t(sortLabel)}</span>
        </div>
        <div id={panelId} className="filters filter-advanced" hidden={!open}>
          {advanced}
        </div>
      </section>
    );
  }
  return (
    <section className="filter-panel" aria-label={t("Bộ lọc danh sách")}>
      <div className="filter-heading">
        <Icon name="filter" />
        <strong>{t("Tìm kiếm & bộ lọc")}</strong>
        <span>{t("Thu hẹp danh sách theo nhu cầu của bạn")}</span>
      </div>
      <div className="filters">{children}</div>
    </section>
  );
}
