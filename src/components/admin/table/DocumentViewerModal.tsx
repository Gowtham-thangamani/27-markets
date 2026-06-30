// src/components/admin/table/DocumentViewerModal.tsx
import { Download, ExternalLink } from 'lucide-react'
import { Modal, Button } from '@/components/ui'

export interface DocumentViewerModalProps {
  open: boolean
  onClose: () => void
  url: string | null
  fileName?: string
  mimeType?: string
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i
const PDF_RE = /\.pdf$/i

export function DocumentViewerModal({ open, onClose, url, fileName, mimeType }: DocumentViewerModalProps) {
  const name = fileName ?? 'Document'
  const isImage = mimeType?.startsWith('image/') || (fileName ? IMAGE_RE.test(fileName) : false)
  const isPdf = mimeType === 'application/pdf' || (fileName ? PDF_RE.test(fileName) : false)

  return (
    <Modal open={open && !!url} onClose={onClose} title={name} className="max-w-3xl">
      {url && (
        <div className="space-y-4">
          <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-lg border border-white/[0.06] bg-ink-900/60 p-2">
            {isImage ? (
              <img src={url} alt={name} className="max-h-[66vh] max-w-full object-contain" />
            ) : isPdf ? (
              <embed src={url} type="application/pdf" className="h-[66vh] w-full" />
            ) : (
              <p className="p-8 text-sm text-gray-400">Preview not available for this file type.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href={url} download={fileName} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </Button>
            </a>
          </div>
        </div>
      )}
    </Modal>
  )
}
