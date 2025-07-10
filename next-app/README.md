# Soccer Manager (Next.js 13+ App Router)

## 概要
- Next.js 13+（appディレクトリ構成）
- TypeScript
- Tailwind CSS
- Supabase連携
- サッカーマネージャーアプリ雛形

## ディレクトリ構成
```
next-app/
  app/           # ルーティング/ページ
  components/    # UIコンポーネント
  lib/           # サービス・API・ユーティリティ
  public/        # 静的アセット
  styles/        # グローバルCSS
  README.md
  package.json
  next.config.js
  tsconfig.json
  ...
```

## セットアップ
```sh
cd next-app
npm install
npm run dev
```

## 備考
- SupabaseやGoogleログイン等の設定は各自で行ってください。
- 旧Vite/Capacitor版からの移植用雛形です。 