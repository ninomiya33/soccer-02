import { supabase } from '../config/supabase.js';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  age?: number;
  grade?: string;
  gender?: string;
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
  },
  async uploadAvatarFile(file: File, userId: string): Promise<string> {
    const filePath = `avatars/${userId}_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('avatars').upload(filePath, file);
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return urlData.publicUrl;
  }
}; 