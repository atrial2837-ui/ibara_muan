import{c as B,d as F,g as Y}from"./chunk-7LFO6CZV.js";import{a as k,b as z,l as E,o as N}from"./chunk-KQZQN4SK.js";import"./chunk-P5XWWZXF.js";import"./chunk-ZGMLTK2D.js";import{A as T,K as P,L as A,M as q,P as W,X as v,d as S,e as y,f as g,h as p,u as x,v as H,w as L,x as D,y as j,z as R}from"./chunk-W7UWNHP7.js";function ct(){let{songs:t,streams:a}=y.data,s=[...t].sort((b,c)=>c.count-b.count).slice(0,5),r=s[0]?.count||1,o=a.slice(0,5),l=S(),n=D(t,l),i=g("#panel-dashboard"),d=T(a,l),u=j(a).slice(-12),M=Math.max(1,...u.map(b=>b.songs)),f=`
    <div class="card dashboard-card dashboard-activity-card">
      <div class="card-title">${v("analytics")} \u4ECA\u6708\u306E\u6D3B\u52D5</div>
      <div class="dashboard-metric-list">
        <div class="activity-row">
          <span class="a-date">\u914D\u4FE1</span>
          <span class="a-meta">\u4ECA\u6708\u306E\u6B4C\u67A0\u6570</span>
          <strong>${H(a,l)}\u56DE</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">\u6B4C\u5531</span>
          <span class="a-meta">\u4ECA\u6708\u306E\u7DCF\u6B4C\u5531\u6570</span>
          <strong>${L(a,l)}\u66F2</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">\u65B0\u66F2</span>
          <span class="a-meta">\u4ECA\u6708\u306E\u521D\u62AB\u9732\u66F2\u6570</span>
          <strong>${n}\u66F2</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">\u6700\u7D42</span>
          <span class="a-meta">\u6700\u65B0\u6B4C\u67A0\u304B\u3089</span>
          <strong>${a[0]?`${P(a[0].date)}\u65E5\u524D`:"\u2014"}</strong>
        </div>
      </div>
    </div>
  `,$=`
    <div class="card dashboard-card dashboard-top-card">
      <div class="card-title">${v("rank")} TOP5 \u697D\u66F2</div>
      <div class="bar-list">
        ${s.length?s.map((b,c)=>w(b,c,r)).join(""):'<div class="empty-state">\u66F2\u30C7\u30FC\u30BF\u306A\u3057</div>'}
      </div>
    </div>
  `;i.innerHTML=`
    <div class="dashboard-grid" id="dashboard-grid">
      <div class="dashboard-overview-grid">
        ${f}
        ${$}
        <div class="card dashboard-card dashboard-genre-card">
          <div class="card-title">${v("chart")} \u30B8\u30E3\u30F3\u30EB\u5206\u5E03 <span class="pill">\u697D\u66F2\u6570</span></div>
          ${U(t)}
        </div>
        <div class="card dashboard-card dashboard-heatmap-card">
          <div class="card-title">${v("calendar")} \u914D\u4FE1\u30D2\u30FC\u30C8\u30DE\u30C3\u30D7 <span class="pill">\u76F4\u8FD11\u5E74</span></div>
          ${tt(d)}
        </div>
        <div class="card dashboard-card dashboard-monthly-card">
          <div class="card-title">${v("music")} \u6708\u5225 \u6B4C\u5531\u6570 <span class="pill">\u76F4\u8FD112\u304B\u6708</span></div>
          ${u.length?Y("chart-monthly",{class:"short"}):'<div class="empty-state">\u6708\u5225\u30C7\u30FC\u30BF\u306A\u3057</div>'}
        </div>
      </div>
      ${K()}
      ${G()}
      ${Q(a,t,o)}
    </div>
  `,J(),Z(a,t),I(),X(u);let m=i.querySelector(".heatmap-wrap");m&&(m.scrollLeft=m.scrollWidth)}function I(){let t=g("#dashboard-hits-toggle"),a=t?.closest(".dashboard-list-card");!t||!a||t.addEventListener("click",e=>{let s=e.target.closest("[data-hits-period]");if(!s)return;let r=s.dataset.hitsPeriod;a.querySelectorAll("[data-hits-list]").forEach(o=>{o.hidden=o.dataset.hitsList!==r}),t.querySelectorAll("[data-hits-period]").forEach(o=>{let l=o.dataset.hitsPeriod===r;o.classList.toggle("primary",l),o.classList.toggle("ghost",!l)})})}function G(){return`
    <div class="card dashboard-card dashboard-recap-card" id="dashboard-recap-card">
      <div class="card-title">
        ${v("chart")} \u8328\u3080\u3042\u3093\u306E\u307E\u3068\u3081
        <span class="dashboard-recap-toggle" id="dashboard-recap-toggle">
          <button class="btn ghost" type="button" data-recap-period="year" id="recap-btn-year">\u4ECA\u5E74</button>
          <button class="btn ghost" type="button" data-recap-period="month" id="recap-btn-month">\u4ECA\u6708</button>
        </span>
      </div>
      <div id="dashboard-recap-body"></div>
    </div>
  `}function O(t,a,e,s){let r=s.getFullYear(),o=s.getMonth();function l(c){let h=c.date instanceof Date?c.date:new Date(c.date);return e==="year"?h.getFullYear()===r:h.getFullYear()===r&&h.getMonth()===o}let n=t.filter(l);if(!n.length)return null;let i=n.length,d=n.reduce((c,h)=>c+(h.songs?.length||0),0),u=new Set;for(let c of n)for(let h of c.songs||[])h.key&&u.add(h.key);let M=u.size,f=new Map;for(let c of n)for(let h of c.songs||[]){if(!h.key)continue;let C=f.get(h.key)||{title:h.title,count:0};C.count++,f.set(h.key,C)}let $=null,m=0;for(let[,c]of f)c.count>m&&(m=c.count,$=c);let b=0;for(let c of a){if(!c.firstSung)continue;let h=c.firstSung instanceof Date?c.firstSung:new Date(c.firstSung);(e==="year"&&h.getFullYear()===r||e==="month"&&h.getFullYear()===r&&h.getMonth()===o)&&b++}return{streamCount:i,totalSongs:d,distinctCount:M,topSong:$,topCount:m,newSongCount:b}}function V(t,a,e){if(!t)return'<div class="empty-state">\u3053\u306E\u671F\u9593\u306E\u8A18\u9332\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093</div>';let s=t.topSong?`${p(t.topSong.title)} <span class="recap-sub">(${t.topCount}\u56DE)</span>`:"\u2014";return`
    <div class="recap-period-label">${p(a)}</div>
    <div class="recap-tiles">
      <div class="recap-tile">
        <strong>${t.streamCount}</strong>
        <span>${p(e)}\u306E\u6B4C\u67A0\u6570</span>
      </div>
      <div class="recap-tile">
        <strong>${t.totalSongs}</strong>
        <span>${p(e)}\u306E\u6B4C\u5531\u6570</span>
      </div>
      <div class="recap-tile">
        <strong>${t.distinctCount}</strong>
        <span>\u6B4C\u3063\u305F\u66F2\u306E\u7A2E\u985E</span>
      </div>
      <div class="recap-tile">
        <strong>${t.newSongCount}</strong>
        <span>${p(e)}\u306E\u521D\u62AB\u9732\u66F2</span>
      </div>
    </div>
    <div class="recap-top-song">
      ${v("rank")} \u6700\u591A\u6B4C\u5531: ${s}
    </div>
  `}function Z(t,a){let e=g("#dashboard-recap-body"),s=g("#recap-btn-year"),r=g("#recap-btn-month");if(!e)return;let o=S(),l="year";function n(d){l=d;let u=o.getFullYear(),M=o.getMonth(),$=d==="year"?`${u}\u5E74`:`${u}\u5E74 ${["1\u6708","2\u6708","3\u6708","4\u6708","5\u6708","6\u6708","7\u6708","8\u6708","9\u6708","10\u6708","11\u6708","12\u6708"][M]}`,m=O(t,a,d,o);e.innerHTML=V(m,$,d==="year"?"\u4ECA\u5E74":"\u4ECA\u6708"),s?.classList.toggle("primary",d==="year"),s?.classList.toggle("ghost",d!=="year"),r?.classList.toggle("primary",d==="month"),r?.classList.toggle("ghost",d!=="month")}n("year");let i=g("#dashboard-recap-toggle");i&&i.addEventListener("click",d=>{let u=d.target.closest("[data-recap-period]");u&&n(u.dataset.recapPeriod)})}function _(t){let a=Math.max(0,Math.floor(t)),e=Math.floor(a/3600),s=Math.floor(a%3600/60),r=a%60;return e>0?`${e}:${String(s).padStart(2,"0")}:${String(r).padStart(2,"0")}`:`${s}:${String(r).padStart(2,"0")}`}function K(){let t=k().slice(0,6);return t.length?`
    <div class="card dashboard-card dashboard-resume-card">
      <div class="card-title">${v("play")} \u7D9A\u304D\u304B\u3089\u898B\u308B
        <span class="dashboard-resume-actions">
          <button class="dashboard-resume-clear dashboard-resume-queue" id="dashboard-resume-queue" type="button" title="\u5C65\u6B74\u3092\u30AD\u30E5\u30FC\u3068\u3057\u3066\u518D\u751F">\u30AD\u30E5\u30FC\u518D\u751F</button>
          <button class="dashboard-resume-clear" id="dashboard-resume-clear" type="button" title="\u5C65\u6B74\u3092\u6D88\u53BB">\u6D88\u53BB</button>
        </span>
      </div>
      <div class="dashboard-resume-list" id="dashboard-resume-list">
        ${t.map((a,e)=>{let s=W(a.url),r=Math.floor((Date.now()-(a.updatedAt||0))/864e5),o=r<=0?"\u4ECA\u65E5":`${r}\u65E5\u524D`;return`
          <button class="dashboard-resume-item" type="button" data-resume-idx="${e}" title="${p(a.title||"")}">
            ${s?`<img class="dashboard-resume-thumb" src="${p(s)}" alt="" width="320" height="180" loading="lazy" referrerpolicy="no-referrer">`:'<div class="dashboard-resume-thumb"></div>'}
            <span class="dashboard-resume-title">${p(a.title||"\u52D5\u753B")}</span>
            <span class="dashboard-resume-meta">${v("time")} ${_(a.t)} \u304B\u3089 \u30FB ${o}</span>
          </button>`}).join("")}
      </div>
    </div>`:""}function J(){let t=g("#dashboard-resume-list");t&&(t.onclick=s=>{let r=s.target.closest("[data-resume-idx]");if(!r)return;let o=k()[Number(r.dataset.resumeIdx)];if(!o?.url)return;let l=null;o.channel!=null&&o.index!=null&&(l=(y.channelData?.combined?.streams||y.data?.streams||[]).find(i=>i.channel===o.channel&&i.index===o.index)||null),N(l||{url:o.url,title:o.title,isMv:!!o.isMv},o.t)});let a=g("#dashboard-resume-clear");a&&(a.onclick=()=>{z(),g("#panel-dashboard .dashboard-resume-card")?.remove()});let e=g("#dashboard-resume-queue");e&&(e.onclick=()=>{let s=k(),r=y.channelData?.combined?.streams||y.data?.streams||[],o=s.map((l,n)=>{let i=l.channel!=null&&l.index!=null?r.find(d=>d.channel===l.channel&&d.index===l.index):null;return i?.url?{kind:"stream",key:`${i.channel}:${i.index}`,stream:i}:l.url?{kind:"mv",key:`history:${n}`,video:{url:l.url,title:l.title||"\u52D5\u753B",isMv:!!l.isMv}}:null}).filter(Boolean);o.length&&E({name:"\u8996\u8074\u5C65\u6B74",items:o,idx:0})})}function Q(t,a,e){let s=a.filter(n=>n.daysSinceLast>=180).sort((n,i)=>i.count-n.count).slice(0,5),r=a.filter(n=>n.daysSinceLast!=null&&n.daysSinceLast<=30).sort((n,i)=>i.count-n.count).slice(0,5),o=x(t,"month",S()),l=x(t,"year",S());return`
    <div class="card dashboard-card dashboard-list-card dashboard-list-hits">
      <div class="card-title">${v("rank")} \u3088\u304F\u6B4C\u308F\u308C\u305F\u66F2
        <span class="dashboard-recap-toggle" id="dashboard-hits-toggle">
          <button class="btn primary" type="button" data-hits-period="month">\u4ECA\u6708</button>
          <button class="btn ghost" type="button" data-hits-period="year">\u4ECA\u5E74</button>
        </span>
      </div>
      <div class="bar-list" data-hits-list="month">
        ${o.length?o.slice(0,5).map((n,i)=>w(n,i,o[0].count)).join(""):'<div class="empty-state">\u4ECA\u6708\u306E\u6B4C\u5531\u5C65\u6B74\u306A\u3057</div>'}
      </div>
      <div class="bar-list" data-hits-list="year" hidden>
        ${l.length?l.slice(0,5).map((n,i)=>w(n,i,l[0].count)).join(""):'<div class="empty-state">\u4ECA\u5E74\u306E\u6B4C\u5531\u5C65\u6B74\u306A\u3057</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-list-card dashboard-list-stale">
      <div class="card-title">${v("time")} \u4E45\u3057\u3076\u308A\u306E\u66F2 <span class="pill">180\u65E5\u4EE5\u4E0A\u6B4C\u5531\u306A\u3057</span></div>
      <div class="bar-list">
        ${s.length?s.map((n,i)=>w(n,i,s[0].count)).join(""):'<div class="empty-state">\u8A72\u5F53\u306A\u3057</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-list-card dashboard-list-recent">
      <div class="card-title">${v("sparkle")} \u6700\u8FD1\u6B4C\u3063\u305F\u5B9A\u756A <span class="pill">30\u65E5\u4EE5\u5185</span></div>
      <div class="bar-list">
        ${r.length?r.map((n,i)=>w(n,i,r[0].count)).join(""):'<div class="empty-state">\u8A72\u5F53\u306A\u3057</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-recent-card">
      <div class="card-title">${v("video")} \u76F4\u8FD1\u306E\u6B4C\u67A0 <span class="pill">\u6700\u65B0${e.length}\u4EF6</span></div>
      ${e.map(n=>`
        <div class="activity-row">
          <span class="a-date">${A(n.date)}</span>
          <span class="a-title">${n.url?`<a href="${p(n.url)}" target="_blank" rel="noopener">${p(n.title||"\u914D\u4FE1")}</a>`:p(n.title)}</span>
          <span class="a-meta">${v("mic")} ${n.songs.length}\u66F2</span>
        </div>
      `).join("")}
    </div>
  `}function w(t,a,e){let s=Math.round(t.count/e*100);return`
    <div class="bar-row clickable" role="button" tabindex="0" data-songkey="${p(t.key)}" data-songtitle="${p(t.title)}" data-songartist="${p(t.artist)}">
      <div class="bar-rank">${a+1}</div>
      <div class="bar-content">
        <div class="bar-label">${p(t.title)}${t.artist?` <span class="bar-label-sep">/</span> <button class="bar-label-artist artist-search-btn" type="button" data-artist-search="${p(t.artist)}" title="\u3053\u306E\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u306E\u66F2\u3092\u7D5E\u308A\u8FBC\u3080">${p(t.artist)}</button>`:""}</div>
        <div class="bar-bar" style="width:${s}%;"></div>
      </div>
      <div class="bar-value">${t.count}</div>
    </div>
  `}function U(t){let a=new Map;for(let i of t){let d=i.genre||i.genreText||"\u672A\u5206\u985E";!d||d==="\u672A\u5206\u985E"||a.set(d,(a.get(d)||0)+1)}let e=Array.from(a.entries()).sort((i,d)=>d[1]-i[1]),s=e.reduce((i,[,d])=>i+d,0);if(!e.length)return'<div class="empty-state">\u30B8\u30E3\u30F3\u30EB\u30C7\u30FC\u30BF\u306A\u3057</div>';let r=t.length||0,o=Math.max(0,r-s),l=e[0],n=r?Math.round(l[1]/r*100):0;return`
    <div class="genre-meter" aria-label="\u30B8\u30E3\u30F3\u30EB\u5206\u5E03">
      <div class="genre-meter-track">
        ${e.map(([i,d],u)=>`
          <span class="genre-meter-segment g${u%8}" style="width:${Math.max(3,d/s*100)}%" title="${p(i)}: ${d}\u66F2"></span>
        `).join("")}
      </div>
      <div class="genre-breakdown">
        ${e.slice(0,8).map(([i,d],u)=>`
          <div class="genre-row">
            <span class="genre-dot g${u%8}"></span>
            <span class="genre-name">${p(i)}</span>
            <strong>${d}</strong>
          </div>
        `).join("")}
      </div>
      <div class="genre-insights" aria-label="\u30B8\u30E3\u30F3\u30EB\u96C6\u8A08">
        <div class="genre-insight">
          <span>\u5206\u985E\u6E08\u307F</span>
          <strong>${s}<small>\u66F2</small></strong>
        </div>
        <div class="genre-insight">
          <span>\u672A\u5206\u985E</span>
          <strong>${o}<small>\u66F2</small></strong>
        </div>
        <div class="genre-insight">
          <span>\u30B8\u30E3\u30F3\u30EB\u6570</span>
          <strong>${e.length}<small>\u7A2E</small></strong>
        </div>
        <div class="genre-insight">
          <span>${p(l[0])}</span>
          <strong>${n}<small>%</small></strong>
        </div>
      </div>
    </div>
  `}function X(t){if(!t.length)return;let a=t.map(s=>q(s.date).replace(/^\d{4}\//,"")),e=B();F("chart-monthly","line",{labels:a,datasets:[{label:"\u6B4C\u5531\u6570",data:t.map(s=>s.songs),borderColor:e.primaryStrong,backgroundColor:e.primary+"30",tension:.4,fill:!0,pointRadius:3,pointHoverRadius:5,borderWidth:2},{label:"\u6B4C\u67A0\u6570",data:t.map(s=>s.streams),borderColor:e.accent,backgroundColor:"transparent",tension:.4,fill:!1,pointRadius:2,pointHoverRadius:4,borderWidth:1.5,borderDash:[4,3],yAxisID:"y2"}]},{plugins:{legend:{display:!0,position:"top",align:"end",labels:{boxWidth:10,padding:10,font:{size:10}}}},scales:{y:{beginAtZero:!0},y2:{position:"right",beginAtZero:!0,grid:{drawOnChartArea:!1},ticks:{color:e.accentStrong,font:{size:10},precision:0}}}})}function tt(t){let e=["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"].map(r=>`<div>${r}</div>`).join(""),s=t.map(r=>r.inRange?`<div class="heatmap-cell ${R(r.value)}" title="${r.iso}: ${r.value}\u66F2"></div>`:'<div class="heatmap-cell" style="visibility:hidden"></div>').join("");return`
    <div class="heatmap-flex">
      <div class="heatmap-row-labels">${e}</div>
      <div class="heatmap-wrap"><div class="heatmap">${s}</div></div>
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
  `}export{ct as renderDashboard};
