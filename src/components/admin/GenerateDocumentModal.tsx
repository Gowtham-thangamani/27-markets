import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientDetail, type DocumentPrepare, type TextTemplate } from '@/lib/adminApi'

/** Trigger a browser download for a generated blob. */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function GenerateDocumentModal({
  client,
  onClose,
}: {
  client: ClientDetail | null
  onClose: () => void
}) {
  const toast = useToast()
  const [templates, setTemplates] = useState<TextTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [prep, setPrep] = useState<DocumentPrepare | null>(null)
  const [vars, setVars] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!client) return
    adminApi
      .listTextTemplates('PDF')
      .then((all) => setTemplates(all.filter((t) => t.enabled)))
      .catch(() => setTemplates([]))
  }, [client])

  // Default to the client's first account so the common case needs no picking.
  useEffect(() => {
    if (client && client.accounts.length > 0) setAccountId(client.accounts[0].id)
  }, [client])

  const load = useCallback(
    async (id: string, acct: string) => {
      if (!client || !id) return
      try {
        setPrep(await adminApi.prepareDocument(id, client.id, acct || undefined))
      } catch (e) {
        toast.error('Could not prepare document', e instanceof ApiError ? e.message : (e as Error).message)
      }
    },
    [client, toast],
  )

  useEffect(() => {
    setVars({})
    void load(templateId, accountId)
  }, [templateId, accountId, load])

  const generate = async () => {
    if (!client || !templateId) return
    setBusy(true)
    try {
      const blob = await adminApi.generateDocument({
        templateId,
        clientId: client.id,
        ...(prep?.needsAccount ? { accountId } : {}),
        vars,
      })
      const name = templates.find((t) => t.id === templateId)?.name ?? 'document'
      download(blob, `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
      toast.success('Document generated')
      onClose()
    } catch (e) {
      toast.error('Could not generate', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!client) return null
  const selected = templates.find((t) => t.id === templateId)

  return (
    <Modal open={!!client} onClose={onClose} title="Generate document" description={client.name} className="max-w-lg">
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-400">Template</span>
          <select
            aria-label="Template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-ink-800 px-3 py-2 text-white"
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        {selected && <h4 className="text-sm font-semibold text-white">{selected.name}</h4>}

        {prep?.needsAccount && (
          <label className="block text-sm">
            <span className="mb-1 block text-gray-400">Trading account</span>
            <select
              aria-label="Trading account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-ink-800 px-3 py-2 text-white"
            >
              {client.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.number} · {a.type}
                </option>
              ))}
            </select>
          </label>
        )}

        {prep?.manualTokens.map((token) => (
          <Input
            key={token}
            label={token}
            value={vars[token] ?? ''}
            onChange={(e) => setVars((v) => ({ ...v, [token]: e.target.value }))}
          />
        ))}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={generate} loading={busy} disabled={!templateId}>
            Generate PDF
          </Button>
        </div>
      </div>
    </Modal>
  )
}
