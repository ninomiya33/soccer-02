import { supabase, Player } from '../config/supabase.js'

export const playerService = {
  // 選手一覧を取得
  async getPlayers(userId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`選手データの取得に失敗しました: ${error.message}`)
    }

    return data || []
  },

  // 選手を追加
  async addPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select()
      .single()

    if (error) {
      throw new Error(`選手の追加に失敗しました: ${error.message}`)
    }

    return data
  },

  // 選手を更新
  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`選手の更新に失敗しました: ${error.message}`)
    }

    return data
  },

  // 選手を削除
  async deletePlayer(id: number): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`選手の削除に失敗しました: ${error.message}`)
    }
  },

  // 選手をIDで取得
  async getPlayerById(id: number): Promise<Player | null> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // 選手が見つからない
      }
      throw new Error(`選手データの取得に失敗しました: ${error.message}`)
    }

    return data
  }
} 