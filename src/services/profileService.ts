import { supabase } from '../config/supabase.js';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  age?: number;
  grade?: string;
  created_at?: string;
}

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },
  async upsertProfile(profile: Profile): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert([profile], { onConflict: 'id' })
      .select()
      .single();
    if (error) return null;
    return data;
  }
}; 