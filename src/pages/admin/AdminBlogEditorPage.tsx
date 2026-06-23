import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Button } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { blogApi, type PostStatus, type SavePostInput } from '@/lib/blogApi'
import { ApiError } from '@/lib/api'

const field =
  'w-full rounded-lg border border-white/[0.08] bg-ink-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition-colors focus:border-brand-500/50'
const label = 'mb-1.5 block text-xs font-medium text-gray-400'

const EMPTY: SavePostInput = {
  title: '',
  contentHtml: '',
  excerpt: '',
  slug: '',
  featuredImage: '',
  seoTitle: '',
  seoDescription: '',
  ogImage: '',
  status: 'DRAFT',
}

const OPTIONAL_KEYS = ['excerpt', 'slug', 'featuredImage', 'seoTitle', 'seoDescription', 'ogImage'] as const

export default function AdminBlogEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<SavePostInput>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) return
    let active = true
    blogApi
      .adminGet(id!)
      .then((p) => {
        if (!active) return
        setForm({
          title: p.title,
          contentHtml: p.contentHtml,
          excerpt: p.excerpt ?? '',
          slug: p.slug,
          featuredImage: p.featuredImage ?? '',
          seoTitle: p.seoTitle ?? '',
          seoDescription: p.seoDescription ?? '',
          ogImage: p.ogImage ?? '',
          status: p.status,
        })
      })
      .catch((e) => toast.error('Load failed', e instanceof ApiError ? e.message : 'Could not load post'))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, isNew, toast])

  const set =
    (k: keyof SavePostInput) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const preview = useMemo(() => DOMPurify.sanitize(form.contentHtml || ''), [form.contentHtml])
  const canSave = !!form.title && !!form.contentHtml && !saving

  const save = async (status?: PostStatus) => {
    setSaving(true)
    try {
      const payload: SavePostInput = { ...form, status: status ?? form.status }
      // drop empty optional strings so they don't fail URL validation
      for (const k of OPTIONAL_KEYS) if (!payload[k]) delete payload[k]

      if (isNew) {
        const created = await blogApi.create(payload)
        toast.success('Saved', 'Post created.')
        navigate(`/admin/blog/${created.id}`)
      } else {
        await blogApi.update(id!, payload)
        toast.success('Saved', 'Post updated.')
        setForm((f) => ({ ...f, status: payload.status }))
      }
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError ? e.message : 'Could not save post')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (isNew || !window.confirm('Delete this post?')) return
    try {
      await blogApi.remove(id!)
      toast.success('Deleted', 'Post removed.')
      navigate('/admin/blog')
    } catch (e) {
      toast.error('Delete failed', e instanceof ApiError ? e.message : 'Could not delete')
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Loading…</div>

  return (
    <>
      <button
        onClick={() => navigate('/admin/blog')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to posts
      </button>

      <PageTitle
        title={isNew ? 'New post' : 'Edit post'}
        subtitle="Title, rich content, featured image, and SEO metadata."
      />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className={label}>Title</label>
            <input className={field} value={form.title} onChange={set('title')} placeholder="How spreads work" />
          </div>
          <div>
            <label className={label}>Slug (optional — auto-generated from title)</label>
            <input className={field} value={form.slug} onChange={set('slug')} placeholder="how-spreads-work" />
          </div>
          <div>
            <label className={label}>Excerpt</label>
            <textarea className={field} rows={2} value={form.excerpt} onChange={set('excerpt')} placeholder="Short summary shown on cards and used as a meta-description fallback." />
          </div>
          <div>
            <label className={label}>Content (HTML)</label>
            <textarea
              className={`${field} font-mono text-xs`}
              rows={14}
              value={form.contentHtml}
              onChange={set('contentHtml')}
              placeholder="<h2>Heading</h2>&#10;<p>Your article…</p>"
            />
          </div>
          <div>
            <label className={label}>Featured image URL</label>
            <input className={field} value={form.featuredImage} onChange={set('featuredImage')} placeholder="https://…/image.jpg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>SEO title</label>
              <input className={field} value={form.seoTitle} onChange={set('seoTitle')} />
            </div>
            <div>
              <label className={label}>OG image URL</label>
              <input className={field} value={form.ogImage} onChange={set('ogImage')} placeholder="https://…/share.jpg" />
            </div>
          </div>
          <div>
            <label className={label}>SEO description</label>
            <textarea className={field} rows={2} value={form.seoDescription} onChange={set('seoDescription')} />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={field} value={form.status} onChange={set('status')}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => save()} disabled={!canSave} className="gap-1.5">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </Button>
            {form.status !== 'PUBLISHED' && (
              <Button variant="outline" onClick={() => save('PUBLISHED')} disabled={!canSave}>
                Save &amp; publish
              </Button>
            )}
            {!isNew && (
              <Button variant="ghost" onClick={remove} className="gap-1.5 text-danger">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="h-fit lg:sticky lg:top-6">
          <p className={label}>Preview</p>
          <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-5">
            {form.featuredImage && (
              <img src={form.featuredImage} alt="" className="mb-4 w-full rounded-xl object-cover" />
            )}
            <h2 className="font-display text-xl font-bold text-white">{form.title || 'Untitled'}</h2>
            <div
              className="mt-3 text-sm leading-relaxed text-gray-300 [&_a]:text-brand-400 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_img]:my-4 [&_img]:rounded-lg [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
