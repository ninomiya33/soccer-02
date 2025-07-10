'use client';
import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../pages/calendar-ios.css'; // カスタムCSS読み込み

export default function CalendarWrapper() {
  const [date, setDate] = useState(new Date());

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setDate(value);
    }
  };

  return (
    <div className="w-full flex justify-center px-4">
      <div className="calendar-ios rounded-3xl p-4 bg-white shadow-xl">
        <Calendar
          onChange={handleDateChange}
          value={date}
          calendarType="gregory"
          locale="ja-JP"
          showNeighboringMonth={true}
          next2Label={null}
          prev2Label={null}
        />
      </div>
    </div>
  );
} 