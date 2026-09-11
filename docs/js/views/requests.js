import { $, escapeHtml, fmtDate } from '../utils.js';
import { icon } from '../icons.js';
import { statusBadge } from './requests/status.js';

const API = '/api/song-requests';
const VOTED_KEY = 'songRequestVotes';
const OWNER_KEY = 'songRequestOwners';


/** このブラウザで投票済みのリクエストID。ログインが無いため端末ローカルで持つ。 */
function votedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || '[]').map(String));
  } catch {
    return new Set();
  }
}

function saveVotedIds(ids) {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // 保存できなくても投票自体は成立している
  }
}

/**
 * 自分が投稿したリクエストの取り消しキー。
 * { リクエストID: ownerToken } をこのブラウザだけに保存する。
 * サーバーはハッシュしか持たないため、ここを消すと自分では取り消せなくなる。
 */
function ownerTokens() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OWNER_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveOwnerToken(id, token) {
  if (!id || !token) return;
  const tokens = ownerTokens();
  tokens[String(id)] = token;
  try {
    localStorage.setItem(OWNER_KEY, JSON.stringify(tokens));
  } catch {
    // 保存できない場合は取り消しボタンが出ないだけ
  }
}

function forgetOwnerToken(id) {
  const tokens = ownerTokens();
  delete tokens[String(id)];
  try {
    localStorage.setItem(OWNER_KEY, JSON.stringify(tokens));
  } catch {
    // 何もしない
  }
}

/**
 * API 応答を JSON として読む。本文が空でも res.json() で落ちないようにする
 * （エンドポイント未デプロイ時などに Unexpected end of JSON input になるため）。
 */
async function readApiJson(res) {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error('リクエストAPIが見つかりません');
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(res.ok ? 'APIの応答を読み取れませんでした' : 'リクエストAPIが見つかりません');
  }
}

export function renderRequests() {
  const panel = $('#panel-requests');
  if (!panel) return;

  panel.innerHTML = `
    <div class="req-layout">
      <div class="card req-form-card">
        <div class="req-form-head">
          <span class="help-kicker">Request</span>
          <h2 class="req-form-title">曲リクエスト</h2>
          <p class="req-form-lead">歌ってほしい曲をこのフォームから送れます。同じ曲が「みんなのリクエスト」にすでにある場合は、重ねて送らずにその曲の「聴きたい」を押してください。</p>
        </div>
        <form id="req-form" class="req-form" novalidate>
          <div class="req-field">
            <label class="req-label" for="req-title">曲名 <span class="req-required">*</span></label>
            <input class="text-input req-input" id="req-title" name="title" type="text" placeholder="曲名を入力してください" maxlength="120" autocomplete="off" required>
          </div>
          <div class="req-field">
            <label class="req-label" for="req-artist">アーティスト</label>
            <input class="text-input req-input" id="req-artist" name="artist" type="text" placeholder="アーティスト名（任意）" maxlength="120" autocomplete="off">
          </div>
          <div class="req-field">
            <label class="req-label" for="req-url">URL</label>
            <input class="text-input req-input" id="req-url" name="url" type="url" placeholder="YouTube などの URL（任意）" maxlength="2000" autocomplete="off">
          </div>
          <div class="req-field">
            <label class="req-label" for="req-name">お名前</label>
            <input class="text-input req-input" id="req-name" name="requesterName" type="text" placeholder="ニックネーム（任意）" maxlength="40" autocomplete="off">
          </div>
          <div id="req-form-msg" class="req-msg" hidden></div>
          <button class="btn primary req-submit" id="req-submit" type="submit">
            <span class="req-submit-icon" aria-hidden="true">${icon('plus')}</span>
            <span>リクエストする</span>
          </button>
        </form>
      </div>

      <section class="card req-list-section">
        <div class="req-list-head">
          <div>
            <span class="help-kicker">Queue</span>
            <h3 class="req-list-title">みんなのリクエスト</h3>
          </div>
          <span class="req-list-note">投票数順</span>
        </div>
        <div id="req-list" class="req-list">
          <div class="state-card"><div class="spinner"></div><div class="msg">読み込み中…</div></div>
        </div>
      </section>

    </div>
  `;

  initForm();
  loadList();
}

