import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE_URL = "https://trisert.github.io/limitless-labs";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async () => {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
    (a, b) =>
      a.data.date.valueOf() - b.data.date.valueOf() || a.id.localeCompare(b.id),
  );
  const urls = [
    `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    `  <url>\n    <loc>${SITE_URL}/writing.html</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    `  <url>\n    <loc>${SITE_URL}/privacy.html</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
    ...posts.map((post) => {
      const url = `${SITE_URL}/writing/${post.id}.html`;
      return `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${post.data.date.toISOString().slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
