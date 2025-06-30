import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Player } from '../config/supabase.js';
import { playerService } from '../services/playerService.js';
import { physicalLogService } from '../services/physicalLogService.js';
import { skillLogService } from '../services/skillLogService.js';
import { practiceLogService } from '../services/practiceLogService.js';
import { matchLogService } from '../services/matchLogService.js';
import BottomTabBar from '../components/BottomTabBar.js';
import * as echarts from 'echarts';

const TABS = ['体力測定', 'スキル評価', '練習記録', '試合実績'];

const PlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [physicalLogs, setPhysicalLogs] = useState<any[]>([]);
  const [skillLogs, setSkillLogs] = useState<any[]>([]);
  const [practiceLogs, setPracticeLogs] = useState<any[]>([]);
  const [matchLogs, setMatchLogs] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const skillChartRef = useRef<HTMLDivElement>(null);
  const practiceChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const data = await playerService.getPlayerById(Number(id));
        setPlayer(data);
        physicalLogService.getLogs(Number(id)).then(setPhysicalLogs);
        skillLogService.getLogs(Number(id)).then(setSkillLogs);
        practiceLogService.getLogs(Number(id)).then(setPracticeLogs);
        matchLogService.getLogs(Number(id)).then(setMatchLogs);
      } catch (e) {
        setPlayer(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // グラフ描画
  useEffect(() => {
    if (activeTab !== '体力測定' || !chartRef.current || physicalLogs.length === 0) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      title: { text: '身体データの推移', left: 'center', textStyle: { fontSize: 16 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['身長', '体重', '走力'], top: 30, icon: 'circle' },
      grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
      xAxis: { type: 'category', data: physicalLogs.map(l => l.date) },
      yAxis: [
        { type: 'value', name: '身長/体重', position: 'left' },
        { type: 'value', name: '走力(秒)', position: 'right', inverse: true, min: 'dataMin', max: 'dataMax' }
      ],
      series: [
        { name: '身長', type: 'line', data: physicalLogs.map(l => Number(l.height)), symbol: 'circle', symbolSize: 10, smooth: true, yAxisIndex: 0 },
        { name: '体重', type: 'line', data: physicalLogs.map(l => Number(l.weight)), symbol: 'circle', symbolSize: 10, smooth: true, yAxisIndex: 0 },
        { name: '走力', type: 'line', data: physicalLogs.map(l => Number(l.run)), symbol: 'circle', symbolSize: 10, smooth: true, yAxisIndex: 1, lineStyle: { color: '#f59e42' }, itemStyle: { color: '#f59e42' } }
      ]
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [activeTab, physicalLogs]);

  // スキル評価レーダーチャート
  useEffect(() => {
    if (activeTab !== 'スキル評価' || !skillChartRef.current || skillLogs.length === 0) return;
    const latest = skillLogs[0];
    const chart = echarts.init(skillChartRef.current);
    chart.setOption({
      title: { text: 'スキル評価', left: 'center', textStyle: { fontSize: 16 } },
      tooltip: {},
      radar: {
        indicator: [
          { name: 'シュート力', max: 100 },
          { name: 'パス精度', max: 100 },
          { name: 'ドリブル', max: 100 },
          { name: '守備力', max: 100 },
          { name: '戦術理解', max: 100 }
        ],
        radius: 90,
        splitNumber: 5
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: latest
                ? [latest.shoot, latest.pass, latest.dribble, latest.defense, latest.tactic].map(Number)
                : [0, 0, 0, 0, 0],
              name: '今回',
              areaStyle: { opacity: 0.2 },
              symbol: 'circle',
              symbolSize: 6,
              lineStyle: { width: 2 }
            }
          ]
        }
      ]
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [activeTab, skillLogs]);

  // 練習記録グラフ
  useEffect(() => {
    if (activeTab !== '練習記録' || !practiceChartRef.current || practiceLogs.length === 0) return;
    // 日付ごとの合計練習時間（時間単位）を算出
    const data = practiceLogs.map(log => {
      const h = log.duration.match(/([\d.]+)時間/);
      return {
        date: log.date,
        hours: h ? parseFloat(h[1]) : 0
      };
    });
    // 日付で昇順ソート
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const chart = echarts.init(practiceChartRef.current);
    chart.setOption({
      title: { text: '練習時間の推移', left: 'center', textStyle: { fontSize: 16 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.map(d => d.date) },
      yAxis: { type: 'value', name: '時間', min: 0 },
      series: [
        {
          name: '練習時間',
          type: 'line',
          data: data.map(d => d.hours),
          symbol: 'circle',
          symbolSize: 10,
          smooth: true,
          lineStyle: { color: '#3b82f6' },
          itemStyle: { color: '#3b82f6' }
        }
      ]
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [activeTab, practiceLogs]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!player) return <div className="min-h-screen flex items-center justify-center text-red-500">選手が見つかりません</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto pt-10 px-4">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">{player.name}</h2>
          <div className="text-gray-600 mb-1">{player.team}</div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <span>ポジション: {player.position}</span>
            <span>年齢: {player.age}歳</span>
            <span>身長: {player.height}cm</span>
            <span>体重: {player.weight}kg</span>
            <span>背番号: {player.jersey_number}</span>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`py-2 rounded-lg font-bold text-xs ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === '体力測定' && (
          <div>
            <div ref={chartRef} style={{ width: '100%', height: 300, marginBottom: 24 }} />
            <div className="space-y-2">
              {physicalLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
              {physicalLogs.map((log, i) => (
                <div key={i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                  <span className="font-bold mr-2">{log.date}</span>
                  <span>身長: <span className="font-bold">{log.height}cm</span></span>
                  <span>体重: <span className="font-bold">{log.weight}kg</span></span>
                  <span>50m走: <span className="font-bold">{log.run}秒</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'スキル評価' && (
          <div>
            <div ref={skillChartRef} style={{ width: '100%', height: 320, marginBottom: 24 }} />
            <div className="space-y-2">
              {skillLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
              {skillLogs.map((log, i) => (
                <div key={i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                  <span className="font-bold mr-2">{log.date}</span>
                  <span>シュート: <span className="font-bold">{log.shoot}</span></span>
                  <span>パス: <span className="font-bold">{log.pass}</span></span>
                  <span>ドリブル: <span className="font-bold">{log.dribble}</span></span>
                  <span>守備: <span className="font-bold">{log.defense}</span></span>
                  <span>戦術: <span className="font-bold">{log.tactic}</span></span>
                  {log.comment && <span className="text-gray-500 ml-2">{log.comment}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === '練習記録' && (
          <div>
            <div ref={practiceChartRef} style={{ width: '100%', height: 300, marginBottom: 24 }} />
            <div className="mb-4 text-right text-sm text-gray-700">
              合計練習時間: <span className="font-bold">{
                practiceLogs.reduce((sum, log) => {
                  const h = log.duration.match(/([\d.]+)時間/);
                  return sum + (h ? parseFloat(h[1]) : 0);
                }, 0)
              }</span> 時間
            </div>
            <div className="space-y-2">
              {practiceLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
              {practiceLogs.map((log, i) => (
                <div key={i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                  <span className="font-bold mr-2">{log.date}</span>
                  <span>内容: <span className="font-bold">{log.title}</span></span>
                  <span>時間: <span className="font-bold">{log.duration}</span></span>
                  {log.description && <span className="text-gray-500 ml-2">{log.description}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === '試合実績' && (
          <div>
            <div className="mb-4 text-right text-sm text-gray-700">
              合計得点: <span className="font-bold">{
                matchLogs.reduce((sum, log) => {
                  const m = log.score.match(/得点(\d+)/);
                  return sum + (m ? Number(m[1]) : 0);
                }, 0)
              }</span> ／ アシスト: <span className="font-bold">{
                matchLogs.reduce((sum, log) => {
                  const m = log.score.match(/アシスト(\d+)/);
                  return sum + (m ? Number(m[1]) : 0);
                }, 0)
              }</span>
            </div>
            <div className="space-y-2">
              {matchLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
              {matchLogs.map((log, i) => (
                <div key={i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                  <span className="font-bold mr-2">{log.date}</span>
                  <span>相手: <span className="font-bold">{log.opponent}</span></span>
                  <span>結果: <span className="font-bold">{log.result}</span></span>
                  <span>スコア: <span className="font-bold">{log.score}</span></span>
                  {log.note && <span className="text-gray-500 ml-2">{log.note}</span>}
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${log.status === 'win' ? 'bg-green-100 text-green-600' : log.status === 'draw' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab !== '体力測定' && (
          <div className="bg-white rounded-xl shadow p-6 min-h-[200px]">
            <div className="text-gray-400 text-center">{activeTab}のデータ表示（今後実装）</div>
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default PlayerDetailPage; 