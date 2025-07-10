'use client';
import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Soccer Manager</h1>
      <p className="mb-8 text-gray-600">Next.js 13+ App Router版サッカーマネージャーアプリ雛形</p>
      <a href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow hover:bg-blue-700 transition">ダッシュボードへ</a>
    </main>
  );
} 