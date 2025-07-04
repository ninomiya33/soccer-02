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
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('ログアウトに失敗:', error);
    }
  };

  return (
    <header className="relative w-full top-0 z-20 shadow-md">
      {/* グラデーション背景＋斜めカット */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 pb-8 pt-6 px-0 relative">
        <div className="max-w-4xl mx-auto px-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3 shadow-lg flex items-center justify-center">
                <i className="fas fa-running text-3xl text-white drop-shadow"></i>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight drop-shadow">Sakakko</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative cursor-pointer" onClick={() => navigate('/notifications')}>
                <span className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                  <i className="fas fa-bell text-xl text-blue-600"></i>
                </span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-white font-bold">
                  {noticeCount > 0 ? noticeCount : ''}
                </span>
              </button>
              <span className="hidden sm:inline text-base font-medium text-white/80 drop-shadow">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-base font-bold transition-colors shadow-lg"
              >
                ログアウト
              </button>
            </div>
          </div>
          {/* ユーザーカード */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-6">
            <div className="flex items-center gap-4 bg-white bg-opacity-90 rounded-2xl shadow-lg px-4 py-2">
              {profile.image && (
                <img src={profile.image} alt="profile" className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover shadow" />
              )}
              <div className="text-left">
                <h2 className="text-lg font-bold text-blue-800">{profile.name || '未登録'}</h2>
                <p className="text-xs text-blue-600 opacity-90">{profile.age ? `${profile.age}歳` : ''}{profile.grade ? `・${profile.grade}` : ''}</p>
              </div>
            </div>
          </div>
        </div>
        {/* 波型SVGで下部を切り替え */}
        <svg className="absolute bottom-0 left-0 w-full" height="32" viewBox="0 0 1440 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#fff" fillOpacity="1" d="M0,32L1440,0L1440,32L0,32Z"></path>
        </svg>
      </div>
    </header>
  );
};

export default Header;
