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
import DetailTabs from '../components/DetailedTabs.js';
import Badges from '../components/AchievementBadges.js';
import BottomTabBar from '../components/BottomTabBar.js';
import FabButton from '../components/FabButton.js';

interface DashboardPageProps {
  physicalLogs: {
    date: string;
    height: string;
    weight: string;
    run: string;
  }[];
  setPhysicalLogs: React.Dispatch<React.SetStateAction<{
    date: string;
    height: string;
    weight: string;
    run: string;
  }[]>>;
  skillLogs: {
    date: string;
    shoot: string;
    pass: string;
    dribble: string;
    defense: string;
    tactic: string;
    comment: string;
  }[];
  setSkillLogs: React.Dispatch<React.SetStateAction<{
    date: string;
    shoot: string;
    pass: string;
    dribble: string;
    defense: string;
    tactic: string;
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
    date: string;
    duration: string;
    title: string;
    description: string;
  }[];
  setPracticeLogs: React.Dispatch<React.SetStateAction<{
    date: string;
    duration: string;
    title: string;
    description: string;
  }[]>>;
}

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
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ name: string; image: string; age: string; grade: string }>({ name: '', image: '', age: '', grade: '' });
  const [selectedPlayer, setSelectedPlayer] = useState("田中太郎");
  const [activeTab, setActiveTab] = useState("体力測定");

  // モーダル開閉状態
  const [selectTypeModalOpen, setSelectTypeModalOpen] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [physicalModalOpen, setPhysicalModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  // 今後拡張用: 選択された追加タイプ
  const [addType, setAddType] = useState<null | '体力測定' | 'スキル評価' | '練習記録' | '試合実績'>(null);

  // 練習記録リスト（状態管理）
  const [form, setForm] = useState({
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
    run: ''
  });

  // スキル評価リスト（状態管理）
  const [skillForm, setSkillForm] = useState({
    date: '',
    shoot: '',
    pass: '',
    dribble: '',
    defense: '',
    tactic: '',
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
  const physicalChartRef = useRef<HTMLDivElement | null>(null);
  const skillChartRef = useRef<HTMLDivElement | null>(null);
  const matchChartRef = useRef<HTMLDivElement | null>(null);

  // 試合実績モーダル開閉状態
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  const [playerId, setPlayerId] = useState<number | null>(null);

  // フォーム入力ハンドラ
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handlePhysicalFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      })));
    } catch (err) {
      alert('保存に失敗しました');
      console.error(err);
    }
    setPracticeModalOpen(false);
    setAddType(null);
    setForm({ date: '', title: 'パス練習', duration: '1時間', description: '' });
  };
  const handlePhysicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalForm.date || !physicalForm.height || !physicalForm.weight || !physicalForm.run) return;
    if (!user || !playerId) return;
    const log = {
      ...physicalForm,
      user_id: user.id,
      player_id: playerId,
      height: Number(physicalForm.height),
      weight: Number(physicalForm.weight),
      run: physicalForm.run,
    };
    try {
      await physicalLogService.addLog(log);
      const newLogs = await physicalLogService.getLogs(playerId);
      setPhysicalLogs(newLogs.map(l => ({
        date: l.date,
        height: String(l.height),
        weight: String(l.weight),
        run: l.run,
      })));
    } catch (err) {
      alert('保存に失敗しました');
      console.error(err);
    }
    setPhysicalModalOpen(false);
    setAddType(null);
    setPhysicalForm({ date: '', height: '', weight: '', run: '' });
  };
  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.date || !skillForm.shoot || !skillForm.pass || !skillForm.dribble || !skillForm.defense || !skillForm.tactic) return;
    if (!user || !playerId) return;
    const log = {
      ...skillForm,
      user_id: user.id,
      player_id: playerId,
      shoot: Number(skillForm.shoot),
      pass: Number(skillForm.pass),
      dribble: Number(skillForm.dribble),
      defense: Number(skillForm.defense),
      tactic: Number(skillForm.tactic),
      comment: skillForm.comment,
    };
    try {
      await skillLogService.addLog(log);
      const newLogs = await skillLogService.getLogs(playerId);
      setSkillLogs(newLogs.map(l => ({
        date: l.date,
        shoot: String(l.shoot),
        pass: String(l.pass),
        dribble: String(l.dribble),
        defense: String(l.defense),
        tactic: String(l.tactic),
        comment: l.comment || '',
      })));
    } catch (err) {
      alert('保存に失敗しました');
      console.error(err);
    }
    setSkillModalOpen(false);
    setAddType(null);
    setSkillForm({ date: '', shoot: '', pass: '', dribble: '', defense: '', tactic: '', comment: '' });
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
        date: l.date,
        height: String(l.height),
        weight: String(l.weight),
        run: l.run,
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
        shoot: String(l.shoot),
        pass: String(l.pass),
        dribble: String(l.dribble),
        defense: String(l.defense),
        tactic: String(l.tactic),
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

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <Header selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} profile={profile} />
      <main className="pt-28 px-4 pb-16">
        <PlayerInfoCard profile={profile} />
        <DashboardCard
          physicalLogs={physicalLogs}
          skillLogs={skillLogs}
          practiceLogs={practiceLogs}
          matchLogs={matchLogs}
        />
        <GoalProgress />
        <DetailTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          physicalChartRef={physicalChartRef}
          skillChartRef={skillChartRef}
          matchChartRef={matchChartRef}
          practiceLogs={practiceLogs}
          physicalLogs={physicalLogs}
          skillLogs={skillLogs}
          matchLogs={matchLogs}
        />
        <Badges
          practiceLogs={practiceLogs}
          matchLogs={matchLogs}
          skillLogs={skillLogs}
        />
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
            <h2 className="text-lg font-bold mb-4">練習記録を追加</h2>
            <form className="space-y-4" onSubmit={handlePracticeSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="date" name="date" value={form.date} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">種類</label>
                <select name="title" value={form.title} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                  <option>パス練習</option>
                  <option>シュート練習</option>
                  <option>ミニゲーム</option>
                  <option>フィジカルトレーニング</option>
                  <option>個人技術練習</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">時間</label>
                <select name="duration" value={form.duration} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                  <option>1時間</option>
                  <option>1.5時間</option>
                  <option>2時間</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">内容</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" rows={3} />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
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
            <h2 className="text-lg font-bold mb-4">体力測定データを追加</h2>
            <form className="space-y-4" onSubmit={handlePhysicalSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="date" name="date" value={physicalForm.date} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">身長 (cm)</label>
                <input type="number" name="height" value={physicalForm.height} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" required min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">体重 (kg)</label>
                <input type="number" name="weight" value={physicalForm.weight} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" required min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">50m走 (秒)</label>
                <input type="number" name="run" value={physicalForm.run} onChange={handlePhysicalFormChange} className="border rounded px-3 py-2 w-full" required min="0" step="0.01" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
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
            <h2 className="text-lg font-bold mb-4">スキル評価を追加</h2>
            <form className="space-y-4" onSubmit={handleSkillSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="date" name="date" value={skillForm.date} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    シュート力
                    <span className="block text-xs text-gray-500">（試合や練習でのシュート成功回数を入力してください）</span>
                  </label>
                  <input type="number" name="shoot" value={skillForm.shoot} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    パス精度
                    <span className="block text-xs text-gray-500">（パス成功回数を入力してください）</span>
                  </label>
                  <input type="number" name="pass" value={skillForm.pass} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ドリブル
                    <span className="block text-xs text-gray-500">（ドリブル突破成功回数を入力してください）</span>
                  </label>
                  <input type="number" name="dribble" value={skillForm.dribble} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    守備力
                    <span className="block text-xs text-gray-500">（ボール奪取や守備成功回数を入力してください）</span>
                  </label>
                  <input type="number" name="defense" value={skillForm.defense} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    戦術理解
                    <span className="block text-xs text-gray-500">（正しいポジショニングや戦術的な動きができた回数を入力してください）</span>
                  </label>
                  <input type="number" name="tactic" value={skillForm.tactic} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" min="0" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">コメント</label>
                <textarea name="comment" value={skillForm.comment} onChange={handleSkillFormChange} className="border rounded px-3 py-2 w-full" rows={2} />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 試合実績追加モーダル */}
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
            <h2 className="text-lg font-bold mb-4">試合実績を追加</h2>
            <form className="space-y-4" onSubmit={handleMatchSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="date" name="date" value={matchForm.date} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">対戦相手</label>
                <input type="text" name="opponent" value={matchForm.opponent} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">結果</label>
                <input type="text" name="result" value={matchForm.result} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 勝利 3-1" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">スコア</label>
                <input type="text" name="score" value={matchForm.score} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 得点2、アシスト1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">メモ</label>
                <textarea name="note" value={matchForm.note} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ステータス</label>
                <select name="status" value={matchForm.status} onChange={handleMatchFormChange} className="border rounded px-3 py-2 w-full">
                  <option value="win">勝利</option>
                  <option value="draw">引分</option>
                  <option value="lose">敗北</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
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
