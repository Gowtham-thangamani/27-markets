import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../common/decorators';
import { SitemapService } from './sitemap.service';

/**
 * Serves the live sitemap. Resolved under the global `api` prefix as
 * `/api/sitemap.xml`; CloudFront rewrites `27markets.com/sitemap.xml` to it so
 * search engines always see the current set of published blog posts.
 */
@Controller()
export class SitemapController {
  constructor(private readonly sitemap: SitemapService) {}

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300, must-revalidate')
  build(): Promise<string> {
    return this.sitemap.build();
  }
}
