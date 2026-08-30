import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bulky API",
    short_name: "Bulky",
    description: "JavaScript API automation client",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    categories: ["developer", "productivity", "utilities"],
    icons: [
      {
        src: "/bulky_api.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/bulky_api.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