function initForm() {
  const form = $('#req-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#req-submit');
    const msg = $('#req-form-msg');
    const title = $('#req-title').value.trim();

    if (!title) {
      showMsg(msg, '曲名を入力してください', 'error');
      $('#req-title').focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = '送信中…';
    hideMsg(msg);

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist: $('#req-artist').value.trim(),
          url: $('#req-url').value.trim(),
          requesterName: $('#req-name').value.trim(),
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました');

      // 自分の投稿として取り消せるように、返ってきたキーを保存する
      saveOwnerToken(data.item?.id, data.ownerToken);

      showMsg(msg, '✅ リクエストを送信しました！ありがとうございます', 'success');
      form.reset();
      await loadList();
    } catch (err) {
      showMsg(msg, `⚠️ ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'リクエストする';
    }
  });
}

async function loadList() {
  const list = $('#req-list');
  if (!list) return;

  try {
    // 投稿・投票・取り消しの直後に呼ばれるため、キャッシュ済みの古い一覧を掴まない
    const res = await fetch(`${API}?limit=100`, { cache: 'no-store' });
    const { items, error } = await readApiJson(res);
    if (!res.ok) throw new Error(error || '取得に失敗しました');
    renderList(list, items || []);
  } catch (err) {
    list.innerHTML = `<div class="state-card"><div class="msg">⚠️ ${escapeHtml(err.message)}</div></div>`;
  }
}

function renderList(container, items) {
  if (!items.length) {
    container.innerHTML = `
      <div class="req-empty">
        <strong>まだリクエストがありません</strong>
        <span>最初の曲を送るとここに表示されます。</span>
      </div>`;
    return;
  }

  const votes = votedIds();
  const owned = ownerTokens();

  container.innerHTML = items.map((item, index) => {
    const voted = votes.has(String(item.id));
    const isOwn = Boolean(owned[String(item.id)]);
    return `
    <div class="req-card" data-id="${item.id}">
      <span class="req-rank">${index + 1}</span>
      <div class="req-card-body">
        <div class="req-card-main">
          <span class="req-card-title">${escapeHtml(item.title)}</span>
          ${item.artist ? `<span class="req-card-artist">${escapeHtml(item.artist)}</span>` : ''}
          ${statusBadge(item.status)}
          ${isOwn ? '<span class="req-card-own">自分の投稿</span>' : ''}
        </div>
        <div class="req-card-meta">
          ${item.url ? `<a class="req-card-url" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">リンクを開く</a>` : ''}
          ${item.requesterName ? `<span class="req-card-name">by ${escapeHtml(item.requesterName)}</span>` : ''}
          ${item.createdAt ? `<span class="req-card-date">${fmtDate(item.createdAt)}</span>` : ''}
        </div>
      </div>
      <div class="req-card-actions">
        ${isOwn ? `<button class="req-delete-btn" data-delete-id="${item.id}" type="button" aria-label="自分のリクエストを取り消す" title="自分のリクエストを取り消す">${icon('close')}</button>` : ''}
        <button class="req-vote-btn${voted ? ' req-voted' : ''}" data-id="${item.id}" type="button"
          aria-label="${voted ? '聴きたいを取り消す' : '聴きたい'}"
          title="${voted ? 'もう一度押すと取り消します' : '聴きたい'}">
          <span class="req-vote-icon" aria-hidden="true">${icon('heart')}</span>
          <span class="req-vote-label">聴きたい</span>
          <span class="req-vote-count">${item.voteCount ?? item.vote_count ?? 0}</span>
        </button>
      </div>
    </div>
  `;
  }).join('');

  container.querySelectorAll('.req-vote-btn').forEach((btn) => {
    btn.addEventListener('click', () => vote(btn));
  });

  container.querySelectorAll('.req-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteOwn(btn));
  });
}

/** 自分の投稿を取り消す（保存済みの ownerToken を送ってサーバー側で照合） */
async function deleteOwn(btn) {
  if (btn.disabled) return;
  const id = btn.dataset.deleteId;
  const token = ownerTokens()[String(id)];
  if (!token) return;

  const card = btn.closest('.req-card');
  const title = card?.querySelector('.req-card-title')?.textContent || 'このリクエスト';
  if (!window.confirm(`「${title}」のリクエストを取り消しますか？`)) return;

  btn.disabled = true;
  try {
    const res = await fetch(`${API}/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerToken: token }),
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || '取り消せませんでした');

    forgetOwnerToken(id);
    await loadList();
  } catch (err) {
    btn.disabled = false;
    window.alert(`⚠️ ${err.message}`);
  }
}

/** 投票トグル。投票済みなら unvote、未投票なら vote を叩く。 */
async function vote(btn) {
  if (btn.disabled) return;
  const id = btn.dataset.id;
  btn.disabled = true;
  const count = btn.querySelector('.req-vote-count');
  const votes = votedIds();
  const voted = votes.has(String(id));

  try {
    const res = await fetch(`${API}/${id}/${voted ? 'unvote' : 'vote'}`, { method: 'POST' });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'エラー');
    const n = data.item?.voteCount ?? data.item?.vote_count;
    if (n != null) count.textContent = n;

    if (voted) {
      votes.delete(String(id));
      btn.classList.remove('req-voted');
      btn.setAttribute('aria-label', '聴きたい');
      btn.title = '聴きたい';
    } else {
      votes.add(String(id));
      btn.classList.add('req-voted');
      btn.setAttribute('aria-label', '聴きたいを取り消す');
      btn.title = 'もう一度押すと取り消します';
    }
    saveVotedIds(votes);
  } catch {
    // 失敗時は表示を変えない（次のクリックで再試行できるようにする）
  } finally {
    btn.disabled = false;
  }
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `req-msg req-msg--${type}`;
  el.hidden = false;
}

function hideMsg(el) {
  el.hidden = true;
}
