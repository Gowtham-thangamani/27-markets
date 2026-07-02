import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { ArrowLeft } from 'lucide-react'
import { Skeleton, ErrorState } from '@/components/ui'
import { blogApi, type BlogPost } from '@/lib/blogApi'
import { ApiError } from '@/lib/api'
import { useSeo } from '@/lib/useSeo'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const PROSE =
  'mt-8 text-[15px] leading-relaxed text-gray-300 ' +
  '[&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white ' +
  '[&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white ' +
  '[&_p]:mt-4 [&_a]:text-brand-400 [&_a]:underline ' +
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 ' +
  '[&_img]:my-6 [&_img]:rounded-xl ' +
  '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-brand-500 [&_blockquote]:pl-4 [&_blockquote]:text-gray-400'

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!slug) return
    setError(null)
    try {
      setPost(await blogApi.bySlug(slug))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Post not found')
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  useSeo({
    title: post ? `${post.seoTitle || post.title} — 27 Markets` : undefined,
    description: post?.seoDescription || post?.excerpt,
    image: post?.ogImage || post?.featuredImage,
  })

  const html = post ? DOMPurify.sanitize(post.contentHtml) : ''

  return (
    <article className="container-x max-w-3xl py-16">
      <Link
        to="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>

      {error ? (
        <div className="mt-8">
          <ErrorState description={error} onRetry={load} />
        </div>
      ) : !post ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-brand-400">{formatDate(post.publishedAt)}</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {post.title}
          </h1>
          {post.author && (
            <p className="mt-3 text-sm text-gray-500">
              By {post.author.firstName} {post.author.lastName}
            </p>
          )}
          {post.featuredImage && (
            <img src={post.featuredImage} alt={post.title} className="mt-8 w-full rounded-2xl object-cover" />
          )}
          <div className={PROSE} dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
    </article>
  )
}
