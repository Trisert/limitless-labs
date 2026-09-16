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
      b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id),
  );
  const updated =
    posts[0]?.data.date.toISOString() ?? "2026-01-01T00:00:00.000Z";
  const entries = posts
    .map((post) => {
      const url = `${SITE_URL}/writing/${post.id}.html`;
      const summary = post.data.description ?? post.data.title;
      return `    <entry>
      <title>${escapeXml(post.data.title)}</title>
      <link href="${url}"/>
      <id>${url}</id>
      <updated>${post.data.date.toISOString()}</updated>
      <summary>${escapeXml(summary)}</summary>
      <author><name>Nicola Destro</name></author>
    </entry>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Limitless Labs</title>
  <link href="${SITE_URL}/"/>
  <link href="${SITE_URL}/feed.xml" rel="self"/>
  <updated>${updated}</updated>
  <author><name>Nicola Destro</name></author>
  <id>${SITE_URL}/feed.xml</id>
  <generator>Astro static build</generator>
  <subtitle>Field notes by Nicola Destro</subtitle>
${entries}
</feed>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
};
