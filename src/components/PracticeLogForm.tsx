import React, { useState } from "react";

const MENU_CATEGORIES = [
  { category: "全体練習", menus: ["全体練習"] },
  { category: "ドリブル教室", menus: ["ドリブル教室"] },
  { category: "シュート練習", menus: ["シュート練習"] },
  { category: "パス練習", menus: ["パス練習"] },
];

const SATISFACTION_EMOJIS = ["😄", "😐", "😞"];

export default function PracticeLogForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [totalMinutes, setTotalMinutes] = useState(90);
  const [menus, setMenus] = useState([
    { category: "ドリブル", menu: "8の字", minutes: 10 },
  ]);
  const [satisfaction, setSatisfaction] = useState("😐");
  const [comment, setComment] = useState("");

  const handleMenuChange = (idx: number, key: string, value: string | number) => {
    setMenus((prev) =>
      prev.map((m, i) =>
        i === idx ? { ...m, [key]: value } : m
      )
    );
  };

  const handleAddMenu = () => {
    setMenus((prev) => [
      ...prev,
      { category: MENU_CATEGORIES[0].category, menu: MENU_CATEGORIES[0].menus[0], minutes: 10 },
    ]);
  };

  const handleRemoveMenu = (idx: number) => {
    setMenus((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <form className="p-4 space-y-4 bg-white rounded shadow max-w-xl mx-auto">
      <div>
        <label>練習日：</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1" />
      </div>
      <div>
        <label>練習時間（分）：</label>
        <input type="number" min={0} max={300} step={1} value={totalMinutes} onChange={e => setTotalMinutes(Number(e.target.value))} className="border rounded px-2 py-1 w-24" />
      </div>
      <div>
        <label>練習メニュー：</label>
        <div className="space-y-2">
          {menus.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={m.category}
                onChange={e => {
                  const cat = e.target.value;
                  handleMenuChange(idx, "category", cat);
                  // カテゴリ変更時、メニューも初期化
                  const firstMenu = MENU_CATEGORIES.find(c => c.category === cat)?.menus[0] || "";
                  handleMenuChange(idx, "menu", firstMenu);
                }}
                className="border rounded px-2 py-1"
              >
                {MENU_CATEGORIES.map(c => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
              <select
                value={m.menu}
                onChange={e => handleMenuChange(idx, "menu", e.target.value)}
                className="border rounded px-2 py-1"
              >
                {MENU_CATEGORIES.find(c => c.category === m.category)?.menus.map(menu => (
                  <option key={menu} value={menu}>{menu}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={180}
                value={m.minutes}
                onChange={e => handleMenuChange(idx, "minutes", Number(e.target.value))}
                className="border rounded px-2 py-1 w-16"
                placeholder="分"
              />
              <button type="button" onClick={() => handleRemoveMenu(idx)} className="text-red-500">削除</button>
            </div>
          ))}
          <button type="button" onClick={handleAddMenu} className="text-blue-500">＋メニュー追加</button>
        </div>
      </div>
      <div>
        <label>満足度：</label>
        <div className="flex gap-2">
          {SATISFACTION_EMOJIS.map(emoji => (
            <label key={emoji}>
              <input
                type="radio"
                name="satisfaction"
                value={emoji}
                checked={satisfaction === emoji}
                onChange={() => setSatisfaction(emoji)}
              />
              <span className="text-2xl ml-1">{emoji}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label>今日の気づき・コメント：</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="border rounded px-2 py-1 w-full min-h-[60px]"
          placeholder="例：左足うまくいかず…でも3本入った！"
        />
      </div>
      <div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">保存</button>
      </div>
    </form>
  );
} 