import React, { useState, useEffect } from 'react';
import BottomTabBar from '../components/BottomTabBar.js';
import { useAuth } from '../contexts/AuthContext.js';
import { videoService, Video } from '../services/videoService.js';

const categories = [
  { key: 'all', label: 'すべて' },
  { key: 'match', label: '試合映像' },
  { key: 'practice', label: '練習映像' },
  { key: 'analysis', label: '技術分析' },
];

const initialVideos = [
  {
    id: 1,
    title: '青葉台FCとの練習試合 - 前半ハイライト',
    date: '2025-06-22 14:30',
    views: 24,
    category: 'match',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    videoUrl: '',
    duration: '12:35',
    tag: '試合映像',
    favorite: true,
    comment: true,
  },
  {
    id: 2,
    title: 'ドリブル技術トレーニング - 基本から応用まで',
    date: '2025-06-20 16:45',
    views: 18,
    category: 'practice',
    thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
    videoUrl: '',
    duration: '23:18',
    tag: '練習映像',
    favorite: false,
    comment: true,
  },
];

// サムネイル画像を動画ファイルから生成しSupabase Storageにアップロードする関数
async function generateAndUploadThumbnail(file: File, userId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0.1;
    video.onloadeddata = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas context error');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async blob => {
        if (!blob) return reject('Blob error');
        try {
          const url = await videoService.uploadThumbnailFile(blob, userId);
          resolve(url);
        } catch (err) { reject(err); }
      }, 'image/jpeg', 0.8);
    };
    video.onerror = () => reject('動画の読み込みに失敗しました');
  });
}

