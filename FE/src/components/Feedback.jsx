export function InlineMessage({
  children,
  className = "",
  tone = "error",
  ...props
}) {
  return (
    <div
      {...props}
      className={`feedback ${tone === "error" ? "error" : "note"} ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function LoadingState({ children, ...props }) {
  return (
    <div {...props} className="feedback loading-state" role="status">
      <span className="loading-dot" aria-hidden="true" />
      {children}
    </div>
  );
}
export function EmptyState({ children, ...props }) {
  return (
    <section {...props} className="empty" role="status">
      {children}
    </section>
  );
}
