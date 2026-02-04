'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [userName] = useState('Irene')
  const [formData, setFormData] = useState({
    name: 'Irene',
    surname: '',
    email: '',
    language: 'English',
  })

  const handleLogout = () => {
    // TODO: Implementare logout
    console.log('Logout')
  }

  const handleChangeEmail = () => {
    // TODO: Implementare cambio email
    console.log('Change email')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implementare salvataggio impostazioni
    console.log('Save settings', formData)
  }

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#1A1A1A] border-r border-[#2C2C2E] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-white font-semibold text-lg">ZenkAI</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="font-medium">Home</span>
          </button>

          <button
            onClick={() => router.push('/avatars')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="font-medium">Avatar</span>
          </button>

          <button
            onClick={() => router.push('/chat')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="font-medium">Chat</span>
          </button>

          <button
            onClick={() => router.push('/material')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="font-medium">Material</span>
          </button>

          {/* Separator */}
          <div className="pt-4 border-t border-[#2C2C2E] mt-4"></div>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#6B48FF] text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="font-medium">Settings</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">Support</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-[#1A1A1A] text-xs font-bold">I</span>
            </div>
            <div className="flex-1">
              <p className="text-[#A0A0A0] text-sm">Welcome back</p>
              <p className="text-white font-medium">{userName}</p>
            </div>
            <span className="text-lg">👋</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Title Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-[#A0A0A0] text-base">Manage your account settings and preferences</p>
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] transition-colors"
                placeholder="Enter your name"
              />
            </div>

            {/* Surname Field */}
            <div>
              <label htmlFor="surname" className="block text-sm font-medium text-white mb-2">
                Surname
              </label>
              <input
                type="text"
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] transition-colors"
                placeholder="Enter your surname"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="flex-1 px-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] transition-colors"
                  placeholder="Enter your email"
                />
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="px-6 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Language Field */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-white mb-2">
                Language
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white focus:outline-none focus:border-[#6B48FF] transition-colors"
              >
                <option value="English">English</option>
                <option value="Italian">Italian</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
              >
                Save Changes
              </button>
            </div>

            {/* Logout Button */}
            <div className="pt-8 border-t border-[#2C2C2E]">
              <button
                type="button"
                onClick={handleLogout}
                className="px-6 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
