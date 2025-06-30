import { supabase } from '../config/supabase.js'

export interface SkillLog {
  id?: number
  player_id: number
  date: string
  shoot: number
  pass: number
  dribble: number
  defense: number
  tactic: number
  comment?: string
  user_id?: string
  created_at?: string
}

export const skillLogService = {
  async getLogs(playerId: number): Promise<SkillLog[]> {
    const { data, error } = await supabase
      .from('skill_logs')
      .select('*')
      .eq('player_id', playerId)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },
  async addLog(log: Omit<SkillLog, 'id' | 'created_at'>): Promise<SkillLog> {
    const { data, error } = await supabase
      .from('skill_logs')
      .insert([log])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async updateLog(id: number, updates: Partial<SkillLog>): Promise<SkillLog> {
    const { data, error } = await supabase
      .from('skill_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async deleteLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('skill_logs')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
} 