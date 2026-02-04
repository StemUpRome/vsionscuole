// TypeScript types for Nhost database schema

export type UserRole = 'superadmin' | 'admin_scuola' | 'docente' | 'studente'

export interface Profile {
  id: string
  role: UserRole
  school_id: string | null
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface School {
  id: string
  name: string
  code: string | null
  district_id: string | null
  created_at: string
  updated_at: string
}

export interface Avatar {
  id: string
  user_id: string
  school_id: string | null
  name: string
  image_url: string | null
  language: string
  voice: string | null
  temperature: number
  ai_model: string
  is_template: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AvatarContent {
  id: string
  avatar_id: string
  description: string | null
  personality_openness: number
  personality_conscientiousness: number
  personality_extraversion: number
  personality_agreeableness: number
  personality_neuroticism: number
  created_at: string
  updated_at: string
}

export interface KnowledgeDocument {
  id: string
  user_id: string
  school_id: string | null
  name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  status: 'disponibile' | 'collegato' | 'non_disponibile'
  created_at: string
  updated_at: string
}

export interface AvatarKnowledgeLink {
  id: string
  avatar_id: string
  document_id: string
  created_at: string
}

export interface License {
  id: string
  school_id: string | null
  user_id: string | null
  type: 'trial' | 'basic' | 'premium' | 'enterprise'
  max_avatars: number
  max_students: number
  max_storage_gb: number
  expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  avatar_id: string | null
  session_name: string | null
  messages: any[] // JSONB array
  token_count: number
  created_at: string
  updated_at: string
}

export interface CreateAvatarInput {
  name: string
  image_url?: string
  language?: string
  voice?: string
  temperature?: number
  ai_model?: string
  school_id?: string
}

export interface UpdateAvatarContentInput {
  avatar_id: string
  description?: string
  personality_openness?: number
  personality_conscientiousness?: number
  personality_extraversion?: number
  personality_agreeableness?: number
  personality_neuroticism?: number
}

export interface CreateKnowledgeDocumentInput {
  name: string
  file_path: string
  file_size?: number
  mime_type?: string
  school_id?: string
}
