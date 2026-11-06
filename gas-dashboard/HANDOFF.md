# 引き継ぎメモ：通知表・定期テスト分析ダッシュボード（Apps Script版）

## 目的
Claudeを使っていない社員が、URLを開くだけで見られる成績分析ダッシュボード。
元は Claude のアーティファクト（https://claude.ai/artifact/BPeth6cX3k25evJc2XQfzV）。これを Apps Script のウェブアプリに移植した。

## アカウントと権限
- 作成・公開は `tosemi.nonaka@gmail.com`。
- データ元の2つのスプレッドシートの所有者は `nonaka@tosemi.in`。`tosemi.nonaka@gmail.com` に共有済み。
  - 通知表：`1l35XL4-sgy0nQQExQ3FwqAC-SWsZ1JN_PJC8IAEUFWQ`（シート 中1・中2・中3）
  - 定期テスト：`17DDsuCOSeC4cCDrASf7F9TSpp8xvCJZe4iWCVr-5_8s`（シート 中1・中2・中3）
- 生徒の成績を含むため、アクセスは「Googleアカウントを持つ全員」まで。匿名公開にしない。
- 合言葉はスクリプトプロパティ `ACCESS_CODE`（値はここには書かない。登録は任意だが推奨）。

## ファイル（リポジトリ `nonaka-kochance/tosemi`、ブランチ `claude/practical-tesla-u1di1s`、フォルダ `gas-dashboard/`）
- `Code.gs`：`doGet`、`needsCode`、`getRaw(code)`（6つの表を `getDisplayValues` で返す）、`selfTest`。データ範囲は `SOURCES` に定義。
- `Index.html`：画面と集計のすべて。d3 v7.9.0 を cdnjs から読み込む。
- `appsscript.json`：権限は `https://www.googleapis.com/auth/spreadsheets`（`.readonly` では `openById` が動かない）。実行ユーザーは `USER_DEPLOYING`、アクセスは `ANYONE`。
- `README.md`（設置手順）、`GEMINI_INSTRUCTIONS.md`（Gemini向け指示書）。

## 作りの要点
- 元アーティファクトの画面・集計コードをほぼそのまま移植した。`Index.html` 冒頭の小さな実行基盤 `window.dash` が、元の `dash.loader / calc / data / draw / onData / params` を再現している。
- 集計はすべてブラウザ側。サーバーは生データを返すだけ。
- 3タブ：通知表、定期テスト、科目追加候補（通知表で見る／定期テストで見る、基準点 60・70・80）。
- 科目追加候補の判定（2026-11-06 変更）：学年で一律に決めず、生徒ごと・教科ごとに成績がある直近2回を使う（`perStudentCand`）。
  - さかのぼるのは学年の最新の成績から1年半（18か月）前まで。時期は通知表・テストの見出しから月を推定（`mon`）。
  - 空白は0点にしない。2学期制の通知表は前期が「2学期」、後期が「学年末」の列。
  - 2回必要なのに1回しかない生徒は候補に入れず「参考」として別に数える。通知表の中1は直近1回、定期テストの中1は2回で判定。
- 教室名の表記ゆれ（大文字小文字、＋と+）は読み込み時にそろえる。

## 現在の状況（2026-11-05）
- 完了：Apps Script プロジェクトの作成、3ファイルの貼り付け、`selfTest` 成功（6つの表がすべて読めた）。
  - g1〜g3：400行 × 90 / 83 / 86列、t1〜t3：400行 × 55 / 81 / 86列。
- 動作確認：架空データでの画面テストは済み。実データでの画面確認は未了。
- 未了：ウェブアプリのデプロイ、URLを開いての確認、社員への共有。

## 次にやること
1. 「デプロイ」→「新しいデプロイ」→ ウェブアプリ（実行：自分、アクセス：Googleアカウントを持つ全員）。
2. URLを開き、3タブの表示・学年と教室の切り替え・数値を元のダッシュボードと見比べる。
3. `ACCESS_CODE` を登録し、URLと合言葉を社員に共有する。
4. コード更新時は「デプロイを管理」→ 編集 → 新バージョンで反映する。

## 注意点・ハマりどころ
- `Index.html` を TextEdit(Mac) で開くと表示結果になり、コピーできない。設定で「HTMLファイルをHTMLコードとして表示」をオンにするか、`.txt` にして開く。
- 初回の読み込みは10〜20秒かかる。
- 通知表・定期テストのシートの列構成（見出しの形式）を変えると、読み込みが壊れる。
- 私（Claude）のDriveコネクタでは Apps Script 形式のファイルを作れない。プロジェクト作成と貼り付けは手作業か clasp で行う。
