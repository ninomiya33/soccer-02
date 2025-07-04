import React from 'react';

interface DashboardCardProps {
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
  practiceLogs: {
    date: string;
    duration: string;
    title: string;
    description: string;
  }[];
  matchLogs: {
    date: string;
    opponent: string;
    result: string;
    score: string;
    note: string;
    status: 'win' | 'draw' | 'lose';
  }[];
}

const DashboardCard: React.FC<DashboardCardProps> = ({ physicalLogs, skillLogs, practiceLogs, matchLogs }) => {
  // 体力測定（最新身長）
  const latestPhysical = physicalLogs[0];
  // スキル評価（最新合計点）
  const latestSkill = skillLogs[0];
  const skillTotal = latestSkill
    ? [latestSkill.shoot_success, latestSkill.pass_success, latestSkill.dribble_count, latestSkill.defense_success, latestSkill.decision_correct].reduce((a, b) => a + Number(b), 0)
    : 0;
  // 練習記録（合計時間）
  const totalPracticeHours = practiceLogs.reduce((sum, log) => {
    const h = log.duration.match(/([\d.]+)時間/);
    return sum + (h ? parseFloat(h[1]) : 0);
  }, 0);
  // 試合実績（合計得点・アシスト）
  const totalGoals = matchLogs.reduce((sum, log) => {
    const m = log.score.match(/得点(\d+)/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);
  const totalAssists = matchLogs.reduce((sum, log) => {
    const m = log.score.match(/アシスト(\d+)/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* 体力測定カード */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg p-3">
        <div className="flex items-center mb-2">
          <i className="fas fa-heartbeat text-red-500 mr-2"></i>
          <h3 className="text-sm font-medium">体力測定</h3>
        </div>
        <div className="text-2xl font-bold">{latestPhysical ? latestPhysical.height : '--'}<span className="text-sm text-gray-500">cm</span></div>
        <div className="flex items-center text-xs text-green-600 mt-1">
          <i className="fas fa-arrow-up mr-1"></i>
          <span>最新測定日: {latestPhysical ? latestPhysical.date : '--'}</span>
        </div>
      </div>

      {/* スキル評価カード */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg p-3">
        <div className="flex items-center mb-2">
          <i className="fas fa-star text-yellow-500 mr-2"></i>
          <h3 className="text-sm font-medium">スキル評価</h3>
        </div>
        <div className="text-2xl font-bold">{skillTotal}<span className="text-sm text-gray-500">点</span></div>
        <div className="flex items-center text-xs text-green-600 mt-1">
          <i className="fas fa-arrow-up mr-1"></i>
          <span>最新評価日: {latestSkill ? latestSkill.date : '--'}</span>
        </div>
      </div>

      {/* 練習記録カード */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg p-3">
        <div className="flex items-center mb-2">
          <i className="fas fa-calendar-check text-blue-500 mr-2"></i>
          <h3 className="text-sm font-medium">練習記録</h3>
        </div>
        <div className="text-2xl font-bold">{totalPracticeHours}<span className="text-sm text-gray-500">時間</span></div>
        <div className="flex items-center text-xs text-blue-600 mt-1">
          <i className="fas fa-clock mr-1"></i>
          <span>記録数 {practiceLogs.length}件</span>
        </div>
      </div>

      {/* 試合実績カード */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg p-3">
        <div className="flex items-center mb-2">
          <i className="fas fa-trophy text-amber-500 mr-2"></i>
          <h3 className="text-sm font-medium">試合実績</h3>
        </div>
        <div className="text-2xl font-bold">{totalGoals}<span className="text-sm text-gray-500">得点</span></div>
        <div className="flex items-center text-xs text-blue-600 mt-1">
          <i className="fas fa-futbol mr-1"></i>
          <span>アシスト {totalAssists}回</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
