const paths = {
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z",
  "eye-off":
    "m3 3 18 18M10 5c7-1 12 7 12 7a19 19 0 0 1-4 5M6 6a20 20 0 0 0-4 6s4 7 10 7c2 0 3-1 4-1M10 10a3 3 0 0 0 4 4",
  calendar: "M5 3v4m14-4v4M3 9h18M3 5h18v16H3Z",
  check: "m4 12 5 5L20 6",
  folder: "M3 7V5h6l2 2h10v13H3Z",
  palette:
    "M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-4-5-6-9-6ZM7 8h.01M12 6h.01M17 8h.01M6 13h.01",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18",
  megaphone: "M3 9v6h5l12 5V4L8 9Zm5 6 2 6h4l-2-4M20 9h2v6h-2",
  layers: "m12 3 10 6-10 6L2 9Zm-10 12 10 6 10-6M2 12l10 6 10-6",
  document: "M5 3h9l5 5v13H5Zm9 0v5h5M8 12h8M8 16h8",
  people:
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a7 7 0 0 1 14 0v3M17 3a4 4 0 0 1 0 8m2 3a5 5 0 0 1 3 4v3",
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  tasks: "M9 5h11M9 12h11M9 19h11m-17-14 1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  filter: "M4 7h16M4 17h16M8 4v6m8 4v6",
};
export default function Icon({ name, className = "" }) {
  return (
    <svg
      className={"ui-icon " + className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.filter} />
    </svg>
  );
}
