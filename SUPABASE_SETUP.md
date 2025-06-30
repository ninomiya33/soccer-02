# Supabase設定ガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクト名: `soccer-manager`
4. データベースパスワードを設定

## 2. 環境変数の設定

プロジェクトのルートディレクトリに `.env` ファイルを作成し、以下の内容を追加：

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

これらの値は、Supabaseプロジェクトの設定 > API から取得できます。

## 3. データベーステーブルの作成

Supabaseのダッシュボードで以下のSQLを実行してテーブルを作成：

```sql
-- 選手テーブル
CREATE TABLE players (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(10) NOT NULL,
  age INTEGER NOT NULL,
  height INTEGER NOT NULL,
  weight INTEGER NOT NULL,
  team VARCHAR(255) NOT NULL,
  jersey_number INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- ユーザーが自分の選手データのみアクセスできるポリシー
CREATE POLICY "Users can view own players" ON players
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own players" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own players" ON players
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own players" ON players
  FOR DELETE USING (auth.uid() = user_id);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 4. 認証設定

1. Supabaseダッシュボードで「Authentication」>「Settings」に移動
2. 「Site URL」を `http://localhost:5173` に設定
3. 「Redirect URLs」に以下を追加：
   - `http://localhost:5173`
   - `http://localhost:5173/login`

## 5. アプリケーションの起動

```bash
npm run dev
```

## 6. テスト

1. アプリケーションにアクセス
2. サインアップでアカウントを作成
3. メール確認後、ログイン
4. 選手管理ページで選手を追加・編集・削除

## 注意事項

- 本番環境では、適切なセキュリティ設定を行ってください
- 環境変数は `.gitignore` に追加して、Gitにコミットしないようにしてください
- Supabaseの無料プランには制限があります。本格的な運用では有料プランを検討してください 