const VideosPage: React.FC = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [videos, setVideos] = useState<Video[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: '',
    category: 'match',
    videoUrl: '',
    duration: '',
    uploadType: 'file', // 'file' or 'link'
    file: null as File | null,
    thumbnail: '',
  });
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'new' | 'old' | 'views'>('new');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    videoService.getVideos().then(setVideos).catch(console.error);
  }, []);

  const filteredVideos = videos
    .filter(v => (activeCategory === 'all' || v.type === activeCategory))
    .filter(v => v.title.includes(search) || (v.type && categories.find(c => c.key === v.type)?.label?.includes(search)))
    .sort((a, b) => {
      if (sort === 'new') return (b.created_at || '').localeCompare(a.created_at || '');
      if (sort === 'old') return (a.created_at || '').localeCompare(b.created_at || '');
      if (sort === 'views') return (b.views || 0) - (a.views || 0);
      return 0;
    });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as any;
    if (name === 'file') {
      const file = files[0];
      setForm({ ...form, file });
      // duration自動取得
      if (file) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          const dur = video.duration;
          const min = Math.floor(dur / 60);
          const sec = Math.round(dur % 60).toString().padStart(2, '0');
          setForm(f => ({ ...f, duration: `${min}:${sec}` }));
        };
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category || (!form.file && !form.videoUrl) || !user) return;
    setUploading(true);
    let url = form.videoUrl;
    let thumbnail = '';
    let duration = form.duration;
    try {
      if (form.uploadType === 'file' && form.file) {
        url = await videoService.uploadVideoFile(form.file, user.id);
        thumbnail = await generateAndUploadThumbnail(form.file, user.id);
      } else if (form.uploadType === 'link') {
        thumbnail = getThumbnail(form.videoUrl);
      }
      const newVideo: Omit<Video, 'id' | 'created_at' | 'views'> = {
        title: form.title,
        url,
        type: form.category as Video['type'],
        uploaded_by: user.id,
        thumbnail,
        duration,
      };
      const saved = await videoService.addVideo(newVideo);
      setVideos([saved, ...videos]);
      setAddModalOpen(false);
      setForm({ title: '', date: '', category: 'match', videoUrl: '', duration: '', uploadType: 'file', file: null, thumbnail: '' });
    } catch (err) {
      alert('動画の登録に失敗しました');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // サムネイル生成関数
  const getThumbnail = (url: string) => {
    // YouTubeリンクならサムネイル自動生成
    const yt = url.match(/(?:youtu.be\/|youtube.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    if (yt) return `https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg`;
    // それ以外はデフォルト画像
    return '/default_video_thumb.png';
  };

  const handleEditVideo = (video: Video) => {
    setEditForm(video);
    setEditModalOpen(true);
  };

  const handleDeleteVideo = async (id: number) => {
    if (!window.confirm('本当に削除しますか？')) return;
    await videoService.deleteVideo(id);
    setVideos(videos.filter(v => v.id !== id));
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* タイトルバー */}
      <header className="bg-blue-600 text-white p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button className="text-2xl"><i className="fas fa-arrow-left"></i></button>
          <span className="text-lg font-bold">動画ライブラリー</span>
        </div>
        <div className="flex items-center gap-4">
          <button><i className="fas fa-search text-xl"></i></button>
          <button><i className="fas fa-ellipsis-v text-xl"></i></button>
        </div>
      </header>
      {/* 上部UIを美しくリファクタ */}
      <div className="sticky top-0 z-20 bg-white shadow-sm rounded-b-xl px-3 py-2 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="動画検索"
              className="pl-10 pr-3 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 w-full"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold"
          >
            <option value="new">新着順</option>
            <option value="old">古い順</option>
            <option value="views">再生回数順</option>
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.key}
              className={`px-4 py-1 rounded-full font-bold border transition ${
                activeCategory === cat.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-100'
              }`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      {/* 動画リスト */}
      <main className="px-2 pt-2 pb-20 max-w-xl mx-auto">
        {filteredVideos.map(video => (
          <div key={video.id} className="bg-white rounded-xl shadow mb-6 overflow-hidden relative">
            <div className="relative">
              <img src={video.thumbnail} alt={video.title} className="w-full h-48 object-cover" />
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center">
                <span className="bg-black/60 rounded-full p-3"><i className="fas fa-play text-white text-2xl"></i></span>
              </a>
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs rounded px-2 py-0.5">{video.views ?? 0}回</span>
            </div>
            <div className="p-3">
              <div className="font-bold text-base mb-1 flex items-center">{video.title}</div>
              <div className="text-xs text-gray-500 mb-1">{video.created_at ? new Date(video.created_at).toLocaleString('ja-JP') : ''}</div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    `px-2 py-0.5 rounded text-xs font-bold ` +
                    (video.type === 'match'
                      ? 'bg-blue-100 text-blue-600'
                      : video.type === 'practice'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-amber-100 text-amber-600')
                  }
                >
                  {video.type === 'match' ? '試合映像' : video.type === 'practice' ? '練習映像' : '技術分析'}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="text-xs text-blue-600 underline" onClick={() => handleEditVideo(video)}>編集</button>
              <button className="text-xs text-red-600 underline" onClick={() => { if (video.id !== undefined) handleDeleteVideo(video.id); }}>削除</button>
            </div>
          </div>
        ))}
        {filteredVideos.length === 0 && (
          <div className="text-center text-gray-400 py-12">動画がありません</div>
        )}
      </main>
      {/* 追加ボタン */}
      <button className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-blue-600 text-white text-3xl shadow-lg flex items-center justify-center z-50 hover:bg-blue-700" onClick={() => setAddModalOpen(true)}>
        <i className="fas fa-plus"></i>
      </button>
      {/* 追加モーダル */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setAddModalOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">動画を追加</h2>
            <form className="space-y-4" onSubmit={handleAddVideo}>
              <div>
                <label className="block text-sm font-medium mb-1">タイトル</label>
                <input type="text" name="title" value={form.title} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="datetime-local" name="date" value={form.date} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">カテゴリ</label>
                <select name="category" value={form.category} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                  {categories.filter(c => c.key !== 'all').map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">サムネイル画像URL</label>
                <input type="text" name="thumbnail" value={form.thumbnail} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              {form.uploadType === 'link' && (
                <div>
                  <label className="block text-sm font-medium mb-1">動画URL</label>
                  <input type="text" name="videoUrl" value={form.videoUrl} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">再生時間</label>
                <input type="text" name="duration" value={form.duration} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 12:35" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">アップロードタイプ</label>
                <select name="uploadType" value={form.uploadType} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                  <option value="file">ファイルアップロード</option>
                  <option value="link">外部リンク</option>
                </select>
              </div>
              <div>
                {form.uploadType === 'file' && (
                  <label className="block text-sm font-medium mb-1">動画ファイル</label>
                )}
                {form.uploadType === 'file' && (
                  <input type="file" name="file" accept="video/*" onChange={handleFormChange} className="border rounded px-3 py-2 w-full" />
                )}
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setEditModalOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">動画を編集</h2>
            <form className="space-y-4" onSubmit={handleAddVideo}>
              <div>
                <label className="block text-sm font-medium mb-1">タイトル</label>
                <input type="text" name="title" value={editForm?.title} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="datetime-local" name="date" value={editForm?.date} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">カテゴリ</label>
                <select name="category" value={editForm?.type} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                  {categories.filter(c => c.key !== 'all').map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">サムネイル画像URL</label>
                <input type="text" name="thumbnail" value={editForm?.thumbnail} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">動画URL</label>
                <input type="text" name="videoUrl" value={editForm?.url} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">再生時間</label>
                <input type="text" name="duration" value={editForm?.duration} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 12:35" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">アップロードタイプ</label>
                <select name="uploadType" value={editForm?.uploadType} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                  <option value="file">ファイルアップロード</option>
                  <option value="link">外部リンク</option>
                </select>
              </div>
              <div>
                {editForm?.uploadType === 'file' && (
                  <label className="block text-sm font-medium mb-1">動画ファイル</label>
                )}
                {editForm?.uploadType === 'file' && (
                  <input type="file" name="file" accept="video/*" onChange={handleFormChange} className="border rounded px-3 py-2 w-full" />
                )}
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <BottomTabBar />
    </div>
  );
};

export default VideosPage; 