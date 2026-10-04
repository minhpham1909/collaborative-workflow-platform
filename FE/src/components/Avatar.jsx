import { useState } from "react";
export default function Avatar({ user }) {
  const [broken, setBroken] = useState(null),
    url =
      user.avatar?.source === "google" ? user.avatar.googlePictureUrl : null;
  return (
    <span className="avatar">
      {url && broken !== url ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(url)}
        />
      ) : (
        user.displayName?.slice(0, 1)
      )}
    </span>
  );
}
