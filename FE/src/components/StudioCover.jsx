const workspaceCovers = ["moodboard", "architecture", "campaign"];
const projectCovers = ["website", "architecture", "branding"];
export function studioTone(id) {
  return (
    [...String(id)].reduce(
      (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
      0,
    ) % 3
  );
}
export default function StudioCover({
  id,
  project = false,
  archived = false,
  children,
}) {
  const tone = studioTone(id);
  return (
    <div
      className={`studio-cover tone-${tone}${archived ? " archived-cover" : ""}`}
    >
      <img
        src={`/images/studio/${(project ? projectCovers : workspaceCovers)[tone]}.jpg`}
        alt=""
        loading="lazy"
        width="720"
        height="300"
      />
      {children}
    </div>
  );
}
