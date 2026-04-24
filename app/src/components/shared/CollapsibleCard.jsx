import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid'

export default function CollapsibleCard({ title, subtitle, summary, headerRight, children }) {
  const [isOpen, setIsOpen] = useState(false)
  const ChevronIcon = isOpen ? ChevronUpIcon : ChevronDownIcon

  return (
    <div className="p-5 flex flex-col gap-4 rounded-lg bg-surface-2 border border-border">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center justify-between gap-4 text-left w-full cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-fg">{title}</h3>
          <p className="text-xs mt-0.5 text-fg-subtle">
            {isOpen ? subtitle : summary}
          </p>
        </div>
        {headerRight && isOpen && (
          <div onClick={e => e.stopPropagation()}>{headerRight}</div>
        )}
        <ChevronIcon className="w-8 h-8 text-fg-subtle shrink-0" />
      </button>

      {isOpen && (
        <>
          {children}
          {summary && (
            <p className="text-xs text-fg-muted leading-relaxed border-t border-border pt-3 -mb-1">
              {summary}
            </p>
          )}
        </>
      )}
    </div>
  )
}
