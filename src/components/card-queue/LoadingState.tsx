import { Skeleton } from '@/components/ui/skeleton'

export function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Priorizando cards...</span>
        <div className="relative w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div className="absolute h-full w-2/5 bg-primary rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  )
}
