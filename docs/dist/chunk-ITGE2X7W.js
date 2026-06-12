import{g as $,h as M,i as S,j as x,k as H,l as k,m as j}from"./chunk-F74N3FWX.js";import{d as h,e as m}from"./chunk-4VQQINBR.js";import{a as v,c as y,d as b,g as f,i as n,n as w}from"./chunk-3CMR4JCK.js";function V(){let{songs:t,streams:s}=m.data,r=[...t].sort((o,u)=>u.count-o.count).slice(0,5),a=r[0]?.count||1,e=s.slice(0,5),l=h(),d=x(t,l),c=v("#panel-dashboard"),D=j(s,l),g=H(s).slice(-12),L=Math.max(1,...g.map(o=>o.songs)),R=`
    <div class="card dashboard-card dashboard-activity-card">
      <div class="card-title">\u{1F4C8} \u4ECA\u6708\u306E\u6D3B\u52D5</div>
      <div class="dashboard-metric-list">
        <div class="activity-row">
          <span class="a-date">\u914D\u4FE1</span>
          <span class="a-meta">\u4ECA\u6708\u306E\u6B4C\u67A0\u6570</span>
          <strong>${M(s,l)}\u56DE</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">\u6B4C\u5531</span>
          <span class="a-meta">\u4ECA\u6708\u306E\u7DCF\u6B4C\u5531\u6570</span>
          <strong>${S(s,l)}\u66F2</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">\u65B0\u66F2</span>
          <span class="a-meta">\u4ECA\u6708\u306E\u521D\u62AB\u9732\u66F2\u6570</span>
          <strong>${d}\u66F2</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">\u6700\u7D42</span>
          <span class="a-meta">\u6700\u65B0\u6B4C\u67A0\u304B\u3089</span>
          <strong>${s[0]?`${f(s[0].date)}\u65E5\u524D`:"\u2014"}</strong>
        </div>
      </div>
    </div>
  `,I=`
    <div class="card dashboard-card dashboard-top-card">
      <div class="card-title">\u{1F3C6} TOP5 \u697D\u66F2</div>
      <div class="bar-list">
        ${r.length?r.map((o,u)=>p(o,u,a)).join(""):'<div class="empty-state">\u66F2\u30C7\u30FC\u30BF\u306A\u3057</div>'}
      </div>
    </div>
  `;c.innerHTML=`
    <div class="dashboard-grid" id="dashboard-grid">
      ${A()}
      <div class="dashboard-main-stack">
        <div class="dashboard-lead">
          ${R}
          ${I}
        </div>
        <div class="card dashboard-card dashboard-monthly-card">
          <div class="card-title">\u{1F3B6} \u6708\u5225 \u6B4C\u5531\u6570 <span class="pill">\u76F4\u8FD112\u304B\u6708</span></div>
          ${z(g,L)}
        </div>
      </div>
      <div class="card dashboard-card dashboard-side-card">
        <section class="dashboard-side-section">
          <div class="card-title">\u{1F3B8} \u30B8\u30E3\u30F3\u30EB\u5206\u5E03 <span class="pill">\u697D\u66F2\u6570</span></div>
          ${O(t)}
        </section>
        <section class="dashboard-side-section">
          <div class="card-title">\u{1F4C5} \u914D\u4FE1\u30D2\u30FC\u30C8\u30DE\u30C3\u30D7 <span class="pill">\u76F4\u8FD11\u5E74</span></div>
          ${B(D)}
        </section>
      </div>
      ${N(s,t,e)}
    </div>
  `,C()}var T="ibara-muan-watch-history-v1";function _(){try{return JSON.parse(localStorage.getItem(T)||"[]")}catch{return[]}}function P(t){let s=Math.max(0,Math.floor(t)),i=Math.floor(s/3600),r=Math.floor(s%3600/60),a=s%60;return i>0?`${i}:${String(r).padStart(2,"0")}:${String(a).padStart(2,"0")}`:`${r}:${String(a).padStart(2,"0")}`}function A(){let t=_().slice(0,6);return t.length?`
    <div class="card dashboard-card dashboard-resume-card">
      <div class="card-title">\u23EF \u7D9A\u304D\u304B\u3089\u898B\u308B
        <button class="dashboard-resume-clear" id="dashboard-resume-clear" type="button" title="\u5C65\u6B74\u3092\u6D88\u53BB">\u6D88\u53BB</button>
      </div>
      <div class="dashboard-resume-list" id="dashboard-resume-list">
        ${t.map((s,i)=>{let r=w(s.url),a=Math.floor((Date.now()-(s.updatedAt||0))/864e5),e=a<=0?"\u4ECA\u65E5":`${a}\u65E5\u524D`;return`
          <button class="dashboard-resume-item" type="button" data-resume-idx="${i}" title="${n(s.title||"")}">
            ${r?`<img class="dashboard-resume-thumb" src="${n(r)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="dashboard-resume-thumb"></div>'}
            <span class="dashboard-resume-title">${n(s.title||"\u52D5\u753B")}</span>
            <span class="dashboard-resume-meta">\u23F1 ${P(s.t)} \u304B\u3089 \u30FB ${e}</span>
          </button>`}).join("")}
      </div>
    </div>`:""}function C(){let t=v("#dashboard-resume-list");t&&(t.onclick=i=>{let r=i.target.closest("[data-resume-idx]");if(!r)return;let a=_()[Number(r.dataset.resumeIdx)];if(!a?.url)return;let e=null;a.channel!=null&&a.index!=null&&(e=(m.channelData?.combined?.streams||m.data?.streams||[]).find(d=>d.channel===a.channel&&d.index===a.index)||null),window.__openStreamViewer?.(e||{url:a.url,title:a.title,isMv:!!a.isMv},a.t)});let s=v("#dashboard-resume-clear");s&&(s.onclick=()=>{try{localStorage.removeItem(T)}catch{}v("#panel-dashboard .dashboard-resume-card")?.remove()})}function N(t,s,i){let r=s.filter(d=>d.daysSinceLast>=180).sort((d,c)=>c.count-d.count).slice(0,5),a=s.filter(d=>d.daysSinceLast!=null&&d.daysSinceLast<=30).sort((d,c)=>c.count-d.count).slice(0,5),e=$(t,"month",h()),l=$(t,"year",h());return`
    <div class="card dashboard-card dashboard-list-card dashboard-list-month">
      <div class="card-title">\u{1F5F3} \u4ECA\u6708\u306E\u3088\u304F\u6B4C\u308F\u308C\u305F\u66F2 <span class="pill">\u8EFD\u91CF\u7248</span></div>
      <div class="bar-list">
        ${e.length?e.slice(0,5).map((d,c)=>p(d,c,e[0].count)).join(""):'<div class="empty-state">\u4ECA\u6708\u306E\u6B4C\u5531\u5C65\u6B74\u306A\u3057</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-list-card dashboard-list-year">
      <div class="card-title">\u{1F5F3} \u4ECA\u5E74\u306E\u3088\u304F\u6B4C\u308F\u308C\u305F\u66F2 <span class="pill">\u8EFD\u91CF\u7248</span></div>
      <div class="bar-list">
        ${l.length?l.slice(0,5).map((d,c)=>p(d,c,l[0].count)).join(""):'<div class="empty-state">\u4ECA\u5E74\u306E\u6B4C\u5531\u5C65\u6B74\u306A\u3057</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-list-card dashboard-list-stale">
      <div class="card-title">\u{1F4A4} \u4E45\u3057\u3076\u308A\u5019\u88DC <span class="pill">180\u65E5\u4EE5\u4E0A</span></div>
      <div class="bar-list">
        ${r.length?r.map((d,c)=>p(d,c,r[0].count)).join(""):'<div class="empty-state">\u5019\u88DC\u306A\u3057</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-list-card dashboard-list-recent">
      <div class="card-title">\u2728 \u6700\u8FD1\u6B4C\u3063\u305F\u5B9A\u756A <span class="pill">30\u65E5\u4EE5\u5185</span></div>
      <div class="bar-list">
        ${a.length?a.map((d,c)=>p(d,c,a[0].count)).join(""):'<div class="empty-state">\u5019\u88DC\u306A\u3057</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-recent-card">
      <div class="card-title">\u{1F4FA} \u76F4\u8FD1\u306E\u6B4C\u67A0 <span class="pill">\u6700\u65B0${i.length}\u4EF6</span></div>
      ${i.map(d=>`
        <div class="activity-row">
          <span class="a-date">${y(d.date)}</span>
          <span class="a-title">${d.url?`<a href="${n(d.url)}" target="_blank" rel="noopener">${n(d.title||"\u914D\u4FE1")}</a>`:n(d.title)}</span>
          <span class="a-meta">\u{1F3A4} ${d.songs.length}\u66F2</span>
        </div>
      `).join("")}
    </div>
  `}function p(t,s,i){let r=Math.round(t.count/i*100);return`
    <div class="bar-row clickable" data-songkey="${n(t.key)}" data-songtitle="${n(t.title)}" data-songartist="${n(t.artist)}" title="\u30AF\u30EA\u30C3\u30AF\u3067\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u7D5E\u308A\u8FBC\u307F">
      <div class="bar-rank">${s+1}</div>
      <div class="bar-content">
        <div class="bar-label">${n(t.title)} <span style="color:var(--ink-mute);font-size:11px;">/ ${n(t.artist)}</span></div>
        <div class="bar-bar" style="width:${r}%;"></div>
      </div>
      <div class="bar-value">${t.count}</div>
    </div>
  `}function O(t){let s=new Map;for(let a of t){let e=a.genre||a.genreText||"\u672A\u5206\u985E";!e||e==="\u672A\u5206\u985E"||s.set(e,(s.get(e)||0)+1)}let i=Array.from(s.entries()).sort((a,e)=>e[1]-a[1]),r=i.reduce((a,[,e])=>a+e,0);return i.length?`
    <div class="genre-meter" aria-label="\u30B8\u30E3\u30F3\u30EB\u5206\u5E03">
      <div class="genre-meter-track">
        ${i.map(([a,e],l)=>`
          <span class="genre-meter-segment g${l%8}" style="width:${Math.max(3,e/r*100)}%" title="${n(a)}: ${e}\u66F2"></span>
        `).join("")}
      </div>
      <div class="genre-breakdown">
        ${i.slice(0,8).map(([a,e],l)=>`
          <div class="genre-row">
            <span class="genre-dot g${l%8}"></span>
            <span class="genre-name">${n(a)}</span>
            <strong>${e}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `:'<div class="empty-state">\u30B8\u30E3\u30F3\u30EB\u30C7\u30FC\u30BF\u306A\u3057</div>'}function z(t,s){return t.length?`
    <div class="monthly-bars" aria-label="\u6708\u5225\u6B4C\u5531\u6570">
      ${t.map(i=>{let r=Math.max(5,Math.round(i.songs/s*100));return`
          <div class="month-bar" title="${b(i.date)}: ${i.songs}\u66F2 / ${i.streams}\u67A0">
            <div class="month-bar-track"><span style="height:${r}%"></span></div>
            <div class="month-label">${b(i.date).replace(/^\d{4}\//,"")}</div>
            <strong>${i.songs}</strong>
          </div>
        `}).join("")}
    </div>
  `:'<div class="empty-state">\u6708\u5225\u30C7\u30FC\u30BF\u306A\u3057</div>'}function B(t){let i=["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"].map(a=>`<div>${a}</div>`).join(""),r=t.map(a=>a.inRange?`<div class="heatmap-cell ${k(a.value)}" title="${a.iso}: ${a.value}\u66F2"></div>`:'<div class="heatmap-cell" style="visibility:hidden"></div>').join("");return`
    <div class="heatmap-flex">
      <div class="heatmap-row-labels">${i}</div>
      <div class="heatmap-wrap"><div class="heatmap">${r}</div></div>
    </div>
    <div class="heatmap-legend">
      \u5C11\u306A\u3081
      <div class="scale">
        <div class="heatmap-cell"></div>
        <div class="heatmap-cell l1"></div>
        <div class="heatmap-cell l2"></div>
        <div class="heatmap-cell l3"></div>
        <div class="heatmap-cell l4"></div>
      </div>
      \u591A\u3081
    </div>
  `}export{V as renderDashboard};
