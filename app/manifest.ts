import type { MetadataRoute } from "next";

/** Lets the app install to the home screen and open without browser chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chanks Money Pool",
    short_name: "Chanks Money Pool",
    description: "Track what every friend has saved into the fund.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f8f1",
    theme_color: "#f0f8f1",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
