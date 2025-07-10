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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      {/* 体力測定カード */}
      <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-2 transition-transform active:scale-95 cursor-pointer hover:shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50">
            <i className="fas fa-heartbeat text-2xl text-red-500"></i>
        </div>
          <h3 className="text-base font-bold text-gray-800">体力測定</h3>
        </div>
        <div className="text-4xl font-extrabold text-gray-900 mb-1">{latestPhysical ? latestPhysical.height : '--'}<span className="text-lg text-gray-400 font-medium">cm</span></div>
        <div className="text-xs text-green-600 flex items-center gap-1"><i className="fas fa-arrow-up"></i>最新測定日: {latestPhysical ? latestPhysical.date : '--'}</div>
      </div>

      {/* スキル評価カード */}
      <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-2 transition-transform active:scale-95 cursor-pointer hover:shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-yellow-50">
            <i className="fas fa-star text-2xl text-yellow-500"></i>
        </div>
          <h3 className="text-base font-bold text-gray-800">スキル評価</h3>
        </div>
        <div className="text-4xl font-extrabold text-gray-900 mb-1">{skillTotal}<span className="text-lg text-gray-400 font-medium">点</span></div>
        <div className="text-xs text-green-600 flex items-center gap-1"><i className="fas fa-arrow-up"></i>最新評価日: {latestSkill ? latestSkill.date : '--'}</div>
      </div>

      {/* 練習記録カード */}
      <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-2 transition-transform active:scale-95 cursor-pointer hover:shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50">
            <i className="fas fa-calendar-check text-2xl text-blue-500"></i>
        </div>
          <h3 className="text-base font-bold text-gray-800">練習記録</h3>
        </div>
        <div className="text-4xl font-extrabold text-gray-900 mb-1">{totalPracticeHours}<span className="text-lg text-gray-400 font-medium">時間</span></div>
        <div className="text-xs text-blue-600 flex items-center gap-1"><i className="fas fa-clock"></i>記録数 {practiceLogs.length}件</div>
      </div>

      {/* 試合実績カード */}
      <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-2 transition-transform active:scale-95 cursor-pointer hover:shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-amber-50">
            <i className="fas fa-trophy text-2xl text-amber-500"></i>
        </div>
          <h3 className="text-base font-bold text-gray-800">試合実績</h3>
        </div>
        <div className="text-4xl font-extrabold text-gray-900 mb-1">{totalGoals}<span className="text-lg text-gray-400 font-medium">得点</span></div>
        <div className="text-xs text-blue-600 flex items-center gap-1"><i className="fas fa-futbol"></i>アシスト {totalAssists}回</div>
      </div>
    </div>
  );
};

export default DashboardCard;
