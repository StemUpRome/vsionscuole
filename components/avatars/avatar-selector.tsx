'use client'

import { useState } from 'react'

interface AvatarSelectorProps {
  selectedAvatar: string | null
  onSelectAvatar: (avatarUrl: string) => void
}

export default function AvatarSelector({ selectedAvatar, onSelectAvatar }: AvatarSelectorProps) {
  // Usa le immagini reali degli avatar dalla cartella public
  const generateAvatarGrid = () => {
    const avatars: string[] = []
    // Abbiamo 16 immagini reali (avatar-1.png fino a avatar-16.png)
    for (let i = 1; i <= 16; i++) {
      avatars.push(`/avatar-${i}.png`)
    }
    return avatars
  }

  const avatars = generateAvatarGrid()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 max-h-96 overflow-y-auto p-2">
      {avatars.map((avatarUrl, index) => (
        <button
          key={index}
          onClick={() => onSelectAvatar(avatarUrl)}
          className={`relative aspect-square rounded-xl overflow-hidden border-2 backdrop-blur-sm transition-all shadow-lg ${
            selectedAvatar === avatarUrl
              ? 'border-blue-400 ring-4 ring-blue-300/50 shadow-blue-500/50 scale-105'
              : 'border-white/30 hover:border-blue-400/60 hover:shadow-blue-400/30'
          }`}
        >
          <img
            src={avatarUrl}
            alt={`Avatar ${index + 1}`}
            className="w-full h-full object-cover"
          />
          {selectedAvatar === avatarUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-blue-600/30 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-blue-500 rounded-full p-2 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
                </svg>
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
