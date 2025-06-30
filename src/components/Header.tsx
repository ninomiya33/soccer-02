// src/components/Header.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext.js';

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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('ログアウトに失敗:', error);
    }
  };

  return (
    <header className="bg-blue-600 text-white w-full top-0 z-20 shadow-md">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-3 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <i className="fas fa-running text-2xl"></i>
            <h1 className="text-2xl font-bold tracking-tight">サッカーマネージャー</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative cursor-pointer">
              <i className="fas fa-bell text-xl"></i>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </button>
            <span className="hidden sm:inline text-base font-medium">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow"
            >
              ログアウト
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
          <div className="flex items-center gap-3">
            {profile.image && (
              <img src={profile.image} alt="profile" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
            )}
            <div className="text-right">
              <h2 className="text-base font-bold">{profile.name || '未登録'}</h2>
              <p className="text-xs opacity-90">{profile.age ? `${profile.age}歳` : ''}{profile.grade ? `・${profile.grade}` : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
