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
  // 今後拡張用: 選択された追加タイプ
  const [addType, setAddType] = useState<null | '体力測定' | 'スキル評価' | '練習記録' | '試合実績'>(null);

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
  const tileContent = () => null;

  // カード表示用: 選択日があればその日の記録だけ、なければ全件
  const filteredLogs = selectedDate
    ? practiceLogs.filter(log => log.date === selectedDate)
    : practiceLogs;

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
    setAddType(null);
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
    setAddType(null);
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
    setAddType(null);
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
    setAddType(null);
    setMatchForm({ date: '', opponent: '', result: '', score: '', note: '', status: 'win' });
  };

  // FabButtonクリック時
  const handleFabClick = () => {
    setSelectTypeModalOpen(true);
  };

  // 種類選択後
  const handleSelectType = (type: '体力測定' | 'スキル評価' | '練習記録' | '試合実績') => {
    setAddType(type);
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
      <Header selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} profile={profile} />
      <main className="pt-28 px-4 pb-16">
        <DashboardCard
          physicalLogs={physicalLogs}
          skillLogs={skillLogs}
          practiceLogs={practiceLogs}
          matchLogs={matchLogs}
        />
        <div className="bg-white rounded-xl shadow p-6 mt-8">
          <h2 className="text-xl font-bold mb-4">今月の練習記録</h2>
          <div className="flex gap-2 mb-6">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`px-4 py-2 rounded-t-lg font-bold border-b-2 transition-colors duration-150 ${selectedTab === tab.key ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-400 bg-gray-100'}`}
                onClick={() => setSelectedTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* タブごとの内容 */}
          {selectedTab === 'practice' && (
            (() => {
              console.log('【DEBUG】practiceLogs:', practiceLogs);
              console.log('【DEBUG】selectedDate:', selectedDate);
              console.log('【DEBUG】filteredLogs:', filteredLogs);
              return (
                <div>
                  <Calendar
                    onChange={date => {
                      if (!date) return;
                      const d = Array.isArray(date) ? date[0] : date;
                      if (!d) return;
                      const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      console.log('【DEBUG】カレンダー日付クリック:', localDateStr);
                      setSelectedDate(localDateStr);
                    }}
                    value={selectedDate ? new Date(selectedDate) : new Date()}
                    tileContent={tileContent}
                    tileClassName={({ date, view }) => {
                      if (view !== 'month') return '';
                      const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const log = practiceLogs.find(l => l.date === d);
                      if (log) {
                        return typeColorMap[log.title] || 'bg-blue-100 text-blue-700 border-blue-200 font-extrabold';
                      }
                      return '';
                    }}
                    calendarType="iso8601"
                    className="mx-auto mb-6 border-none"
                    minDetail="year"
                    maxDetail="month"
                    showNeighboringMonth={true}
                    prev2Label={"<<"}
                    next2Label={">>"}
                    showNavigation={true}
                  />
                  <div className="mt-6 space-y-4">
                    {filteredLogs.length === 0 && (
                      <div className="text-gray-400 text-sm">練習記録がありません</div>
                    )}
                    {filteredLogs.map((log, i) => {
                      console.log('【DEBUG】log:', log);
                      return (
                        <div key={log.id || i} className="p-4 rounded-lg shadow bg-white flex flex-col gap-2 border border-gray-100 relative">
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span>📅 <span className="font-bold">{log.date}</span></span>
                            <span className={`font-bold px-2 py-1 rounded ${typeColorMap[log.title] || 'bg-gray-400'} text-white`}>{log.title}</span>
                            <span>⏱ <span className="font-bold">{log.duration}</span>分</span>
                          </div>
                          {log.description && <div className="text-gray-700 text-sm">💬 {log.description}</div>}
                          <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            title="削除"
                            onClick={() => handleDeletePracticeLog(log.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
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
              <h3 className="text-base font-medium mt-6 mb-2">体力測定履歴</h3>
              <div className="space-y-2">
                {physicalLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
                {physicalLogs.slice().reverse().map((log, i) => (
                  <div key={i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm relative">
                    <span className="font-bold mr-2">{log.date}</span>
                    <span>身長: <span className="font-bold">{log.height}cm</span></span>
                    <span>体重: <span className="font-bold">{log.weight}kg</span></span>
                    <span>視力: <span className="font-bold">{log.vision_left || '-'} / {log.vision_right || '-'}</span></span>
                    <span>50m走: <span className="font-bold">{log.run50m}秒</span></span>
                    <span>10mダッシュ: <span className="font-bold">{log.dash10m}秒</span></span>
                    <span>往復走: <span className="font-bold">{log.shuttle_run}回</span></span>
                    <span>立ち幅跳び: <span className="font-bold">{log.jump}cm</span></span>
                    <span>上体起こし: <span className="font-bold">{log.sit_up}回</span></span>
                    <span>長座体前屈: <span className="font-bold">{log.sit_and_reach}cm</span></span>
                    {log.note && <span>備考: <span className="font-bold">{log.note}</span></span>}
                    <button
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      title="削除"
                      onClick={() => handleDeletePhysicalLog(log.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
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
              <div className="flex justify-end mb-4">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  onClick={() => setMatchModalOpen(true)}
                >
                  ＋試合結果を追加
                </button>
              </div>
              <div className="space-y-4">
                {matchLogs.length === 0 && (
                  <div className="text-gray-400 text-sm">試合結果がありません</div>
                )}
                {matchLogs.map((log, i) => (
                  <div key={i} className="p-4 rounded-lg shadow bg-white flex flex-col gap-2 border border-gray-100 relative">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span>📅 <span className="font-bold">{log.date}</span></span>
                      <span className="font-bold px-2 py-1 rounded bg-gray-200 text-gray-700">{log.opponent}</span>
                      <span className={`font-bold px-2 py-1 rounded text-white ${log.status === 'win' ? 'bg-green-500' : log.status === 'draw' ? 'bg-yellow-500' : 'bg-red-500'}`}>{log.result}</span>
                      <span>スコア: <span className="font-bold">{log.score}</span></span>
                    </div>
                    {log.note && <div className="text-gray-700 text-sm">💬 {log.note}</div>}
                    <button
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      title="削除"
                      onClick={() => handleDeleteMatchLog(undefined, i)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {/* 追加モーダル */}
              {matchModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
                    <button
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                      onClick={() => { setMatchModalOpen(false); setAddType(null); }}
                      aria-label="閉じる"
                    >
                      ×
                    </button>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><i className="fas fa-trophy text-amber-500"></i>試合実績を追加</h2>
                    <form className="space-y-6" onSubmit={handleMatchSubmit}>
                      {/* 基本情報 */}
                      <div className="bg-blue-50 rounded-lg p-4 mb-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700">日付</label>
                            <input type="date" name="date" value={matchForm.date} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" required />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700">対戦相手</label>
                            <input type="text" name="opponent" value={matchForm.opponent} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" required placeholder="例: FC青葉" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700">結果</label>
                            <select name="result" value={matchForm.result} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full">
                              <option value="win">勝ち</option>
                              <option value="draw">引き分け</option>
                              <option value="lose">負け</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700">ステータス</label>
                            <select name="status" value={matchForm.status} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full">
                              <option value="win">勝利</option>
                              <option value="draw">引き分け</option>
                              <option value="lose">敗北</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      {/* 試合データ */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-futbol mr-1"></i>得点</label>
                            <input type="text" name="score" value={matchForm.score} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" required placeholder="例: 得点1 アシスト1" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-clock mr-1"></i>出場時間</label>
                            <input type="text" name="note" value={matchForm.note} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 40分" />
                          </div>
                        </div>
                      </div>
                      {/* メモ欄 */}
                      <div>
                        <label className="block text-xs font-bold mb-1 text-blue-700">メモ</label>
                        <textarea name="note" value={matchForm.note} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" rows={2} placeholder="自由記入 (任意)" />
                      </div>
                      <div className="flex justify-end mt-2">
                        <button type="submit" className="bg-amber-500 text-white px-6 py-2 rounded-lg shadow hover:bg-amber-600 font-bold text-base">
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
            <div className="text-gray-400 text-center py-12">このタブの内容は今後追加予定です</div>
          )}
        </div>
      </main>
      <BottomTabBar />
      <FabButton onClick={handleFabClick} />

      {/* 追加タイプ選択モーダル */}
      {selectTypeModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setSelectTypeModalOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">追加する情報の種類を選択</h2>
            <div className="space-y-3">
              {['体力測定', 'スキル評価', '練習記録', '試合実績'].map(type => (
                <button
                  key={type}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-2 rounded"
                  onClick={() => handleSelectType(type as any)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 練習記録追加モーダル */}
      {practiceModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => { setPracticeModalOpen(false); setAddType(null); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><i className="fas fa-calendar-plus text-blue-500"></i>練習記録を追加</h2>
            <form className="space-y-6" onSubmit={handlePracticeSubmit}>
              {/* 基本情報 */}
              <div className="bg-blue-50 rounded-lg p-4 mb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700">日付</label>
                    <input type="date" name="date" value={form.date} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700">種類</label>
                    <select name="title" value={form.title} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                      <option>パス練習</option>
                      <option>シュート練習</option>
                      <option>ミニゲーム</option>
                      <option>フィジカルトレーニング</option>
                      <option>個人技術練習</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700">時間 <span className='text-gray-400'>(分)</span></label>
                    <input type="number" name="duration" value={form.duration} onChange={handleFormChange} min={1} max={300} step={1} className="border rounded px-3 py-2 w-full" placeholder="例: 90" required />
                  </div>
                  <div></div>
                </div>
              </div>
              {/* 内容 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-clipboard-list mr-1"></i>内容</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" rows={3} placeholder="例: パス練習を中心に30分、ミニゲーム20分" />
              </div>
              <div className="flex justify-end mt-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 font-bold text-base">
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 体力測定追加モーダル */}
      {physicalModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => { setPhysicalModalOpen(false); setAddType(null); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><i className="fas fa-dumbbell text-blue-500"></i>体力測定データを追加</h2>
            <form className="space-y-6" onSubmit={handlePhysicalSubmit}>
              {/* 基本情報 */}
              <div className="bg-blue-50 rounded-lg p-4 mb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700">日付</label>
                    <input type="date" name="date" value={physicalForm.date} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" required />
                  </div>
                  <div></div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700">身長 <span className='text-gray-400'>(cm)</span></label>
                    <input type="number" name="height" value={physicalForm.height} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" required min="0" placeholder="例: 120" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700">体重 <span className='text-gray-400'>(kg)</span></label>
                    <input type="number" name="weight" value={physicalForm.weight} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" required min="0" placeholder="例: 25.5" />
                  </div>
                </div>
              </div>
              {/* 測定項目 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-eye mr-1"></i>視力（左）</label>
                    <input type="text" name="vision_left" value={physicalForm.vision_left} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 1.2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-eye mr-1"></i>視力（右）</label>
                    <input type="text" name="vision_right" value={physicalForm.vision_right} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 1.0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-running mr-1"></i>50m走 <span className='text-gray-400'>(秒)</span></label>
                    <input type="number" name="run50m" value={physicalForm.run50m} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" min="0" step="0.01" placeholder="例: 9.2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-bolt mr-1"></i>10mダッシュ <span className='text-gray-400'>(秒)</span></label>
                    <input type="number" name="dash10m" value={physicalForm.dash10m} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" min="0" step="0.01" placeholder="例: 2.1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-exchange-alt mr-1"></i>往復走（シャトルラン）<span className='text-gray-400'>(回)</span></label>
                    <input type="number" name="shuttle_run" value={physicalForm.shuttle_run} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" min="0" placeholder="例: 30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-shoe-prints mr-1"></i>立ち幅跳び <span className='text-gray-400'>(cm)</span></label>
                    <input type="number" name="jump" value={physicalForm.jump} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" min="0" placeholder="例: 150" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-child mr-1"></i>上体起こし <span className='text-gray-400'>(回)</span><span className='text-xs text-gray-500 ml-1'>(30秒間で何回できるか)</span></label>
                    <input type="number" name="sit_up" value={physicalForm.sit_up} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" min="0" placeholder="例: 20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-arrows-alt-v mr-1"></i>長座体前屈 <span className='text-gray-400'>(cm)</span></label>
                    <input type="number" name="sit_and_reach" value={physicalForm.sit_and_reach} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" min="0" placeholder="例: 35" />
                  </div>
                </div>
              </div>
              {/* 備考欄 */}
              <div>
                <label className="block text-xs font-bold mb-1 text-blue-700">備考</label>
                <textarea name="note" value={physicalForm.note} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" rows={2} placeholder="自由記入 (任意)" />
              </div>
              <div className="flex justify-end mt-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 font-bold text-base">
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* スキル評価追加モーダル */}
      {skillModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => { setSkillModalOpen(false); setAddType(null); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><i className="fas fa-star text-yellow-500"></i>スキル評価を追加</h2>
            <form className="space-y-6" onSubmit={handleSkillSubmit}>
              {/* 基本情報 */}
              <div className="bg-blue-50 rounded-lg p-4 mb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700">日付</label>
                    <input type="date" name="date" value={skillForm.date} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" required />
                  </div>
                  <div></div>
                </div>
              </div>
              {/* スキル項目 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-futbol mr-1"></i>1分間ドリブル回数</label>
                    <input type="number" name="dribble_count" value={skillForm.dribble_count} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" required placeholder="例: 20" />
                    <span className="text-xs text-gray-400">スピード＋安定性</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-futbol mr-1"></i>10本シュート成功数</label>
                    <input type="number" name="shoot_success" value={skillForm.shoot_success} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" max="10" required placeholder="例: 7" />
                    <span className="text-xs text-gray-400">正確さ＋両足も可</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-futbol mr-1"></i>10本パス成功数</label>
                    <input type="number" name="pass_success" value={skillForm.pass_success} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" max="10" required placeholder="例: 8" />
                    <span className="text-xs text-gray-400">コントロール力</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-shield-alt mr-1"></i>1対1守備成功数</label>
                    <input type="number" name="defense_success" value={skillForm.defense_success} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" max="3" required placeholder="例: 2" />
                    <span className="text-xs text-gray-400">フットワーク力</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-brain mr-1"></i>判断テスト正答数</label>
                    <input type="number" name="decision_correct" value={skillForm.decision_correct} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" max="5" required placeholder="例: 3" />
                    <span className="text-xs text-gray-400">認知判断力</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-700"><i className="fas fa-star mr-1"></i>スキル総合点</label>
                    <input type="number" name="total_score" value={skillForm.total_score} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" required placeholder="例: 30" />
                    <span className="text-xs text-gray-400">AI成長予測に使える</span>
                  </div>
                </div>
              </div>
              {/* コメント欄 */}
              <div>
                <label className="block text-xs font-bold mb-1 text-blue-700">コメント</label>
                <textarea name="comment" value={skillForm.comment} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" rows={2} placeholder="自由記入 (任意)" />
              </div>
              <div className="flex justify-end mt-2">
                <button type="submit" className="bg-yellow-500 text-white px-6 py-2 rounded-lg shadow hover:bg-yellow-600 font-bold text-base">
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
