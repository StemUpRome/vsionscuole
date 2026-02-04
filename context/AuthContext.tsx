'use client'

import React, { createContext, useContext } from 'react'

type Student = {
  id: string
  name: string
  grade?: string
  schoolType?: string
  schoolLevel?: string
}

type AuthContextType = {
  currentStudent: Student | null
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Stub demo: singolo studente fittizio
  const value: AuthContextType = {
    currentStudent: { id: 'demo-student', name: 'Irene' },
    token: null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }
  return context
}

