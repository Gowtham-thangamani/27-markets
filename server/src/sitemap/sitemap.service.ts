import { Injectable } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SITE = 'https://27markets.com';

// Static marketing URLs — keep in sync with the frontend's public/sitemap.xml.
// [path, changefreq, priority]
const STATIC: ReadonlyArray<readonly [string, string, string]> = [
  ['/', 'weekly', '1.0'],
  ['/about', 'monthly', '0.7'],
  ['/markets', 'weekly', '0.9'],
  ['/platforms', 'monthly', '0.8'],
  ['/accounts', 'monthly', '0.8'],
  ['/conditions', 'monthly', '0.7'],
  ['/funding', 'monthly', '0.7'],
  ['/trust', 'monthly', '0.6'],
  ['/faq', 'monthly', '0.6'],
  ['/partnership', 'monthly', '0.8'],
  ['/partner/apply', 'monthly', '0.7'],
  ['/economic-calendar', 'daily', '0.7'],
  ['/blog', 'weekly', '0.7'],
  ['/contact', 'yearly', '0.5'],
  ['/disclaimer', 'yearly', '0.3'],
  ['/legal/client-agreement', 'yearly', '0.3'],
  ['/legal/risk-disclosure', 'yearly', '0.3'],
  ['/legal/privacy', 'yearly', '0.3'],
  ['/legal/aml', 'yearly', '0.3'],
];

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full sitemap: static marketing pages + every published blog post (live). */
  async build(): Promise<string> {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: PostStatus.PUBLISHED, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, publishedAt: true },
    });

    const staticUrls = STATIC.map(
      ([loc, cf, pr]) =>
        `  <url><loc>${SITE}${loc}</loc><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`,
    );

    const blogUrls = posts.map((p) => {
      const loc = `${SITE}/blog/${xmlEscape(encodeURIComponent(p.slug))}`;
      const lastmod = p.publishedAt
        ? `<lastmod>${p.publishedAt.toISOString().slice(0, 10)}</lastmod>`
        : '';
      return `  <url><loc>${loc}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.6</priority></url>`;
    });

    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      [...staticUrls, ...blogUrls].join('\n') +
      '\n</urlset>\n'
    );
  }
}
