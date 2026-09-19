import { ImageResponse } from "next/og";

/**
 * iOS home-screen icon: the piggy bank glyph, matching the Android icon in
 * public/icon.svg. Safari needs a raster image, so it is rendered here.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #63c66c 0%, #299968 55%, #24794c 100%)",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 512 512">
          <ellipse cx="248" cy="308" rx="132" ry="98" fill="#fdfaf1" />
          <circle cx="368" cy="286" r="40" fill="#fdfaf1" />
          <path d="M124 292q-30-4-30 22t30 18Z" fill="#fdfaf1" />
          <path d="M204 214q-6-30 20-36-8 26 10 40Z" fill="#fdfaf1" />
          <rect x="220" y="196" width="70" height="18" rx="9" fill="#24794c" />
          <circle cx="255" cy="150" r="24" fill="#fdfaf1" />
          <circle cx="384" cy="276" r="8" fill="#24794c" />
          <rect x="176" y="380" width="30" height="40" rx="12" fill="#fdfaf1" />
          <rect x="296" y="380" width="30" height="40" rx="12" fill="#fdfaf1" />
        </svg>
      </div>
    ),
    size
  );
}
