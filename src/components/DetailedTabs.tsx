import React, { useEffect, useState } from 'react';
import * as echarts from 'echarts';

type TabProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  physicalChartRef: React.RefObject<HTMLDivElement | null>;
  skillChartRef: React.RefObject<HTMLDivElement | null>;
  matchChartRef: React.RefObject<HTMLDivElement | null>;
  practiceLogs: {
    date: string;
    duration: string;
    title: string;
    description: string;
  }[];
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
};

const periodOptions = [
  { label: '1週間', value: 'week' },
  { label: '1ヶ月', value: 'month' },
  { label: '3ヶ月', value: '3month' },
  { label: '1年', value: 'year' }
];

const DetailedTabs: React.FC<TabProps> = ({
  activeTab,
  setActiveTab,
  physicalChartRef,
  skillChartRef,
  matchChartRef,
  practiceLogs,
  physicalLogs,
  skillLogs,
  matchLogs
}) => {
  console.log('DetailedTabs rendered');

  // デバッグ用: 最上部でpracticeLogsとcalendarCellsを出力
  console.log('practiceLogs at top:', practiceLogs);

  // 体力測定グラフの期間
  const [physicalPeriod, setPhysicalPeriod] = useState<'week' | 'month' | '3month' | 'year'>('month');

  // 体力測定グラフ用データを期間でフィルタ
  const filteredPhysicalLogs = React.useMemo(() => {
    if (!physicalLogs.length) return [];
    const now = new Date();
    let from: Date;
    switch (physicalPeriod) {
      case 'week':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        break;
      case '3month':
        from = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        break;
      case 'year':
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        from = new Date(0);
    }
    return physicalLogs.filter(log => {
      const d = new Date(log.date);
      return d >= from && d <= now;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [physicalLogs, physicalPeriod]);

  // 体力測定グラフ
  useEffect(() => {
    if (physicalChartRef.current && activeTab === "体力測定") {
      const chart = echarts.init(physicalChartRef.current);
      chart.setOption({
        title: {
          text: '身体データの推移',
          left: 'center',
          textStyle: { fontSize: 16 }
        },
        tooltip: { trigger: 'axis' },
        legend: { top: 30, data: ['身長', '体重', '走力'], icon: 'circle' },
        grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: filteredPhysicalLogs.map(log => log.date)
        },
        yAxis: [
          { type: 'value', name: '身長/体重', position: 'left' },
          { type: 'value', name: '走力(秒)', position: 'right', inverse: true, min: 'dataMin', max: 'dataMax' }
        ],
        series: [
          {
            name: '身長',
            type: 'line',
            data: filteredPhysicalLogs.map(log => Number(log.height)),
            symbol: 'circle',
            symbolSize: 10,
            smooth: true,
            yAxisIndex: 0
          },
          {
            name: '体重',
            type: 'line',
            data: filteredPhysicalLogs.map(log => Number(log.weight)),
            symbol: 'circle',
            symbolSize: 10,
            smooth: true,
            yAxisIndex: 0
          },
          {
            name: '走力',
            type: 'line',
            data: filteredPhysicalLogs.map(log => Number(log.run50m)),
            symbol: 'circle',
            symbolSize: 10,
            smooth: true,
            yAxisIndex: 1,
            lineStyle: { color: '#f59e42' },
            itemStyle: { color: '#f59e42' }
          }
        ]
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, [physicalChartRef, activeTab, filteredPhysicalLogs]);

  // スキル評価レーダーチャート
  useEffect(() => {
    if (skillChartRef.current && activeTab === "スキル評価") {
      const chart = echarts.init(skillChartRef.current);
      // skillLogsの最新データを取得
      const latestSkill = skillLogs[0];
      chart.setOption({
        title: {
          text: 'スキル評価',
          left: 'center',
          textStyle: { fontSize: 16 }
        },
        tooltip: {},
        radar: {
          indicator: [
            { name: '1分間ドリブル回数', max: 100 },
            { name: '10本シュート成功数', max: 100 },
            { name: 'パス精度', max: 100 },
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
                value: latestSkill
                  ? [
                      Number(latestSkill.dribble_count),
                      Number(latestSkill.shoot_success),
                      Number(latestSkill.pass_success),
                      Number(latestSkill.defense_success),
                      Number(latestSkill.decision_correct)
                    ]
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
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, [skillChartRef, activeTab, skillLogs]);

  // --- カレンダー・リスト完全リセット（YYYY-MM-DD一致方式） ---

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0始まり
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // YYYY-MM-DD形式で今月の日付配列を生成
  const dateStrings = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  const weekDays = ['日','月','火','水','木','金','土'];
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  // カレンダーセル配列（空白セルはnull、日付セルはYYYY-MM-DD）
  const calendarCells = [
    ...Array.from({ length: firstDayOfWeek }, () => null), // 空白セルはnull
    ...dateStrings
  ];

  // デバッグ用: 最上部でpracticeLogsとcalendarCellsを出力
  console.log('practiceLogs at top:', practiceLogs);
  console.log('calendarCells at top:', calendarCells);

  // 今月の練習記録の日付（YYYY-MM-DD）
  const practicedDays = practiceLogs
    .filter(log => log.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`))
    .map(log => (log.date.length > 10 ? log.date.slice(0, 10) : log.date));

  // 選択した日付の記録
  const selectedLogs = selectedDate
    ? practiceLogs.filter(log => log.date === selectedDate)
    : practiceLogs.filter(log => log.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`));

  // 試合データ分析グラフ用データ
  const matchChartData = React.useMemo(() => {
    // 日付降順で6件まで
    const sorted = matchLogs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      labels: sorted.slice(0, 6).map(log => log.date.replace(/\-/g, '/').slice(5)),
      goals: sorted.slice(0, 6).map(log => {
        const m = log.score.match(/得点(\d+)/);
        return m ? Number(m[1]) : 0;
      }),
      assists: sorted.slice(0, 6).map(log => {
        const m = log.score.match(/アシスト(\d+)/);
        return m ? Number(m[1]) : 0;
      })
    };
  }, [matchLogs]);

  useEffect(() => {
    if (matchChartRef.current && activeTab === '試合実績') {
      const chart = echarts.init(matchChartRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['得点', 'アシスト'] },
        xAxis: { type: 'category', data: matchChartData.labels },
        yAxis: { type: 'value' },
        series: [
          { name: '得点', type: 'bar', data: matchChartData.goals },
          { name: 'アシスト', type: 'bar', data: matchChartData.assists }
        ]
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, [matchChartRef, activeTab, matchChartData]);

  // デバッグ用: 練習記録タブ描画直前でまとめて出力
  if (activeTab === '練習記録') {
    console.log('【DEBUG】practiceLogs:', practiceLogs);
    console.log('【DEBUG】calendarCells:', calendarCells);
    console.log('【DEBUG】practicedDays:', practicedDays);
    console.log('【DEBUG】selectedDate:', selectedDate);
    console.log('【DEBUG】selectedLogs:', selectedLogs);
    calendarCells.forEach((cell, i) => {
      if (typeof cell === 'string') {
        console.log('【DEBUG】cell:', cell, 'practicedDays:', practicedDays, 'includes(cell):', practicedDays.includes(cell));
      }
    });
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 mb-4">
        {['体力測定', 'スキル評価', '練習記録', '試合実績'].map((tab) => (
          <button
            key={tab}
            className={`text-xs py-2 rounded-lg ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === '体力測定' && (
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="flex items-center mb-2 gap-2">
            {periodOptions.map(opt => (
              <button
                key={opt.value}
                className={`px-3 py-1 rounded text-xs font-bold border ${physicalPeriod === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300'}`}
                onClick={() => setPhysicalPeriod(opt.value as any)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div ref={physicalChartRef} style={{ height: '250px', width: '100%' }} />
          <h3 className="text-base font-medium mt-6 mb-2">体力測定履歴</h3>
          <div className="space-y-2">
            {filteredPhysicalLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
            {filteredPhysicalLogs.slice().reverse().map((log, i) => (
              <div key={i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                <span className="font-bold mr-2">{log.date}</span>
                <span>身長: <span className="font-bold">{log.height}cm</span></span>
                <span>体重: <span className="font-bold">{log.weight}kg</span></span>
                <span>50m走: <span className="font-bold">{log.run50m}秒</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'スキル評価' && (
        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-base font-medium mb-4">技術評価レーダーチャート</h3>
          <div
            ref={skillChartRef}
            style={{ height: '250px', width: '100%' }}
          />
          <h3 className="text-base font-medium mt-6 mb-2">スキル評価履歴</h3>
          <div className="space-y-2">
            {skillLogs.length === 0 && <div className="text-gray-400 text-sm">データがありません</div>}
            {skillLogs.slice().map((log, i) => (
              <div key={i} className="p-3 rounded border bg-gray-50 flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                <span className="font-bold mr-2">{log.date}</span>
                <span>1分間ドリブル回数: <span className="font-bold">{log.dribble_count}</span></span>
                <span>10本シュート成功数: <span className="font-bold">{log.shoot_success}</span></span>
                <span>パス精度: <span className="font-bold">{log.pass_success}</span></span>
                <span>守備力: <span className="font-bold">{log.defense_success}</span></span>
                <span>戦術理解: <span className="font-bold">{log.decision_correct}</span></span>
                {log.comment && <span className="text-gray-500 ml-2">コメント: {log.comment}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === '練習記録' && (
        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">今月の練習記録</h3>
          {/* カレンダー表示 */}
          <div className="mb-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, i) => (
                <div key={i} className="text-center text-xs font-medium">{day}</div>
              ))}
              {calendarCells.map((cell, i) => {
                const isPracticed = typeof cell === 'string' && practicedDays.includes(cell);
                return typeof cell === 'string' ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(selectedDate === cell ? null : cell)}
                    className={`aspect-square rounded-full flex items-center justify-center text-xs font-bold border transition relative
                      ${selectedDate === cell
                        ? 'bg-blue-500 text-white border-blue-500'
                        : isPracticed
                          ? 'bg-blue-500 text-white border-blue-500 font-extrabold'
                          : 'bg-gray-100 border-gray-200'}`}
                  >
                    {Number(cell.split('-')[2])}
                  </button>
                ) : (
                  <div key={i} />
                );
              })}
            </div>
          </div>
          {/* 練習記録リスト */}
          <div className="mt-4">
            {selectedDate && selectedLogs.length === 0 && (
              <div className="text-gray-400 text-sm">この日の練習記録はありません</div>
            )}
            {selectedLogs.length === 0 && !selectedDate && (
              <div className="text-gray-400 text-sm">今月の練習記録はありません</div>
            )}
            {selectedLogs.map((log, index) => (
              <div key={index} className="mb-2 p-2 bg-gray-100 rounded">
                <div>{log.title}</div>
                <div className="text-xs text-gray-500">{log.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === '試合実績' && (
        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">試合データ分析</h3>
          {/* グラフ表示 */}
          <div ref={matchChartRef} style={{ height: '250px', width: '100%' }} />
          <div className="grid grid-cols-4 text-center mb-4">
            <div>
              <p className="text-xs text-gray-500">試合数</p>
              <p className="text-xl font-bold">{matchLogs.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">得点</p>
              <p className="text-xl font-bold">{matchChartData.goals.reduce((a, b) => a + b, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">アシスト</p>
              <p className="text-xl font-bold">{matchChartData.assists.reduce((a, b) => a + b, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">出場時間</p>
              <p className="text-xl font-bold">-</p>
            </div>
          </div>

          <h4 className="text-base font-medium mb-2">試合履歴</h4>
          <div className="space-y-2">
            {matchLogs
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((match, index) => {
                const statusColor = {
                  win: 'bg-green-100 text-green-600',
                  draw: 'bg-yellow-100 text-yellow-600',
                  lose: 'bg-red-100 text-red-600'
                };
                return (
                  <div key={index} className="mb-3 p-4 rounded-xl shadow border flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                    <div className="flex-1">
                      <p className="font-bold">vs {match.opponent}</p>
                      <p className="text-sm text-gray-500">{match.date}</p>
                      <p className="text-sm">{match.score}</p>
                      {match.note && <p className="text-xs text-gray-500 mt-1">{match.note}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${statusColor[match.status]}`}>{match.result}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedTabs;
