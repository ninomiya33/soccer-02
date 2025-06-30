import { supabase } from '../config/supabase.js'

export interface PracticeLog {
  id?: number
  player_id: number
  date: string
  duration: string
  title: string
  description: string
  user_id?: string
  created_at?: string
}

export const practiceLogService = {
  async getLogs(playerId: number): Promise<PracticeLog[]> {
    const { data, error } = await supabase
      .from('practice_logs')
      .select('*')
      .eq('player_id', playerId)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },
  async addLog(log: Omit<PracticeLog, 'id' | 'created_at'>): Promise<PracticeLog> {
    const { data, error } = await supabase
      .from('practice_logs')
      .insert([log])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async updateLog(id: number, updates: Partial<PracticeLog>): Promise<PracticeLog> {
    const { data, error } = await supabase
      .from('practice_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async deleteLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('practice_logs')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
} 