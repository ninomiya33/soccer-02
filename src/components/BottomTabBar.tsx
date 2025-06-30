import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/', icon: 'fas fa-home', label: 'ホーム' },
  { to: '/players', icon: 'fas fa-users', label: '選手' },
  { to: '/analytics', icon: 'fas fa-chart-line', label: '分析' },
  { to: '/schedule', icon: 'fas fa-calendar-alt', label: '予定' },
  { to: '/videos', icon: 'fas fa-video', label: '動画' },
  { to: '/settings', icon: 'fas fa-cog', label: '設定' },
];

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 grid grid-cols-6 text-center z-10">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.to || (tab.to === '/' && location.pathname === '');
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center justify-center py-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <i className={`${tab.icon} text-lg`}></i>
            <span className="text-xs mt-1">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomTabBar;
