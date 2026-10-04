import Icon from "./Icon.jsx";
export default function FilterPanel({ children }) {
  return (
    <section className="filter-panel" aria-label="Bộ lọc danh sách">
      <div className="filter-heading">
        <Icon name="filter" />
        <strong>Tìm kiếm & bộ lọc</strong>
        <span>Thu hẹp danh sách theo nhu cầu của bạn</span>
      </div>
      <div className="filters">{children}</div>
    </section>
  );
}
