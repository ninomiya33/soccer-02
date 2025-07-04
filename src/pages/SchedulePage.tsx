import React, { useState, useEffect } from 'react';
import BottomTabBar from '../components/BottomTabBar.js';
import { useAuth } from '../contexts/AuthContext.js';
import { scheduleService, Schedule } from '../services/scheduleService.js';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import PracticeLogForm from '../components/PracticeLogForm.js';

const typeOptions = [
  { value: '試合', label: '試合', color: 'bg-red-100 text-red-600', dot: 'bg-red-500', icon: 'fas fa-futbol', iconBg: 'bg-red-500' },
  { value: '練習', label: '練習', color: 'bg-blue-100 text-blue-600', dot: 'bg-blue-500', icon: 'fas fa-running', iconBg: 'bg-blue-500' },
  { value: 'フットサル', label: 'フットサル', color: 'bg-green-100 text-green-600', dot: 'bg-green-500', icon: 'fas fa-futbol', iconBg: 'bg-green-500' },
];

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

// フォームstate型を統一
interface ScheduleForm {
  type: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  time: string;
  place: string;
  note: string;
  items: string;
  latitude: number | null;
  longitude: number | null;
}

const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'今後の予定' | '今日の予定'>('今後の予定');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<Schedule[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState<ScheduleForm>({
    type: '練習',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    time: '',
    place: '',
    note: '',
    items: '',
    latitude: null,
    longitude: null,
  });
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const days: Date[] = getMonthDays(calendarYear, calendarMonth);
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();

  // カレンダーで選択された日付の予定のみ表示
  let filteredEvents = tab === '今後の予定'
    ? events.filter(e => e.date >= todayStr)
    : events.filter(e => e.date === todayStr);
  if (selectedDate) {
    filteredEvents = events.filter(e => e.date === selectedDate);
  }

  // 予定がある日をセット（色も持たせる）
  const eventDateMap: { [date: string]: string } = {};
  events.forEach(e => { eventDateMap[(e.date || '') as string] = typeOptions.find(t => t.value === e.type)?.dot || 'bg-blue-500'; });

  // カード表示時の色・アイコン・itemsのデフォルト処理
  const getTypeOption = (type: string) => typeOptions.find(t => t.value === type) || typeOptions[1];

  // 追加モーダルのハンドラ
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.type || !form.title || !user) return;
    const timeStr = form.startTime && form.endTime ? `${form.startTime}〜${form.endTime}` : '';
    const newEvent: Omit<Schedule, 'id' | 'created_at'> = {
      user_id: user.id,
      type: form.type,
      title: form.title,
      date: form.date,
      time: timeStr,
      place: form.place,
      note: form.note,
      items: form.items ? form.items.split(',').map(s => s.trim()).filter(Boolean) : [],
      latitude: form.latitude,
      longitude: form.longitude,
    };
    try {
      const saved = await scheduleService.addSchedule(newEvent);
      setEvents([saved, ...events]);
      setAddModalOpen(false);
      setForm({ type: '練習', title: '', date: '', startTime: '', endTime: '', time: '', place: '', note: '', items: '', latitude: null, longitude: null });
    } catch (err) { console.error(err); }
  };

  // 編集用フォーム
  const [editForm, setEditForm] = useState({
    type: '練習',
    title: '',
    date: '',
    time: '',
    place: '',
    note: '',
    items: '',
    startTime: '',
    endTime: '',
  });

  // 編集開始
  const handleEdit = (idx: number) => {
    const e = filteredEvents[idx];
    setEditForm({
      type: e.type,
      title: e.title,
      date: e.date,
      time: e.time,
      place: e.place,
      note: e.note ?? '',
      items: Array.isArray(e.items) ? e.items.join(', ') : '',
      startTime: '',
      endTime: '',
    });
    setEditIndex(idx);
    setEditModalOpen(true);
  };
  // 編集保存
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editIndex === null || !user) return;
    const eventToEdit = filteredEvents[editIndex];
    if (!eventToEdit.id) return;
    const realIdx = events.findIndex(ev => ev.id === eventToEdit.id);
    if (realIdx === -1) return;
    const updates: Partial<Schedule> = {
      type: editForm.type,
      title: editForm.title,
      date: editForm.date,
      time: editForm.time,
      place: editForm.place,
      note: editForm.note,
      items: editForm.items ? editForm.items.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    try {
      const updated = await scheduleService.updateSchedule(eventToEdit.id!, updates);
      const newEvents = [...events];
      newEvents[realIdx] = updated;
      setEvents(newEvents);
      setEditModalOpen(false);
      setEditIndex(null);
    } catch (err) { console.error(err); }
  };
  // 編集フォーム変更
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  // 削除
  const handleDelete = (idx: number) => {
    setDeleteIndex(idx);
  };
  const confirmDelete = async () => {
    if (deleteIndex === null) return;
    const eventToDelete = filteredEvents[deleteIndex];
    if (!eventToDelete.id) return;
    try {
      await scheduleService.deleteSchedule(eventToDelete.id!);
      setEvents(events.filter(ev => ev.id !== eventToDelete.id));
      setDeleteIndex(null);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    scheduleService.getSchedules().then(setEvents).catch(console.error);
  }, []);

  // Google Maps APIキー（.envやconfigから取得する想定）
  const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapContainerStyle = { width: '100%', height: '240px' };
  const defaultCenter = { lat: 35.681236, lng: 139.767125 }; // 東京駅

  // useJsApiLoaderでGoogle Mapsをラップ
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  if (!isLoaded) return <div>地図を読み込み中...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-16 flex flex-col md:flex-row">
      {/* 予定一覧ボタン（PC:右中央, スマホ:右上） */}
      <button
        className="fixed z-40 bg-blue-600 text-white px-3 py-2 rounded-l-lg shadow-md md:top-1/2 md:right-0 md:rounded-l-lg md:translate-y-[-50%] top-4 right-4 md:bottom-auto md:block md:top-1/2 md:right-0 md:translate-y-[-50%] md:rounded-l-lg"
        onClick={() => setSidebarOpen(true)}
      >
        <i className="fas fa-list mr-1"></i>予定一覧
      </button>
      {/* サイドバー（スライドイン, PC/スマホ共通） */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white border-l shadow-lg z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:w-72 w-11/12 max-w-xs`}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={() => setSidebarOpen(false)}
          aria-label="閉じる"
        >×</button>
        <div className="pt-12 pb-4 px-4">
          <h2 className="text-base font-bold mb-2">今後の予定一覧</h2>
          <div className="space-y-2">
            {events
              .filter(e => e.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((event, i) => (
                <div key={i} className="flex items-center bg-gray-50 rounded shadow p-2 border">
                  <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${getTypeOption(event.type).color}`}>{event.type}</span>
                  <span className="font-bold mr-2">{event.title}</span>
                  <span className="text-xs text-gray-500 mr-2">{new Date(event.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                  <button className="text-xs text-blue-500 underline ml-auto mr-1" onClick={() => handleEdit(i)}>編集</button>
                  <button className="text-xs text-red-500 underline" onClick={() => handleDelete(i)}>削除</button>
                </div>
              ))}
            {events.filter(e => e.date >= todayStr).length === 0 && (
              <div className="text-center text-gray-400 py-4">今後の予定はありません</div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 w-full max-w-xl mx-auto pt-2 px-2">
        {/* カレンダー */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex items-center justify-center mb-2">
            <button onClick={() => {
              if (calendarMonth === 0) {
                setCalendarYear(calendarYear - 1);
                setCalendarMonth(11);
              } else {
                setCalendarMonth(calendarMonth - 1);
              }
            }} className="text-2xl px-2">&lt;</button>
            <span className="mx-4 font-bold text-lg">{calendarYear}年{calendarMonth + 1}月</span>
            <button onClick={() => {
              if (calendarMonth === 11) {
                setCalendarYear(calendarYear + 1);
                setCalendarMonth(0);
              } else {
                setCalendarMonth(calendarMonth + 1);
              }
            }} className="text-2xl px-2">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold mb-1">
            {['日','月','火','水','木','金','土'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={i}></div>)}
            {days.map((date: Date, i: number) => {
              const dateStr = date.toISOString().slice(0, 10);
              const dotColor = eventDateMap[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  className={`aspect-square w-8 rounded-full flex flex-col items-center justify-center text-xs font-bold border transition
                    ${isSelected ? 'bg-blue-500 text-white border-blue-500' : isToday ? 'border-blue-400 text-blue-600' : 'bg-gray-100 border-transparent text-gray-700'}
                  `}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  {date.getDate()}
                  {dotColor && <span className={`block w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : dotColor}`}></span>}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <button className="mt-2 text-xs text-blue-500 underline" onClick={() => setSelectedDate(null)}>
              カレンダー選択を解除
            </button>
          )}
        </div>
        {/* タブ */}
        <div className="flex mb-4">
          {['今後の予定', '今日の予定'].map(t => (
            <button
              key={t}
              className={`flex-1 py-2 rounded-lg font-bold border ${tab === t ? 'bg-white border-black text-black' : 'bg-gray-100 border-transparent text-gray-500'}`}
              onClick={() => { setTab(t as any); setSelectedDate(null); }}
            >
              {t}
            </button>
          ))}
        </div>
        {/* 予定リスト */}
        {filteredEvents.length <= 3 ? (
          <div className="space-y-4">
            {filteredEvents.map((event, i) => (
              <div key={i} className="bg-white rounded-xl shadow p-4 border relative">
                <div className="flex items-center mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${getTypeOption(event.type).color}`}>{event.type}</span>
                  <span className="text-base font-bold mr-2 flex items-center">
                    {event.title}
                    <span className="inline-flex gap-2 ml-2 align-middle">
                      <button className="text-xs text-blue-500 underline" onClick={() => handleEdit(i)}>編集</button>
                      <button className="text-xs text-red-500 underline" onClick={() => handleDelete(i)}>削除</button>
                    </span>
                  </span>
                  <span className={`ml-auto w-8 h-8 flex items-center justify-center rounded-full ${getTypeOption(event.type).iconBg}`}>
                    <i className={`${getTypeOption(event.type).icon} text-white`}></i>
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-1">{new Date(event.date || '').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {event.time}</div>
                {event.place && <div className="text-xs text-gray-500 mb-2"><i className="fas fa-map-marker-alt mr-1"></i>{event.place}</div>}
                {event.note && <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 mb-2">{event.note}</div>}
                {event.items && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-gray-500">持ち物:</span>
                    {event.items.map((item: string, j: number) => (
                      <span key={j} className="px-2 py-1 bg-gray-100 rounded text-xs font-bold border border-gray-200">{item}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredEvents.slice(0, 3).map((event, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 border relative">
                  <div className="flex items-center mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${getTypeOption(event.type).color}`}>{event.type}</span>
                    <span className="text-base font-bold mr-2 flex items-center">
                      {event.title}
                      <span className="inline-flex gap-2 ml-2 align-middle">
                        <button className="text-xs text-blue-500 underline" onClick={() => handleEdit(i)}>編集</button>
                        <button className="text-xs text-red-500 underline" onClick={() => handleDelete(i)}>削除</button>
                      </span>
                    </span>
                    <span className={`ml-auto w-8 h-8 flex items-center justify-center rounded-full ${getTypeOption(event.type).iconBg}`}>
                      <i className={`${getTypeOption(event.type).icon} text-white`}></i>
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{new Date(event.date || '').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {event.time}</div>
                  {event.place && <div className="text-xs text-gray-500 mb-2"><i className="fas fa-map-marker-alt mr-1"></i>{event.place}</div>}
                  {event.note && <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 mb-2">{event.note}</div>}
                  {event.items && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs text-gray-500">持ち物:</span>
                      {event.items.map((item: string, j: number) => (
                        <span key={j} className="px-2 py-1 bg-gray-100 rounded text-xs font-bold border border-gray-200">{item}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-4 mt-2 max-h-40 overflow-y-auto pr-1">
              {filteredEvents.slice(3).map((event, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 border relative">
                  <div className="flex items-center mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${getTypeOption(event.type).color}`}>{event.type}</span>
                    <span className="text-base font-bold mr-2 flex items-center">
                      {event.title}
                      <span className="inline-flex gap-2 ml-2 align-middle">
                        <button className="text-xs text-blue-500 underline" onClick={() => handleEdit(i)}>編集</button>
                        <button className="text-xs text-red-500 underline" onClick={() => handleDelete(i)}>削除</button>
                      </span>
                    </span>
                    <span className={`ml-auto w-8 h-8 flex items-center justify-center rounded-full ${getTypeOption(event.type).iconBg}`}>
                      <i className={`${getTypeOption(event.type).icon} text-white`}></i>
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{new Date(event.date || '').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {event.time}</div>
                  {event.place && <div className="text-xs text-gray-500 mb-2"><i className="fas fa-map-marker-alt mr-1"></i>{event.place}</div>}
                  {event.note && <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 mb-2">{event.note}</div>}
                  {event.items && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs text-gray-500">持ち物:</span>
                      {event.items.map((item: string, j: number) => (
                        <span key={j} className="px-2 py-1 bg-gray-100 rounded text-xs font-bold border border-gray-200">{item}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* プラスボタン */}
      <button
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-blue-600 text-white text-3xl shadow-lg flex items-center justify-center z-50 hover:bg-blue-700"
        onClick={() => setAddModalOpen(true)}
        aria-label="予定を追加"
      >
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
            <h2 className="text-lg font-bold mb-4">スケジュールを追加</h2>
            <form className="space-y-4" onSubmit={handleAddEvent}>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="date" name="date" value={form.date} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">種別</label>
                <select name="type" value={form.type} onChange={handleFormChange} className="border rounded px-3 py-2 w-full">
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">タイトル</label>
                <input type="text" name="title" value={form.title} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">開始時刻</label>
                <input type="time" name="startTime" value={form.startTime} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">終了時刻</label>
                <input type="time" name="endTime" value={form.endTime} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">場所</label>
                <input type="text" name="place" value={form.place} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">メモ</label>
                <textarea name="note" value={form.note} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">持ち物（カンマ区切り）</label>
                <input type="text" name="items" value={form.items} onChange={handleFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 水筒, タオル" />
              </div>
              <div className="mb-2">
                <button type="button" className="bg-green-500 text-white px-3 py-1 rounded text-sm" onClick={() => {
                  if (!navigator.geolocation) {
                    alert('位置情報取得に未対応のブラウザです');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      const gmap = `https://www.google.com/maps?q=${lat},${lng}`;
                      setForm({ ...form, place: gmap, latitude: lat, longitude: lng });
                    },
                    err => { alert('位置情報の取得に失敗しました'); }
                  );
                }}>
                  現在地リンクを取得
                </button>
                <span className="text-xs text-gray-500 ml-2">Googleマップで開けるリンクを自動入力</span>
              </div>
              <div className="flex justify-end mt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2">登録</button>
                <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400" onClick={() => setAddModalOpen(false)}>完了</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 編集モーダル */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => { setEditModalOpen(false); setEditIndex(null); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">スケジュールを編集</h2>
            <form className="space-y-4" onSubmit={handleEditSave}>
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input type="date" name="date" value={editForm.date} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">種別</label>
                <select name="type" value={editForm.type} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full">
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">タイトル</label>
                <input type="text" name="title" value={editForm.title} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">開始時刻</label>
                <input type="time" name="startTime" value={editForm.startTime} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">終了時刻</label>
                <input type="time" name="endTime" value={editForm.endTime} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">場所</label>
                <input type="text" name="place" value={editForm.place} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">メモ</label>
                <textarea name="note" value={editForm.note} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">持ち物（カンマ区切り）</label>
                <input type="text" name="items" value={editForm.items} onChange={handleEditFormChange} className="border rounded px-3 py-2 w-full" placeholder="例: 水筒, タオル" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 削除確認ダイアログ */}
      {deleteIndex !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs relative">
            <h2 className="text-lg font-bold mb-4">この予定を削除しますか？</h2>
            <div className="flex justify-end gap-4">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700" onClick={() => setDeleteIndex(null)}>キャンセル</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={confirmDelete}>削除</button>
            </div>
          </div>
        </div>
      )}
      <BottomTabBar />
    </div>
  );
};

export default SchedulePage; 