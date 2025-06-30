import { supabase } from '../config/supabase.js'

export interface MatchLog {
  id?: number
  player_id: number
  date: string
  opponent: string
  result: string
  score: string
  note?: string
  status: string
  user_id?: string
  created_at?: string
}

export const matchLogService = {
  async getLogs(playerId: number): Promise<MatchLog[]> {
    const { data, error } = await supabase
      .from('match_logs')
      .select('*')
      .eq('player_id', playerId)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },
  async addLog(log: Omit<MatchLog, 'id' | 'created_at'>): Promise<MatchLog> {
    const { data, error } = await supabase
      .from('match_logs')
      .insert([log])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async updateLog(id: number, updates: Partial<MatchLog>): Promise<MatchLog> {
    const { data, error } = await supabase
      .from('match_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async deleteLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('match_logs')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
} 