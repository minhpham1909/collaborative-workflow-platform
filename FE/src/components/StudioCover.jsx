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
  coverId,
  children,
}) {
  const tone = studioTone(id);
  const presets = project ? projectCovers : workspaceCovers;
  const cover = presets.includes(coverId) ? coverId : presets[tone];
  return (
    <div
      className={`studio-cover tone-${tone}${archived ? " archived-cover" : ""}`}
    >
      <img
        key={cover}
        src={`/images/studio/${cover}.jpg`}
        alt=""
        onError={event => { event.currentTarget.hidden = true; }}
        loading="lazy"
        width="720"
        height="300"
      />
      {children}
    </div>
  );
}
