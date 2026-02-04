'use client'

import { useState } from 'react'

interface KnowledgeFile {
  id: string
  name: string
  type: string
  status: string
  size?: number
}

interface KnowledgeBankTabProps {
  files: KnowledgeFile[]
  onFilesChange: (files: KnowledgeFile[]) => void
}

export default function KnowledgeBankTab({ files, onFilesChange }: KnowledgeBankTabProps) {
  const [activeSection, setActiveSection] = useState<'archive' | 'write' | 'upload'>('archive')
  const [writtenContent, setWrittenContent] = useState('')
  const [writtenFileName, setWrittenFileName] = useState('')

  const getFileType = (fileName: string, mimeType: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    
    // Audio files
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) {
      return 'audio'
    }
    
    // Video files
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video'
    }
    
    // PowerPoint files
    if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) {
      return 'presentation'
    }
    
    // PDF files
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf'
    }
    
    // Word documents
    if (mimeType.includes('word') || ['doc', 'docx'].includes(extension)) {
      return 'word'
    }
    
    // Text files
    if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf'].includes(extension)) {
      return 'text'
    }
    
    // Excel files
    if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension)) {
      return 'spreadsheet'
    }
    
    return 'document'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'audio':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        )
      case 'video':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      case 'presentation':
        return (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        )
      case 'pdf':
        return (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        )
      case 'word':
        return (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        )
      case 'text':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'spreadsheet':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles) return

    const newFiles: KnowledgeFile[] = Array.from(uploadedFiles).map((file) => {
      const fileType = getFileType(file.name, file.type)
      return {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: fileType,
        status: 'disponibile',
        size: file.size,
      }
    })

    onFilesChange([...files, ...newFiles])
  }

  const handleSaveWritten = () => {
    if (!writtenContent.trim() || !writtenFileName.trim()) return

    const newFile: KnowledgeFile = {
      id: `written-${Date.now()}`,
      name: writtenFileName,
      type: 'text/plain',
      status: 'disponibile',
    }

    onFilesChange([...files, newFile])
    setWrittenContent('')
    setWrittenFileName('')
    setActiveSection('archive')
  }

  const handleFileAction = (fileId: string, action: 'use' | 'unlink' | 'download' | 'delete') => {
    switch (action) {
      case 'use':
        onFilesChange(
          files.map((f) => (f.id === fileId ? { ...f, status: 'collegato' } : f))
        )
        break
      case 'unlink':
        onFilesChange(
          files.map((f) => (f.id === fileId ? { ...f, status: 'disponibile' } : f))
        )
        break
      case 'delete':
        onFilesChange(files.filter((f) => f.id !== fileId))
        break
      case 'download':
        console.log('Download file:', fileId)
        break
    }
  }

  return (
    <div className="h-full">
      <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-lg">Knowledge Bank</h2>

      {/* Section Selector */}
      <div className="flex gap-2 md:gap-4 mb-4 md:mb-6 border-b border-white/20 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveSection('archive')}
          className={`px-3 md:px-4 py-2 font-medium transition-all relative whitespace-nowrap flex-shrink-0 ${
            activeSection === 'archive'
              ? 'text-white border-b-2 border-blue-300'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <span className="text-sm md:text-base">Archivio</span>
        </button>
        <button
          onClick={() => setActiveSection('write')}
          className={`px-3 md:px-4 py-2 font-medium transition-all relative whitespace-nowrap flex-shrink-0 ${
            activeSection === 'write'
              ? 'text-white border-b-2 border-blue-300'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <span className="text-sm md:text-base">Scrivi</span>
        </button>
        <button
          onClick={() => setActiveSection('upload')}
          className={`px-3 md:px-4 py-2 font-medium transition-all relative whitespace-nowrap flex-shrink-0 ${
            activeSection === 'upload'
              ? 'text-white border-b-2 border-blue-300'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <span className="text-sm md:text-base">Upload un file</span>
        </button>
      </div>

      {/* Archive Section */}
      {activeSection === 'archive' && (
        <div>
          {files.length === 0 ? (
            <div className="text-center py-12 text-white/70">
              <p className="mb-2 text-lg">Nessun file caricato</p>
              <p className="text-sm">Usa &quot;Scrivi&quot; o &quot;Upload un file&quot; per aggiungere contenuti</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all shadow-lg"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400/30 to-blue-600/30 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{file.name}</p>
                      <div className="flex items-center gap-2 flex-wrap text-sm text-white/70">
                        <span className="capitalize">{file.type}</span>
                        {file.size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(file.size)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span
                          className={`${
                            file.status === 'collegato' ? 'text-green-300' : 'text-white/60'
                          }`}
                        >
                          {file.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                    {file.status === 'collegato' ? (
                      <button
                        onClick={() => handleFileAction(file.id, 'unlink')}
                        className="px-2 md:px-3 py-1 text-xs md:text-sm bg-yellow-500/30 backdrop-blur-sm text-yellow-200 border border-yellow-400/30 rounded-lg hover:bg-yellow-500/40 transition-all"
                      >
                        Scollega
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFileAction(file.id, 'use')}
                        className="px-2 md:px-3 py-1 text-xs md:text-sm bg-green-500/30 backdrop-blur-sm text-green-200 border border-green-400/30 rounded-lg hover:bg-green-500/40 transition-all"
                      >
                        Utilizza
                      </button>
                    )}
                    <button
                      onClick={() => handleFileAction(file.id, 'download')}
                      className="px-2 md:px-3 py-1 text-xs md:text-sm bg-blue-500/30 backdrop-blur-sm text-blue-200 border border-blue-400/30 rounded-lg hover:bg-blue-500/40 transition-all"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleFileAction(file.id, 'delete')}
                      className="px-2 md:px-3 py-1 text-xs md:text-sm bg-red-500/30 backdrop-blur-sm text-red-200 border border-red-400/30 rounded-lg hover:bg-red-500/40 transition-all"
                    >
                      Cancella
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Write Section */}
      {activeSection === 'write' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2 drop-shadow-md">
              Nome file
            </label>
            <input
              type="text"
              value={writtenFileName}
              onChange={(e) => setWrittenFileName(e.target.value)}
              placeholder="es. Note_lezione_chimica.txt"
              className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all shadow-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2 drop-shadow-md">
              Contenuto
            </label>
            <textarea
              value={writtenContent}
              onChange={(e) => setWrittenContent(e.target.value)}
              placeholder="Scrivi qui il contenuto del documento..."
              className="w-full min-h-[400px] px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none shadow-xl transition-all"
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSaveWritten}
              disabled={!writtenContent.trim() || !writtenFileName.trim()}
              className="px-6 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-xl hover:from-blue-400/90 hover:to-blue-600/90 disabled:from-gray-500/50 disabled:to-gray-600/50 disabled:cursor-not-allowed transition-all shadow-lg border border-blue-400/50"
            >
              Salva
            </button>
            <button
              onClick={() => {
                setWrittenContent('')
                setWrittenFileName('')
              }}
              className="px-6 py-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl hover:bg-white/30 transition-all shadow-lg"
            >
              Cancella
            </button>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {activeSection === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-white/30 bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center hover:border-white/50 transition-all shadow-xl">
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.rtf,.ppt,.pptx,.xls,.xlsx,.csv,.mp3,.wav,.ogg,.m4a,.aac,.flac,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <svg
                className="w-12 h-12 text-white/70 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-white font-medium mb-2">Clicca per caricare file</p>
              <p className="text-xs md:text-sm text-white/70 mb-4">
                Supportati: PDF, Word (DOC, DOCX), PowerPoint (PPT, PPTX), Excel (XLS, XLSX), 
                Text (TXT, MD, RTF), Audio (MP3, WAV, OGG, M4A, AAC, FLAC), 
                Video (MP4, AVI, MOV, WMV, FLV, WEBM, MKV)
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-xs text-white/60">
                <span className="px-2 py-1 bg-blue-500/20 rounded-lg border border-blue-400/30">📄 Documenti</span>
                <span className="px-2 py-1 bg-green-500/20 rounded-lg border border-green-400/30">🎵 Audio</span>
                <span className="px-2 py-1 bg-purple-500/20 rounded-lg border border-purple-400/30">🎬 Video</span>
                <span className="px-2 py-1 bg-yellow-500/20 rounded-lg border border-yellow-400/30">📊 Presentazioni</span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
