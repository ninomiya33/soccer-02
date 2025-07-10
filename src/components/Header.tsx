// src/components/Header.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase.js';

interface HeaderProps {
  selectedPlayer: string;
  setSelectedPlayer: (player: string) => void;
  profile: {
    name: string;
    image: string;
    age: string;
    grade: string;
  };
}

const Header: React.FC<HeaderProps> = ({ selectedPlayer, setSelectedPlayer, profile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [noticeCount, setNoticeCount] = React.useState<number>(0);

  const fetchUnreadCount = async () => {
    const lastRead = localStorage.getItem('lastReadNoticeAt');
    let query = supabase.from('notices').select('*', { count: 'exact', head: true });
    if (lastRead) {
      query = query.gt('created_at', lastRead);
    }
    const { count } = await query;
    setNoticeCount(count || 0);
  };

  React.useEffect(() => {
    fetchUnreadCount();
    window.addEventListener('noticeRead', fetchUnreadCount);
    return () => window.removeEventListener('noticeRead', fetchUnreadCount);
  }, []);

  return (
    <header className="relative w-full top-0 z-20 bg-white/90 backdrop-blur shadow-sm">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Sakakko</h1>
        <div className="flex items-center gap-3">
          <button className="relative" onClick={() => navigate('/notifications')} aria-label="通知">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 shadow-sm">
                  <i className="fas fa-bell text-xl text-blue-600"></i>
                </span>
            {noticeCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-white font-bold">
                {noticeCount}
                </span>
            )}
              </button>
          {profile.image && (
            <img src={profile.image} alt="profile" className="w-11 h-11 rounded-full border-2 border-blue-400 object-cover shadow cursor-pointer" onClick={() => navigate('/settings')} />
          )}
            </div>
          </div>
          {/* ユーザーカード */}
      <div className="max-w-2xl mx-auto px-4 mt-4 flex flex-col items-center">
        <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex flex-col items-center w-full">
              {profile.image && (
            <img src={profile.image} alt="profile" className="w-20 h-20 rounded-full border-4 border-blue-200 object-cover shadow mb-2" />
              )}
          <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.name || '未登録'}</h2>
          <p className="text-sm text-gray-500 mb-1">{profile.age ? `${profile.age}歳` : ''}{profile.grade ? `・${profile.grade}` : ''}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
