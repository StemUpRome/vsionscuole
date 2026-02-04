'use client'

import { useState } from 'react'

export interface DocItem {
  id: string
  name: string
}

interface ExistingDocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  documents?: DocItem[]
  onSelect: (selected: DocItem[]) => void
}

const DEFAULT_DOCS: DocItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: `doc-${i + 1}`,
  name: 'Document.pdf',
}))

export function ExistingDocumentsModal({
  isOpen,
  onClose,
  documents = DEFAULT_DOCS,
  onSelect,
}: ExistingDocumentsModalProps) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const selected = documents.filter((d) => selectedIds.has(d.id))
    onSelect(selected)
    setSelectedIds(new Set())
    setSearch('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1A1A1A] border border-[#2C2C2E] rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#2C2C2E]">
          <h2 className="text-xl font-semibold text-white mb-4">Existing documents</h2>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0A0A0]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search File"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.map((doc) => (
            <label
              key={doc.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(doc.id)}
                onChange={() => toggle(doc.id)}
                className="w-5 h-5 rounded border-[#2C2C2E] bg-[#2C2C2E] text-[#6B48FF] focus:ring-[#6B48FF]"
              />
              <span className="text-white group-hover:text-[#A0A0A0]">{doc.name}</span>
            </label>
          ))}
        </div>

        <div className="p-6 border-t border-[#2C2C2E] flex justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  )
}
