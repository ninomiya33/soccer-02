import React, { useState, useEffect } from 'react';
import BottomTabBar from '../components/BottomTabBar.js';
import { useAuth } from '../contexts/AuthContext.js';
import { scheduleService, Schedule } from '../services/scheduleService.js';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import PracticeLogForm from '../components/PracticeLogForm.js';
import CustomCalendar from '../components/CustomCalendar.js';

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

// 時刻をHH:mm形式で表示する関数を追加
const formatTime = (t: string | null | undefined) => t ? t.slice(0,5) : '--:--';

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
  const [showDatePicker, setShowDatePicker] = useState(false);

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
  // addSchedule時もitems: string[]で送信
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.type || !form.title || !user) return;
    const newEvent = {
      user_id: user.id,
      type: form.type,
      title: form.title,
      date: form.date,
      start_time: form.startTime || null,
      end_time: form.endTime || null,
      location: form.place || '',
      description: form.note || '',
      items: form.items ? form.items.split(',').map(s => s.trim()).filter(Boolean) : [],
      latitude: form.latitude || null,
      longitude: form.longitude || null,
    };
    try {
      const saved = await scheduleService.addSchedule(newEvent);
      setEvents([saved, ...events]);
      setAddModalOpen(false);
      setForm({ type: '練習', title: '', date: '', startTime: '', endTime: '', time: '', place: '', note: '', items: '', latitude: null, longitude: null });
    } catch (err: any) {
      alert('登録に失敗しました: ' + (err?.message || err));
      console.error(err);
    }
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
      time: e.start_time || '',
      place: e.location,
      note: e.description ?? '',
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
    const updates = {
      type: editForm.type,
      title: editForm.title,
      date: editForm.date,
      start_time: editForm.startTime || null,
      end_time: editForm.endTime || null,
      location: editForm.place || '',
      description: editForm.note || '',
      items: editForm.items ? editForm.items.split(',').map(s => s.trim()).filter(Boolean) : [],
      latitude: eventToEdit.latitude ?? null,
      longitude: eventToEdit.longitude ?? null,
    };
    try {
      const updated = await scheduleService.updateSchedule(eventToEdit.id!, updates);
      const newEvents = [...events];
      newEvents[realIdx] = updated;
      setEvents(newEvents);
      setEditModalOpen(false);
      setEditIndex(null);
    } catch (err: any) {
      alert('保存に失敗しました: ' + (err?.message || err));
      console.error(err);
    }
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
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* iOS風ヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/50">
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">スケジュール</h1>
              <p className="text-sm text-gray-500 mt-1">練習・試合の予定管理</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="pt-32 px-6 pb-16">
        {/* iOS風カレンダー */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarYear(calendarYear - 1);
                  setCalendarMonth(11);
                } else {
                  setCalendarMonth(calendarMonth - 1);
                }
              }} 
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:bg-blue-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">{calendarYear}年{calendarMonth + 1}月</span>
            <button 
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarYear(calendarYear + 1);
                  setCalendarMonth(0);
                } else {
                  setCalendarMonth(calendarMonth + 1);
                }
              }} 
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:bg-blue-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-gray-500 mb-4">
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
                  className={`aspect-square w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-base font-bold transition-all duration-200
                    ${isSelected 
                      ? 'bg-blue-500 text-white shadow-lg scale-105' 
                      : isToday 
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  {date.getDate()}
                  {dotColor && (
                    <span className={`block w-2 h-2 rounded-full mt-1 ${
                      isSelected ? 'bg-white' : dotColor
                    }`}></span>
                  )}
                </button>
              );
            })}
          </div>
          
          {selectedDate && (
            <button 
              className="mt-4 text-sm text-blue-600 font-semibold" 
              onClick={() => setSelectedDate(null)}
            >
              選択を解除
            </button>
          )}
        </div>

        {/* iOS風タブ */}
        <div className="flex bg-white rounded-2xl shadow-lg border border-gray-100 p-1 mb-6">
          {['今後の予定', '今日の予定'].map(t => (
            <button
              key={t}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                tab === t 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setTab(t as any); setSelectedDate(null); }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* iOS風予定リスト */}
        <div className="space-y-4">
          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">予定はありません</p>
            </div>
          )}
          
          {filteredEvents.map((event, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${getTypeOption(event.type).iconBg} shadow-sm`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {event.type === '試合' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    )}
                    {event.type === '練習' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    )}
                    {event.type === 'フットサル' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    )}
                  </svg>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* 予定カード内 */}
                  <div className="space-y-2">
                    {/* 日付・種別 */}
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{new Date(event.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTypeOption(event.type).color}`}>{event.type}</span>
                    </div>
                    {/* タイトル */}
                    <div className="font-bold text-lg text-gray-900">{event.title}</div>
                    {/* 開始・終了時刻 */}
                    {(event.start_time || event.end_time) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatTime(event.start_time)}〜{formatTime(event.end_time)}</span>
                      </div>
                    )}
                    {/* 場所 */}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    )}
                    {/* メモ */}
                    {event.description && (
                      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                        {event.description}
                      </div>
                    )}
                    {/* 持ち物 */}
                    {(() => {
                      let items: string[] = [];
                      if (Array.isArray(event.items)) {
                        items = event.items;
                      } else if (typeof event.items === 'string' && event.items && (event.items as string).trim() !== '') {
                        items = (event.items as string).split(',').map((s: string) => s.trim()).filter(Boolean);
                      }
                      return items.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500 font-semibold">持ち物</div>
                          <div className="flex flex-wrap gap-2">
                            {items.map((item, j) => (
                              <span key={j} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button 
                    className="text-blue-600 font-semibold px-4 py-2 rounded-xl bg-blue-50 active:bg-blue-100 text-sm transition-colors" 
                    onClick={() => handleEdit(i)}
                  >
                    編集
                  </button>
                  <button 
                    className="text-red-600 font-semibold px-4 py-2 rounded-xl bg-red-50 active:bg-red-100 text-sm transition-colors" 
                    onClick={() => handleDelete(i)}
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* iOS風サイドバー */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">予定一覧</h2>
          <button
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-3">
          {events
            .filter(e => e.date >= todayStr)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((event, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTypeOption(event.type).color}`}>
                    {event.type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="font-semibold text-gray-900 mb-1">{event.title}</div>
                <div className="flex gap-2">
                  <button 
                    className="text-xs text-blue-600 underline" 
                    onClick={() => handleEdit(i)}
                  >
                    編集
                  </button>
                  <button 
                    className="text-xs text-red-600 underline" 
                    onClick={() => handleDelete(i)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          {events.filter(e => e.date >= todayStr).length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">今後の予定はありません</p>
            </div>
          )}
        </div>
      </div>

      {/* iOS風FAB */}
      <button
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center z-50 hover:bg-blue-700 transition-colors"
        onClick={() => setAddModalOpen(true)}
        aria-label="予定を追加"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* iOS風追加モーダル */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setAddModalOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              スケジュールを追加
            </h2>
            <form className="space-y-6" onSubmit={handleAddEvent}>
              {/* 日付 */}
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">日付</label>
                <input
                  type="text"
                  name="date"
                  value={form.date}
                  onFocus={() => setShowDatePicker(true)}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base cursor-pointer"
                  required
                  placeholder="YYYY-MM-DD"
                />
                {showDatePicker && (
                  <div className="absolute z-50 bg-white rounded-xl shadow-xl mt-2">
                    <CustomCalendar
                      year={calendarYear}
                      month={calendarMonth}
                      selectedDate={form.date}
                      onDateSelect={date => {
                        setForm({ ...form, date });
                        setShowDatePicker(false);
                      }}
                      onYearChange={setCalendarYear}
                      onMonthChange={setCalendarMonth}
                    />
                    <button type="button" className="mt-2 text-blue-600" onClick={() => setShowDatePicker(false)}>閉じる</button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">種別</label>
                <select 
                  name="type" 
                  value={form.type} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base"
                >
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">タイトル</label>
                <input 
                  type="text" 
                  name="title" 
                  value={form.title} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">開始時刻</label>
                  <input 
                    type="time" 
                    name="startTime" 
                    value={form.startTime} 
                    onChange={handleFormChange} 
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">終了時刻</label>
                  <input 
                    type="time" 
                    name="endTime" 
                    value={form.endTime} 
                    onChange={handleFormChange} 
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">場所</label>
                <input 
                  type="text" 
                  name="place" 
                  value={form.place} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">メモ</label>
                <textarea 
                  name="note" 
                  value={form.note} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  rows={3} 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">持ち物（カンマ区切り）</label>
                <input 
                  type="text" 
                  name="items" 
                  value={form.items} 
                  onChange={handleFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  placeholder="例: 水筒, タオル" 
                />
              </div>
              
              <div className="bg-blue-50 rounded-2xl p-4">
                <button 
                  type="button" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold mb-2" 
                  onClick={() => {
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
                  }}
                >
                  現在地リンクを取得
                </button>
                <p className="text-xs text-gray-500">Googleマップで開けるリンクを自動入力</p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold" 
                  onClick={() => setAddModalOpen(false)}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 transition-colors"
                >
                  登録
                </button>
              </div>
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
              onClick={() => { setEditModalOpen(false); setEditIndex(null); }}
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              スケジュールを編集
            </h2>
            <form className="space-y-6" onSubmit={handleEditSave}>
              {/* 日付 */}
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">日付</label>
                <input
                  type="text"
                  name="date"
                  value={editForm.date}
                  onFocus={() => setShowDatePicker(true)}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base cursor-pointer"
                  required
                  placeholder="YYYY-MM-DD"
                />
                {showDatePicker && (
                  <div className="absolute z-50 bg-white rounded-xl shadow-xl mt-2">
                    <CustomCalendar
                      year={calendarYear}
                      month={calendarMonth}
                      selectedDate={editForm.date}
                      onDateSelect={date => {
                        setEditForm({ ...editForm, date });
                        setShowDatePicker(false);
                      }}
                      onYearChange={setCalendarYear}
                      onMonthChange={setCalendarMonth}
                    />
                    <button type="button" className="mt-2 text-blue-600" onClick={() => setShowDatePicker(false)}>閉じる</button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">種別</label>
                <select 
                  name="type" 
                  value={editForm.type} 
                  onChange={handleEditFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base"
                >
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">タイトル</label>
                <input 
                  type="text" 
                  name="title" 
                  value={editForm.title} 
                  onChange={handleEditFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">開始時刻</label>
                  <input 
                    type="time" 
                    name="startTime" 
                    value={editForm.startTime} 
                    onChange={handleEditFormChange} 
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-700">終了時刻</label>
                  <input 
                    type="time" 
                    name="endTime" 
                    value={editForm.endTime} 
                    onChange={handleEditFormChange} 
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">場所</label>
                <input 
                  type="text" 
                  name="place" 
                  value={editForm.place} 
                  onChange={handleEditFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">メモ</label>
                <textarea 
                  name="note" 
                  value={editForm.note} 
                  onChange={handleEditFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  rows={3} 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">持ち物（カンマ区切り）</label>
                <input 
                  type="text" 
                  name="items" 
                  value={editForm.items} 
                  onChange={handleEditFormChange} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white text-base" 
                  placeholder="例: 水筒, タオル" 
                />
              </div>
              
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* iOS風削除確認ダイアログ */}
      {deleteIndex !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">この予定を削除しますか？</h2>
              <p className="text-gray-500 text-sm mb-6">この操作は取り消せません</p>
              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold" 
                  onClick={() => setDeleteIndex(null)}
                >
                  キャンセル
                </button>
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold" 
                  onClick={confirmDelete}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomTabBar />
    </div>
  );
};

export default SchedulePage; 