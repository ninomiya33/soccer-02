import React, { useState, useEffect } from 'react';
import BottomTabBar from '../components/BottomTabBar.js';
import { useAuth } from '../contexts/AuthContext.js';
import { profileService } from '../services/profileService.js';
import { Profile } from '../services/profileService.js';

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  // トグル用state
  const [notification, setNotification] = useState(false);
  const [sync, setSync] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [location, setLocation] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // プロフィール情報
  const [profile, setProfile] = useState<Profile>({
    id: '',
    name: '',
    email: '',
    avatar_url: '',
    age: undefined,
    grade: '',
    gender: '',
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Profile>(profile);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // プロフィール初期値をSupabaseから取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const data = await profileService.getProfile(user.id);
      if (data) {
        setProfile({
          id: data.id,
          name: data.name || '',
          email: data.email || '',
          avatar_url: data.avatar_url || '',
          age: data.age,
          grade: data.grade || '',
          gender: data.gender || '',
        });
      } else {
        // プロフィールが未登録の場合はauth情報を初期値に
        setProfile({
          id: '',
          name: '',
          email: user.email || '',
          avatar_url: '',
          age: undefined,
          grade: '',
          gender: '',
        });
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 通知設定の保存・復元
  useEffect(() => {
    const saved = localStorage.getItem('notification');
    if (saved !== null) setNotification(saved === 'true');
  }, []);
  const handleNotificationToggle = () => {
    setNotification(v => {
      localStorage.setItem('notification', (!v).toString());
      setSnackbar('通知設定を保存しました');
      setTimeout(() => setSnackbar(null), 2000);
      return !v;
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target instanceof HTMLInputElement && e.target.name === 'imageFile' && e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = ev => {
        setEditImagePreview(ev.target?.result as string);
        setEditForm({ ...editForm, avatar_url: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      if (e.target.name === 'age') {
        setEditForm({ ...editForm, age: e.target.value ? Number(e.target.value) : undefined });
      } else {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
        if (e.target.name === 'avatar_url') setEditImagePreview(e.target.value);
      }
    }
  };
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const profileData: Profile = {
      id: user.id,
      name: editForm.name,
      email: editForm.email,
      avatar_url: editForm.avatar_url,
      age: editForm.age,
      grade: editForm.grade,
      gender: editForm.gender,
    };
    await profileService.upsertProfile(profileData);
    setProfile(editForm);
    setEditModalOpen(false);
    setSnackbar('プロフィールを保存しました');
    setTimeout(() => setSnackbar(null), 2000);
  };

  // ダークモードの保存・復元
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(saved === 'true');
      if (saved === 'true') document.documentElement.classList.add('dark');
    }
  }, []);
  const handleDarkModeToggle = () => {
    setDarkMode(v => {
      const next = !v;
      localStorage.setItem('darkMode', next.toString());
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      setSnackbar('ダークモードを保存しました');
      setTimeout(() => setSnackbar(null), 2000);
      return next;
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* プロフィールカード */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl shadow p-6 flex flex-col items-center max-w-xl mx-auto mt-4">
        <img src={profile.avatar_url} alt="profile" className="w-20 h-20 rounded-full border-4 border-white shadow mb-2" />
        <div className="text-white text-xl font-bold">{profile.name}</div>
        <div className="text-blue-100 text-sm mb-2">{profile.email}</div>
        <button className="mt-2 px-6 py-2 rounded-lg border border-blue-200 text-blue-900 bg-white font-bold flex items-center gap-2 hover:bg-blue-50" onClick={() => { setEditForm(profile); setEditModalOpen(true); }}>
          <i className="fas fa-user-edit"></i>プロフィールを編集
        </button>
      </div>
      {/* プロフィール編集モーダル */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setEditModalOpen(false)}
              aria-label="閉じる"
            >×</button>
            <h2 className="text-lg font-bold mb-4">プロフィール編集</h2>
            <form className="space-y-4" onSubmit={handleEditSave}>
              <div>
                <label className="block text-sm font-medium mb-1">名前</label>
                <input type="text" name="name" value={editForm.name} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">メールアドレス</label>
                <input type="email" name="email" value={editForm.email} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">画像URL</label>
                <input type="text" name="avatar_url" value={editForm.avatar_url} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full mb-2" />
                <input type="file" name="imageFile" accept="image/*" onChange={handleEditFormChange} className="mb-2" />
                {editImagePreview && (
                  <img src={editImagePreview} alt="preview" className="w-20 h-20 rounded-full mx-auto border mb-2" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">年齢</label>
                <input type="number" name="age" value={editForm.age ?? ''} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">学年</label>
                <input type="text" name="grade" value={editForm.grade} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">性別</label>
                <select name="gender" value={editForm.gender} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full">
                  <option value="">選択してください</option>
                  <option value="男子">男子</option>
                  <option value="女子">女子</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 基本設定 */}
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-4 divide-y">
        <div className="text-gray-700 font-bold mb-2">基本設定</div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <i className="fas fa-bell text-blue-400 text-xl"></i>
            <div>
              <div className="font-bold">通知設定</div>
              <div className="text-xs text-gray-500">アプリからの通知を受け取る</div>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={notification} onChange={handleNotificationToggle} />
            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-500 rounded-full relative transition">
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notification ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>
        </div>
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded" onClick={() => alert('言語設定画面へ遷移')}>
          <div className="flex items-center gap-3">
            <i className="fas fa-language text-purple-400 text-xl"></i>
            <div>
              <div className="font-bold">言語設定</div>
              <div className="text-xs text-gray-500">日本語</div>
            </div>
          </div>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <i className="fas fa-sync-alt text-green-400 text-xl"></i>
            <div>
              <div className="font-bold">データ同期設定</div>
              <div className="text-xs text-gray-500">データをクラウドに自動保存</div>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={sync} onChange={() => setSync(v => !v)} />
            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-green-500 rounded-full relative transition">
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${sync ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <i className="fas fa-moon text-gray-400 text-xl"></i>
            <div>
              <div className="font-bold">ダークモード</div>
              <div className="text-xs text-gray-500">画面の明るさを調整</div>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={handleDarkModeToggle} />
            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-gray-700 rounded-full relative transition">
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>
        </div>
      </div>

      {/* プライバシーとセキュリティ */}
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-4 divide-y">
        <div className="text-gray-700 font-bold mb-2">プライバシーとセキュリティ</div>
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded" onClick={() => alert('セキュリティ設定画面へ遷移')}>
          <div className="flex items-center gap-3">
            <i className="fas fa-shield-alt text-red-400 text-xl"></i>
            <div>
              <div className="font-bold">セキュリティ設定</div>
              <div className="text-xs text-gray-500">パスワード変更・二段階認証</div>
            </div>
          </div>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <i className="fas fa-map-marker-alt text-blue-400 text-xl"></i>
            <div>
              <div className="font-bold">位置情報サービス</div>
              <div className="text-xs text-gray-500">近くの施設を検索</div>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={location} onChange={() => setLocation(v => !v)} />
            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-500 rounded-full relative transition">
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${location ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <i className="fas fa-users text-yellow-400 text-xl"></i>
            <div>
              <div className="font-bold">アカウント公開範囲</div>
              <div className="text-xs text-gray-500">プロフィールを公開する</div>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={publicProfile} onChange={() => setPublicProfile(v => !v)} />
            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-yellow-400 rounded-full relative transition">
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${publicProfile ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>
        </div>
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded" onClick={() => alert('データ管理画面へ遷移')}>
          <div className="flex items-center gap-3">
            <i className="fas fa-database text-purple-400 text-xl"></i>
            <div>
              <div className="font-bold">データ管理</div>
              <div className="text-xs text-gray-500">アプリデータの削除・エクスポート</div>
            </div>
          </div>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
      </div>

      {/* サポート＆その他 */}
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-4 divide-y">
        <div className="text-gray-700 font-bold mb-2">サポート＆その他</div>
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded" onClick={() => alert('ヘルプセンターへ遷移')}>
          <div className="flex items-center gap-3">
            <i className="fas fa-question-circle text-green-400 text-xl"></i>
            <div className="font-bold">ヘルプセンター</div>
          </div>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded" onClick={() => alert('お問い合わせへ遷移')}>
          <div className="flex items-center gap-3">
            <i className="fas fa-envelope text-blue-400 text-xl"></i>
            <div className="font-bold">お問い合わせ</div>
          </div>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded" onClick={() => alert('利用規約へ遷移')}>
          <div className="flex items-center gap-3">
            <i className="fas fa-file-alt text-gray-400 text-xl"></i>
            <div className="font-bold">利用規約</div>
          </div>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded" onClick={() => alert('プライバシーポリシーへ遷移')}>
          <div className="flex items-center gap-3">
            <i className="fas fa-lock text-gray-400 text-xl"></i>
            <div className="font-bold">プライバシーポリシー</div>
          </div>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <i className="fas fa-info-circle text-blue-400 text-xl"></i>
            <div>
              <div className="font-bold">アプリ情報</div>
              <div className="text-xs text-gray-500">バージョン 2.5.1</div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-xl mx-auto mt-10 mb-8 flex justify-center">
        <button
          className="bg-red-500 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-red-600 transition"
          onClick={async () => { await signOut(); window.location.reload(); }}
        >
          ログアウト
        </button>
      </div>
      <BottomTabBar />
      {/* スナックバー */}
      {snackbar && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-2 rounded shadow z-50 animate-fade-in">
          {snackbar}
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 