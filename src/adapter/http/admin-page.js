/**
 * @module adapter/http/admin-page
 * @description Tailscale admin-server 用の管理 UI HTML。
 *
 * admin-server/server.js から分離。Phase 5 完了条件 (エントリの薄化) のため。
 */

/**
 * @returns {string}
 */
export function renderAdminPage() {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>茨むあん 歌枠管理</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f6fbff; color: #143045; }
    main { max-width: 1100px; margin: 0 auto; padding: 28px 18px 52px; }
    h1 { margin: 0 0 18px; font-size: 26px; }
    label { display: grid; gap: 6px; font-weight: 700; }
    input, select, textarea { box-sizing: border-box; width: 100%; border: 1px solid #b7d8ea; border-radius: 6px; padding: 10px 12px; font: inherit; background: white; }
    textarea { min-height: 260px; resize: vertical; font-family: ui-monospace, "Cascadia Mono", monospace; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .panel { background: white; border: 1px solid #d4ebf7; border-radius: 8px; padding: 18px; box-shadow: 0 8px 24px rgba(39, 126, 171, .08); margin-bottom: 18px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    button { border: 0; border-radius: 6px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
    .primary { background: #2398c7; color: white; }
    .ghost { background: #e9f6fc; color: #12506c; }
    .status { margin-top: 14px; white-space: pre-wrap; font-family: ui-monospace, "Cascadia Mono", monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 14px; }
    th, td { border-bottom: 1px solid #d9edf7; padding: 8px; text-align: left; vertical-align: top; }
    .ok { color: #12683d; }
    .warn { color: #b06a00; }
    .compact-input { min-width: 110px; padding: 7px 9px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>茨むあん 歌枠管理</h1>
    <section class="panel">
      <div class="grid">
        <label>管理トークン<input id="token" type="password" autocomplete="current-password" placeholder="ADMIN_TOKENを設定した場合だけ入力"></label>
        <label>チャンネル<select id="channel"></select></label>
        <label>配信日<input id="streamedOn" type="date"></label>
        <label>枠番号<input id="sourceIndex" type="number" min="1" placeholder="空なら自動採番"></label>
        <label>配信タイトル<input id="title" type="text"></label>
        <label>URL<input id="url" type="url" placeholder="https://..."></label>
      </div>
      <label style="margin-top:14px">曲リスト<textarea id="songsText" placeholder="曲名 / アーティスト&#10;曲名 / アーティスト | +2 | アニソン"></textarea></label>
      <div class="actions">
        <button class="ghost" id="preview">プレビュー</button>
        <button class="primary" id="submit">登録</button>
      </div>
      <div class="status" id="status"></div>
      <div id="previewBox"></div>
    </section>
    <section class="panel">
      <h2>キー・ジャンル管理</h2>
      <div class="grid">
        <label>曲検索<input id="songQuery" type="search" placeholder="曲名 / 歌手 / キー / ジャンル"></label>
        <div>
          <strong>最新キー参照</strong>
          <label style="margin-top:8px">Spreadsheet URL<input id="keySheetUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=..."></label>
          <label style="margin-top:8px">CSVファイル<input id="keyCsvFile" type="file" accept=".csv,text/csv"></label>
          <div class="actions">
            <button class="ghost" id="syncKeys" type="button">Spreadsheetから同期</button>
            <button class="ghost" id="syncKeyCsv" type="button">CSVから同期</button>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" id="searchSongs" type="button">検索</button>
      </div>
      <div class="status" id="metaStatus"></div>
      <div id="songMetaBox"></div>
    </section>
    <section class="panel">
      <h2>静的データ生成</h2>
      <p>D1の現在の内容から公開サイト用の <code>docs/data/*.json</code> を生成します。生成後はGitへコミット/PushするとPagesに反映できます。</p>
      <div class="actions">
        <button class="primary" id="generateStaticData" type="button">静的JSONを生成</button>
      </div>
      <div class="status" id="staticStatus"></div>
    </section>
  </main>
  <script>
    const $ = (id) => document.getElementById(id);
    const token = $('token');
    token.value = localStorage.getItem('adminToken') || '';
    token.addEventListener('input', () => localStorage.setItem('adminToken', token.value));
    $('streamedOn').valueAsDate = new Date();

    async function api(path, body) {
      const res = await fetch(path, {
        method: body ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json', 'x-admin-token': token.value },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    function formData() {
      return {
        channelCode: $('channel').value,
        streamedOn: $('streamedOn').value,
        sourceIndex: $('sourceIndex').value,
        title: $('title').value,
        url: $('url').value,
        songsText: $('songsText').value,
      };
    }

    function renderPreview(rows) {
      $('previewBox').innerHTML = '<table><thead><tr><th>#</th><th>曲</th><th>歌手</th><th>キー</th><th>ジャンル</th><th>判定</th></tr></thead><tbody>' +
        rows.map(row => '<tr><td>' + row.position + '</td><td>' + escapeHtml(row.title) + '</td><td>' + escapeHtml(row.artist || '') + '</td><td>' + escapeHtml(row.displayKey || '') + '</td><td>' + escapeHtml(row.genre || '') + '</td><td class="' + (row.match === 'exact' || row.match === 'title' ? 'ok' : 'warn') + '">' + row.match + '</td></tr>').join('') +
        '</tbody></table>';
    }

    function renderSongMeta(rows) {
      $('songMetaBox').innerHTML = '<table><thead><tr><th>曲</th><th>歌手</th><th>キー</th><th>ジャンル</th><th></th></tr></thead><tbody>' +
        rows.map(row => '<tr data-song-id="' + row.id + '"><td><input class="compact-input" data-field="title" value="' + escapeHtml(row.title || '') + '"></td><td><input class="compact-input" data-field="artist" value="' + escapeHtml(row.artist || '') + '"></td><td><input class="compact-input" data-field="displayKey" value="' + escapeHtml(row.display_key || '') + '"></td><td><input class="compact-input" data-field="genre" value="' + escapeHtml(row.genre || '') + '"></td><td><button class="ghost" type="button" data-save-meta>保存</button></td></tr>').join('') +
        '</tbody></table>';
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    async function loadChannels() {
      try {
        const data = await api('/api/channels');
        $('channel').innerHTML = data.channels.map(ch => '<option value="' + ch.code + '">' + ch.name + '</option>').join('');
        $('status').textContent = '';
      } catch (error) {
        $('channel').innerHTML = '';
        $('status').textContent = error.message;
      }
    }

    token.addEventListener('change', loadChannels);
    loadChannels();

    $('preview').addEventListener('click', async () => {
      $('status').textContent = 'プレビュー中...';
      try {
        const data = await api('/api/preview-stream', formData());
        renderPreview(data.songs);
        $('status').textContent = data.songs.length + '曲を確認しました。';
      } catch (error) {
        $('status').textContent = error.message;
      }
    });

    $('submit').addEventListener('click', async () => {
      if (!confirm('この歌枠をD1に登録します。よろしいですか？')) return;
      $('status').textContent = '登録中...';
      try {
        const data = await api('/api/streams', formData());
        $('status').textContent = '登録しました: stream_id=' + data.streamId + ', ' + data.songCount + '曲';
        $('previewBox').innerHTML = '';
      } catch (error) {
        $('status').textContent = error.message;
      }
    });

    $('searchSongs').addEventListener('click', async () => {
      $('metaStatus').textContent = '検索中...';
      try {
        const data = await api('/api/songs/search?q=' + encodeURIComponent($('songQuery').value));
        renderSongMeta(data.songs);
        $('metaStatus').textContent = data.songs.length + '件';
      } catch (error) {
        $('metaStatus').textContent = error.message;
      }
    });

    $('songMetaBox').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-save-meta]');
      if (!button) return;
      const row = button.closest('[data-song-id]');
      $('metaStatus').textContent = '保存中...';
      try {
        await api('/api/songs/metadata', {
          songId: row.dataset.songId,
          title: row.querySelector('[data-field="title"]').value,
          artist: row.querySelector('[data-field="artist"]').value,
          displayKey: row.querySelector('[data-field="displayKey"]').value,
          genre: row.querySelector('[data-field="genre"]').value,
        });
        $('metaStatus').textContent = '保存しました';
      } catch (error) {
        $('metaStatus').textContent = error.message;
      }
    });

    $('syncKeys').addEventListener('click', async () => {
      if (!confirm('SpreadsheetからD1のキー/ジャンルを同期します。よろしいですか？')) return;
      $('metaStatus').textContent = '同期中...';
      try {
        const data = await api('/api/key-reference/sync-url', { url: $('keySheetUrl').value });
        $('metaStatus').textContent = '同期しました: updated=' + data.updated + ', skipped=' + data.skipped + '\\ncolumns=' + JSON.stringify(data.detectedColumns);
      } catch (error) {
        $('metaStatus').textContent = error.message;
      }
    });

    $('syncKeyCsv').addEventListener('click', async () => {
      const file = $('keyCsvFile').files[0];
      if (!file) {
        $('metaStatus').textContent = 'CSVファイルを選んでください';
        return;
      }
      if (!confirm('CSVからD1のキー/ジャンルを同期します。よろしいですか？')) return;
      $('metaStatus').textContent = 'CSV同期中...';
      try {
        const data = await api('/api/key-reference/import-csv', { csvText: await file.text() });
        $('metaStatus').textContent = '同期しました: updated=' + data.updated + ', skipped=' + data.skipped + '\\ncolumns=' + JSON.stringify(data.detectedColumns);
      } catch (error) {
        $('metaStatus').textContent = error.message;
      }
    });

    $('generateStaticData').addEventListener('click', async () => {
      if (!confirm('D1の現在の内容から docs/data/*.json を生成します。よろしいですか？')) return;
      $('staticStatus').textContent = '生成中...';
      try {
        const data = await api('/api/static-data/generate', {});
        const files = Object.entries(data.files || {})
          .map(([name, bytes]) => name + ': ' + Math.round(bytes / 1024) + ' KiB')
          .join('\\n');
        $('staticStatus').textContent =
          '生成しました' +
          '\\n' + files +
          '\\n合計: ' + Math.round(data.bytes / 1024) + ' KiB' +
          '\\n曲数: ' + data.stats.repertoire +
          '\\n歌枠: ' + data.stats.streams +
          '\\n最新: ' + data.stats.updateDate +
          '\\n生成時刻: ' + data.generatedAt;
      } catch (error) {
        $('staticStatus').textContent = error.message;
      }
    });
  </script>
</body>
</html>`;
}
