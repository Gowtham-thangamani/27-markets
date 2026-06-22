import { useId, useRef, useState, type DragEvent } from 'react'
import { UploadCloud, FileCheck2, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FileUploadProps {
  label?: string
  accept?: string
  value?: string
  onFile?: (file: File) => void
  onClear?: () => void
}

export function FileUpload({ label, accept = 'image/*,.pdf', value, onFile, onClear }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) onFile?.(files[0])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileCheck2 className="h-5 w-5 shrink-0 text-success" />
          <span className="truncate text-sm text-gray-200">{value}</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove file"
          className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium text-gray-300">{label}</p>}
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
          dragging
            ? 'border-brand-500 bg-brand-500/[0.07]'
            : 'border-white/15 hover:border-brand-500/50 hover:bg-white/[0.02]'
        )}
      >
        <UploadCloud className="h-7 w-7 text-brand-400" />
        <span className="text-sm text-gray-300">
          <span className="font-semibold text-white">Click to upload</span> or drag and drop
        </span>
        <span className="text-xs text-gray-500">PNG, JPG or PDF — up to 10MB</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  )
}
