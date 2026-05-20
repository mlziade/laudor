import { cn } from '../../lib/utils'

export function PreviewSkeleton({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('overflow-hidden p-8', className)}>
      <div className="animate-pulse space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-4 w-1/2 rounded bg-muted" />
          <div className="mx-auto h-3 w-1/3 rounded bg-muted/70" />
        </div>
        <div className="space-y-2 pt-4">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-[96%] rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-[84%] rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-[91%] rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-[88%] rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-[75%] rounded bg-muted" />
        </div>
        <div className="space-y-1 pt-2">
          <div className="flex gap-1">
            <div className="h-6 flex-1 rounded bg-muted" />
            <div className="h-6 flex-1 rounded bg-muted" />
            <div className="h-6 flex-1 rounded bg-muted" />
          </div>
          <div className="flex gap-1">
            <div className="h-5 flex-1 rounded bg-muted/60" />
            <div className="h-5 flex-1 rounded bg-muted/60" />
            <div className="h-5 flex-1 rounded bg-muted/60" />
          </div>
          <div className="flex gap-1">
            <div className="h-5 flex-1 rounded bg-muted/60" />
            <div className="h-5 flex-1 rounded bg-muted/60" />
            <div className="h-5 flex-1 rounded bg-muted/60" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-[93%] rounded bg-muted" />
          <div className="h-3 w-[67%] rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
