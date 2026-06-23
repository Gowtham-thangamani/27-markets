import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PostStatus } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreatePostDto, UpdatePostDto, ListPostsQuery } from './dto';

/** Turn a title (or custom slug) into a URL-safe slug. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Allowlist for stored rich text — never trust client HTML.
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'h1',
    'h2',
    'figure',
    'figcaption',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    a: ['href', 'name', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // force safe external links
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

// Fields safe to expose on public listing cards.
const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  featuredImage: true,
  publishedAt: true,
} satisfies Prisma.BlogPostSelect;

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────── Public ─────────────

  async listPublished(q: ListPostsQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const where: Prisma.BlogPostWhereInput = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: new Date() },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: CARD_SELECT,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async getPublishedBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  // ───────────── Admin ─────────────

  listAll() {
    return this.prisma.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  async getById(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(authorId: string, dto: CreatePostDto) {
    const base = dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.title);
    const slug = await this.uniqueSlug(base);
    const status = dto.status ?? PostStatus.DRAFT;
    const post = await this.prisma.blogPost.create({
      data: {
        slug,
        title: dto.title,
        excerpt: dto.excerpt,
        contentHtml: sanitizeHtml(dto.contentHtml, SANITIZE),
        featuredImage: dto.featuredImage,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        ogImage: dto.ogImage,
        status,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
        authorId,
      },
    });
    await this.audit.record({
      userId: authorId,
      action: 'blog.create',
      entity: 'BlogPost',
      entityId: post.id,
    });
    return post;
  }

  async update(editorId: string, id: string, dto: UpdatePostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');

    const data: Prisma.BlogPostUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.contentHtml !== undefined) data.contentHtml = sanitizeHtml(dto.contentHtml, SANITIZE);
    if (dto.featuredImage !== undefined) data.featuredImage = dto.featuredImage;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription;
    if (dto.ogImage !== undefined) data.ogImage = dto.ogImage;
    if (dto.slug !== undefined && dto.slug.trim()) {
      data.slug = await this.uniqueSlug(slugify(dto.slug), id);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === PostStatus.PUBLISHED && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    const post = await this.prisma.blogPost.update({ where: { id }, data });
    await this.audit.record({
      userId: editorId,
      action: 'blog.update',
      entity: 'BlogPost',
      entityId: id,
    });
    return post;
  }

  async remove(editorId: string, id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');
    await this.prisma.blogPost.delete({ where: { id } });
    await this.audit.record({
      userId: editorId,
      action: 'blog.delete',
      entity: 'BlogPost',
      entityId: id,
    });
    return { ok: true };
  }

  /** Ensure slug uniqueness, appending -2, -3, … as needed. */
  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const root = base || 'post';
    let slug = root;
    let n = 1;
    // bounded loop; in practice resolves in 1–2 iterations
    while (n < 1000) {
      const found = await this.prisma.blogPost.findUnique({ where: { slug } });
      if (!found || found.id === ignoreId) return slug;
      n += 1;
      slug = `${root}-${n}`;
    }
    return `${root}-${Date.now()}`;
  }
}
