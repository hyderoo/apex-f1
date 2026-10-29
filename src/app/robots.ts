import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/settings", "/health"] }], sitemap: "https://apexf1.web.id/sitemap.xml" };
}
