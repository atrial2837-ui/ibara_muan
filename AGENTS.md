# AGENTS.md - 開発ガイドライン

## ブランチ構成

| ブランチ | 役割 |
|---------|------|
| `main` | 本番環境 |
| `develop` | 開発統合ブランチ |
| `feature/*` | 作業ごとの機能ブランチ |

### 開発フロー

```
feature/xxx ──PR──→ develop ──merge──→ main
  (作業単位)        (開発統合)      (本番リリース)
```

## ブランチ命名規則

### 基本フォーマット

```
feature/{作業内容を表す短い説明}
```

### 命名例

| ブランチ名 | 作業内容 |
|--------|---------|
| `feature/add-search-filter` | 検索フィルタ追加 |
| `feature/fix-admin-ui` | 管理画面UI修正 |
| `feature/add-ranking-api` | ランキングAPI追加 |
| `feature/update-theme` | テーマ更新 |
| `feature/fix-timeline-sort` | タイムラインソート修正 |

### ルール

- 全て小文字
- 単語間は `-` で区切る
- 簡潔で具体的な名前をつける
- 作業が明確に伝わる名前にする

## 作業手順

1. `develop` から `feature/*` ブランチを作成
2. 作業完了後、`develop` にPRを作成
3. レビュー・マージ後、`feature/*` ブランチを削除
4. リリース時に `develop` → `main` にマージ

## ディレクトリ構成

### `src/` - アプリケーションソースコード

クリーンアーキテクチャに基づいた構成。

| フォルダ | 役割 |
|---------|------|
| `domain/` | ビジネスロジック（検索、分析、曲、ストリーム等） |
| `usecase/` | ユースケース（アプリケーションの操作単位） |
| `adapter/` | 外部との入出力（HTTP、CSV、スプレッドシート等） |
| `infra/` | インフラ実装（D1 REST API、インメモリ、スプレッドシート等） |

### `tests/` - テストコード

`src/` と同じ構造でテストファイルを配置。

| フォルダ | 役割 |
|---------|------|
| `adapter/` | アダプタのテスト |
| `contract/` | リポジトリのコントラクトテスト |
| `domain/` | ドメインロジックのテスト |
| `functions/` | Cloudflare Pages Functions のテスト |
| `infra/` | インフラのテスト |
| `usecase/` | ユースケースのテスト |

### `docs/` - 静的フロントエンド

本番で配信される静的ファイル。

| フォルダ | 役割 |
|---------|------|
| `css/` | スタイルシート |
| `js/` | フロントエンドJavaScript |
| `data/` | 静的データ（ビルド時に生成） |
| `dist/` | ビルド成果物 |
| `assets/` | フォント等のアセット |

### `functions/` - Cloudflare Pages Functions

APIエンドポイント。サーバーサイドの処理。

### `d1/` - D1データベースマイグレーション

D1（Cloudflareのデータベース）用のSQLファイル。

### `supabase/` - Supabase

Supabase用のスキーマ・SQLファイル。

### `SoT/` - Source of Truth

プロジェクトの設計ドキュメント。

| ファイル | 内容 |
|---------|------|
| `00_overview.md` | 概要 |
| `01_frontend.md` | フロントエンド設計 |
| `02_pages_functions.md` | Pages Functions 設計 |
| `03_admin_server.md` | 管理サーバー設計 |
| `04_data_model.md` | データモデル |
| `10_domain_candidates.md` | ドメイン候補 |
| `20_target_architecture.md` | 目標アーキテクチャ |
| `30_implementation_status.md` | 実装状況 |

### `tools/` - ユーティリティスクリプト

開発・運用補助用のスクリプト（データ生成、インポート等）。

### `.github/workflows/` - GitHub Actions

CI/CDワークフロー。静的データの自動更新。
