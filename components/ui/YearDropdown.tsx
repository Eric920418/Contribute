// YearDropdown.tsx
import { useEffect, useRef, useState } from 'react'

type Option = { value: number; label: string; id?: string }

export default function YearDropdown({
  value,
  selectedId,
  onChange,
  options,
  className = '',
}: {
  value: number
  selectedId?: string
  onChange: (conferenceId: string, year: number) => void
  options: Option[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const selected = options.find(o => (selectedId ? o.id === selectedId : o.value === value)) ?? options[0] ?? { value: 0, label: '載入中...', id: 'loading' }

  return (
    <div className={`relative z-[9999] ${className}`} ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 focus:outline-none max-w-xs lg:max-w-md"
      >
        <span className="text-28M text-[#00182C] truncate">{selected?.label || '載入中...'}</span>
        <svg width="48" height="48" viewBox="0 0 32 28" aria-hidden="true" className="flex-shrink-0">
          <path
            d="M7 10l5 5 5-5"
            fill="none"
            stroke="#00182C"
            strokeWidth="2"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-2 min-w-80 max-w-96 rounded-lg border border-slate-200 bg-white shadow-lg z-[9999]"
        >
          {options.length > 0 ? options.map(opt => (
            <li
              key={opt.id || opt.value}
              role="option"
              aria-selected={selectedId ? opt.id === selectedId : opt.value === value}
              onClick={() => {
                onChange(opt.id || `year-${opt.value}`, opt.value)
                setOpen(false)
              }}
              className="cursor-pointer px-3 py-2 text-slate-800 hover:bg-slate-100 text-sm leading-relaxed"
            >
              {opt.label}
            </li>
          )) : (
            <li className="px-3 py-2 text-slate-400 text-sm">
              載入中...
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
