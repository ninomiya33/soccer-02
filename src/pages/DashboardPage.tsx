import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { profileService } from '../services/profileService.js';
import { physicalLogService } from '../services/physicalLogService.js';
import { playerService } from '../services/playerService.js';
import { skillLogService } from '../services/skillLogService.js';
import { practiceLogService } from '../services/practiceLogService.js';
import { matchLogService } from '../services/matchLogService.js';

// 各コンポーネントをインポート
import Header from '../components/Header.js';
import PlayerInfoCard from '../components/PlayerInfoCard.js';
import DashboardCard from '../components/DashboardCard.js';
import GoalProgress from '../components/GoalProgressCard.js';
import Badges from '../components/AchievementBadges.js';
import BottomTabBar from '../components/BottomTabBar.js';
import FabButton from '../components/FabButton.js';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import * as echarts from 'echarts';
import SkillPage from './SkillPage.js';
import CalendarWrapper from '../components/CalendarWrapper.js';
import CustomCalendar from '../components/CustomCalendar.js';
import './calendar-ios.css';

interface DashboardPageProps {
  physicalLogs: {
    id?: number;
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
  }[];
  setPhysicalLogs: React.Dispatch<React.SetStateAction<{
    id?: number;
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
  }[]>>;
  skillLogs: {
    date: string;
    dribble_count: string;
    shoot_success: string;
    pass_success: string;
    defense_success: string;
    decision_correct: string;
    total_score: string;
    comment: string;
  }[];
  setSkillLogs: React.Dispatch<React.SetStateAction<{
    date: string;
    dribble_count: string;
    shoot_success: string;
    pass_success: string;
    defense_success: string;
    decision_correct: string;
    total_score: string;
    comment: string;
  }[]>>;
  matchLogs: {
    date: string;
    opponent: string;
    result: string;
    score: string;
    note: string;
    status: 'win' | 'draw' | 'lose';
  }[];
  setMatchLogs: React.Dispatch<React.SetStateAction<{
    date: string;
    opponent: string;
    result: string;
    score: string;
    note: string;
    status: 'win' | 'draw' | 'lose';
  }[]>>;
  practiceLogs: {
    id: number;
    date: string;
    duration: string;
    title: string;
    description: string;
  }[];
  setPracticeLogs: React.Dispatch<React.SetStateAction<{
    id: number;
    date: string;
    duration: string;
    title: string;
    description: string;
  }[]>>;
}

const TABS = [
  { key: 'physical', label: '体力測定' },
  { key: 'skill', label: 'スキル評価' },
  { key: 'practice', label: '練習記録' },
  { key: 'match', label: '試合結果' },
];

