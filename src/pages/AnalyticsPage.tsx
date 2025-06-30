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

interface AnalyticsPageProps {
  physicalLogs: {
    date: string;
    height: string;
    weight: string;
    run: string;
  }[];
  skillLogs: {
    date: string;
    shoot: string;
    pass: string;
    dribble: string;
    defense: string;
    tactic: string;
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
  shoot: string;
  pass: string;
  dribble: string;
  defense: string;
  tactic: string;
  comment: string;
}

interface PhysicalLogType {
  date: string;
  height: string;
  weight: string;
  run: string;
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
  const skillScore = latestSkill ? [latestSkill.shoot, latestSkill.pass, latestSkill.dribble, latestSkill.defense, latestSkill.tactic].reduce((a, b) => a + Number(b), 0) : 0;
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
  const thisMonthScore = thisMonthSkill ? [thisMonthSkill.shoot, thisMonthSkill.pass, thisMonthSkill.dribble, thisMonthSkill.defense, thisMonthSkill.tactic].reduce((a, b) => a + Number(b), 0) : 0;
  const lastMonthScore = lastMonthSkill ? [lastMonthSkill.shoot, lastMonthSkill.pass, lastMonthSkill.dribble, lastMonthSkill.defense, lastMonthSkill.tactic].reduce((a, b) => a + Number(b), 0) : 0;
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
  const [activeTab, setActiveTab] = useState<string>("成長推移");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("月間");
  const [selectedDataType, setSelectedDataType] = useState<string>("全て");
  const [showReportDialog, setShowReportDialog] = useState<boolean>(false);

  const growthChartRef = useRef<HTMLDivElement>(null);
  const matchStatsChartRef = useRef<HTMLDivElement>(null);
  const playerComparisonChartRef = useRef<HTMLDivElement>(null);
  const strengthWeaknessChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.name) setSelectedPlayer(profile.name);
  }, [profile]);

  // 技術・体力スコアを月ごとに集計（練習記録も加味）
  const simpleGrowthMonthly: { [month: string]: { skill: number; physical: number; count: number } } = {};
  [...skillLogs, ...physicalLogs, ...practiceLogs].forEach(l => {
    const m = getMonth(l.date);
    if (!simpleGrowthMonthly[m]) simpleGrowthMonthly[m] = { skill: 0, physical: 0, count: 0 };
    // skill_logs
    if ('shoot' in l && 'pass' in l && 'dribble' in l && 'defense' in l && 'tactic' in l) {
      simpleGrowthMonthly[m].skill += Number(l.shoot) + Number(l.pass) + Number(l.dribble) + Number(l.defense) + Number(l.tactic);
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
  const sumSkill = (logs: SkillLogType[]): number => logs.reduce((sum, l) => sum + Number(l.shoot) + Number(l.pass) + Number(l.dribble) + Number(l.defense) + Number(l.tactic), 0);
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
  const sumMental = (logs: SkillLogType[]): number => logs.reduce((sum, l) => sum + Number(l.defense) + Number(l.tactic), 0);
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
  const skillMonthly = groupByMonth(skillLogs, ["shoot", "pass", "dribble", "defense", "tactic"]);
  const skillMonths = Object.keys(skillMonthly).sort();
  const skillSeries = ["shoot", "pass", "dribble", "defense", "tactic"].map(key => ({
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
      const skillSum = skillLogs.map(l => [l.shoot, l.pass, l.dribble, l.defense, l.tactic].reduce((a, b) => a + Number(b), 0));
      const physicalAvg = physicalLogs.map(l => (Number(l.height) + Number(l.weight) + Number(l.run)) / 3);
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
      const latest = skillLogs[0] || { shoot: 0, pass: 0, dribble: 0, defense: 0, tactic: 0 };
      const self = [latest.shoot, latest.pass, latest.dribble, latest.defense, latest.tactic].map(Number);
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

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <div className="bg-blue-600 text-white w-full top-0 z-20 shadow-md">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <h2 className="text-2xl font-bold tracking-tight">パフォーマンス分析</h2>
          <div className="text-lg font-semibold mt-2">{profile?.name || ''}</div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-gray-500 text-sm mb-1">総合評価</div>
          <div className="text-3xl font-bold mb-1">{totalScore}点</div>
          <div className="text-green-600 text-xs">先月比 {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-gray-500 text-sm mb-1">成長率</div>
          <div className="text-3xl font-bold mb-1">{growthRate.toFixed(1)}%</div>
          <div className="text-green-600 text-xs">平均より +3.2%</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-gray-500 text-sm mb-1">練習時間</div>
          <div className="text-3xl font-bold mb-1">{totalPracticeHours}時間</div>
          <div className="text-blue-600 text-xs">今月 {totalPracticeHours}時間</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-gray-500 text-sm mb-1">試合出場</div>
          <div className="text-3xl font-bold mb-1">{thisMonthMatches.length}試合</div>
          <div className="text-purple-600 text-xs">今月 {thisMonthMatches.length}試合</div>
        </div>
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
            <h2 className="text-sm font-medium">青葉サッカークラブ U-12</h2>
            <p className="text-xs opacity-80">ポジション: ミッドフィールダー</p>
          </div>
        </div>
      </header>
      <main className="pt-32 px-4 pb-20">
        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between">
            <div className="flex items-center mb-2"><i className="fas fa-chart-line text-blue-500 mr-2"></i>総合評価</div>
            <div className="text-3xl font-bold">{skillLogs[0] ? [skillLogs[0].shoot, skillLogs[0].pass, skillLogs[0].dribble, skillLogs[0].defense, skillLogs[0].tactic].reduce((a, b) => a + Number(b), 0) : '--'}<span className="text-base text-gray-500">点</span></div>
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
        {/* タブ */}
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-2">
            {["成長推移", "試合統計", "選手比較", "強み弱み"].map(tab => (
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
        {/* グラフ＋成長率バー＋解説 */}
        {activeTab === "成長推移" && (
          <div className="bg-white rounded-xl shadow p-6 mt-8 mb-6">
            <h2 className="text-lg font-bold mb-4">成長推移</h2>
            <div id="simpleGrowthChart" style={{ width: '100%', height: 260 }} />
          </div>
        )}
        {/* コーチのハイライト・アドバイス */}
        {activeTab === "成長推移" && (
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <h3 className="text-base font-bold mb-2 flex items-center"><i className="fas fa-lightbulb text-amber-500 mr-2"></i>コーチからのハイライト・アドバイス</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>・シュート精度が大幅に向上。右足の決定力が増した。</li>
              <li>・試合中の状況判断力が向上。冷静なプレーができている。</li>
              <li>・今後は左足のキック力強化と守備意識の向上が課題。</li>
            </ul>
          </div>
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