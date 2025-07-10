import { supabase } from '../config/supabase.js';

export interface Schedule {
  id?: number;
  user_id: string;
  type: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  description?: string;
  items?: string[];
  latitude: number | null;
  longitude: number | null;
  created_at?: string;
}

export const scheduleService = {
  async getSchedules(): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('date', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async addSchedule(schedule: Omit<Schedule, 'id' | 'created_at'>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .insert([schedule])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  async deleteSchedule(id: number): Promise<void> {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
}; 