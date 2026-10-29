import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://apexf1.web.id";
  return ["", "/live", "/calendar", "/standings", "/drivers", "/teams", "/circuits", "/strategy", "/analysis", "/replay", "/telemetry", "/radio"].map((u) => ({ url: `${base}${u}` }));
}
