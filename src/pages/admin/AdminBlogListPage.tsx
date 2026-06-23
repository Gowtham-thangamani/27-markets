import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Button, Badge, SkeletonRows, ErrorState } from '@/components/ui'
import { blogApi, type AdminBlogRow } from '@/lib/blogApi'
import { ApiError } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—'
}

export default function AdminBlogListPage() {
  const toast = useToast()
  const [rows, setRows] = useState<AdminBlogRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await blogApi.adminList())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load posts')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (id: string) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    try {
      await blogApi.remove(id)
      toast.success('Deleted', 'Post removed.')
      void load()
    } catch (e) {
      toast.error('Delete failed', e instanceof ApiError ? e.message : 'Could not delete')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title="Blog" subtitle="Create and manage published articles." />
        <Link to="/admin/blog/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New post
          </Button>
        </Link>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-10 text-center text-gray-400">
          No posts yet — create your first.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Published</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{r.title}</p>
                    <p className="text-xs text-gray-500">/{r.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={r.status === 'PUBLISHED' ? 'success' : 'neutral'}>{r.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{fmt(r.publishedAt)}</td>
                  <td className="px-5 py-3.5 text-gray-400">{fmt(r.updatedAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/blog/${r.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(r.id)}
                        className="gap-1 text-danger"
                        aria-label="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
