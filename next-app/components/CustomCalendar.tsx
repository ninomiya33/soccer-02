import React from 'react';

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

function getMonthDays(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(d);
  }
  return days;
}

const years = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020〜2030
const months = Array.from({ length: 12 }, (_, i) => i + 1);

export default function CustomCalendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  onYearChange,
  onMonthChange
}: {
  year: number;
  month: number;
  selectedDate?: string; // 'YYYY-MM-DD'
  onDateSelect?: (date: string) => void;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
}) {
  const days = getMonthDays(year, month);
  const rows = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  // 日付をYYYY-MM-DD形式で返す
  const getDateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div style={{ width: 320, margin: '0 auto' }}>
      {/* 年月セレクト */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <select value={year} onChange={e => onYearChange && onYearChange(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={month + 1} onChange={e => onMonthChange && onMonthChange(Number(e.target.value) - 1)}>
          {months.map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 600 }}>
        {weekDays.map((d) => (
          <div key={d} style={{ color: d === '日' ? '#ef4444' : d === '土' ? '#2563eb' : '#333' }}>{d}</div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', height: 36 }}>
          {row.map((d) => {
            const dateStr = getDateStr(d);
            const isSelected = selectedDate === dateStr;
            return (
              <div
                key={d}
                style={{
                  lineHeight: '36px',
                  background: isSelected ? '#2563eb' : undefined,
                  color: isSelected ? '#fff' : undefined,
                  borderRadius: isSelected ? 8 : undefined,
                  cursor: onDateSelect ? 'pointer' : 'default',
                  fontWeight: isSelected ? 700 : 500
                }}
                onClick={() => onDateSelect && onDateSelect(dateStr)}
              >
                {d}
              </div>
            );
          })}
          {/* 7日未満の行は空セルで埋める */}
          {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, idx) => <div key={idx + 'empty'} />)}
        </div>
      ))}
    </div>
  );
} 