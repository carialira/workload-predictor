interface Props {
  error: string
}

export function ErrorState({ error }: Props) {
  return (
    <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
      {error}
    </div>
  )
}
