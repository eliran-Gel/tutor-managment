import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "אלירן גלברג - מורה פרטי",
    short_name: "אלירן גלברג",
    description: "מערכת ניהול לעסק ההוראה הפרטית",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#102a4c",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
