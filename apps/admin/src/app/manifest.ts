import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest (public: see the proxy matcher).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HIG Admin",
    short_name: "HIG Admin",
    description: "HIG users, roles and permissions",
    lang: "km",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
