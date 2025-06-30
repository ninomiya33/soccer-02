import React from 'react';

interface Badge {
  icon: string;
  name: string;
  desc: string;
  isAchieved: (args: { practiceLogs: any[]; matchLogs: any[]; skillLogs: any[] }) => boolean;
  condition: string;
}

interface AchievementBadgesProps {
  practiceLogs: any[];
  matchLogs: any[];
  skillLogs: any[];
}

const BADGES: Badge[] = [
  {
    icon: 'fas fa-futbol',
    name: 'ゴールハンター',
    desc: '5試合連続得点',
    condition: '5試合連続で得点',
    isAchieved: ({ matchLogs }) => {
      if (matchLogs.length < 5) return false;
      // 日付降順で5件連続で得点
      const sorted = matchLogs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sorted.slice(0, 5).every(log => {
        const m = log.score.match(/得点(\d+)/);
        return m && Number(m[1]) > 0;
      });
    }
  },
  {
    icon: 'fas fa-running',
    name: 'スピードスター',
    desc: '50m走記録更新',
    condition: '50m走で自己ベスト更新',
    isAchieved: ({ practiceLogs, skillLogs, matchLogs }) => false // 実装例: physicalLogsが必要
  },
  {
    icon: 'fas fa-users',
    name: 'チームプレイヤー',
    desc: 'アシスト王',
    condition: '通算アシスト10回以上',
    isAchieved: ({ matchLogs }) => {
      const totalAssists = matchLogs.reduce((sum, log) => {
        const m = log.score.match(/アシスト(\d+)/);
        return sum + (m ? Number(m[1]) : 0);
      }, 0);
      return totalAssists >= 10;
    }
  },
  {
    icon: 'fas fa-calendar-check',
    name: '練習の鬼',
    desc: '20日連続練習',
    condition: '20日連続で練習記録',
    isAchieved: ({ practiceLogs }) => {
      if (practiceLogs.length < 20) return false;
      // 日付昇順で連続日数をカウント
      const days = practiceLogs
        .map(log => log.date)
        .map(date => new Date(date).toISOString().slice(0, 10))
        .sort();
      let maxStreak = 1, streak = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1]);
        const curr = new Date(days[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else if (diff > 1) {
          streak = 1;
        }
      }
      return maxStreak >= 20;
    }
  }
];

const AchievementBadges: React.FC<AchievementBadgesProps> = ({ practiceLogs, matchLogs, skillLogs }) => {
  return (
    <div className="bg-white shadow-sm rounded-lg mt-6 p-4">
      <div className="flex items-center mb-4">
        <i className="fas fa-medal text-amber-500 mr-2"></i>
        <h3 className="text-base font-medium">獲得バッジ</h3>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {BADGES.map((badge, i) => {
          const achieved = badge.isAchieved({ practiceLogs, matchLogs, skillLogs });
          return (
            <div key={i} className="text-center">
              <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2 ${achieved ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                <i className={`${badge.icon} text-xl`}></i>
              </div>
              <p className={`text-xs font-medium ${achieved ? '' : 'text-gray-400'}`}>{badge.name}</p>
              <p className="text-[10px] text-gray-500">{badge.desc}</p>
              {!achieved && <p className="text-[10px] text-red-400 mt-1">{badge.condition}</p>}
              {achieved && <p className="text-[10px] text-green-600 mt-1">獲得！</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementBadges;
