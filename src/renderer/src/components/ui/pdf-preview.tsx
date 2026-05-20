import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PdfPreviewProps {
  buffer: Uint8Array | null
  className?: string
  emptyLabel?: string
}

export function PdfPreview({
  buffer,
  className,
  emptyLabel = 'Selecione um arquivo .docx para ver a pré-visualização'
}: PdfPreviewProps): React.JSX.Element {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }

    if (!buffer) {
      setBlobUrl(null)
      return
    }

    const blob = new Blob([buffer.slice()], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    urlRef.current = url
    setBlobUrl(url)

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [buffer])

  if (!blobUrl) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 p-6 text-center',
          className
        )}
      >
        <FileText size={40} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <iframe
      key={blobUrl}
      src={blobUrl}
      className={cn('w-full border-0', className)}
      title="Pré-visualização do documento"
    />
  )
}
