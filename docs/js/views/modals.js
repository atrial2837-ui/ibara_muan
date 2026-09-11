// チャンネル情報・各種モーダル(ヘルプ / ウェルカムTip)
import { $, escapeHtml } from '../utils.js';

// ─── チャンネル情報モーダル ────────────────────────────────────────────────────

const CH_INFO = {
  main: {
    name: '茨むあん - Ibara Muan',
    handle: '@ibaramuan',
    url: 'https://www.youtube.com/@ibaramuan',
    label: '茨むあん',
    desc: '沢山寝て、沢山笑って、沢山歌うよ\n個人勢Vsinger　茨むあん(Ibara Muan)です！\n\n基本配信時間(不定期)\n火曜21:00∼定期歌枠\n日曜23:00∼いばらじお(雑談)\n\n♔活動内容\n・歌枠\n・歌ってみた\n・雑談\n・ゲーム\n\n♔キャラクターデザイン\nBeryl様(新モデル）\n【 https://twitter.com/blueberylpie 】\nゆーりか様(旧モデル)\n【 https://twitter.com/eureka_yu_rika?s=20 】\n\n♔Live2Dモデリング\nDate様\n【 https://twitter.com/date_list 】\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n\n2021/5/2　　デビュー💐\n\n#vtuber #歌枠 #karaoke',
    links: [
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>', label: 'X', url: 'https://x.com/ibaramuan' },
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>', label: 'Bluesky', url: 'https://bsky.app/profile/ibaramuan.bsky.social' },
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', label: 'BOOTH', url: 'https://ibaramuan.booth.pm' },
    ],
    avatarUrl: 'assets/avatar.jpg',
    bannerUrl: 'assets/banner.jpg',
  },
};

function _buildChCard(key) {
  const info = CH_INFO[key];
  if (!info) return '';

  // バナー部分（画像URL があれば img、なければグラデーション）
  const bannerInner = info.bannerUrl
    ? `<img class="ch-card-banner-img" src="${escapeHtml(info.bannerUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : '';

  // アバター部分（画像URL があれば img、なければ文字）
  const avatarInner = info.avatarUrl
    ? `<img class="ch-card-avatar-img" src="${escapeHtml(info.avatarUrl)}" alt="${escapeHtml(info.name)}" loading="lazy" referrerpolicy="no-referrer">`
    : '茨';

  // 説明文（改行対応）
  const descHtml = info.desc
    ? `<p class="ch-card-desc">${info.desc.split('\n').map(l => escapeHtml(l)).join('<br>')}</p>`
    : '';

  // リンク一覧
  const linksHtml = info.links?.length ? `
    <div class="ch-card-links">
      ${info.links.map(l => `
        <a class="ch-card-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
          <span class="ch-card-link-icon" aria-hidden="true">${l.icon}</span>
          <span>${escapeHtml(l.label)}</span>
        </a>`).join('')}
    </div>` : '';

  return `
    <div class="ch-card ch-card--${key}">
      <div class="ch-card-banner ch-card-banner--${key}${info.bannerUrl ? ' ch-card-banner--img' : ''}">
        ${bannerInner}
      </div>
      <div class="ch-card-body">
        <div class="ch-card-header">
          <div class="ch-card-avatar ch-card-avatar--${key}${info.avatarUrl ? ' ch-card-avatar--img' : ''}">${avatarInner}</div>
          <div class="ch-card-meta">
            <div class="ch-card-name">${escapeHtml(info.name)}</div>
            <div class="ch-card-handle">${escapeHtml(info.handle)}</div>
          </div>
        </div>
        ${descHtml}
        ${linksHtml}
        <div class="ch-card-actions">
          <a class="ch-card-yt-btn" href="${escapeHtml(info.url)}" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
            YouTubeチャンネルへ
          </a>
        </div>
      </div>
    </div>`;
}

function openChannelModal(chKey) {
  const modal = $('#ch-modal');
  const body  = $('#ch-modal-body');
  if (!modal || !body) return;

  // 単チャンネル運用: main 以外(all/undefined含む)は main のカードを表示
  const key = CH_INFO[chKey] ? chKey : 'main';
  const html = _buildChCard(key);

  body.innerHTML = html;
  modal.hidden = false;
  $('#ch-modal-close')?.focus();
}

export function initChannelModal() {
  const modal    = $('#ch-modal');
  const closeBtn = $('#ch-modal-close');
  if (!modal || !closeBtn) return;

  const close = () => { modal.hidden = true; };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  // Official Channel ボタン
  document.querySelectorAll('[data-ch-modal]').forEach(btn => {
    btn.addEventListener('click', () => openChannelModal(btn.dataset.chModal));
  });
}

export function initHelpModal() {
  const modal = $('#help-modal');
  const openBtn = $('#help-btn');
  const closeBtn = $('#help-close');
  if (!modal || !openBtn || !closeBtn) return;

  const open = () => {
    modal.hidden = false;
    closeBtn.focus();
  };
  const close = () => {
    modal.hidden = true;
    openBtn.focus();
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });
}

export function initWelcomeTip() {
  const tip = $('#welcome-tip');
  const close = $('#welcome-close');
  if (!tip || !close) return;
  if (window.matchMedia('(max-width: 760px)').matches) return;
  if (localStorage.getItem('ibara-welcome-tip-dismissed') === '1') return;
  const show = () => { tip.hidden = false; };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(show, { timeout: 5000 });
  } else {
    window.setTimeout(show, 2500);
  }
  close.addEventListener('click', () => {
    tip.hidden = true;
    localStorage.setItem('ibara-welcome-tip-dismissed', '1');
  });
}
