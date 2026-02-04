'use client'

import { useCallback, useRef } from 'react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadFile?: (file: File) => void
  onExistingFile?: () => void
}

export function UploadModal({ isOpen, onClose, onUploadFile, onExistingFile }: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file && onUploadFile) onUploadFile(file)
    },
    [onUploadFile]
  )

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUploadFile) onUploadFile(file)
    e.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1A1A1A] border border-[#2C2C2E] rounded-2xl w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2E]">
          <h2 className="text-xl font-semibold text-white">Upload</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#A0A0A0] hover:text-white hover:bg-[#2C2C2E] rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          className="mx-6 mt-6 p-8 border-2 border-dashed border-[#2C2C2E] rounded-xl flex flex-col items-center justify-center min-h-[180px] gap-2"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <p className="text-white font-medium">Insert a document</p>
          <p className="text-[#A0A0A0] text-sm">Click or drag a file you want to use.</p>
        </div>

        {/* Buttons */}
        <div className="p-6 flex gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload file
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={onExistingFile}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Existing file
          </button>
        </div>
      </div>
    </div>
  )
}
