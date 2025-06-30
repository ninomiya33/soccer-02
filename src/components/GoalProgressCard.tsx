import React, { useState } from 'react';

interface Goal {
  title: string;
  progress: number;
}

const GoalProgressCard: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([
    { title: 'ドリブル技術の向上', progress: 80 },
    { title: 'シュート精度の向上', progress: 65 },
    { title: '試合での得点', progress: 90 }
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Goal>({ title: '', progress: 0 });

  // 追加・編集モーダルを開く
  const openModal = (goal?: Goal, index?: number) => {
    if (goal && typeof index === 'number') {
      setForm(goal);
      setEditIndex(index);
    } else {
      setForm({ title: '', progress: 0 });
      setEditIndex(null);
    }
    setModalOpen(true);
  };
  // モーダルを閉じる
  const closeModal = () => {
    setModalOpen(false);
    setForm({ title: '', progress: 0 });
    setEditIndex(null);
  };
  // 入力ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'progress' ? Number(value) : value });
  };
  // 追加・編集確定
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    if (editIndex !== null) {
      setGoals(goals.map((g, i) => (i === editIndex ? form : g)));
    } else {
      setGoals([...goals, form]);
    }
    closeModal();
  };
  // 削除
  const handleDelete = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white shadow-sm rounded-lg mb-6 p-4">
      <div className="flex items-center mb-4">
        <i className="fas fa-bullseye text-purple-500 mr-2"></i>
        <h3 className="text-base font-medium">目標達成状況</h3>
        <button className="ml-auto bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold" onClick={() => openModal()}>＋目標追加</button>
      </div>
      <div className="space-y-3">
        {goals.map((goal, index) => (
          <div key={index} className="group">
            <div className="flex justify-between text-sm mb-1 items-center">
              <span>{goal.title}</span>
              <span className="text-gray-500">{goal.progress}%</span>
              <button className="ml-2 text-xs text-blue-500 hover:underline" onClick={() => openModal(goal, index)}>編集</button>
              <button className="ml-1 text-xs text-red-400 hover:underline" onClick={() => handleDelete(index)}>削除</button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${goal.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      {/* 追加・編集モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={closeModal}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">{editIndex !== null ? '目標を編集' : '目標を追加'}</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">目標タイトル</label>
                <input type="text" name="title" value={form.title} onChange={handleChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">進捗率（%）</label>
                <input type="number" name="progress" value={form.progress} onChange={handleChange} className="border rounded px-3 py-2 w-full" min={0} max={100} required />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editIndex !== null ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalProgressCard;
