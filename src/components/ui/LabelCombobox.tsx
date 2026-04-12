import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LabelComboboxProps {
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
}

export function LabelCombobox({ value, onChange, options }: LabelComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  function remove(option: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter((v) => v !== option))
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'min-h-8 w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none cursor-pointer',
          'hover:bg-accent/50',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          open && 'border-ring ring-3 ring-ring/50'
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-muted-foreground">Selecionar labels...</span>
          ) : (
            value.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-sm font-medium"
              >
                {v}
                <button
                  type="button"
                  onClick={(e) => remove(v, e)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum resultado</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm hover:bg-accent/60 text-left cursor-pointer"
                >
                  {option}
                  {value.includes(option) && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
