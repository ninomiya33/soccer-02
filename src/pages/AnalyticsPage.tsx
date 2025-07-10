import React, { useState, useEffect, useRef } from "react";
import * as echarts from "echarts";
import BottomTabBar from '../components/BottomTabBar.js';
import { useAuth } from '../contexts/AuthContext.js';
import { profileService } from '../services/profileService.js';
import { skillLogService } from '../services/skillLogService.js';
import { physicalLogService } from '../services/physicalLogService.js';
import { practiceLogService } from '../services/practiceLogService.js';
import { matchLogService } from '../services/matchLogService.js';
import { playerService } from '../services/playerService.js';
import { fetchAdvice } from '../services/aiAdviceService.js';
import { saveAdviceLog, getAdviceLogs, deleteAdviceLog } from '../services/adviceLogService.js';
import { fetchGrowthPrediction } from '../services/growthService.js';
import CustomCalendar from '../components/CustomCalendar.js';

interface AnalyticsPageProps {
  physicalLogs: {
    date: string;
    height: string;
    weight: string;
    run50m?: string;
  }[];
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
  matchLogs: {
    date: string;
    opponent: string;
    result: string;
    score: string;
    note: string;
    status: 'win' | 'draw' | 'lose';
  }[];
  practiceLogs: {
    date: string;
    duration: string;
    title: string;
    description: string;
  }[];
}

interface SkillLogType {
  date: string;
  dribble_count: string;
  shoot_success: string;
  pass_success: string;
  defense_success: string;
  decision_correct: string;
  total_score: string;
  comment: string;
}

interface PhysicalLogType {
  date: string;
  height: string;
  weight: string;
  run50m?: string;
}

