import { supabase } from '../config/supabase.js';

export async function saveAdviceLog(log: {
  user_id?: string;
  date: string;
  age: number;
  gender: string;
  run50m: number;
  shuttle_run: number;
  jump: number;
  sit_up: number;
  sit_and_reach: number;
  advice: string;
}) {
  const { error } = await supabase.from('advice_logs').insert([log]);
  if (error) throw error;
}

export async function getAdviceLogs(user_id: string) {
  const { data, error } = await supabase
    .from('advice_logs')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function deleteAdviceLog(id: number) {
  const { error } = await supabase.from('advice_logs').delete().eq('id', id);
  if (error) throw error;
} 