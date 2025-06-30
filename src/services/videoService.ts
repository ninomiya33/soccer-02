import { supabase } from '../config/supabase.js';

export interface Video {
  id?: number;
  title: string;
  url: string;
  type: 'match' | 'practice' | 'analysis';
  uploaded_by?: string;
  created_at?: string;
  views?: number;
  thumbnail?: string;
  duration?: string;
}

export const videoService = {
  async getVideos(): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async addVideo(video: Omit<Video, 'id' | 'created_at' | 'views'>): Promise<Video> {
    const { data, error } = await supabase
      .from('videos')
      .insert([video])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  async uploadVideoFile(file: File, userId: string): Promise<string> {
    const filePath = `videos/${userId}_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('videos').upload(filePath, file);
    if (error) throw new Error(error.message);
    // 公開URL取得
    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filePath);
    return urlData.publicUrl;
  },
  async deleteVideo(id: number): Promise<void> {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
  async uploadThumbnailFile(blob: Blob, userId: string): Promise<string> {
    const filePath = `thumbnails/${userId}_${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from('videos').upload(filePath, blob, { contentType: 'image/jpeg' });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filePath);
    return urlData.publicUrl;
  },
  async updateVideo(id: number, updates: Partial<Video>): Promise<Video> {
    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
}; 