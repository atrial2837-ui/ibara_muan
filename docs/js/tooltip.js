/**
 * @module tooltip
 * @description data-tooltip の自動配置ポップアップ。
 *
 * 従来の CSS ::after 方式は「下固定・中央寄せ」のため、画面端ではみ出し・
 * 先祖の overflow/stacking context による欠けが多発した。代わりに単一の
 * fixed 要素を使い、表示位置をその場で決める。
 *   - 下に余白があれば下、なければ上(自動反転)
 *   - 横はビューポート内に収める
 *   - fixed のため先祖の overflow:hidden の影響を受けない
 *   - data-tooltip-pos 属性は旧方式の名残。無視する(後方互換のため残置)
 */
const MARGIN = 8;
const GAP = 6;

let tip = null;

function ensureTip() {
  if (tip) return tip;
  tip = document.createElement('div');
  tip.className = 'global-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);
  return tip;
}

function hideTip() {
  if (tip) tip.hidden = true;
}

function showFor(el) {
  const text = el.getAttribute('data-tooltip');
  if (!text) return;
  const node = ensureTip();
  // textContent への代入でエスケープされる (innerHTML は使わない)
  node.textContent = text;
  node.hidden = false;
  node.style.visibility = 'hidden';

  const r = el.getBoundingClientRect();
  const tw = node.offsetWidth;
  const th = node.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 縦: 下が入らなければ上へ。それでも入らなければ下(スクロールで見える側)。
  let top = r.bottom + GAP;
  if (top + th + MARGIN > vh && r.top - th - GAP - MARGIN >= 0) {
    top = r.top - th - GAP;
  }
  // 横: ビューポート内に収める。
  const left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - tw / 2, vw - tw - MARGIN));

  node.style.left = `${Math.round(left)}px`;
  node.style.top = `${Math.round(top)}px`;
  node.style.visibility = '';
}

function targetOf(event) {
  const el = event.target instanceof Element ? event.target.closest('[data-tooltip]') : null;
  return el;
}

export function initTooltip() {
  // mouseover は子要素間でも発火するため、ボタン外からの侵入だけ扱う
  document.addEventListener('mouseover', (e) => {
    const el = targetOf(e);
    if (!el) return;
    if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
    showFor(el);
  });
  document.addEventListener('mouseout', (e) => {
    const el = targetOf(e);
    if (!el) return;
    if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
    hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const el = targetOf(e);
    if (el) showFor(el);
  });
  document.addEventListener('focusout', () => hideTip());
  // スクロール・リサイズ・操作後は位置がずれるので消す
  document.addEventListener('scroll', hideTip, { capture: true, passive: true });
  window.addEventListener('resize', hideTip);
  document.addEventListener('click', (e) => {
    if (targetOf(e)) hideTip();
  }, { capture: true });
}
