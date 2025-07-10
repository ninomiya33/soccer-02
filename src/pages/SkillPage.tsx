import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { skillLogService, SkillLog } from '../services/skillLogService.js';
import { useAuth } from '../contexts/AuthContext.js';
import { playerService } from '../services/playerService.js';

const TOP_PLAYER_BENCHMARK = {
  dribble: 90,
  shoot: 10,
  pass: 10,
  defense: 10,
  tactic: 5,
  total: 100,
};

const SkillPage: React.FC = () => {
  const { user } = useAuth();
  const [playerId, setPlayerId] = React.useState<number | null>(null);
  const [skillLogs, setSkillLogs] = React.useState<SkillLog[]>([]);
  const radarRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // playerId取得
  useEffect(() => {
    if (!user) return;
    (async () => {
      const players = await playerService.getPlayers(user.id);
      if (players.length > 0) setPlayerId(players[0].id ?? null);
    })();
  }, [user]);

  // skillLogs取得
  useEffect(() => {
    if (!playerId) return;
    (async () => {
      const logs = await skillLogService.getLogs(playerId);
      setSkillLogs(logs);
    })();
  }, [playerId]);

  // レーダーチャート
  useEffect(() => {
    if (!skillLogs.length) return;
    const latest = skillLogs[skillLogs.length - 1];
    if (radarRef.current) {
      const chart = echarts.init(radarRef.current);
      chart.setOption({
        title: { text: '', show: false }, // レーダーチャート内タイトルは非表示
        tooltip: {},
        legend: { data: ['自分', 'トップ選手'], top: 0, left: 'center', itemGap: 32, textStyle: { fontSize: 15 } },
        grid: { top: 80 },
        radar: {
          indicator: [
            { name: 'ドリブル', max: TOP_PLAYER_BENCHMARK.dribble },
            { name: 'シュート', max: TOP_PLAYER_BENCHMARK.shoot },
            { name: 'パス', max: TOP_PLAYER_BENCHMARK.pass },
            { name: '守備', max: TOP_PLAYER_BENCHMARK.defense },
            { name: '戦術', max: TOP_PLAYER_BENCHMARK.tactic },
          ],
          center: ['50%', '70%'], // グラフをさらに下にずらす
          radius: 90,
        },
        series: [{
          type: 'radar',
          data: [
            {
              value: [
                latest?.dribble ?? 0,
                latest?.shoot ?? 0,
                latest?.pass ?? 0,
                latest?.defense ?? 0,
                latest?.tactic ?? 0,
              ],
              name: '自分',
              areaStyle: { color: 'rgba(59,130,246,0.2)' },
              lineStyle: { color: '#3b82f6' },
              symbol: 'circle',
              itemStyle: { color: '#3b82f6' },
            },
            {
              value: [
                TOP_PLAYER_BENCHMARK.dribble,
                TOP_PLAYER_BENCHMARK.shoot,
                TOP_PLAYER_BENCHMARK.pass,
                TOP_PLAYER_BENCHMARK.defense,
                TOP_PLAYER_BENCHMARK.tactic,
              ],
              name: 'トップ選手',
              areaStyle: { color: 'rgba(245,158,66,0.15)' },
              lineStyle: { color: '#f59e42', type: 'dashed', width: 3 },
              symbol: 'none',
              itemStyle: { color: '#f59e42' },
            },
          ],
        }],
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }
  }, [skillLogs]);

  // 折れ線グラフ
  useEffect(() => {
    if (!skillLogs.length) return;
    if (lineRef.current) {
      const chart = echarts.init(lineRef.current);
      chart.setOption({
        title: { text: 'スキル推移', left: 'center', textStyle: { fontSize: 16 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 30, data: ['ドリブル', 'シュート', 'パス', '守備', '戦術', 'トップ選手'], icon: 'circle' },
        grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
        xAxis: { type: 'category', data: skillLogs.map(l => l.date) },
        yAxis: { type: 'value', name: '点数', position: 'left', max: Math.max(
          TOP_PLAYER_BENCHMARK.dribble,
          TOP_PLAYER_BENCHMARK.shoot,
          TOP_PLAYER_BENCHMARK.pass,
          TOP_PLAYER_BENCHMARK.defense,
          TOP_PLAYER_BENCHMARK.tactic
        ) },
        series: [
          { name: 'ドリブル', type: 'line', data: skillLogs.map(l => l.dribble), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: 'シュート', type: 'line', data: skillLogs.map(l => l.shoot), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: 'パス', type: 'line', data: skillLogs.map(l => l.pass), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: '守備', type: 'line', data: skillLogs.map(l => l.defense), symbol: 'circle', symbolSize: 10, smooth: true },
          { name: '戦術', type: 'line', data: skillLogs.map(l => l.tactic), symbol: 'circle', symbolSize: 10, smooth: true },
          // トップ選手基準線
          { name: 'トップ選手', type: 'line', data: skillLogs.map(() => TOP_PLAYER_BENCHMARK.dribble), symbol: 'none', lineStyle: { type: 'dashed', color: '#aaa' }, areaStyle: { opacity: 0 }, },
        ],
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }
  }, [skillLogs]);

  // 棒グラフ（最新値）
  useEffect(() => {
    if (!skillLogs.length) return;
    const latest = skillLogs[skillLogs.length - 1];
    if (barRef.current) {
      const chart = echarts.init(barRef.current);
      chart.setOption({
        title: { text: 'スキル最新値', left: 'center', textStyle: { fontSize: 16 } },
        tooltip: {},
        xAxis: { type: 'category', data: ['ドリブル', 'シュート', 'パス', '守備', '戦術'] },
        yAxis: { type: 'value', name: '点数', max: Math.max(
          TOP_PLAYER_BENCHMARK.dribble,
          TOP_PLAYER_BENCHMARK.shoot,
          TOP_PLAYER_BENCHMARK.pass,
          TOP_PLAYER_BENCHMARK.defense,
          TOP_PLAYER_BENCHMARK.tactic
        ) },
        series: [{
          type: 'bar',
          data: [
            latest?.dribble ?? 0,
            latest?.shoot ?? 0,
            latest?.pass ?? 0,
            latest?.defense ?? 0,
            latest?.tactic ?? 0,
          ],
          barWidth: 40,
          markLine: {
            data: [
              { yAxis: TOP_PLAYER_BENCHMARK.dribble, name: 'トップ選手' },
            ],
            lineStyle: { type: 'dashed', color: '#aaa' },
            label: { formatter: 'トップ選手' },
          },
        }],
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }
  }, [skillLogs]);

  // スキル評価削除ハンドラ
  const handleDeleteSkillLog = async (id: number | undefined) => {
    if (!id) return;
    if (!window.confirm('本当に削除しますか？')) return;
    try {
      await skillLogService.deleteLog(id);
      if (!playerId) return;
      const logs = await skillLogService.getLogs(playerId);
      setSkillLogs(logs);
    } catch (err) {
      alert('削除に失敗しました');
      console.error(err);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <h1 className="text-2xl font-bold text-center pt-8">スキル評価</h1>
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold text-center mb-2">スキルバランス（最新）</h2>
        {/* レーダーチャートをタイトル直下に配置 */}
        <div ref={radarRef} style={{ width: '100%', height: 260, margin: '0 auto 32px auto' }} />
        {/* 他のグラフ */}
        <div ref={lineRef} style={{ width: '100%', height: 260, marginBottom: 32 }} />
        <div ref={barRef} style={{ width: '100%', height: 260, marginBottom: 32 }} />
        {/* 比較説明 */}
        <div className="mb-6 text-xs text-gray-700">
          グラフの外枠や点線はトップ選手の目安値です。自分のスコアと比較して成長を確認しましょう。
        </div>
        {/* トップ選手の目安表と補足説明 */}
        <div className="mb-6 bg-white rounded-xl shadow p-4">
          <div className="font-bold mb-2">🏆 小学6年生 トップ選手の想定目安（男子・アスリート系）</div>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left">項目</th>
                <th className="text-right">トップ選手の目安</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1分間ドリブル回数</td><td className="text-right">90回以上</td></tr>
              <tr><td>10本シュート成功数</td><td className="text-right">9〜10本</td></tr>
              <tr><td>10本パス成功数</td><td className="text-right">10本</td></tr>
              <tr><td>1対1守備成功数</td><td className="text-right">8〜10回</td></tr>
              <tr><td>判断テスト正答数</td><td className="text-right">4〜5問</td></tr>
              <tr><td>スキル総合点</td><td className="text-right">85点以上/100点</td></tr>
            </tbody>
          </table>
          <div className="text-xs text-gray-600">
            <div>ドリブル回数：コーン間やマーカーで左右交互に動かすものと仮定。1秒1回以上を継続できると優秀。</div>
            <div>シュート成功数：ゴールの枠内に決められる精度。インサイドやインステップなどで正確に。</div>
            <div>パス成功数：距離10m以内の正確なパスを10本。1回でもミスがあると減点。</div>
            <div>守備成功数：1対1形式で攻撃側を止めた回数（接近→ステップ→ボール奪取）。</div>
            <div>判断テスト：画面に表示された選択肢に瞬時に反応できるかを評価（タブレットや口頭でも可）。</div>
            <div>コメント欄：コーチや親が見て気づいた成長点や課題を書く場所。</div>
          </div>
        </div>
        <h3 className="text-base font-medium mt-6 mb-2">スキル評価履歴</h3>
        <div className="space-y-2">
          {skillLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
          {skillLogs.slice().reverse().map((log, i) => (
            <div key={log.id || i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm relative">
              <span className="font-bold mr-2">{log.date}</span>
              <span>ドリブル: <span className="font-bold">{log.dribble}</span> / <span className="text-gray-500">{TOP_PLAYER_BENCHMARK.dribble}目安</span></span>
              <span>シュート: <span className="font-bold">{log.shoot}</span> / <span className="text-gray-500">{TOP_PLAYER_BENCHMARK.shoot}目安</span></span>
              <span>パス: <span className="font-bold">{log.pass}</span> / <span className="text-gray-500">{TOP_PLAYER_BENCHMARK.pass}目安</span></span>
              <span>守備: <span className="font-bold">{log.defense}</span> / <span className="text-gray-500">{TOP_PLAYER_BENCHMARK.defense}目安</span></span>
              <span>戦術: <span className="font-bold">{log.tactic}</span> / <span className="text-gray-500">{TOP_PLAYER_BENCHMARK.tactic}目安</span></span>
              {log.comment && <span>コメント: <span className="font-bold">{log.comment}</span></span>}
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                title="削除"
                onClick={() => handleDeleteSkillLog(log.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillPage; 