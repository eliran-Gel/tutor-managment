import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://elirangelberg.com";
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/login`, priority: 0.5 },
    { url: `${base}/signup`, priority: 0.5 },
  ];
}
