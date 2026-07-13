// Regenerate dist/sitemap.xml = the static marketing URLs (from public/sitemap.xml)
// + one <url> per published blog post, fetched live from the API at build time.
//
// Runs as an npm `postbuild` hook, so it executes after `vite build` (which has
// already copied public/sitemap.xml -> dist/sitemap.xml) and before the S3 sync.
// The API base comes from VITE_API_URL (exported by scripts/deploy-frontend.sh),
// defaulting to production. Any failure falls back to the static sitemap so a
// flaky API never breaks a deploy.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const SITE = 'https://27markets.com'
const API = (process.env.VITE_API_URL || 'https://api.27markets.com/api').replace(/\/$/, '')
const STATIC_SRC = 'public/sitemap.xml'
const OUT = 'dist/sitemap.xml'
const MAX_PAGES = 50

const xmlEscape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function fetchPublishedPosts() {
  const posts = []
  let page = 1
  let pages = 1
  do {
    const res = await fetch(`${API}/blog?page=${page}&limit=50`, {
      headers: { accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`GET /blog?page=${page} -> ${res.status}`)
    const data = await res.json()
    for (const it of data.items ?? []) {
      if (it?.slug) posts.push({ slug: it.slug, publishedAt: it.publishedAt })
    }
    pages = Math.min(Number(data.pages) || 1, MAX_PAGES)
    page += 1
  } while (page <= pages)
  return posts
}

async function main() {
  const staticXml = await readFile(STATIC_SRC, 'utf8')
  await mkdir('dist', { recursive: true })

  let blockUrls = ''
  try {
    const posts = await fetchPublishedPosts()
    blockUrls = posts
      .map((p) => {
        const loc = `${SITE}/blog/${xmlEscape(encodeURIComponent(p.slug))}`
        const lastmod = p.publishedAt ? `<lastmod>${String(p.publishedAt).slice(0, 10)}</lastmod>` : ''
        return `  <url><loc>${loc}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.6</priority></url>`
      })
      .join('\n')
    console.log(`[sitemap] added ${posts.length} blog post URL(s) from ${API}`)
  } catch (err) {
    console.warn(`[sitemap] blog fetch failed (${err.message}); writing static sitemap only`)
  }

  const out = blockUrls
    ? staticXml.replace('</urlset>', `${blockUrls}\n</urlset>`)
    : staticXml
  await writeFile(OUT, out, 'utf8')
  console.log(`[sitemap] wrote ${OUT}`)
}

main().catch((err) => {
  // Never fail the build over the sitemap; ensure dist has at least the static file.
  console.warn(`[sitemap] generator error: ${err.message}`)
  if (existsSync(STATIC_SRC) && !existsSync(OUT)) {
    readFile(STATIC_SRC, 'utf8').then((s) => mkdir('dist', { recursive: true }).then(() => writeFile(OUT, s)))
  }
})
