import React from 'react';

type FabButtonProps = {
  onClick: () => void;
};

const FabButton: React.FC<FabButtonProps> = ({ onClick }) => (
  <button
    className="fixed right-4 bottom-20 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors cursor-pointer z-50"
    onClick={onClick}
    aria-label="追加"
  >
    <i className="fas fa-plus text-xl"></i>
  </button>
);

export default FabButton;