interface PracticeLogType {
  date: string;
  duration: string;
  title: string;
  description: string;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ physicalLogs, skillLogs, matchLogs, practiceLogs }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    profileService.getProfile(user.id).then(setProfile);
  }, [user]);

  // 総合評価: スキル・体力の最新値合計（例）
  const latestSkill = skillLogs[0];
  const latestPhysical = physicalLogs[0];
  const skillScore = latestSkill ? [latestSkill.dribble_count, latestSkill.shoot_success, latestSkill.pass_success, latestSkill.defense_success, latestSkill.decision_correct].reduce((a, b) => a + Number(b), 0) : 0;
  const physicalScore = latestPhysical ? Number(latestPhysical.height) + Number(latestPhysical.weight) : 0;
  const totalScore = skillScore + physicalScore;

  // 成長率: 先月と今月のスコア比較（例）
  const getMonth = (date: string) => date?.slice(0, 7);
  const nowMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();
  const thisMonthSkill = skillLogs.find(l => getMonth(l.date) === nowMonth);
  const lastMonthSkill = skillLogs.find(l => getMonth(l.date) === lastMonth);
  const thisMonthScore = thisMonthSkill ? [thisMonthSkill.dribble_count, thisMonthSkill.shoot_success, thisMonthSkill.pass_success, thisMonthSkill.defense_success, thisMonthSkill.decision_correct].reduce((a, b) => a + Number(b), 0) : 0;
  const lastMonthScore = lastMonthSkill ? [lastMonthSkill.dribble_count, lastMonthSkill.shoot_success, lastMonthSkill.pass_success, lastMonthSkill.defense_success, lastMonthSkill.decision_correct].reduce((a, b) => a + Number(b), 0) : 0;
  const growthRate = lastMonthScore ? ((thisMonthScore - lastMonthScore) / lastMonthScore) * 100 : 0;

  // 今月の練習時間合計
  const thisMonthPractice = practiceLogs.filter(l => getMonth(l.date) === nowMonth);
  const totalPracticeHours = thisMonthPractice.reduce((sum, log) => {
    const h = log.duration.match(/([\d.]+)時間/);
    return sum + (h ? parseFloat(h[1]) : 0);
  }, 0);

  // 今月の試合数
  const thisMonthMatches = matchLogs.filter(l => getMonth(l.date) === nowMonth);

  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("AIコーチ");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("月間");
  const [selectedDataType, setSelectedDataType] = useState<string>("全て");
  const [showReportDialog, setShowReportDialog] = useState<boolean>(false);

  const growthChartRef = useRef<HTMLDivElement>(null);
  const matchStatsChartRef = useRef<HTMLDivElement>(null);
  const playerComparisonChartRef = useRef<HTMLDivElement>(null);
  const strengthWeaknessChartRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    date: '',
    age: '',
    gender: '',
    run50m: '',
    shuttle_run: '',
    jump: '',
    sit_up: '',
    sit_and_reach: '',
  });
  const [adviceResult, setAdviceResult] = useState<{ scores: any; advice: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [growthPrediction, setGrowthPrediction] = useState<any>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [growthError, setGrowthError] = useState<string | null>(null);
  const [showAdviceDatePicker, setShowAdviceDatePicker] = useState(false);

  useEffect(() => {
    if (profile?.name) setSelectedPlayer(profile.name);
  }, [profile]);

  useEffect(() => {
    if (user?.id) {
      getAdviceLogs(user.id).then(setLogs).catch(console.error);
    }
  }, [user]);

  // 技術・体力スコアを月ごとに集計（練習記録も加味）
  const simpleGrowthMonthly: { [month: string]: { skill: number; physical: number; count: number } } = {};
  [...skillLogs, ...physicalLogs, ...practiceLogs].forEach(l => {
    const m = getMonth(l.date);
    if (!simpleGrowthMonthly[m]) simpleGrowthMonthly[m] = { skill: 0, physical: 0, count: 0 };
    // skill_logs
    if ('dribble_count' in l && 'shoot_success' in l && 'pass_success' in l && 'defense_success' in l && 'decision_correct' in l) {
      simpleGrowthMonthly[m].skill += Number(l.dribble_count) + Number(l.shoot_success) + Number(l.pass_success) + Number(l.defense_success) + Number(l.decision_correct);
      simpleGrowthMonthly[m].count++;
    }
    // physical_logs
    if ('height' in l && 'weight' in l) {
      simpleGrowthMonthly[m].physical += Number(l.height) + Number(l.weight);
      simpleGrowthMonthly[m].count++;
    }
    // practice_logs（練習時間をスコアに微加算: 1時間=+1pt仮）
    if ('duration' in l) {
      const h = l.duration.match(/([\d.]+)時間/);
      if (h) {
        simpleGrowthMonthly[m].skill += parseFloat(h[1]);
        simpleGrowthMonthly[m].physical += parseFloat(h[1]);
        simpleGrowthMonthly[m].count++;
      }
    }
  });
  const simpleMonths = Object.keys(simpleGrowthMonthly).sort();
  const skillGrowth = simpleMonths.map(m => simpleGrowthMonthly[m].count ? simpleGrowthMonthly[m].skill / simpleGrowthMonthly[m].count : 0);
  const physicalGrowth = simpleMonths.map(m => simpleGrowthMonthly[m].count ? simpleGrowthMonthly[m].physical / simpleGrowthMonthly[m].count : 0);

  // 成長率バー用: 今月・先月のデータで成長率を計算
  // 技術スコア成長率
  const sumSkill = (logs: SkillLogType[]): number => logs.reduce((sum, l) => sum + Number(l.dribble_count) + Number(l.shoot_success) + Number(l.pass_success) + Number(l.defense_success) + Number(l.decision_correct), 0);
  const thisMonthSkillLogs = skillLogs.filter(l => getMonth(l.date) === nowMonth);
  const lastMonthSkillLogs = skillLogs.filter(l => getMonth(l.date) === lastMonth);
  const thisMonthSkillScore = sumSkill(thisMonthSkillLogs);
  const lastMonthSkillScore = sumSkill(lastMonthSkillLogs);
  const skillGrowthRate = lastMonthSkillScore ? ((thisMonthSkillScore - lastMonthSkillScore) / lastMonthSkillScore) * 100 : 0;

  // 体力スコア成長率
  const avgPhysical = (logs: PhysicalLogType[]): number => logs.length ? logs.reduce((sum, l) => sum + Number(l.height) + Number(l.weight), 0) / (logs.length * 2) : 0;
  const thisMonthPhysicalLogs = physicalLogs.filter(l => getMonth(l.date) === nowMonth);
  const lastMonthPhysicalLogs = physicalLogs.filter(l => getMonth(l.date) === lastMonth);
  const thisMonthPhysicalAvg = avgPhysical(thisMonthPhysicalLogs);
  const lastMonthPhysicalAvg = avgPhysical(lastMonthPhysicalLogs);
  const physicalGrowthRate = lastMonthPhysicalAvg ? ((thisMonthPhysicalAvg - lastMonthPhysicalAvg) / lastMonthPhysicalAvg) * 100 : 0;

  // メンタルスコア成長率（defense + tactic）
  const sumMental = (logs: SkillLogType[]): number => logs.reduce((sum, l) => sum + Number(l.defense_success) + Number(l.decision_correct), 0);
  const thisMonthMental = sumMental(thisMonthSkillLogs);
  const lastMonthMental = sumMental(lastMonthSkillLogs);
  const mentalGrowthRate = lastMonthMental ? ((thisMonthMental - lastMonthMental) / lastMonthMental) * 100 : 0;

  // 月ごとに集計するユーティリティ
  const groupByMonth = <T extends { date: string }>(logs: T[], fields: (keyof T)[]): { [month: string]: any } => {
    const map: { [month: string]: any } = {};
    logs.forEach(l => {
      const m = getMonth(l.date);
      if (!map[m]) map[m] = { count: 0 };
      map[m].count++;
      fields.forEach(f => {
        map[m][f] = (map[m][f] || 0) + Number(l[f] || 0);
      });
    });
    // 平均値算出
    Object.keys(map).forEach(m => {
      fields.forEach(f => { map[m][f] = map[m][f] / map[m].count; });
    });
    return map;
  };

  // 技術スコア推移
  const skillMonthly = groupByMonth(skillLogs, ["dribble_count", "shoot_success", "pass_success", "defense_success", "decision_correct"]);
  const skillMonths = Object.keys(skillMonthly).sort();
  const skillSeries = ["dribble_count", "shoot_success", "pass_success", "defense_success", "decision_correct"].map(key => ({
    name: key,
    type: "line",
    data: skillMonths.map(m => skillMonthly[m][key] || 0),
  }));

  // 体力スコア推移
  const physicalMonthly = groupByMonth(physicalLogs, ["height", "weight"]);
  const physicalMonths = Object.keys(physicalMonthly).sort();
  const physicalSeries = ["height", "weight"].map(key => ({
    name: key,
    type: "line",
    data: physicalMonths.map(m => physicalMonthly[m][key] || 0),
  }));

  // 練習時間推移
  const practiceMonthly: { [month: string]: { count: number; hours?: number } } = {};
  Object.keys(practiceMonthly).forEach(m => {
    practiceMonthly[m].hours = practiceLogs.filter(l => getMonth(l.date) === m).reduce((sum, l) => {
      const h = l.duration.match(/([\d.]+)時間/); return sum + (h ? parseFloat(h[1]) : 0);
    }, 0);
  });
  const practiceMonths = Object.keys(practiceMonthly).sort();
  const practiceSeries = [{
    name: "練習時間",
    type: "bar",
    data: practiceMonths.map(m => practiceMonthly[m].hours),
  }];

  // 試合数推移
  const matchMonthly = groupByMonth(matchLogs, []);
  const matchMonths = Object.keys(matchMonthly).sort();
  const matchSeries = [{
    name: "試合数",
    type: "bar",
    data: matchMonths.map(m => matchMonthly[m].count),
  }];

  // 成長推移グラフ（例: 総合評価=スキル合計, 技術=スキル, 体力=体力測定平均）
  useEffect(() => {
    if (growthChartRef.current) {
      const months = physicalLogs.map(l => l.date.slice(5, 7) + '月');
      const skillSum = skillLogs.map(l => [l.dribble_count, l.shoot_success, l.pass_success, l.defense_success, l.decision_correct].reduce((a, b) => a + Number(b), 0));
      const physicalAvg = physicalLogs.map(l => (Number(l.height) + Number(l.weight) + Number(l.run50m || 0)) / 3);
      const overall = skillSum.map((v, i) => Math.round((v + (physicalAvg[i] || 0)) / 2));
      const growthOption = {
        tooltip: { trigger: "axis" },
        legend: { data: ["総合評価", "技術スコア", "体力スコア"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "15%", top: "8%", containLabel: true },
        xAxis: { type: "category" as const, boundaryGap: false, data: months },
        yAxis: { type: "value", min: 0, max: 100 },
        series: [
          { name: "総合評価", type: "line", data: overall, lineStyle: { width: 3 }, itemStyle: { color: "#3b82f6" }, smooth: true },
          { name: "技術スコア", type: "line", data: skillSum, lineStyle: { width: 2 }, itemStyle: { color: "#10b981" }, smooth: true },
          { name: "体力スコア", type: "line", data: physicalAvg, lineStyle: { width: 2 }, itemStyle: { color: "#f59e0b" }, smooth: true },
        ],
      };
      const chart = echarts.init(growthChartRef.current as HTMLDivElement);
      chart.setOption(growthOption as any);
      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
      return () => { chart.dispose(); window.removeEventListener("resize", handleResize); };
    }
  }, [physicalLogs, skillLogs]);

  // 試合統計グラフ
  useEffect(() => {
    if (matchStatsChartRef.current && activeTab === "試合統計") {
      const sorted = matchLogs.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const xData = sorted.map(l => l.date.slice(5).replace('-', '/'));
      const goals = sorted.map(l => { const m = l.score.match(/得点(\d+)/); return m ? Number(m[1]) : 0; });
      const assists = sorted.map(l => { const m = l.score.match(/アシスト(\d+)/); return m ? Number(m[1]) : 0; });
      const shots = sorted.map(() => Math.floor(Math.random() * 5) + 3); // 仮: ランダム
      const matchStatsOption = {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { data: ["得点", "アシスト", "シュート数"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "15%", top: "8%", containLabel: true },
        xAxis: [{ type: "category" as const, data: xData }],
        yAxis: [{ type: "value" }],
        series: [
          { name: "得点", type: "bar", data: goals, itemStyle: { color: "#3b82f6" } },
          { name: "アシスト", type: "bar", data: assists, itemStyle: { color: "#10b981" } },
          { name: "シュート数", type: "line", data: shots, itemStyle: { color: "#f59e0b" } },
        ],
      };
      const chart = echarts.init(matchStatsChartRef.current as HTMLDivElement);
      chart.setOption(matchStatsOption as any);
      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
      return () => { chart.dispose(); window.removeEventListener("resize", handleResize); };
    }
  }, [matchLogs, activeTab]);

  // 選手比較グラフ（例: 最新スキル評価 vs チーム平均/トップ）
  useEffect(() => {
    if (playerComparisonChartRef.current && activeTab === "選手比較") {
      const latest = skillLogs[0] || { dribble_count: 0, shoot_success: 0, pass_success: 0, defense_success: 0, decision_correct: 0 };
      const self = [latest.dribble_count, latest.shoot_success, latest.pass_success, latest.defense_success, latest.decision_correct].map(Number);
      const teamAvg = [60, 65, 62, 60, 63]; // 仮
      const top = [90, 92, 88, 85, 90]; // 仮
      const playerComparisonOption = {
        tooltip: { trigger: "item" },
        legend: { data: [selectedPlayer || profile?.name || "自分", "チーム平均", "トップ選手"], bottom: 0 },
        radar: {
          indicator: [
            { name: "シュート力", max: 100 },
            { name: "パス精度", max: 100 },
            { name: "ドリブル", max: 100 },
            { name: "守備力", max: 100 },
            { name: "戦術理解", max: 100 }
          ],
          radius: "65%",
        },
        series: [
          { type: "radar", data: [
            { value: self, name: selectedPlayer || profile?.name || "自分", itemStyle: { color: "#3b82f6" }, areaStyle: { color: "rgba(59, 130, 246, 0.3)" }, lineStyle: { width: 2 } },
            { value: teamAvg, name: "チーム平均", itemStyle: { color: "#9ca3af" }, areaStyle: { color: "rgba(156, 163, 175, 0.3)" }, lineStyle: { width: 2 } },
            { value: top, name: "トップ選手", itemStyle: { color: "#f59e0b" }, areaStyle: { color: "rgba(245, 158, 11, 0.3)" }, lineStyle: { width: 2 } },
          ]}
        ]
      };
      const chart = echarts.init(playerComparisonChartRef.current as HTMLDivElement);
      chart.setOption(playerComparisonOption as any);
      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
      return () => { chart.dispose(); window.removeEventListener("resize", handleResize); };
    }
  }, [skillLogs, activeTab, selectedPlayer, profile]);

  // 強み弱みグラフ（仮: 固定データ）
  useEffect(() => {
    if (strengthWeaknessChartRef.current && activeTab === "強み弱み") {
      const chart = echarts.init(strengthWeaknessChartRef.current as HTMLDivElement);
      const strengthWeaknessOption = {
        tooltip: { position: "top" },
        grid: { left: "3%", right: "4%", bottom: "10%", top: "10%", containLabel: true },
        xAxis: { type: "category" as const, data: ["パス", "シュート", "ドリブル", "戦術", "スタミナ", "メンタル", "スピード", "ポジショニング"], splitArea: { show: true } },
        yAxis: { type: "category" as const, data: ["攻撃時", "守備時", "試合全体"], splitArea: { show: true } },
        visualMap: { min: 0, max: 100, calculable: true, orient: "horizontal", left: "center", bottom: "0%", inRange: { color: ["#f87171", "#fbbf24", "#34d399", "#3b82f6"] } },
        series: [{ name: "パフォーマンス評価", type: "heatmap", data: [ [0, 0, 85], [1, 0, 90], [2, 0, 80], [3, 0, 70], [4, 0, 75], [5, 0, 95], [6, 0, 85], [7, 0, 75], [0, 1, 65], [1, 1, 60], [2, 1, 70], [3, 1, 75], [4, 1, 80], [5, 1, 85], [6, 1, 75], [7, 1, 80], [0, 2, 75], [1, 2, 80], [2, 2, 75], [3, 2, 70], [4, 2, 80], [5, 2, 90], [6, 2, 80], [7, 2, 75], ], label: { show: true }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" } } }],
      };
      chart.setOption(strengthWeaknessOption as any);
      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
      return () => { chart.dispose(); window.removeEventListener("resize", handleResize); };
    }
  }, [activeTab]);

  // useEffectでシンプル成長推移グラフ描画
  useEffect(() => {
    if (activeTab !== "成長推移") return;
    if (document.getElementById("simpleGrowthChart")) {
      const chart = echarts.init(document.getElementById("simpleGrowthChart") as HTMLDivElement);
      chart.setOption({
        tooltip: { trigger: "axis" },
        legend: { data: ["技術スコア", "体力スコア"], bottom: 0 },
        xAxis: { type: "category" as const, data: simpleMonths },
        yAxis: { type: "value" },
        series: [
          { name: "技術スコア", type: "line", data: skillGrowth, itemStyle: { color: "#3b82f6" } },
          { name: "体力スコア", type: "line", data: physicalGrowth, itemStyle: { color: "#f59e0b" } },
        ],
      } as any);
      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
      return () => { chart.dispose(); window.removeEventListener("resize", handleResize); };
    }
  }, [activeTab, simpleMonths.join(), skillGrowth.join(), physicalGrowth.join()]);

  // 最新履歴から成長予測APIを呼ぶ
  useEffect(() => {
    if (logs.length === 0) return;
    const latest = logs[0];
    if (!latest) return;
    setGrowthLoading(true);
    setGrowthError(null);
    fetchGrowthPrediction({
      age: latest.age,
      gender: latest.gender,
      run50m: latest.run50m,
      shuttle_run: latest.shuttle_run,
      jump: latest.jump,
      sit_up: latest.sit_up,
      sit_and_reach: latest.sit_and_reach,
    })
      .then(setGrowthPrediction)
      .catch(e => setGrowthError(e.message))
      .finally(() => setGrowthLoading(false));
  }, [logs]);

  // グラフ描画
  useEffect(() => {
    if (!growthChartRef.current || !growthPrediction) return;
    const months = ['現在', '1ヶ月後', '2ヶ月後', '3ヶ月後'];
    const keys = ['run50m', 'shuttle_run', 'jump', 'sit_up', 'sit_and_reach'];
    const labels = ['50m走', 'シャトルラン', '立ち幅跳び', '上体起こし', '長座体前屈'];
    const start = growthPrediction.start;
    const pred = growthPrediction.growth_prediction;
    const series = keys.map((k, i) => ({
      name: labels[i],
      type: 'line',
      data: [start[k], ...pred[k]],
      smooth: true,
      lineStyle: { width: 3, type: 'solid' },
      symbol: 'circle',
    }));
    const option = {
      tooltip: { trigger: 'axis' },
      legend: { data: labels },
      xAxis: { type: 'category', data: months },
      yAxis: { type: 'value' },
      series,
    };
    const chart = echarts.init(growthChartRef.current as HTMLDivElement);
    chart.setOption(option as any);
    return () => chart.dispose();
  }, [growthPrediction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAdviceResult(null);
    try {
      const input = {
        date: form.date,
        age: Number(form.age),
        gender: form.gender,
        run50m: Number(form.run50m),
        shuttle_run: Number(form.shuttle_run),
        jump: Number(form.jump),
        sit_up: Number(form.sit_up),
        sit_and_reach: Number(form.sit_and_reach),
      };
      const result = await fetchAdvice(input);
      setAdviceResult(result);
      // Supabaseに保存
      await saveAdviceLog({
        user_id: user?.id,
        ...input,
        advice: result.advice,
      });
      // 保存後に履歴を再取得
      if (user?.id) {
        getAdviceLogs(user.id).then(setLogs).catch(console.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <div className="bg-blue-600 text-white w-full top-0 z-20 shadow-md">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <h2 className="text-2xl font-bold tracking-tight">パフォーマンス分析</h2>
          <div className="text-lg font-semibold mt-2">{profile?.name || ''}</div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTab !== "AIコーチ" && (
          <>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
              <div className="text-gray-500 text-sm mb-1">総合評価</div>
              <div className="text-3xl font-bold mb-1">{skillLogs[0] ? [skillLogs[0].dribble_count, skillLogs[0].shoot_success, skillLogs[0].pass_success, skillLogs[0].defense_success, skillLogs[0].decision_correct].reduce((a, b) => a + Number(b), 0) : '--'}<span className="text-base text-gray-500">点</span></div>
              <div className="text-green-600 text-xs">先月比 {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
              <div className="text-gray-500 text-sm mb-1">成長率</div>
              <div className="text-3xl font-bold mb-1">{growthRate.toFixed(1)}%</div>
              <div className="text-green-600 text-xs">平均より +3.2%</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
              <div className="text-gray-500 text-sm mb-1">練習時間</div>
              <div className="text-3xl font-bold mb-1">{totalPracticeHours}時間</div>
              <div className="text-blue-600 text-xs">今月 {totalPracticeHours}時間</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
              <div className="text-gray-500 text-sm mb-1">試合出場</div>
              <div className="text-3xl font-bold mb-1">{thisMonthMatches.length}試合</div>
              <div className="text-purple-600 text-xs">今月 {thisMonthMatches.length}試合</div>
            </div>
          </>
        )}
      </div>
      <header className="bg-blue-600 text-white p-4 fixed w-full top-0 z-10 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="cursor-pointer"><i className="fas fa-arrow-left text-lg"></i></span>
            <h1 className="text-lg font-bold">パフォーマンス分析</h1>
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <div className="text-white font-bold">{selectedPlayer}</div>
          <div className="text-right">
            <h2 className="text-sm font-medium">TAKUMA.jr</h2>
            <p className="text-xs opacity-80">ポジション: ミッドフィールダー</p>
          </div>
        </div>
      </header>
      <main className="pt-32 px-4 pb-20">
        {/* サマリーカード */}
        {activeTab !== "AIコーチ" && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between">
              <div className="flex items-center mb-2"><i className="fas fa-chart-line text-blue-500 mr-2"></i>総合評価</div>
              <div className="text-3xl font-bold">{skillLogs[0] ? [skillLogs[0].dribble_count, skillLogs[0].shoot_success, skillLogs[0].pass_success, skillLogs[0].defense_success, skillLogs[0].decision_correct].reduce((a, b) => a + Number(b), 0) : '--'}<span className="text-base text-gray-500">点</span></div>
              <div className="flex items-center text-xs text-green-600 mt-1"><i className="fas fa-arrow-up mr-1"></i>先月比 +3点</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between">
              <div className="flex items-center mb-2"><i className="fas fa-rocket text-green-500 mr-2"></i>成長率</div>
              <div className="text-3xl font-bold">{growthRate}<span className="text-base text-gray-500">%</span></div>
              <div className="flex items-center text-xs text-green-600 mt-1"><i className="fas fa-arrow-up mr-1"></i>平均より +{growthRate.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between">
              <div className="flex items-center mb-2"><i className="fas fa-stopwatch text-amber-500 mr-2"></i>練習時間</div>
              <div className="text-3xl font-bold">{totalPracticeHours}<span className="text-base text-gray-500">時間</span></div>
              <div className="flex items-center text-xs text-blue-600 mt-1"><i className="fas fa-clock mr-1"></i>今月 {totalPracticeHours}時間</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between">
              <div className="flex items-center mb-2"><i className="fas fa-trophy text-purple-500 mr-2"></i>試合出場</div>
              <div className="text-3xl font-bold">{thisMonthMatches.length}<span className="text-base text-gray-500">試合</span></div>
              <div className="flex items-center text-xs text-blue-600 mt-1"><i className="fas fa-futbol mr-1"></i>先発 {thisMonthMatches.length}回</div>
            </div>
          </div>
        )}
        {/* タブ */}
        <div className="mb-4">
          <div className="grid grid-cols-5 gap-2">
            {activeTab === "AIコーチ"
              ? ["AIコーチ"].map(tab => (
                  <button
                    key={tab}
                    className={`text-xs py-2 rounded-lg font-bold bg-blue-600 text-white`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))
              : ["AIコーチ", "成長推移", "試合統計", "選手比較", "強み弱み"].map(tab => (
                  <button
                    key={tab}
                    className={`text-xs py-2 rounded-lg font-bold ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
          </div>
        </div>
        {/* --- AIコーチタブ --- */}
        {activeTab === "AIコーチ" && (
          <>
            {/* iOS風AIコーチフォーム */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-700">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                AIコーチ体力アドバイス
              </h2>
              <form className="space-y-8" onSubmit={handleSubmit}>
                {/* 基本情報 */}
                <div className="bg-blue-50 rounded-xl p-4 mb-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-blue-700">日付</label>
                      <input
                        type="text"
                        name="date"
                        value={form.date}
                        onFocus={() => setShowAdviceDatePicker(true)}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base cursor-pointer"
                        required
                        placeholder="YYYY-MM-DD"
                      />
                      {showAdviceDatePicker && (
                        <div className="absolute z-50 bg-white rounded-xl shadow-xl mt-2">
                          <CustomCalendar
                            year={new Date().getFullYear()}
                            month={new Date().getMonth()}
                            selectedDate={form.date}
                            onDateSelect={(date: string) => {
                              setForm({ ...form, date });
                              setShowAdviceDatePicker(false);
                            }}
                            onYearChange={() => {}}
                            onMonthChange={() => {}}
                          />
                          <button type="button" className="mt-2 text-blue-600" onClick={() => setShowAdviceDatePicker(false)}>閉じる</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-blue-700">年齢</label>
                      <input type="number" name="age" value={form.age} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" required placeholder="例: 10" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-blue-700">性別</label>
                      <select name="gender" value={form.gender} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" required>
                        <option value="">選択</option>
                        <option value="boy">男子</option>
                        <option value="girl">女子</option>
                      </select>
                    </div>
                    <div></div>
                  </div>
                </div>
                {/* 測定項目 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-blue-700"><svg className="inline w-4 h-4 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>50m走 <span className='text-gray-400'>(秒)</span></label>
                      <input type="number" step="0.01" name="run50m" value={form.run50m} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" required placeholder="例: 9.2" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-green-700"><svg className="inline w-4 h-4 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>シャトルラン <span className='text-gray-400'>(回)</span></label>
                      <input type="number" name="shuttle_run" value={form.shuttle_run} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 bg-white text-base" required placeholder="例: 30" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-yellow-700"><svg className="inline w-4 h-4 mr-1 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>立ち幅跳び <span className='text-gray-400'>(cm)</span></label>
                      <input type="number" name="jump" value={form.jump} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-500 bg-white text-base" required placeholder="例: 150" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-pink-700"><svg className="inline w-4 h-4 mr-1 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>上体起こし <span className='text-gray-400'>(回)</span><span className='text-xs text-gray-500 ml-1'>(30秒間で何回できるか)</span></label>
                      <input type="number" name="sit_up" value={form.sit_up} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-500 bg-white text-base" required placeholder="例: 20" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-purple-700"><svg className="inline w-4 h-4 mr-1 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>長座体前屈 <span className='text-gray-400'>(cm)</span></label>
                      <input type="number" name="sit_and_reach" value={form.sit_and_reach} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 bg-white text-base" required placeholder="例: 35" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl shadow-lg hover:bg-blue-700 font-bold text-base transition-all duration-150" disabled={loading}>
                    {loading ? '診断中...' : 'AIアドバイスを受ける'}
                  </button>
                </div>
              </form>
              {error && <div className="text-red-500 mt-4 text-center font-bold">{error}</div>}
            </div>
            {/* iOS風診断履歴カード */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
              <h2 className="text-lg font-bold mb-4 text-blue-700">診断履歴</h2>
              {logs.length === 0 && <div className="text-gray-400 text-sm text-center">履歴がありません</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {logs.map(log => {
                    const isOpen = adviceResult && ((adviceResult as any).id ? (adviceResult as any).id === log.id : (adviceResult as any).date === log.date && (adviceResult as any).created_at === log.created_at);
                    return (
                    <div key={log.id} className={`bg-white rounded-xl shadow-lg flex flex-col gap-2 p-5 relative group border-2 transition cursor-pointer ${isOpen ? 'border-blue-400 ring-2 ring-blue-200' : 'border-transparent'}`}
                        onClick={() => setAdviceResult(isOpen ? null : log)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                          <span className="text-xs text-gray-500">{log.date || log.created_at?.slice(0,10)}</span>
                        <span className="ml-2 text-xs text-blue-500 flex items-center gap-1"><svg className={`w-4 h-4 ${isOpen ? 'rotate-180' : ''} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>{isOpen ? '閉じる' : '詳細'}</span>
                          <button
                            className="ml-auto text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                            title="削除"
                            onClick={e => { e.stopPropagation(); if(window.confirm('この診断履歴を削除しますか？')) { deleteAdviceLog(log.id).then(()=>{ if(user?.id) getAdviceLogs(user.id).then(setLogs); }); } }}
                          >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        <div className="text-sm font-bold">年齢: {log.age} / 性別: {log.gender}</div>
                        <div className="text-xs text-gray-600">50m走: {log.run50m}秒 / シャトルラン: {log.shuttle_run}回</div>
                        <div className="text-xs text-gray-600">立ち幅跳び: {log.jump}cm / 上体起こし: {log.sit_up}回 / 長座体前屈: {log.sit_and_reach}cm</div>
                        {isOpen && (
                          <div className="mt-3 border-t pt-3 animate-fade-in">
                            {log.scores && (
                              <>
                              <div className="mb-2 font-bold text-blue-700">スコア</div>
                                <ul className="text-sm grid grid-cols-2 gap-2">
                                  {(Object.entries(log.scores) as [string, any][]).map(([k, v]) => (
                                    <li key={k}>{k}: <span className="font-bold">{v}</span></li>
                                  ))}
                                </ul>
                              </>
                            )}
                          <div className="mb-2 font-bold mt-2 text-blue-700">AIコーチのアドバイス</div>
                          <div className="bg-blue-50 rounded-xl p-3 text-sm mb-2" style={{ whiteSpace: 'pre-line' }}>
                              {log.advice}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            {/* --- カスタム練習メニュー --- */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-700">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h3" /></svg>
                5種目別カスタム練習メニュー
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-5 flex gap-4 items-start shadow-sm border border-blue-100">
                  <svg className="w-8 h-8 text-blue-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  <div>
                    <div className="font-bold text-blue-700 mb-1 text-lg">50m走</div>
                    <ul className="list-disc pl-5 text-base text-blue-900 space-y-1">
                      <li>ダッシュ練習</li>
                      <li>ミニハードル走</li>
                      <li>フォーム改善</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-5 flex gap-4 items-start shadow-sm border border-green-100">
                  <svg className="w-8 h-8 text-green-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  <div>
                    <div className="font-bold text-green-700 mb-1 text-lg">シャトルラン</div>
                    <ul className="list-disc pl-5 text-base text-green-900 space-y-1">
                      <li>持久走</li>
                      <li>インターバルトレーニング</li>
                      <li>リズム走</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-5 flex gap-4 items-start shadow-sm border border-yellow-100">
                  <svg className="w-8 h-8 text-yellow-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  <div>
                    <div className="font-bold text-yellow-700 mb-1 text-lg">立ち幅跳び</div>
                    <ul className="list-disc pl-5 text-base text-yellow-900 space-y-1">
                      <li>ジャンプドリル</li>
                      <li>スクワット</li>
                      <li>体幹トレーニング</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-pink-50 rounded-xl p-5 flex gap-4 items-start shadow-sm border border-pink-100">
                  <svg className="w-8 h-8 text-pink-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  <div>
                    <div className="font-bold text-pink-700 mb-1 text-lg">上体起こし</div>
                    <ul className="list-disc pl-5 text-base text-pink-900 space-y-1">
                      <li>腹筋運動</li>
                      <li>体幹プランク</li>
                      <li>メディシンボール投げ</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 flex gap-4 items-start shadow-sm border border-purple-100 sm:col-span-2">
                  <svg className="w-8 h-8 text-purple-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  <div>
                    <div className="font-bold text-purple-700 mb-1 text-lg">長座体前屈</div>
                    <ul className="list-disc pl-5 text-base text-purple-900 space-y-1">
                      <li>ストレッチ</li>
                      <li>ヨガ</li>
                      <li>柔軟体操</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            {/* --- 成長予想グラフ --- */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-700">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 10V5a3 3 0 00-6 0v5m6 0a3 3 0 01-6 0m6 0v1a3 3 0 01-6 0v-1" /></svg>
                成長予想グラフ（3ヶ月）
              </h2>
              {growthLoading && <div className="text-blue-500 text-center">予測中...</div>}
              {growthError && <div className="text-red-500 text-center">{growthError}</div>}
              <div ref={growthChartRef} style={{ width: '100%', height: 300 }} />
            </div>
          </>
        )}
        {/* --- 成長推移タブ --- */}
        {activeTab === "成長推移" && (
          <>
            <div className="bg-white rounded-xl shadow p-6 mt-8 mb-6">
              <h2 className="text-lg font-bold mb-4">成長推移</h2>
              <div id="simpleGrowthChart" style={{ width: '100%', height: 260 }} />
            </div>
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h3 className="text-base font-bold mb-2 flex items-center"><i className="fas fa-lightbulb text-amber-500 mr-2"></i>コーチからのハイライト・アドバイス</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>・シュート精度が大幅に向上。右足の決定力が増した。</li>
                <li>・試合中の状況判断力が向上。冷静なプレーができている。</li>
                <li>・今後は左足のキック力強化と守備意識の向上が課題。</li>
              </ul>
            </div>
          </>
        )}
        {/* 他タブは従来通り */}
        {activeTab === "試合統計" && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-bold mb-2">試合別パフォーマンス</h2>
            <div ref={matchStatsChartRef} style={{ height: 250, width: '100%' }} />
          </div>
        )}
        {activeTab === "選手比較" && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-bold mb-2">選手比較分析</h2>
            <div ref={playerComparisonChartRef} style={{ height: 250, width: '100%' }} />
          </div>
        )}
        {activeTab === "強み弱み" && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-bold mb-2">強み・弱み詳細分析</h2>
            <div ref={strengthWeaknessChartRef} style={{ height: 250, width: '100%' }} />
          </div>
        )}
      </main>
      <BottomTabBar />
    </div>
  );
};

export default AnalyticsPage; 