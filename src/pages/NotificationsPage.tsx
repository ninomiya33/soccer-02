import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import { useAuth } from '../contexts/AuthContext.js';
import BottomTabBar from '../components/BottomTabBar.js';

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by?: string;
  notice_date?: string;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ title: '', content: '', notice_date: todayStr });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // お知らせ一覧を取得
  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError('お知らせの取得に失敗しました');
    } else {
      setNotices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
    // お知らせを開いたら既読にする
    const now = new Date().toISOString();
    localStorage.setItem('lastReadNoticeAt', now);
    window.dispatchEvent(new Event('noticeRead'));
  }, []);

  // お知らせ作成
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content || !form.notice_date || !user) return;
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from('notices').insert([
      { title: form.title, content: form.content, notice_date: form.notice_date, created_by: user.id }
    ]);
    setSubmitting(false);
    if (error) {
      setError('お知らせの作成に失敗しました');
    } else {
      setForm({ title: '', content: '', notice_date: todayStr });
      fetchNotices();
    }
  };

  // お知らせ削除
  const handleDelete = async (id: string) => {
    if (!window.confirm('このお知らせを削除しますか？')) return;
    setError(null);
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) {
      setError('削除に失敗しました');
    } else {
      fetchNotices();
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16 px-4 pt-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <i className="fas fa-bell text-blue-500"></i>お知らせ一覧
      </h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 mb-6">
        <h2 className="text-lg font-bold mb-2">お知らせ作成</h2>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <div className="mb-2">
          <label className="block text-xs font-bold mb-1 text-blue-700">日付</label>
          <input
            type="date"
            name="notice_date"
            value={form.notice_date}
            onChange={e => setForm({ ...form, notice_date: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            required
            disabled={submitting}
          />
        </div>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="タイトル"
          className="border rounded px-3 py-2 w-full mb-2"
          required
          disabled={submitting}
        />
        <textarea
          name="content"
          value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          placeholder="内容"
          className="border rounded px-3 py-2 w-full mb-2"
          rows={3}
          required
          disabled={submitting}
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50" disabled={submitting}>作成</button>
      </form>
      <div className="space-y-6">
        {loading ? (
          <div className="text-gray-400 text-center py-8">読み込み中...</div>
        ) : notices.length === 0 ? (
          <div className="text-gray-400">お知らせはありません</div>
        ) : (
          notices.map(notice => (
            <div
              key={notice.id}
              className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-2xl transition-shadow relative group"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <i className="fas fa-bell text-blue-400 text-xl"></i>
                  <span className="font-bold text-lg text-blue-900 tracking-tight drop-shadow-sm">{notice.title}</span>
                </div>
                <button
                  className="text-gray-300 hover:text-red-500 transition p-2 rounded-full bg-white shadow group-hover:scale-110"
                  title="削除"
                  onClick={() => handleDelete(notice.id)}
                  disabled={submitting}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
                <i className="fas fa-calendar-alt"></i>
                {notice.notice_date || (notice.created_at && notice.created_at.slice(0, 10))}
              </div>
              <div className="text-gray-800 whitespace-pre-line text-base leading-relaxed font-medium">
                {notice.content}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default NotificationsPage; 