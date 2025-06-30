// src/components/PlayerInfo.tsx
import React from 'react';

interface PlayerInfoProps {
  profile: {
    name: string;
    image: string;
    age: string;
    grade: string;
  };
}

const PlayerInfoCard: React.FC<PlayerInfoProps> = ({ profile }) => {
  return (
    <div className="flex items-center mb-6">
      <div className="h-16 w-16 mr-4 border-2 border-blue-500 rounded-full overflow-hidden">
        <img
          src={profile.image || 'https://readdy.ai/api/search-image?query=Japanese%20elementary%20school%20boy%2C%2011%20years%20old%2C%20wearing%20blue%20soccer%20jersey%2C%20short%20black%20hair%2C%20friendly%20smile%2C%20outdoor%20sports%20field%20background%2C%20natural%20lighting%2C%20portrait%20style%2C%20high%20quality%2C%20realistic&width=64&height=64&seq=2&orientation=squarish'}
          alt={profile.name || 'プロフィール画像'}
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h1 className="text-xl font-bold">{profile.name || '未登録'}</h1>
        <p className="text-sm text-gray-600">{profile.age ? `${profile.age}歳` : ''}{profile.grade ? `・${profile.grade}` : ''}</p>
        <div className="flex mt-1">
          <span className="mr-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">技術A評価</span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">チーム MVP</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerInfoCard;
