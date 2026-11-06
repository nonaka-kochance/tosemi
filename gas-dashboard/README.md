# 通知表・定期テスト分析ダッシュボード（Apps Script 版）

Claude を使っていない社員でも、URL を開くだけで見られる Web アプリです。
データ元は Google スプレッドシート「通知表」「定期テスト」（`Code.gs` 冒頭の `SOURCES`）。

## 設置手順（tosemi.nonaka@gmail.com で実施・約5分）

1. 「通知表」「定期テスト」の2つのスプレッドシートを、`tosemi.nonaka@gmail.com` に**閲覧者**として共有する。
2. `tosemi.nonaka@gmail.com` でログインして https://script.google.com を開き、「新しいプロジェクト」を作成。名前は「通知表・定期テスト分析」など。
3. 左の「プロジェクトの設定」→「『appsscript.json』マニフェスト ファイルをエディタで表示する」にチェック。
4. エディタで次の3ファイルの中身を、このフォルダのファイルで置き換え／追加する。
   - `Code.gs`（既存の `コード.gs` の中身を置き換え）
   - `Index.html`（「＋」→ HTML → 名前を `Index` にして作成）
   - `appsscript.json`
5. （推奨）「プロジェクトの設定」→「スクリプト プロパティ」で `ACCESS_CODE` に合言葉を登録。社員にはこの合言葉を伝える。生徒の成績が含まれるため推奨。
6. 関数 `selfTest` を選んで「実行」→ 権限を承認。ログに6つの表の行数・列数が出れば OK。
7. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**Google アカウントを持つ全員**
   → 発行された URL を社員に共有。

コードを更新したら「デプロイを管理」→ 編集 → バージョン「新バージョン」で反映。

### clasp を使う場合
```bash
npm i -g @google/clasp && clasp login      # gmail アカウントでログイン
cd gas-dashboard && clasp create --type webapp --title "通知表・定期テスト分析" --rootDir .
clasp push -f && clasp deploy
```
