import type { MetadataRoute } from "next";

/** Lets the app install to the home screen and open without browser chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FriendlyFund",
    short_name: "FriendlyFund",
    description: "Track what every friend has saved into the fund.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f8f1",
    theme_color: "#f0f8f1",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      // Notification icons and badges must be raster; SVG is not accepted.
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
