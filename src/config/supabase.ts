import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your_supabase_project_url'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// データベースの型定義
export interface Player {
  id?: number
  name: string
  position: string
  age: number
  height: number
  weight: number
  team: string
  jersey_number: number
  created_at?: string
  updated_at?: string
  user_id?: string
}

export interface User {
  id: string
  email: string
  created_at: string
} 