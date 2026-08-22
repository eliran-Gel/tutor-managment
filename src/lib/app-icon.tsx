import { ImageResponse } from "next/og";

const NAVY = "#102a4c";

/** Shared renderer for every app-icon size (favicon, apple touch icon,
 * PWA manifest icons) - one visual source of truth instead of four
 * hand-drawn images to keep in sync. Matches the same navy + 🎓 mark
 * already used for the brand badge in the sidebar. */
export function renderAppIcon(px: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: NAVY,
          fontSize: Math.round(px * 0.6),
        }}
      >
        🎓
      </div>
    ),
    { width: px, height: px },
  );
}
