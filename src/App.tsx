import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import LoginPage from './pages/LoginPage.js';

import DashboardPage from './pages/DashboardPage.js';
import AnalyticsPage from './pages/AnalyticsPage.js';
import SchedulePage from './pages/SchedulePage.js';
import VideosPage from './pages/VideosPage.js';
import SettingsPage from './pages/SettingsPage.js';
import PlayerDetailPage from './pages/PlayerDetailPage.js';
import NotificationsPage from './pages/NotificationsPage.js';
import { useState } from 'react';

console.log('test from App');

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="pt-32 text-center text-2xl text-gray-400 min-h-screen">{title}ページは準備中です</div>
);

// ProtectedRouteの定義と利用を削除し、全ページをそのまま表示するように修正
// <Route path="/login" ... /> も削除
const AppRoutes: React.FC = () => {
  // ダッシュボードと同じログデータをここで管理
  const [physicalLogs, setPhysicalLogs] = useState<{
    date: string;
    height: string;
    weight: string;
    vision_left?: string;
    vision_right?: string;
    run50m?: string;
    dash10m?: string;
    shuttle_run?: string;
    jump?: string;
    sit_up?: string;
    sit_and_reach?: string;
    note?: string;
  }[]>([]);
  const [skillLogs, setSkillLogs] = useState<{
    date: string;
    dribble_count: string;
    shoot_success: string;
    pass_success: string;
    defense_success: string;
    decision_correct: string;
    total_score: string;
    comment: string;
  }[]>([]);
  const [matchLogs, setMatchLogs] = useState<{
    date: string;
    opponent: string;
    result: string;
    score: string;
    note: string;
    status: 'win' | 'draw' | 'lose';
  }[]>([]);
  const [practiceLogs, setPracticeLogs] = useState<{
    id: number;
    date: string;
    duration: string;
    title: string;
    description: string;
  }[]>([
    {
      id: Date.now() + Math.random(),
      date: '2025-06-23',
      duration: '2時間',
      title: 'パス＆シュート練習',
      description: 'コーナーキックの精度向上に取り組みました。'
    },
    {
      id: Date.now() + Math.random(),
      date: '2025-06-19',
      duration: '1.5時間',
      title: 'ミニゲーム',
      description: '3対3の小さな試合で状況判断力を鍛えました。'
    },
    {
      id: Date.now() + Math.random(),
      date: '2025-06-18',
      duration: '2時間',
      title: 'フィジカルトレーニング',
      description: 'スプリントとアジリティトレーニングを実施。'
    },
    {
      id: Date.now() + Math.random(),
      date: '2025-06-16',
      duration: '1時間',
      title: '個人技術練習',
      description: 'ドリブル技術の向上に集中しました。'
    }
  ]);

  return (
    <Routes>
      <Route path="/" element={
          <DashboardPage
            physicalLogs={physicalLogs}
            setPhysicalLogs={setPhysicalLogs}
            skillLogs={skillLogs}
            setSkillLogs={setSkillLogs}
            matchLogs={matchLogs}
            setMatchLogs={setMatchLogs}
            practiceLogs={practiceLogs}
            setPracticeLogs={setPracticeLogs}
          />
      } />

      <Route path="/players/:id" element={
          <PlayerDetailPage />
      } />
      <Route path="/analytics" element={
          <AnalyticsPage
            physicalLogs={physicalLogs}
            skillLogs={skillLogs}
            matchLogs={matchLogs}
            practiceLogs={practiceLogs}
          />
      } />
      <Route path="/schedule" element={
          <SchedulePage />
      } />
      <Route path="/videos" element={
          <VideosPage />
      } />
      <Route path="/settings" element={
          <SettingsPage />
      } />
      <Route path="/notifications" element={
          <NotificationsPage />
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
