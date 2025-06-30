import { supabase } from '../config/supabase.js'

export interface PhysicalLog {
  id?: number
  player_id: number
  date: string
  height: number
  weight: number
  run: string
  user_id?: string
  created_at?: string
}

export const physicalLogService = {
  async getLogs(playerId: number): Promise<PhysicalLog[]> {
    const { data, error } = await supabase
      .from('physical_logs')
      .select('*')
      .eq('player_id', playerId)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },
  async addLog(log: Omit<PhysicalLog, 'id' | 'created_at'>): Promise<PhysicalLog> {
    const { data, error } = await supabase
      .from('physical_logs')
      .insert([log])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async updateLog(id: number, updates: Partial<PhysicalLog>): Promise<PhysicalLog> {
    const { data, error } = await supabase
      .from('physical_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
  async deleteLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('physical_logs')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
} 