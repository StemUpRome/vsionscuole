-- ==========================================
-- NHOST DATABASE SCHEMA FOR VSION SCUOLA
-- ==========================================

-- ==========================================
-- 1. PROFILES (Estensione Users)
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'studente' CHECK (role IN ('superadmin', 'admin_scuola', 'docente', 'studente')),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. SCHOOLS (Multi-tenancy)
-- ==========================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. DISTRICTS (Opzionale)
-- ==========================================
CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. CLASSES
-- ==========================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  institute_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. AVATARS (Avatar creati dagli utenti)
-- ==========================================
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  language TEXT DEFAULT 'it',
  voice TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  ai_model TEXT DEFAULT 'gpt-4',
  is_template BOOLEAN DEFAULT FALSE, -- true se è template globale (solo superadmin)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_avatar_name UNIQUE(user_id, name)
);

-- ==========================================
-- 6. AVATAR_CONTENTS (Contenuti degli avatar)
-- ==========================================
CREATE TABLE IF NOT EXISTS avatar_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  description TEXT,
  personality_openness INTEGER DEFAULT 50 CHECK (personality_openness >= 0 AND personality_openness <= 100),
  personality_conscientiousness INTEGER DEFAULT 50 CHECK (personality_conscientiousness >= 0 AND personality_conscientiousness <= 100),
  personality_extraversion INTEGER DEFAULT 50 CHECK (personality_extraversion >= 0 AND personality_extraversion <= 100),
  personality_agreeableness INTEGER DEFAULT 50 CHECK (personality_agreeableness >= 0 AND personality_agreeableness <= 100),
  personality_neuroticism INTEGER DEFAULT 50 CHECK (personality_neuroticism >= 0 AND personality_neuroticism <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(avatar_id)
);

-- ==========================================
-- 7. KNOWLEDGE_DOCUMENTS (Documenti Knowledge Bank)
-- ==========================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path nel bucket storage
  file_size BIGINT,
  mime_type TEXT,
  status TEXT DEFAULT 'disponibile' CHECK (status IN ('disponibile', 'collegato', 'non_disponibile')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. AVATAR_KNOWLEDGE_LINKS (Link Avatar-Documenti)
-- ==========================================
CREATE TABLE IF NOT EXISTS avatar_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(avatar_id, document_id)
);

-- ==========================================
-- 9. LICENSES (Licenze)
-- ==========================================
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('trial', 'basic', 'premium', 'enterprise')),
  max_avatars INTEGER DEFAULT 10,
  max_students INTEGER DEFAULT 100,
  max_storage_gb INTEGER DEFAULT 10,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 10. CHAT_SESSIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
  session_name TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 11. LAB_SESSIONS (per futuri laboratori)
-- ==========================================
CREATE TABLE IF NOT EXISTS lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  lab_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended'))
);

-- ==========================================
-- 12. INDEXES per performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_avatars_school_id ON avatars(school_id);
CREATE INDEX IF NOT EXISTS idx_avatar_contents_avatar_id ON avatar_contents(avatar_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_school_id ON knowledge_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_avatar_knowledge_links_avatar_id ON avatar_knowledge_links(avatar_id);
CREATE INDEX IF NOT EXISTS idx_avatar_knowledge_links_document_id ON avatar_knowledge_links(document_id);
CREATE INDEX IF NOT EXISTS idx_licenses_school_id ON licenses(school_id);
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_avatar_id ON chat_sessions(avatar_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

-- ==========================================
-- 13. TRIGGERS per updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_avatars_updated_at BEFORE UPDATE ON avatars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avatar_contents_updated_at BEFORE UPDATE ON avatar_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 14. ROW LEVEL SECURITY (RLS) Policies
-- ==========================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_sessions ENABLE ROW LEVEL SECURITY;

-- PROFILES: Gli utenti possono vedere solo il proprio profilo
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- AVATARS: Gli utenti possono vedere/modificare solo i propri avatar (o quelli della propria scuola per docenti)
CREATE POLICY "Users can view own avatars" ON avatars
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_scuola' AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create own avatars" ON avatars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own avatars" ON avatars
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
  );

CREATE POLICY "Users can delete own avatars" ON avatars
  FOR DELETE USING (auth.uid() = user_id);

-- KNOWLEDGE_DOCUMENTS: Gli utenti possono vedere/modificare solo i propri documenti
CREATE POLICY "Users can view own documents" ON knowledge_documents
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin_scuola', 'docente') AND 
    (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) OR school_id IS NULL)
  );

CREATE POLICY "Users can create own documents" ON knowledge_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON knowledge_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON knowledge_documents
  FOR DELETE USING (auth.uid() = user_id);

-- AVATAR_CONTENTS: Stesso accesso degli avatar
CREATE POLICY "Users can view avatar contents" ON avatar_contents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM avatars WHERE avatars.id = avatar_contents.avatar_id AND (
      avatars.user_id = auth.uid() OR
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    ))
  );

CREATE POLICY "Users can manage avatar contents" ON avatar_contents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM avatars WHERE avatars.id = avatar_contents.avatar_id AND avatars.user_id = auth.uid())
  );

-- CHAT_SESSIONS: Gli utenti possono vedere solo le proprie sessioni
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- LICENSES: Solo superadmin e admin_scuola possono vedere le licenze
CREATE POLICY "Admins can view licenses" ON licenses
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin_scuola') AND
    (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) OR school_id IS NULL OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin')
  );

-- SCHOOLS: Solo superadmin può gestire le scuole
CREATE POLICY "Superadmin can manage schools" ON schools
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- CLASSES: Docenti e admin possono vedere le classi della propria scuola
CREATE POLICY "Users can view school classes" ON classes
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin_scuola', 'docente') AND
    (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin')
  );
