# Contract Tests

Port (interface) を実装するすべての Repository / Gateway が満たすべき振る舞いを定義する **契約テスト** です。

## 概要

各 `*.contract.js` ファイルは `run<Name>Contract(label, factory)` 関数を export します。

- `label`: テスト名のプレフィックス (例: `'InMemory'`, `'D1Worker'`)
- `factory`: `async () => { repo, cleanup? }` — テスト実行ごとに新しい repo インスタンスを返す関数

## ファイル一覧

| ファイル | 対象 Port | テスト数 |
|---------|-----------|---------|
| `song-repository.contract.js` | SongRepository | 13 |
| `artist-repository.contract.js` | ArtistRepository | 9 |
| `stream-repository.contract.js` | StreamRepository | 10 |
| `stream-song-repository.contract.js` | StreamSongRepository | 9 |
| `song-channel-stats-repository.contract.js` | SongChannelStatsRepository | 11 |
| `channel-repository.contract.js` | ChannelRepository | 8 |

## 使い方

### InMemory 実装でテストする (既存)

```js
// tests/infra/in-memory/song-repository.test.js
import { runSongRepositoryContract } from '../../contract/song-repository.contract.js';
import { InMemorySongRepository } from '../../../src/infra/in-memory/in-memory-song-repository.js';

runSongRepositoryContract('InMemorySongRepository', async () => {
  const repo = new InMemorySongRepository();
  return { repo };
});
```

### 将来 D1 実装を追加する場合

新しい実装 (`D1SongRepository` など) を作成したら、同じ contract を呼ぶだけです:

```js
// tests/infra/d1/song-repository.test.js
import { runSongRepositoryContract } from '../../contract/song-repository.contract.js';
import { D1SongRepository } from '../../../src/infra/d1/d1-song-repository.js';

runSongRepositoryContract('D1SongRepository', async () => {
  const db = await createTestD1Database(); // テスト用 D1 をセットアップ
  const repo = new D1SongRepository(db);
  return {
    repo,
    cleanup: async () => { await db.exec('DELETE FROM songs'); },
  };
});
```

## 設計原則

- factory は **テストごと** に新しい空のインスタンスを返すこと (テスト間干渉を防ぐ)
- `cleanup` は後始末が必要な実装 (D1, Postgres など) でのみ提供する
- InMemory 実装は毎回 `new` するだけなので `cleanup` 不要
- ChannelRepository の factory は初期チャンネルデータ (code='new', 'old') を持つ repo を返すこと
