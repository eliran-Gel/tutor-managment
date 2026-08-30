import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup"],
      // Everything past login requires auth anyway - no point crawling it,
      // and no reason to expose the app's internal route structure.
      disallow: ["/tutor", "/portal", "/auth", "/api"],
    },
    sitemap: "https://app.elirangelberg.com/sitemap.xml",
  };
}
