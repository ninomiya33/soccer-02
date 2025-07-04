const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchGrowthPrediction(input: {
  age: number;
  gender: string;
  run50m: number;
  shuttle_run: number;
  jump: number;
  sit_up: number;
  sit_and_reach: number;
}) {
  const res = await fetch(`${API_URL}/growth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('成長予測APIエラー');
  return await res.json();
} 