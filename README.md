# 茨むあん 歌唱データベース

茨むあんさんの歌枠で歌われた曲をまとめるファンメイド歌唱データベースです。公開フロントエンドは `docs/`、管理APIは Cloudflare Pages Functions、データベースは Cloudflare D1 を使います。

## 現在の方針

- 対象チャンネルは `main` の1チャンネルだけです。
- 元データは Google Sheets の「茨むあん　歌唱データベース」で集計します。
- 集計後は管理画面または変換スクリプト経由で D1 に投入し、管理画面の静的データ生成ボタンから `docs/data/*.json` を更新します。
- 古いローカル管理サーバー `admin-server/` は削除済みです。Pages 上の `docs/admin.html` と GitHub Actions 連携を使います。

## スプレッドシート

データソース:

```text
https://docs.google.com/spreadsheets/d/1supVLmIOoa3fdwvT_NHioLefjsa-ldQBQCMhZakKD-o/edit
```

主に使うタブ:

- `歌唱ログ`: 1行=1曲の歌唱ログ。配信日、URL、枠タイトル、曲順、曲名、アーティスト名、キー、ジャンルを入力します。
- `曲マスター`: 表記を確定した曲名・アーティスト名・ジャンル・キーを管理します。
- `表記ゆれ候補`: 同一曲か迷う候補を一時的に置きます。
- `ジャンル一覧`: 入力候補です。

おすすめ運用:

1. 歌枠ごとに `歌唱ログ` へ曲順付きで入力します。
2. `重複チェック` に出た行を確認します。
3. 表記ゆれは `曲マスター` で正規表記を決めます。
4. まとまった単位で D1 へ登録します。
5. `docs/admin.html` の「静的データ生成を開始」で公開用JSONを更新します。

## D1 初期化

新しい D1 を作ったら、Cloudflare D1 Console などで次を実行します。

```sql
-- d1/init_ibara_muan.sql
```

このSQLは `channels` に `main / 茨むあん` を作り、`songs.display_key` と `songs.genre` も最初から含めます。

## Cloudflare Pages 設定

### STG (`stg-rp` ブランチ)

このブランチは STG 用です。Pages の Preview / STG 環境では、本番とは別の D1 を `DB` に bind してください。

管理画面から静的データ生成を起動する場合の既定値:

```text
GITHUB_STATIC_REF=stg-rp
GITHUB_STATIC_ENV=staging
```

STG 用の GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN_STG
CLOUDFLARE_ACCOUNT_ID_STG
CLOUDFLARE_D1_DATABASE_ID_STG
```

STGサイトは検索除外 (`noindex,nofollow`) 設定です。

### 共通

D1 binding:

```text
DB
```

管理画面から GitHub Actions を起動するための Pages 環境変数:

```text
GITHUB_ACTIONS_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_STATIC_WORKFLOW=update-static-data.yml
GITHUB_STATIC_REF=main
GITHUB_STATIC_ENV=production
ADMIN_TOKEN
KEY_REFERENCE_CSV_URL
```

GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_D1_DATABASE_ID
```

## 確認

```powershell
npm test
python -m http.server 8788 -d docs
```

ローカル確認:

```text
http://localhost:8788/
http://localhost:8788/admin.html
```

公開後の確認:

```text
https://サイトURL/api/data
https://サイトURL/admin.html
```