const DashboardPage: React.FC<DashboardPageProps> = ({
  physicalLogs,
  setPhysicalLogs,
  skillLogs,
  setSkillLogs,
  matchLogs,
  setMatchLogs,
  practiceLogs,
  setPracticeLogs
}) => {
  console.log('from DashboardPage');
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ name: string; image: string; age: string; grade: string }>({ name: '', image: '', age: '', grade: '' });
  const [selectedPlayer, setSelectedPlayer] = useState("田中太郎");
  const [selectedTab, setSelectedTab] = useState('practice');

  // モーダル開閉状態
  const [selectTypeModalOpen, setSelectTypeModalOpen] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [physicalModalOpen, setPhysicalModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);


  // 練習記録リスト（状態管理）
  const [form, setForm] = useState({
    id: undefined,
    date: '',
    title: 'パス練習',
    duration: '1時間',
    description: ''
  });

  // 体力測定リスト（状態管理）
  const [physicalForm, setPhysicalForm] = useState({
    date: '',
    height: '',
    weight: '',
    vision_left: '',
    vision_right: '',
    run50m: '',
    dash10m: '',
    shuttle_run: '',
    jump: '',
    sit_up: '',
    sit_and_reach: '',
    note: ''
  });

  // スキル評価リスト（状態管理）
  const [skillForm, setSkillForm] = useState({
    date: '',
    dribble_count: '',      // 1分間ドリブル回数
    shoot_success: '',      // 10本シュート成功数
    pass_success: '',       // 10本パス成功数
    defense_success: '',    // 1対1守備成功数
    decision_correct: '',   // 判断テスト正答数
    total_score: '',        // スキル総合点
    comment: ''
  });

  // 試合実績リスト（状態管理）
  const [matchForm, setMatchForm] = useState({
    date: '',
    opponent: '',
    result: '',
    score: '',
    note: '',
    status: 'win' as 'win' | 'draw' | 'lose',
  });

  // チャート表示用の ref を作成
  const physicalChartRef1 = useRef<HTMLDivElement | null>(null);
  const physicalChartRef2 = useRef<HTMLDivElement | null>(null);
  const physicalChartRef3 = useRef<HTMLDivElement | null>(null);

  // 試合実績モーダル開閉状態
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  const [playerId, setPlayerId] = useState<number | null>(null);

  // 年・月・選択日を管理
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth()); // 0始まり
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 練習記録がある日を配列で取得
  const practiceDates = practiceLogs.map(log => log.date);

  // 種類ごとの色マッピング
  const typeColorMap: Record<string, string> = {
    'パス練習': 'bg-blue-500 text-white border-blue-500',
    'シュート練習': 'bg-red-500 text-white border-red-500',
    'ミニゲーム': 'bg-green-500 text-white border-green-500',
    'フィジカルトレーニング': 'bg-orange-500 text-white border-orange-500',
    '個人技術練習': 'bg-purple-500 text-white border-purple-500',
  };

  // カレンダーの日付セルに色付きバッジを表示
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hasLog = practiceLogs.some(l => l.date === d);
    if (hasLog) {
      return <span className="calendar-dot" />;
    }
    return null;
  };

  // カード表示用: 選択日があればその日の記録だけ、なければ全件
  const filteredLogs = selectedDate
    ? practiceLogs.filter(log => log.date === selectedDate)
    : practiceLogs.filter(log => {
        // カレンダー表示中の月のみ
        const [y, m] = log.date.split('-');
        return Number(y) === calendarYear && Number(m) === calendarMonth + 1;
      });

  // フォーム入力ハンドラ
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handlePhysicalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPhysicalForm({ ...physicalForm, [e.target.name]: e.target.value });
  };
  const handleSkillFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSkillForm({ ...skillForm, [e.target.name]: e.target.value });
  };
  const handleMatchFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMatchForm({ ...matchForm, [name]: value });
  };

  // 登録ボタン押下時
  const handlePracticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.title || !form.duration) return;
    if (!user || !playerId) return;
    const log = {
      ...form,
      user_id: user.id,
      player_id: playerId,
      duration: form.duration,
      title: form.title,
      description: form.description,
    };
    try {
      await practiceLogService.addLog(log);
      const newLogs = await practiceLogService.getLogs(playerId);
      setPracticeLogs(newLogs.map(l => ({
        date: l.date,
        duration: l.duration,
        title: l.title,
        description: l.description,
        id: l.id !== undefined ? l.id : Date.now() + Math.random(),
      })));
    } catch (err) {
      alert('保存に失敗しました');
      console.error(err);
    }
    setPracticeModalOpen(false);
    setForm({ id: undefined, date: '', title: 'パス練習', duration: '1時間', description: '' });
  };
  const handlePhysicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalForm.date || !physicalForm.height || !physicalForm.weight || !physicalForm.run50m) return;
    if (!user || !playerId) return;
    const log = {
      ...physicalForm,
      user_id: user.id,
      player_id: playerId,
      height: Number(physicalForm.height),
      weight: Number(physicalForm.weight),
    };
    try {
      await physicalLogService.addLog(log);
      const newLogs = await physicalLogService.getLogs(playerId);
      setPhysicalLogs(newLogs.map(l => ({
        id: l.id,
        date: l.date,
        height: String(l.height),
        weight: String(l.weight),
        vision_left: l.vision_left,
        vision_right: l.vision_right,
        run50m: l.run50m,
        dash10m: l.dash10m,
        shuttle_run: l.shuttle_run,
        jump: l.jump,
        sit_up: l.sit_up,
        sit_and_reach: l.sit_and_reach,
        note: l.note,
      })));
    } catch (err) {
      alert('保存に失敗しました');
      console.error(err);
    }
    setPhysicalModalOpen(false);
    setPhysicalForm({ date: '', height: '', weight: '', vision_left: '', vision_right: '', run50m: '', dash10m: '', shuttle_run: '', jump: '', sit_up: '', sit_and_reach: '', note: '' });
  };
  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.date || !skillForm.dribble_count || !skillForm.shoot_success || !skillForm.pass_success || !skillForm.defense_success || !skillForm.decision_correct) return;
    if (!user || !playerId) return;
    const log = {
      user_id: user.id,
      player_id: playerId,
      dribble: Number(skillForm.dribble_count),
      shoot: Number(skillForm.shoot_success),
      pass: Number(skillForm.pass_success),
      defense: Number(skillForm.defense_success),
      tactic: Number(skillForm.decision_correct),
      comment: skillForm.comment,
      date: skillForm.date,
    };
    try {
      await skillLogService.addLog(log);
      const newLogs = await skillLogService.getLogs(playerId);
      setSkillLogs(newLogs.map(l => ({
        date: l.date,
        dribble_count: String(l.dribble),
        shoot_success: String(l.shoot),
        pass_success: String(l.pass),
        defense_success: String(l.defense),
        decision_correct: String(l.tactic),
        total_score: String(
          (Number(l.dribble) || 0) +
          (Number(l.shoot) || 0) +
          (Number(l.pass) || 0) +
          (Number(l.defense) || 0) +
          (Number(l.tactic) || 0)
        ),
        comment: l.comment || '',
      })));
    } catch (err) {
      alert('保存に失敗しました');
      console.error(err);
    }
    setSkillModalOpen(false);
    setSkillForm({ date: '', dribble_count: '', shoot_success: '', pass_success: '', defense_success: '', decision_correct: '', total_score: '', comment: '' });
  };
  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchForm.date || !matchForm.opponent || !matchForm.result) return;
    if (!user || !playerId) return;
    const log = {
      ...matchForm,
      user_id: user.id,
      player_id: playerId,
      date: matchForm.date,
      opponent: matchForm.opponent,
      result: matchForm.result,
      score: matchForm.score,
      note: matchForm.note,
      status: matchForm.status,
    };
    try {
      await matchLogService.addLog(log);
      const newLogs = await matchLogService.getLogs(playerId);
      setMatchLogs(newLogs.map(l => ({
        date: l.date,
        opponent: l.opponent,
        result: l.result,
        score: l.score,
        note: l.note || '',
        status: l.status as 'win' | 'draw' | 'lose',
      })));
    } catch (err) {
      alert('保存に失敗しました');
      console.error(err);
    }
    setMatchModalOpen(false);
    setMatchForm({ date: '', opponent: '', result: '', score: '', note: '', status: 'win' });
  };

  // FabButtonクリック時
  const handleFabClick = () => {
    setSelectTypeModalOpen(true);
  };

  // 種類選択後
  const handleSelectType = (type: '体力測定' | 'スキル評価' | '練習記録' | '試合実績') => {
    setSelectTypeModalOpen(false);
    if (type === '練習記録') setPracticeModalOpen(true);
    if (type === '体力測定') setPhysicalModalOpen(true);
    if (type === 'スキル評価') setSkillModalOpen(true);
    if (type === '試合実績') setMatchModalOpen(true);
  };

  // プロフィール取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const data = await profileService.getProfile(user.id);
      if (data) {
        setProfile({
          name: data.name || '',
          image: data.avatar_url || '',
          age: data.age ? String(data.age) : '',
          grade: data.grade || '',
        });
      }
    };
    fetchProfile();
  }, [user]);

  // 初回マウント時に自分のplayer_idを取得
  useEffect(() => {
    const fetchPlayer = async () => {
      if (!user) return;
      const players = await playerService.getPlayers(user.id);
      if (players.length > 0) {
        setPlayerId(players[0]?.id ?? null); // 1人目の選手IDを使う（なければnull）
      }
    };
    fetchPlayer();
  }, [user]);

  // playerIdがセットされたらSupabaseからphysical_logsを取得
  useEffect(() => {
    if (!playerId) return;
    const fetchLogs = async () => {
      const newLogs = await physicalLogService.getLogs(playerId);
      setPhysicalLogs(newLogs.map(l => ({
        id: l.id,
        date: l.date,
        height: String(l.height),
        weight: String(l.weight),
        vision_left: l.vision_left,
        vision_right: l.vision_right,
        run50m: l.run50m,
        dash10m: l.dash10m,
        shuttle_run: l.shuttle_run,
        jump: l.jump,
        sit_up: l.sit_up,
        sit_and_reach: l.sit_and_reach,
        note: l.note,
      })));
    };
    fetchLogs();
  }, [playerId]);

  // playerIdがセットされたらSupabaseからskill_logsを取得
  useEffect(() => {
    if (!playerId) return;
    const fetchLogs = async () => {
      const newLogs = await skillLogService.getLogs(playerId);
      setSkillLogs(newLogs.map(l => ({
        date: l.date,
        dribble_count: String(l.dribble),
        shoot_success: String(l.shoot),
        pass_success: String(l.pass),
        defense_success: String(l.defense),
        decision_correct: String(l.tactic),
        total_score: String(
          (Number(l.dribble) || 0) +
          (Number(l.shoot) || 0) +
          (Number(l.pass) || 0) +
          (Number(l.defense) || 0) +
          (Number(l.tactic) || 0)
        ),
        comment: l.comment || '',
      })));
    };
    fetchLogs();
  }, [playerId]);

  // playerIdがセットされたらSupabaseからpractice_logsを取得
  useEffect(() => {
    if (!playerId) return;
    const fetchLogs = async () => {
      const newLogs = await practiceLogService.getLogs(playerId);
      setPracticeLogs(newLogs.map(l => ({
        date: l.date,
        duration: l.duration,
        title: l.title,
        description: l.description,
        id: l.id !== undefined ? l.id : Date.now() + Math.random(),
      })));
    };
    fetchLogs();
  }, [playerId]);

  // playerIdがセットされたらSupabaseからmatch_logsを取得
  useEffect(() => {
    if (!playerId) return;
    const fetchLogs = async () => {
      const newLogs = await matchLogService.getLogs(playerId);
      setMatchLogs(newLogs.map(l => ({
        date: l.date,
        opponent: l.opponent,
        result: l.result,
        score: l.score,
        note: l.note || '',
        status: l.status as 'win' | 'draw' | 'lose',
      })));
    };
    fetchLogs();
  }, [playerId]);

  useEffect(() => {
    if (selectedTab !== 'physical' || !physicalLogs.length) return;
    // 身長・体重
    if (physicalChartRef1.current) {
      const chart = echarts.init(physicalChartRef1.current);
      chart.setOption({
        title: { text: '身長・体重の推移', left: 'center', textStyle: { fontSize: 16 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 30, data: ['身長', '体重'], icon: 'circle' },
        grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
        xAxis: { type: 'category', data: physicalLogs.map(l => l.date) },
        yAxis: { type: 'value', name: '身長/体重', position: 'left' },
        series: [
          { name: '身長', type: 'line', data: physicalLogs.map(l => Number(l.height)), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: '体重', type: 'line', data: physicalLogs.map(l => Number(l.weight)), symbol: 'circle', symbolSize: 10, smooth: true }
        ]
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }
  }, [selectedTab, physicalLogs]);

  useEffect(() => {
    if (selectedTab !== 'physical' || !physicalLogs.length) return;
    // 50m走・10mダッシュ・往復走
    if (physicalChartRef2.current) {
      const chart = echarts.init(physicalChartRef2.current);
      chart.setOption({
        title: { text: '走力系の推移', left: 'center', textStyle: { fontSize: 16 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 30, data: ['50m走', '10mダッシュ', '往復走'], icon: 'circle' },
        grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
        xAxis: { type: 'category', data: physicalLogs.map(l => l.date) },
        yAxis: { type: 'value', name: '秒/回', position: 'left' },
        series: [
          { name: '50m走', type: 'line', data: physicalLogs.map(l => Number(l.run50m)), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: '10mダッシュ', type: 'line', data: physicalLogs.map(l => Number(l.dash10m)), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: '往復走', type: 'line', data: physicalLogs.map(l => Number(l.shuttle_run)), symbol: 'circle', symbolSize: 10, smooth: true }
        ]
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }
  }, [selectedTab, physicalLogs]);

  useEffect(() => {
    if (selectedTab !== 'physical' || !physicalLogs.length) return;
    // 立ち幅跳び・上体起こし・長座体前屈
    if (physicalChartRef3.current) {
      const chart = echarts.init(physicalChartRef3.current);
      chart.setOption({
        title: { text: '柔軟・筋力系の推移', left: 'center', textStyle: { fontSize: 16 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 30, data: ['立ち幅跳び', '上体起こし', '長座体前屈'], icon: 'circle' },
        grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
        xAxis: { type: 'category', data: physicalLogs.map(l => l.date) },
        yAxis: { type: 'value', name: 'cm/回', position: 'left' },
        series: [
          { name: '立ち幅跳び', type: 'line', data: physicalLogs.map(l => Number(l.jump)), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: '上体起こし', type: 'line', data: physicalLogs.map(l => Number(l.sit_up)), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: '長座体前屈', type: 'line', data: physicalLogs.map(l => Number(l.sit_and_reach)), symbol: 'circle', symbolSize: 10, smooth: true }
        ]
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }
  }, [selectedTab, physicalLogs]);

  // 体力測定削除ハンドラ
  const handleDeletePhysicalLog = async (id: number | undefined) => {
    if (!id) return;
    if (!window.confirm('本当に削除しますか？')) return;
    try {
      await physicalLogService.deleteLog(id);
      if (!playerId) return;
      const newLogs = await physicalLogService.getLogs(playerId);
      setPhysicalLogs(newLogs.map(l => ({
        id: l.id,
        date: l.date,
        height: String(l.height),
        weight: String(l.weight),
        vision_left: l.vision_left,
        vision_right: l.vision_right,
        run50m: l.run50m,
        dash10m: l.dash10m,
        shuttle_run: l.shuttle_run,
        jump: l.jump,
        sit_up: l.sit_up,
        sit_and_reach: l.sit_and_reach,
        note: l.note,
      })));
    } catch (err) {
      alert('削除に失敗しました');
      console.error(err);
    }
  };

  // 練習記録削除ハンドラ
  const handleDeletePracticeLog = async (id: number | undefined) => {
    console.log('【DEBUG】handleDeletePracticeLog called with id:', id);
    if (!id) return;
    if (!window.confirm('本当に削除しますか？')) return;
    try {
      await practiceLogService.deleteLog(id);
      let newLogs;
      if (playerId) {
        newLogs = await practiceLogService.getLogs(playerId);
      } else {
        newLogs = practiceLogs.filter(log => log.id !== id);
      }
      setPracticeLogs(newLogs.map(l => ({
        date: l.date,
        duration: l.duration,
        title: l.title,
        description: l.description,
        id: l.id !== undefined ? l.id : Date.now() + Math.random(),
      })));
      console.log('【DEBUG】Deleted log id:', id, '新しいpracticeLogs:', newLogs);
    } catch (err) {
      alert('削除に失敗しました');
      console.error('【DEBUG】削除エラー:', err);
    }
  };

  // 試合結果削除ハンドラ
  const handleDeleteMatchLog = async (id: number | undefined, index: number) => {
    if (!id) {
      alert('この試合記録は削除できません（id未設定）');
      return;
    }
    if (!window.confirm('本当に削除しますか？')) return;
    try {
      await matchLogService.deleteLog(id);
      if (!playerId) return;
      const newLogs = await matchLogService.getLogs(playerId);
      setMatchLogs(newLogs.map(l => ({
        date: l.date,
        opponent: l.opponent,
        result: l.result,
        score: l.score,
        note: l.note || '',
        status: l.status as 'win' | 'draw' | 'lose',
      })));
    } catch (err) {
      alert('削除に失敗しました');
      console.error(err);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* iOS風ヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/50">
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
              <p className="text-sm text-gray-500 mt-1">今日の練習記録</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                </svg>
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">田中</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="pt-32 px-6 pb-16">
        {/* iOS風サマリーカード */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {practiceLogs.length}
            </div>
            <div className="text-sm text-gray-500">練習記録</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {physicalLogs.length}
            </div>
            <div className="text-sm text-gray-500">体力測定</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {skillLogs.length}
            </div>
            <div className="text-sm text-gray-500">スキル評価</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {matchLogs.length}
            </div>
            <div className="text-sm text-gray-500">試合結果</div>
          </div>
        </div>

        {/* iOS風タブコンテンツ */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* iOS風タブヘッダー */}
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`flex-1 py-4 px-6 text-center font-semibold text-sm transition-colors duration-200 ${
                  selectedTab === tab.key 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div className="p-6">
          {selectedTab === 'practice' && (
            (() => {
              return (
                <div>
                    {/* 年月選択＋1日が必ず日曜列のカレンダー */}
                    <div className="mb-6">
                      <CustomCalendar
                        year={calendarYear}
                        month={calendarMonth}
                        selectedDate={selectedDate ?? undefined}
                        onDateSelect={setSelectedDate}
                        onYearChange={setCalendarYear}
                        onMonthChange={setCalendarMonth}
                      />
                    </div>
                    {/* 練習記録リスト */}
                    <div className="space-y-4">
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm">練習記録がありません</p>
                        </div>
                    )}
                      {filteredLogs.map((log, i) => (
                        <div key={log.id || i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                          </div>
                              <div>
                                <div className="font-semibold text-gray-900">{log.title}</div>
                                <div className="text-sm text-gray-500">{log.date}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-600">{log.duration}分</div>
                          <button
                                className="text-gray-400 hover:text-red-500 mt-1"
                            title="削除"
                            onClick={() => handleDeletePracticeLog(log.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                          </div>
                          {log.description && (
                            <div className="text-gray-700 text-sm bg-white rounded-xl p-3 border border-gray-100">
                              {log.description}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              );
            })()
          )}
          {selectedTab === 'physical' && (
            <div>
              <div ref={physicalChartRef1} style={{ width: '100%', height: 260, marginBottom: 32 }} />
              <div ref={physicalChartRef2} style={{ width: '100%', height: 260, marginBottom: 32 }} />
              <div ref={physicalChartRef3} style={{ width: '100%', height: 260, marginBottom: 32 }} />
                <h3 className="text-lg font-semibold mb-4 text-gray-900">体力測定履歴</h3>
                <div className="space-y-3">
                  {physicalLogs.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">データがありません</p>
                    </div>
                  )}
                {physicalLogs.slice().reverse().map((log, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{log.date}</div>
                            <div className="text-sm text-gray-500">体力測定</div>
                          </div>
                        </div>
                    <button
                          className="text-gray-400 hover:text-red-500"
                      title="削除"
                      onClick={() => handleDeletePhysicalLog(log.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">身長</div>
                          <div className="font-semibold text-gray-900">{log.height}cm</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">体重</div>
                          <div className="font-semibold text-gray-900">{log.weight}kg</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">視力</div>
                          <div className="font-semibold text-gray-900">{log.vision_left || '-'} / {log.vision_right || '-'}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">50m走</div>
                          <div className="font-semibold text-gray-900">{log.run50m}秒</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">10mダッシュ</div>
                          <div className="font-semibold text-gray-900">{log.dash10m}秒</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">往復走</div>
                          <div className="font-semibold text-gray-900">{log.shuttle_run}回</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">立ち幅跳び</div>
                          <div className="font-semibold text-gray-900">{log.jump}cm</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">上体起こし</div>
                          <div className="font-semibold text-gray-900">{log.sit_up}回</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">長座体前屈</div>
                          <div className="font-semibold text-gray-900">{log.sit_and_reach}cm</div>
                        </div>
                      </div>
                      {log.note && (
                        <div className="mt-3 bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs mb-1">備考</div>
                          <div className="text-sm text-gray-900">{log.note}</div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedTab === 'skill' && (
            <SkillPage />
          )}
          {selectedTab === 'match' && (
            <div>
                <div className="flex justify-end mb-6">
                <button
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  onClick={() => setMatchModalOpen(true)}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    試合結果を追加
                </button>
              </div>
              <div className="space-y-4">
                {matchLogs.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">試合結果がありません</p>
                    </div>
                )}
                {matchLogs.map((log, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                    </div>
                          <div>
                            <div className="font-semibold text-gray-900">{log.opponent}</div>
                            <div className="text-sm text-gray-500">{log.date}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold px-3 py-1 rounded-full text-sm ${
                            log.status === 'win' ? 'bg-green-100 text-green-700' : 
                            log.status === 'draw' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {log.result}
                          </div>
                    <button
                            className="text-gray-400 hover:text-red-500 mt-1"
                      title="削除"
                      onClick={() => handleDeleteMatchLog(undefined, i)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs">スコア</div>
                          <div className="font-semibold text-gray-900">{log.score}</div>
                        </div>
                      </div>
                      {log.note && (
                        <div className="mt-3 bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-gray-500 text-xs mb-1">メモ</div>
                          <div className="text-sm text-gray-900">{log.note}</div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
              {/* 追加モーダル */}
              {matchModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
                    <button
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                        onClick={() => { setMatchModalOpen(false); }}
                      aria-label="閉じる"
                    >
                      ×
                    </button>
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        試合実績を追加
                      </h2>
                    <form className="space-y-6" onSubmit={handleMatchSubmit}>
                      {/* 基本情報 */}
                        <div className="bg-blue-50 rounded-2xl p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold mb-2 text-blue-700">日付</label>
                              <input type="date" name="date" value={matchForm.date} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" required />
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-2 text-blue-700">対戦相手</label>
                              <input type="text" name="opponent" value={matchForm.opponent} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" required placeholder="例: FC青葉" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-2 text-blue-700">結果</label>
                              <select name="result" value={matchForm.result} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base">
                              <option value="win">勝ち</option>
                              <option value="draw">引き分け</option>
                              <option value="lose">負け</option>
                            </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-2 text-blue-700">ステータス</label>
                              <select name="status" value={matchForm.status} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base">
                              <option value="win">勝利</option>
                              <option value="draw">引き分け</option>
                              <option value="lose">敗北</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      {/* 試合データ */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold mb-2 text-blue-700">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                得点
                              </label>
                              <input type="text" name="score" value={matchForm.score} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" required placeholder="例: 得点1 アシスト1" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold mb-2 text-blue-700">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                出場時間
                              </label>
                              <input type="text" name="note" value={matchForm.note} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" placeholder="例: 40分" />
                          </div>
                        </div>
                      </div>
                      {/* メモ欄 */}
                      <div>
                          <label className="block text-xs font-bold mb-2 text-blue-700">メモ</label>
                          <textarea name="note" value={matchForm.note} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" rows={2} placeholder="自由記入 (任意)" />
                      </div>
                        <div className="flex justify-end">
                          <button type="submit" className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:bg-amber-600 transition-colors text-base">
                          登録
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedTab !== 'practice' && selectedTab !== 'physical' && selectedTab !== 'skill' && selectedTab !== 'match' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">このタブの内容は今後追加予定です</p>
              </div>
          )}
          </div>
        </div>
      </main>
      <BottomTabBar />
      <FabButton onClick={handleFabClick} />

      {/* 追加タイプ選択モーダル */}
      {selectTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md mx-auto rounded-t-3xl bg-white shadow-2xl pb-4 pt-6 px-4 relative animate-slideup">
            <div className="flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-4"></div>
            </div>
            <h2 className="text-center text-lg font-bold mb-6">追加する情報の種類を選択</h2>
            <div className="flex flex-col gap-3">
              {['体力測定', 'スキル評価', '練習記録', '試合実績'].map(type => (
                <button
                  key={type}
                  className="w-full py-4 text-base font-bold rounded-2xl bg-gray-100 active:bg-blue-100 transition-colors shadow-sm"
                  onClick={() => handleSelectType(type as any)}
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              className="w-full mt-6 py-3 text-base font-bold rounded-2xl bg-white border border-gray-200 text-gray-500 shadow-sm active:bg-gray-100"
              onClick={() => setSelectTypeModalOpen(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 練習記録追加モーダル */}
      {practiceModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => { setPracticeModalOpen(false); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">練習記録を追加</h2>
            </div>
            <form className="space-y-6" onSubmit={handlePracticeSubmit}>
                  <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">日付</label>
                <input type="date" name="date" value={form.date} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" required />
                  </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">種類</label>
                  <select name="title" value={form.title} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base">
                      <option>パス練習</option>
                      <option>シュート練習</option>
                      <option>ミニゲーム</option>
                      <option>フィジカルトレーニング</option>
                      <option>個人技術練習</option>
                    </select>
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">時間 (分)</label>
                  <input type="number" name="duration" value={form.duration} onChange={handleFormChange} min={1} max={300} step={1} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" placeholder="例: 90" required />
                  </div>
                </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">内容</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" rows={3} placeholder="例: パス練習を中心に30分、ミニゲーム20分" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-colors">
                  登録
                </button>
            </form>
          </div>
        </div>
      )}

      {/* 体力測定追加モーダル */}
      {physicalModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => { setPhysicalModalOpen(false); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">体力測定を追加</h2>
            </div>
            <form className="space-y-6" onSubmit={handlePhysicalSubmit}>
                  <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">日付</label>
                <input type="date" name="date" value={physicalForm.date} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" required />
                  </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">身長 (cm)</label>
                  <input type="number" name="height" value={physicalForm.height} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" required min="0" placeholder="例: 120" />
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">体重 (kg)</label>
                  <input type="number" name="weight" value={physicalForm.weight} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" required min="0" placeholder="例: 25.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">視力（左）</label>
                  <input type="text" name="vision_left" value={physicalForm.vision_left} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" placeholder="例: 1.2" />
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">視力（右）</label>
                  <input type="text" name="vision_right" value={physicalForm.vision_right} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" placeholder="例: 1.0" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">50m走 (秒)</label>
                  <input type="number" name="run50m" value={physicalForm.run50m} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" min="0" step="0.01" placeholder="例: 9.2" />
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">10mダッシュ (秒)</label>
                  <input type="number" name="dash10m" value={physicalForm.dash10m} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" min="0" step="0.01" placeholder="例: 2.1" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">シャトルラン (回)</label>
                  <input type="number" name="shuttle_run" value={physicalForm.shuttle_run} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" min="0" placeholder="例: 30" />
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">立ち幅跳び (cm)</label>
                  <input type="number" name="jump" value={physicalForm.jump} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" min="0" placeholder="例: 150" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">上体起こし (回)</label>
                  <input type="number" name="sit_up" value={physicalForm.sit_up} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" min="0" placeholder="例: 20" />
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">長座体前屈 (cm)</label>
                  <input type="number" name="sit_and_reach" value={physicalForm.sit_and_reach} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" min="0" placeholder="例: 35" />
                  </div>
                </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">備考</label>
                <textarea name="note" value={physicalForm.note} onChange={handlePhysicalFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" rows={2} placeholder="自由記入 (任意)" />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:bg-green-700 transition-colors">
                  登録
                </button>
            </form>
          </div>
        </div>
      )}

      {/* スキル評価追加モーダル */}
      {skillModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => { setSkillModalOpen(false); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">スキル評価を追加</h2>
            </div>
            <form className="space-y-6" onSubmit={handleSkillSubmit}>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">日付</label>
                <input type="date" name="date" value={skillForm.date} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" required />
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">1分間ドリブル回数</label>
                  <input type="number" name="dribble_count" value={skillForm.dribble_count} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" min="0" required placeholder="例: 20" />
                  </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">10本シュート成功数</label>
                  <input type="number" name="shoot_success" value={skillForm.shoot_success} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" min="0" max="10" required placeholder="例: 7" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">10本パス成功数</label>
                  <input type="number" name="pass_success" value={skillForm.pass_success} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" min="0" max="10" required placeholder="例: 8" />
              </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">1対1守備成功数</label>
                  <input type="number" name="defense_success" value={skillForm.defense_success} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" min="0" max="3" required placeholder="例: 2" />
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">判断テスト正答数</label>
                  <input type="number" name="decision_correct" value={skillForm.decision_correct} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" min="0" max="5" required placeholder="例: 3" />
                  </div>
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">スキル総合点</label>
                  <input type="number" name="total_score" value={skillForm.total_score} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" min="0" required placeholder="例: 30" />
                </div>
                  </div>
                  <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">コメント</label>
                <textarea name="comment" value={skillForm.comment} onChange={handleSkillFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" rows={2} placeholder="自由記入 (任意)" />
                  </div>
              <button type="submit" className="w-full bg-yellow-600 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:bg-yellow-700 transition-colors">
                登録
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 試合実績追加モーダル */}
      {matchModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => { setMatchModalOpen(false); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">試合実績を追加</h2>
            </div>
            <form className="space-y-6" onSubmit={handleMatchSubmit}>
                  <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">日付</label>
                <input type="date" name="date" value={matchForm.date} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 bg-white text-base" required />
                  </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">対戦相手</label>
                  <input type="text" name="opponent" value={matchForm.opponent} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 bg-white text-base" required placeholder="例: FC青葉" />
                  </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">結果</label>
                  <select name="result" value={matchForm.result} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 bg-white text-base">
                    <option value="win">勝ち</option>
                    <option value="draw">引き分け</option>
                    <option value="lose">負け</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">得点</label>
                <input type="text" name="score" value={matchForm.score} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 bg-white text-base" required placeholder="例: 得点1 アシスト1" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">出場時間・メモ</label>
                <textarea name="note" value={matchForm.note} onChange={handleMatchFormChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 bg-white text-base" rows={2} placeholder="例: 40分" />
              </div>
              <button type="submit" className="w-full bg-amber-600 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:bg-amber-700 transition-colors">
                  登録
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
