import React, { useState, useEffect, useRef } from 'react';
import BottomTabBar from '../components/BottomTabBar.js';
import { useAuth } from '../contexts/AuthContext.js';
import { videoService, Video } from '../services/videoService.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

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
  // アコーディオン開閉状態
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});
  const toggleDate = (date: string) => {
    setOpenDates(prev => ({ ...prev, [date]: !prev[date] }));
  };
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  // フォルダの開閉状態を管理
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const toggleFolder = (folder: string) => {
    setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // タイトルごとにグループ化
  const groupedByTitle = filteredVideos.reduce((acc, video) => {
    const title = video.title || '未設定';
    if (!acc[title]) acc[title] = [];
    acc[title].push(video);
    return acc;
  }, {} as Record<string, Video[]>);

  // folderごとにグループ化
  const groupedByFolder = filteredVideos.reduce((acc, video) => {
    const folder = video.folder || '未分類';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(video);
    return acc;
  }, {} as Record<string, Video[]>);

  // 選択切り替え
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const clearSelection = () => setSelectedIds([]);

  // フォルダ作成・移動処理
  const handleCreateFolder = async () => {
    const folderName = folderInputRef.current?.value?.trim();
    if (!folderName || selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => videoService.updateVideo(id, { folder: folderName })));
      setVideos(videos => videos.map(v => selectedIds.includes(v.id!) ? { ...v, folder: folderName } : v));
      setFolderModalOpen(false);
      clearSelection();
    } catch (e) {
      alert('フォルダ作成・移動に失敗しました');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as any;
    if (name === 'file') {
      const file = files[0];
      setForm({ ...form, file });
      setUploadError(null);
      // プレビュー用URL生成
      if (file) {
        setVideoPreviewUrl(URL.createObjectURL(file));
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          const dur = video.duration;
          const min = Math.floor(dur / 60);
          const sec = Math.round(dur % 60).toString().padStart(2, '0');
          setForm(f => ({ ...f, duration: `${min}:${sec}` }));
        };
      } else {
        setVideoPreviewUrl(null);
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category || (!form.file && !form.videoUrl) || !user) return;
    setUploading(true);
    setUploadError(null);
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
        date: form.date ? new Date(form.date).toISOString() : undefined,
      };
      const saved = await videoService.addVideo(newVideo);
      setVideos([saved, ...videos]);
      setAddModalOpen(false);
      setForm({ title: '', date: '', category: 'match', videoUrl: '', duration: '', uploadType: 'file', file: null, thumbnail: '' });
      setVideoPreviewUrl(null);
    } catch (err) {
      setUploadError('動画の登録に失敗しました');
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

  const handleCameraVideo = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };
  const handlePickVideo = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
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
      {/* iOS風ヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/50">
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">動画ライブラリー</h1>
              <p className="text-sm text-gray-500 mt-1">練習・試合の動画管理</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        </div>

      <main className="pt-32 px-6 pb-16">
        {/* iOS風検索・ソート */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
                placeholder="動画を検索"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-gray-50 text-base"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-gray-50 text-base font-semibold"
          >
            <option value="new">新着順</option>
            <option value="old">古い順</option>
            <option value="views">再生回数順</option>
          </select>
        </div>

          {/* iOS風カテゴリタブ */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.key}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeCategory === cat.key
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

          {/* 選択中のアクション */}
        {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <button 
                className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg hover:bg-yellow-600 transition-colors flex items-center gap-2" 
                onClick={() => setFolderModalOpen(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              フォルダ作成/移動
            </button>
              <span className="text-sm text-gray-600 font-semibold">{selectedIds.length}件選択中</span>
              <button 
                className="text-sm text-gray-400 underline" 
                onClick={clearSelection}
              >
                選択解除
              </button>
            </div>
          )}
        </div>

        {/* iOS風動画グリッド */}
        <div className="grid grid-cols-2 gap-4">
          {filteredVideos.map(video => (
            <div
              key={video.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden relative group cursor-pointer"
              onClick={() => window.open(video.url, '_blank')}
              onContextMenu={e => {
                e.preventDefault();
                if (window.confirm('編集しますか？（キャンセルで削除）')) {
                  handleEditVideo(video);
                } else {
                  if (video.id !== undefined) handleDeleteVideo(video.id);
                }
              }}
            >
              {/* サムネイル */}
              <div className="relative w-full aspect-video bg-gray-200">
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-full object-cover" 
                />
                
                {/* オーバーレイ情報 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs rounded-lg px-2 py-1 font-semibold">
                    {video.duration || ''}
                  </div>
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs rounded-lg px-2 py-1">
                    {video.views ?? 0}回
                  </div>
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs rounded-lg px-2 py-1 font-semibold">
                    {categories.find(c => c.key === video.type)?.label || ''}
                  </div>
                  <div className="absolute bottom-2 left-2 bg-white/90 text-gray-800 text-xs rounded-lg px-2 py-1 font-semibold">
                    {video.date ? new Date(video.date).toLocaleDateString('ja-JP') : ''}
                  </div>
                </div>

                {/* 選択チェックボックス */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(video.id!)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(video.id!);
                    }}
                    className="w-5 h-5 rounded border-2 border-white bg-white/80"
                  />
                </div>
              </div>

              {/* タイトル */}
              <div className="p-3">
                <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
                  {video.title}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* 空状態 */}
        {filteredVideos.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">動画がありません</p>
          </div>
        )}
      </main>

      {/* iOS風フォルダ作成モーダル */}
      {folderModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" 
              onClick={() => setFolderModalOpen(false)} 
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">フォルダを作成</h2>
              <p className="text-gray-500 text-sm">選択した動画を新しいフォルダに移動します</p>
            </div>
            <input 
              ref={folderInputRef} 
              type="text" 
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base mb-6" 
              placeholder="例: 2024夏合宿" 
            />
            <button 
              className="w-full bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-yellow-600 transition-colors" 
              onClick={handleCreateFolder}
            >
              フォルダを作成
            </button>
          </div>
        </div>
        )}

      {/* iOS風FAB */}
      <button 
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center z-50 hover:bg-blue-700 transition-colors" 
        onClick={() => setAddModalOpen(true)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* iOS風追加モーダル */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl z-10"
              onClick={() => setAddModalOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">動画を追加</h2>
            </div>

            <form className="space-y-6" onSubmit={handleAddVideo}>
              {/* アップロード方法切り替え */}
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">アップロード方法</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm border-2 ${form.uploadType === 'file' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200'}`}
                    onClick={() => setForm(f => ({ ...f, uploadType: 'file' }))}
                  >
                    ファイル/カメラ
                  </button>
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm border-2 ${form.uploadType === 'link' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200'}`}
                    onClick={() => setForm(f => ({ ...f, uploadType: 'link', file: null }))}
                  >
                    URLを入力
                  </button>
                </div>
              </div>

              {/* タイトル入力 */}
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">タイトル</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base"
                  placeholder="動画のタイトルを入力"
                  required
                />
              </div>

              {/* カテゴリ選択 */}
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">カテゴリ</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base"
                >
                  {categories.filter(c => c.key !== 'all').map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* ファイル/カメラ or URL入力欄 */}
              {form.uploadType === 'file' && (
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">動画ファイル</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="file"
                    accept="video/*"
                    onChange={handleFormChange}
                    className="hidden"
                  />
                  <div className="space-y-3">
                    <button 
                      type="button" 
                      className="w-full bg-blue-500 text-white px-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 shadow-lg hover:bg-blue-600 transition-colors" 
                      onClick={handleCameraVideo}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      カメラで撮影
                    </button>
                    <button 
                      type="button" 
                      className="w-full bg-green-500 text-white px-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 shadow-lg hover:bg-green-600 transition-colors" 
                      onClick={handlePickVideo}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      動画を選択
                    </button>
                  </div>
                  {/* 選択されたファイルのプレビュー */}
                  {form.file && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 mt-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">{form.file.name}</span>
                      </div>
                      {videoPreviewUrl && (
                        <video 
                          src={videoPreviewUrl} 
                          controls 
                          className="w-full rounded-xl shadow-sm border" 
                          style={{ maxHeight: '200px' }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              {form.uploadType === 'link' && (
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">動画URL</label>
                  <input
                    type="text"
                    name="videoUrl"
                    value={form.videoUrl}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base"
                    placeholder="YouTubeなどの動画URLを入力"
                    required
                  />
                </div>
              )}

              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {uploadError}
                </div>
              )}

              {uploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-600 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  アップロード中...
                </div>
              )}

              {/* 登録ボタン */}
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold text-base shadow-lg hover:bg-blue-700 transition-colors"
                disabled={uploading}
              >
                {uploading ? 'アップロード中...' : '登録'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* iOS風編集モーダル */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setEditModalOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">動画を編集</h2>
            </div>
            <form className="space-y-6" onSubmit={handleAddVideo}>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">タイトル</label>
                <input 
                  type="text" 
                  name="title" 
                  value={editForm?.title} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">日付</label>
                <input 
                  type="datetime-local" 
                  name="date" 
                  value={editForm?.date} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">カテゴリ</label>
                <select 
                  name="category" 
                  value={editForm?.type} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base"
                >
                  {categories.filter(c => c.key !== 'all').map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">サムネイル画像URL</label>
                <input 
                  type="text" 
                  name="thumbnail" 
                  value={editForm?.thumbnail} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">動画URL</label>
                <input 
                  type="text" 
                  name="videoUrl" 
                  value={editForm?.url} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">再生時間</label>
                <input 
                  type="text" 
                  name="duration" 
                  value={editForm?.duration} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  placeholder="例: 12:35" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">アップロードタイプ</label>
                <select 
                  name="uploadType" 
                  value={editForm?.uploadType} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base"
                >
                  <option value="file">ファイルアップロード</option>
                  <option value="link">外部リンク</option>
                </select>
              </div>
              {editForm?.uploadType === 'file' && (
              <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">動画ファイル</label>
                  <input 
                    type="file" 
                    name="file" 
                    accept="video/*" 
                    onChange={handleFormChange} 
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  />
              </div>
              )}
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 transition-colors"
                >
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