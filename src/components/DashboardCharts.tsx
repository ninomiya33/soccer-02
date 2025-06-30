// src/components/DashboardCharts.tsx

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface Props {
  activeTab: string;
}

const DashboardCharts: React.FC<Props> = ({ activeTab }) => {
  const physicalChartRef = useRef<HTMLDivElement>(null);
  const skillChartRef = useRef<HTMLDivElement>(null);
  const matchChartRef = useRef<HTMLDivElement>(null);

  const physicalChartInstance = useRef<echarts.ECharts | null>(null);
  const skillChartInstance = useRef<echarts.ECharts | null>(null);
  const matchChartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (physicalChartRef.current && activeTab === "体力測定") {
      if (physicalChartInstance.current) physicalChartInstance.current.dispose();
      physicalChartInstance.current = echarts.init(physicalChartRef.current);
      physicalChartInstance.current.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['身長', '体重', '走力'] },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
        yAxis: { type: 'value' },
        series: [
          { name: '身長', type: 'line', data: [145, 146, 146, 147, 147, 148] },
          { name: '体重', type: 'line', data: [38, 39, 39, 40, 40, 41] },
          { name: '走力', type: 'line', data: [65, 68, 70, 72, 75, 78] },
        ]
      });
    }

    if (skillChartRef.current && activeTab === "スキル評価") {
      if (skillChartInstance.current) skillChartInstance.current.dispose();
      skillChartInstance.current = echarts.init(skillChartRef.current);
      skillChartInstance.current.setOption({
        tooltip: {},
        radar: {
          indicator: [
            { name: 'パス', max: 100 },
            { name: 'シュート', max: 100 },
            { name: 'ドリブル', max: 100 },
            { name: '戦術理解', max: 100 },
            { name: 'スタミナ', max: 100 },
            { name: 'メンタル', max: 100 },
          ],
        },
        series: [{
          name: 'スキル評価',
          type: 'radar',
          data: [
            { value: [75, 85, 70, 65, 80, 90], name: '現在' },
            { value: [65, 70, 60, 60, 70, 80], name: '3ヶ月前' },
          ]
        }]
      });
    }

    if (matchChartRef.current && activeTab === "試合実績") {
      if (matchChartInstance.current) matchChartInstance.current.dispose();
      matchChartInstance.current = echarts.init(matchChartRef.current);
      matchChartInstance.current.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['得点', 'アシスト'] },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: [{ type: 'category', data: ['4/2', '4/16', '5/7', '5/21', '6/4', '6/18'] }],
        yAxis: [{ type: 'value' }],
        series: [
          { name: '得点', type: 'bar', data: [2, 1, 0, 2, 1, 3] },
          { name: 'アシスト', type: 'bar', data: [1, 2, 1, 0, 2, 1] },
        ]
      });
    }

    const handleResize = () => {
      physicalChartInstance.current?.resize();
      skillChartInstance.current?.resize();
      matchChartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      physicalChartInstance.current?.dispose();
      skillChartInstance.current?.dispose();
      matchChartInstance.current?.dispose();
    };
  }, [activeTab]);

  return (
    <div className="mt-4">
      {activeTab === "体力測定" && <div ref={physicalChartRef} className="h-64" />}
      {activeTab === "スキル評価" && <div ref={skillChartRef} className="h-64" />}
      {activeTab === "試合実績" && <div ref={matchChartRef} className="h-64" />}
    </div>
  );
};

export default DashboardCharts;
