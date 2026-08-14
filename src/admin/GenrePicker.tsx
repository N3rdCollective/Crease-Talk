import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { MUSIC_GENRES, filterMusicGenres, normalizeGenreLabel } from '../lib/genres'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
}

export function GenrePicker({ value, onChange, max = 8 }: Props) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const suggestions = useMemo(
    () => filterMusicGenres(query, value).slice(0, 12),
    [query, value],
  )

  const canAddCustom =
    query.trim().length > 0 &&
    !value.some((g) => g.toLowerCase() === query.trim().toLowerCase()) &&
    !MUSIC_GENRES.some((g) => g.toLowerCase() === query.trim().toLowerCase())

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function addGenre(raw: string) {
    const label = normalizeGenreLabel(raw)
    if (!label) return
    if (value.some((g) => g.toLowerCase() === label.toLowerCase())) {
      setQuery('')
      return
    }
    if (value.length >= max) return
    onChange([...value, label])
    setQuery('')
  }

  function removeGenre(label: string) {
    onChange(value.filter((g) => g !== label))
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="mt-2 flex min-h-[42px] flex-wrap items-center gap-2 border border-neutral-300 bg-white px-2 py-2">
        {value.map((genre) => (
          <span
            key={genre}
            className="inline-flex items-center gap-1 bg-black px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase"
          >
            {genre}
            <button
              type="button"
              aria-label={`Remove ${genre}`}
              onClick={() => removeGenre(genre)}
              className="opacity-70 hover:opacity-100"
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <div className="flex min-w-[10rem] flex-1 items-center gap-1">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (suggestions[0]) addGenre(suggestions[0])
                else if (canAddCustom) addGenre(query)
              } else if (e.key === 'Backspace' && !query && value.length) {
                removeGenre(value[value.length - 1]!)
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder={
              value.length ? 'Add another genre…' : 'Search or pick a genre…'
            }
            className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
          />
          <button
            type="button"
            aria-label="Show all genres"
            onClick={() => setOpen((v) => !v)}
            className="p-1 text-neutral-500 hover:text-black"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-neutral-200 bg-white shadow-lg"
        >
          {suggestions.map((genre) => (
            <li key={genre}>
              <button
                type="button"
                role="option"
                className="flex w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addGenre(genre)}
              >
                {genre}
              </button>
            </li>
          ))}
          {canAddCustom && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addGenre(query)}
              >
                <Plus className="size-3.5" />
                Add “{normalizeGenreLabel(query)}”
              </button>
            </li>
          )}
          {suggestions.length === 0 && !canAddCustom && (
            <li className="px-3 py-3 text-xs text-neutral-400">
              No matching genres. Type a custom one and press Enter.
            </li>
          )}
        </ul>
      )}

      <p className="mt-1 text-xs text-neutral-400">
        Pick from the list or type to search. Up to {max} genres.
      </p>
    </div>
  )
}
