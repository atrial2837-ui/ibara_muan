import{l as ut,o as R}from"./chunk-KQZQN4SK.js";import"./chunk-P5XWWZXF.js";import{a as ot,b as dt,c as A}from"./chunk-ZGMLTK2D.js";import{L as D,N as k,O as U,P as L,Q as V,X as b,e as z,f as y,h as i}from"./chunk-W7UWNHP7.js";var ft="ibara-music-videos-cache-v2",Ft='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>',T="grid",h=null,j=null,q=!1,K="",pt=null,B=!1,x=new Set,bt=()=>!1,X=()=>{};function vt({isActive:t,openAddModal:e}){t&&(bt=t),e&&(X=e)}function ht(){if(h===null){let t=N();t.length&&(h=t)}return et(h||[])}async function gt(){if(h!==null){J();return}h=N(),q=!0,J();let t=await xt();q=!1,h=Array.isArray(t)?t:[],J()}function yt(t){if(h!==null)return!0;let e=N();return e.length?(h=e,!0):(xt().then(s=>{h===null&&(h=Array.isArray(s)?s:[]),t?.()}),!1)}function F(){return h||[]}function $t(t){K=t||""}function C(t){if(!t?.startsWith("mv:"))return null;let e=t.slice(3);return(h||[]).find(s=>s.id===e)||null}function H(t){switch(t.type){case"cover":return{label:"\u30AB\u30D0\u30FC",cls:"mv-badge-cover",sub:t.originalArtist||"\u30AB\u30D0\u30FC\u66F2"};case"sugarily":return{label:"\u3057\u3085\u304C\u308A\u308A",cls:"mv-badge-sugarily",sub:"\u3057\u3085\u304C\u308A\u308A"};case"character":return{label:"\u30AD\u30E3\u30E9",cls:"mv-badge-character",sub:t.character||"\u30AD\u30E3\u30E9\u30BD\u30F3"};default:return{label:"\u30AA\u30EA\u30B8\u30CA\u30EB",cls:"mv-badge-original",sub:"\u8328\u3080\u3042\u3093"}}}function wt(t){let e=t.target.closest("[data-music-view]:not([data-music-select-toggle])");if(e)return T=e.dataset.musicView,O(),!0;if(t.target.closest("[data-music-select-toggle]"))return B=!B,B||x.clear(),Z(),!0;let s=t.target.closest("[data-mv-select]");if(s){let l=s.dataset.mvSelect,r=!x.has(l);r?x.add(l):x.delete(l);let c=s.classList.contains("mv-list-row")?s:s.closest(".mv-card");c&&c.classList.toggle("is-selected",r);let m=c?.querySelector(".mv-card-checkbox, .mv-list-checkbox");return m&&(m.innerHTML=r?b("check"):""),s.setAttribute("aria-pressed",String(r)),Wt(),!0}if(t.target.closest("[data-music-select-all]"))return G(h||[]).forEach(({v:l})=>x.add(l.id)),Z(),!0;if(t.target.closest("[data-music-select-clear]"))return x.clear(),Z(),!0;if(t.target.closest("[data-music-select-add]")){if(!x.size)return!0;let l=[...h||[]].filter(r=>x.has(r.id)).map(r=>"mv:"+r.id);return X(l),!0}let a=t.target.closest("[data-playlist-add-mv]");if(a){let l=a.dataset.playlistAddMv,r=a.dataset.streamTitle||"";return X("mv:"+l,r),!0}let n=t.target.closest("[data-mv-watch]");if(n&&h?.length){if(t.metaKey||t.ctrlKey||t.shiftKey||t.button===1)return!0;t.preventDefault();let l=h[Number(n.dataset.mvWatch)];return l?.url&&R({url:l.url,title:l.title,isMv:!0}),!0}return!1}function tt(t,{immediate:e=!1}={}){let s=t.target.closest("#pl-music-search");return s?(K=s.value||"",clearTimeout(pt),e?O():pt=setTimeout(O,100),!0):!1}function J(){if(!bt())return;let t=y("#pl-subtab-body");t&&(y("#pl-music-search")?O():t.innerHTML=et(h||[]))}function et(t){return Nt(t)+`<div id="pl-music-results">${Mt(t)}</div>`}function Nt(t){let e=st(),a=G(t).length;return`
    <div class="pl-music-viewbar">
      <label class="pl-music-search-wrap">
        <span class="pl-music-search-icon" aria-hidden="true">${b("search")}</span>
        <input id="pl-music-search" class="pl-music-search" type="search"
          value="${i(e)}"
          placeholder="\u66F2\u540D / \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u3067\u691C\u7D22"
          aria-label="\u6B4C\u307F\u305F\u30FB\u30AA\u30EA\u66F2\u3092\u691C\u7D22">
      </label>
      <span class="pl-music-count">${a}${a===t.length?"":` / ${t.length}`}\u4EF6</span>
      <div class="pl-music-views">
        <button class="pl-music-view-btn${T==="grid"?" active":""}" data-music-view="grid"     type="button">\u30B0\u30EA\u30C3\u30C9</button>
        <button class="pl-music-view-btn${T==="list"?" active":""}" data-music-view="list"     type="button">\u30EA\u30B9\u30C8</button>
        <button class="pl-music-view-btn${T==="category"?" active":""}" data-music-view="category" type="button">\u30AB\u30C6\u30B4\u30EA</button>
        <button class="pl-music-view-btn pl-music-select-toggle${B?" active":""}" data-music-select-toggle="1" type="button" ${a?"":"disabled"} data-tooltip="\u8907\u6570\u9078\u629E\u3057\u3066\u307E\u3068\u3081\u3066\u8FFD\u52A0">${b("checkbox")} \u9078\u629E</button>
      </div>
    </div>
    ${B?Gt():""}`}function Gt(){let t=x.size;return`
    <div class="pl-music-selbar">
      <span class="pl-music-selcount" id="pl-music-selcount">${t}\u66F2\u3092\u9078\u629E\u4E2D</span>
      <div class="pl-music-selactions">
        <button class="pl-sel-btn" data-music-select-all="1" type="button">\u8868\u793A\u4E2D\u3092\u3059\u3079\u3066\u9078\u629E</button>
        <button class="pl-sel-btn" data-music-select-clear="1" type="button" ${t?"":"disabled"}>\u9078\u629E\u89E3\u9664</button>
        <button class="pl-sel-btn primary" data-music-select-add="1" type="button" ${t?"":"disabled"}>${b("plus")} ${t}\u66F2\u3092\u307E\u3068\u3081\u3066\u8FFD\u52A0</button>
        <button class="pl-sel-btn" data-music-select-toggle="1" type="button">\u5B8C\u4E86</button>
      </div>
    </div>`}function Mt(t){let e=G(t);return q&&!t.length?'<div class="pl-empty-state"><p>\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</p><p class="pl-empty-hint">\u691C\u7D22\u6B04\u306F\u3053\u306E\u307E\u307E\u5165\u529B\u3067\u304D\u307E\u3059</p></div>':t.length?e.length?T==="grid"?mt(e):T==="list"?Xt(e):T==="category"?te(e):mt(e):q?`<div class="pl-empty-state"><p>\u6700\u65B0\u30C7\u30FC\u30BF\u3092\u78BA\u8A8D\u4E2D\u2026</p><p class="pl-empty-hint">\u300C${i(st())}\u300D\u306E\u5019\u88DC\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059</p></div>`:'<div class="pl-empty-state"><p>\u4E00\u81F4\u3059\u308B\u52D5\u753B\u304C\u3042\u308A\u307E\u305B\u3093</p><p class="pl-empty-hint">\u300C\u66F2\u540D / \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u300D\u306E\u3088\u3046\u306B\u533A\u5207\u3063\u3066\u691C\u7D22\u3067\u304D\u307E\u3059</p></div>':'<div class="pl-empty-state"><p>\u52D5\u753B\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093</p><p class="pl-empty-hint">\u7BA1\u7406\u753B\u9762\u304B\u3089\u767B\u9332\u3067\u304D\u307E\u3059</p></div>'}function st(){let t=y("#pl-music-search");return t&&(K=t.value||""),K}function Z(){let t=y("#pl-subtab-body");t&&(t.innerHTML=et(h||[]))}function Wt(){let t=x.size,e=y("#pl-music-selcount");e&&(e.textContent=`${t}\u66F2\u3092\u9078\u629E\u4E2D`);let s=document.querySelector("[data-music-select-add]");s&&(s.disabled=!t,s.innerHTML=`${b("plus")} ${t}\u66F2\u3092\u307E\u3068\u3081\u3066\u8FFD\u52A0`);let a=document.querySelector("[data-music-select-clear]");a&&(a.disabled=!t)}function O(){let t=h||[],e=y(".pl-music-count");if(e){let a=G(t).length;e.textContent=`${a}${a===t.length?"":` / ${t.length}`}\u4EF6`}document.querySelectorAll("[data-music-view]").forEach(a=>{a.classList.toggle("active",a.dataset.musicView===T)});let s=y("#pl-music-results");s&&(s.innerHTML=Mt(t))}function N(){try{let t=JSON.parse(localStorage.getItem(ft)||"null");return Array.isArray(t?.videos)?t.videos:[]}catch{return[]}}function Qt(t){try{localStorage.setItem(ft,JSON.stringify({videos:t,cachedAt:Date.now()}))}catch{}}async function xt(){return j||(j=fetch("/data/music.json",{cache:"no-store"}).then(t=>t.ok?t.json():Promise.reject(new Error(`music.json ${t.status}`))).then(t=>{let e=Array.isArray(t?.videos)?t.videos:[];return Qt(e),e}).catch(()=>h||N()),j)}function St(t){return String(t||"").normalize("NFKC").toLowerCase().replace(/[！-～]/g,e=>String.fromCharCode(e.charCodeAt(0)-65248)).replace(/[‐-‒–—―ー]/g,"-").replace(/\s+/g," ").trim()}function Ut(t){return St(t).split(/[\/／|｜\s]+/).map(e=>e.trim()).filter(Boolean)}function Jt(t){let e=t.title||"",s=e.split(/[\/／|｜]/).map(n=>n.trim()).filter(Boolean),a=H(t).label;return St([e,...s,t.originalArtist,t.character,t.type,a].filter(Boolean).join(" "))}function G(t){let e=Ut(st()),s=t.map((a,n)=>({v:a,i:n}));return e.length?s.filter(({v:a})=>{let n=Jt(a);return e.every(l=>n.includes(l))}):s}function Y(t){return t.publishedAt?String(t.publishedAt).replaceAll("-","/"):"\u516C\u958B\u65E5\u672A\u767B\u9332"}function _t(t,e){let s=V(t.url),a=L(t.url),{label:n,cls:l}=H(t),r=A("mv:"+t.id);if(B){let c=x.has(t.id);return`
    <div class="mv-card mv-card--select${c?" is-selected":""}">
      <button class="mv-card-thumb-btn" type="button" data-mv-select="${i(t.id)}" aria-pressed="${c}">
        ${s?`<img class="mv-card-thumb" src="${i(s)}" data-fallback="${i(a)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="mv-card-thumb mv-card-thumb-placeholder"></div>'}
        <span class="mv-card-checkbox">${c?b("check"):""}</span>
        <span class="mv-type-badge ${l}">${n}</span>
      </button>
      <div class="mv-card-info">
        <span class="mv-card-title">${i(t.title||"\u2014")}</span>
        <span class="mv-card-sub">${i(Y(t))}</span>
      </div>
    </div>`}return`
    <div class="mv-card">
      <a class="mv-card-thumb-btn" href="${i(t.url||"#")}" target="_blank" rel="noopener"
        data-mv-watch="${e}" aria-label="\u52D5\u753B\u30D3\u30E5\u30FC\u30EF\u30FC\u3067\u898B\u308B">
        ${s?`<img class="mv-card-thumb" src="${i(s)}" data-fallback="${i(a)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="mv-card-thumb mv-card-thumb-placeholder"></div>'}
        <span class="mv-card-play-icon">${b("play")}</span>
        <span class="mv-type-badge ${l}">${n}</span>
      </a>
      <button class="pl-sg-add mv-add-btn mv-add-btn--overlay${r?" is-saved":""}" type="button"
        data-playlist-add-mv="${i(t.id)}"
        data-stream-title="${i(t.title||"")}"
        aria-label="${r?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0"}"
        title="${r?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0"}">${Ft}</button>
      <div class="mv-card-info">
        <span class="mv-card-title">${i(t.title||"\u2014")}</span>
        <span class="mv-card-sub">${i(Y(t))}</span>
      </div>
    </div>`}function Zt(t,e){let s=V(t.url),a=L(t.url),{label:n,cls:l,sub:r}=H(t),c=A("mv:"+t.id);if(B){let m=x.has(t.id);return`
    <div class="mv-list-row mv-list-row--select${m?" is-selected":""}" data-mv-select="${i(t.id)}" role="button" aria-pressed="${m}">
      <span class="mv-list-checkbox">${m?b("check"):""}</span>
      <span class="mv-list-thumb">
        ${s?`<img src="${i(s)}" data-fallback="${i(a)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:""}
      </span>
      <div class="mv-list-info">
        <span class="mv-list-title">${i(t.title||"\u2014")}</span>
        <span class="mv-list-sub">${i(Y(t))}</span>
      </div>
      <span class="mv-type-badge ${l}">${n}</span>
    </div>`}return`
    <div class="mv-list-row">
      <a class="mv-list-thumb" href="${i(t.url||"#")}" target="_blank" rel="noopener" aria-label="YouTube\u3067\u958B\u304F">
        ${s?`<img src="${i(s)}" data-fallback="${i(a)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:""}
      </a>
      <div class="mv-list-info">
        <span class="mv-list-title">${i(t.title||"\u2014")}</span>
        <span class="mv-list-sub">${i(Y(t))}</span>
      </div>
      <span class="mv-type-badge ${l}">${n}</span>
      <button class="mv-add-btn${c?" is-saved":""}" type="button"
        data-playlist-add-mv="${i(t.id)}"
        data-stream-title="${i(t.title||"")}"
        title="${c?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0"}">${b("bookmark")}</button>
    </div>`}function mt(t){return`<div class="mv-grid">${t.map(({v:e,i:s})=>_t(e,s)).join("")}</div>`}function Xt(t){return`<div class="mv-list">${t.map(({v:e,i:s})=>Zt(e,s)).join("")}</div>`}function te(t){return`
    <div class="mv-category">
      ${[{key:"original",label:"\u30AA\u30EA\u30B8\u30CA\u30EB\u66F2\uFF08\u500B\u4EBA\uFF09"},{key:"sugarily",label:"\u3057\u3085\u304C\u308A\u308A"},{key:"character",label:"\u30AD\u30E3\u30E9\u30BD\u30F3 / \u58F0\u512A\u30AA\u30EA\u66F2"},{key:"cover",label:"\u30AB\u30D0\u30FC\u66F2\uFF08\u6B4C\u307F\u305F\uFF09"}].map(({key:s,label:a})=>({label:a,items:t.filter(({v:n})=>n.type===s)})).filter(({items:s})=>s.length>0).map(({label:s,items:a})=>`
      <div class="mv-cat-section">
        <h3 class="mv-cat-heading">${s} <span class="mv-cat-count">${a.length}</span></h3>
        <div class="mv-grid">${a.map(({v:n,i:l})=>_t(n,l)).join("")}</div>
      </div>`).join("")}
    </div>`}var at=24,ee='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>',se=[{key:"newest",label:"\u65B0\u3057\u3044\u9806"},{key:"oldest",label:"\u53E4\u3044\u9806"},{key:"most-songs",label:"\u66F2\u6570\u2193"},{key:"fewest-songs",label:"\u66F2\u6570\u2191"}],W=1,nt="newest",Lt=()=>{};function At({rerender:t}){t&&(Lt=t)}function Tt(){W=1}function ae(t,e){let s=t.slice();return e==="oldest"?s.reverse():e==="most-songs"?s.sort((a,n)=>(n.songs?.length??0)-(a.songs?.length??0)):e==="fewest-songs"?s.sort((a,n)=>(a.songs?.length??0)-(n.songs?.length??0)):s}function lt(t){if(!t.length)return`
      <div class="pl-empty-state">
        <p>\u914D\u4FE1\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026</p>
        <p class="pl-empty-hint">\u5148\u306B\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u30BF\u30D6\u3092\u958B\u304F\u3068\u3059\u3050\u306B\u8868\u793A\u3055\u308C\u307E\u3059</p>
      </div>`;let e=ae(t,nt),s=e.length,a=Math.max(1,Math.ceil(s/at)),n=Math.min(Math.max(1,W),a),l=(n-1)*at,c=e.slice(l,l+at).map(o=>{let v=k(o),f=V(o.url),d=L(o.url),p=o.songs?.length??0;return`
      <button class="pl-sg-card" type="button" data-stream-play="${i(v)}"
        title="${i(o.title||"\u914D\u4FE1")}">
        <div class="pl-sg-thumb-wrap">
          ${f?`<img class="pl-sg-thumb" src="${i(f)}"
                data-fallback="${i(d)}"
                alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="pl-sg-thumb-placeholder"></div>'}
          <span class="pl-sg-song-badge">${p}<span class="pl-sg-badge-unit">\u66F2</span></span>
          <span class="pl-sg-add${A(v)?" is-saved":""}" role="button" tabindex="0"
            aria-label="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0"
            data-playlist-add="${i(v)}" data-stream-title="${i(o.title||"\u914D\u4FE1")}"
            title="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0">${ee}</span>
        </div>
        <div class="pl-sg-info">
          <span class="pl-sg-title">${i(o.title||"\u914D\u4FE1")}</span>
          <span class="pl-sg-date">${i(D(o.date)||"")}</span>
        </div>
      </button>`}).join(""),m=a>1?`
    <div class="pl-pagination">
      <button class="pl-page-btn" data-pl-page="${n-1}"
        ${n<=1?"disabled":""} type="button" aria-label="\u524D\u306E\u30DA\u30FC\u30B8">\u524D\u3078</button>
      <span class="pl-page-info">${n} / ${a}</span>
      <button class="pl-page-btn" data-pl-page="${n+1}"
        ${n>=a?"disabled":""} type="button" aria-label="\u6B21\u306E\u30DA\u30FC\u30B8">\u6B21\u3078</button>
    </div>`:"";return`${`
    <div class="pl-sort-bar">
      ${se.map(o=>`
        <button class="pl-sort-opt${nt===o.key?" active":""}"
          data-pl-sort="${o.key}" type="button">${o.label}</button>`).join("")}
    </div>`}<div class="pl-stream-grid" id="pl-stream-grid">${c}</div>${m}`}function Pt(t,e){let s=t.target.closest("[data-pl-sort]");if(s)return nt=s.dataset.plSort,W=1,kt(e),!0;let a=t.target.closest("[data-pl-page]");return a&&!a.disabled?(W=Number(a.dataset.plPage),kt(e),!0):!1}function kt(t){let e=y("#pl-subtab-body");if(!e){Lt();return}e.innerHTML=lt(t);let s=y("#panel-playlists");s&&s.addEventListener("error",a=>{let n=a.target;if(!n.classList.contains("pl-sg-thumb"))return;let l=n.dataset.fallback;l&&n.src!==l&&(n.src=l,delete n.dataset.fallback)},{once:!0,capture:!0}),e.scrollIntoView({behavior:"smooth",block:"start"})}var ne='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>',E=()=>{};function Ct({rerender:t}){t&&(E=t)}function g(){return ot()}function P(t){dt(t)}function it(t){let e=g(),s={id:String(Date.now()),name:t.trim(),createdAt:new Date().toISOString(),streams:[]};return e.unshift(s),P(e),s}function Et(t){P(g().filter(e=>e.id!==t))}function It(t,e){let s=g(),a=s.find(n=>n.id===t);return!a||a.streams.includes(e)?!1:(a.streams.push(e),P(s),!0)}function Vt(t,e){let s=g(),a=s.find(n=>n.id===t);a&&(a.streams=a.streams.filter(n=>n!==e),P(s))}function Ht(t,e){return(t.streams||[]).map(s=>{if(s.startsWith("mv:")){let n=C(s);return n?.url?U(n.url):""}let a=e.find(n=>k(n)===s);return a?.url?U(a.url):""}).filter(Boolean)}function le(t){if(!t.length){alert("YouTube\u3067\u518D\u751F\u3067\u304D\u308B\u52D5\u753B\u304C\u3042\u308A\u307E\u305B\u3093");return}let e;if(t.length===1)e=`https://www.youtube.com/watch?v=${t[0]}`;else{let s=t.slice(0,50);t.length>50&&alert(`\u52D5\u753B\u304C${t.length}\u672C\u3042\u308A\u307E\u3059\u3002\u5148\u982D50\u672C\u3067\u9023\u7D9A\u518D\u751F\u3057\u307E\u3059\u3002`),e=`https://www.youtube.com/watch_videos?video_ids=${s.join(",")}`}window.open(e,"_blank","noopener noreferrer")}function zt(t){let e=g();return e.length?`
    <div class="pl-my-actions">
      <span class="pl-my-count">${e.length}\u4EF6\u306E\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8</span>
      <button class="pl-new-btn" id="pl-new-btn" type="button">${b("plus")} \u65B0\u898F\u4F5C\u6210</button>
    </div>
    <div class="pl-grid">
      ${e.map(s=>re(s,t)).join("")}
    </div>`:`
      <div class="pl-empty-state">
        <p>\u307E\u3060\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u304C\u3042\u308A\u307E\u305B\u3093</p>
        <p class="pl-empty-hint">\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306E\u914D\u4FE1\u67A0\u304B\u3089 <strong>\u681E\u30DC\u30BF\u30F3</strong> \u3092\u62BC\u3057\u3066\u8FFD\u52A0\u3067\u304D\u307E\u3059</p>
      </div>
      <div class="pl-my-actions">
        <button class="pl-new-btn" id="pl-new-btn" type="button">${b("plus")} \u65B0\u898F\u4F5C\u6210</button>
      </div>`}function re(t,e){let s=t.streams.map(c=>{let m=c.startsWith("mv:"),u=m?C(c):null;return{skey:c,isMv:m,mv:u,stream:m?null:e.find(o=>k(o)===c)}}),a=s.find(({stream:c,mv:m})=>c?.url||m?.url)?.stream?.url||s.find(({mv:c})=>c?.url)?.mv?.url,n=a?`<img class="pl-card-cover" src="${i(L(a))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:"",l=s.map(({skey:c,isMv:m,mv:u,stream:o})=>{let v=i(t.id+"|:|"+c),f=`<span class="pl-drag-handle" aria-hidden="true" title="\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3073\u66FF\u3048">${b("drag")}</span>`,d=`<button class="pl-rm-btn" data-pl-rm-stream="${v}" type="button" title="\u524A\u9664">${b("close")}</button>`;if(m){if(!u)return`
        <div class="pl-stream-row pl-stream-missing" data-pl-skey="${i(c)}" data-pl-id="${i(t.id)}">${f}
          <div class="pl-stream-info"><span class="pl-stream-title">\uFF08\u52D5\u753B\u30C7\u30FC\u30BF\u306A\u3057\uFF09</span></div>
          <div class="pl-stream-actions">${d}</div>
        </div>`;let{label:p,sub:M}=H(u),S=u.type||"original",$=F().indexOf(u);return`
        <div class="pl-stream-row" data-pl-skey="${i(c)}" data-pl-id="${i(t.id)}">
          ${f}
          <div class="pl-stream-info">
            <span class="pl-stream-date"><span class="mv-badge-inline mv-type-${S}">${p}</span></span>
            <span class="pl-stream-title">${i(u.title||"\u2014")}</span>
            <span class="pl-stream-meta">${i(M)}</span>
          </div>
          <div class="pl-stream-actions">
            ${$>=0?`<button class="pl-play-stream-btn" data-play-music-pl="${$}" type="button" title="\u518D\u751F">${b("play")}</button>`:""}
            ${d}
          </div>
        </div>`}return o?`
      <div class="pl-stream-row" data-pl-skey="${i(c)}" data-pl-id="${i(t.id)}">
        ${f}
        <div class="pl-stream-info">
          <span class="pl-stream-date">${D(o.date)}</span>
          <span class="pl-stream-title">${i(o.title||"\u914D\u4FE1")}</span>
          <span class="pl-stream-meta">\u7B2C${o.index}\u67A0 \xB7 ${o.songs?.length??0}\u66F2</span>
        </div>
        <div class="pl-stream-actions">
          ${o.url?`<button class="pl-play-stream-btn" data-pl-play-stream="${i(c)}"
                type="button" title="\u518D\u751F">${b("play")}</button>`:""}
          ${d}
        </div>
      </div>`:`
      <div class="pl-stream-row pl-stream-missing" data-pl-skey="${i(c)}" data-pl-id="${i(t.id)}">${f}
        <div class="pl-stream-info"><span class="pl-stream-title">\uFF08\u914D\u4FE1\u30C7\u30FC\u30BF\u306A\u3057\uFF09</span></div>
        <div class="pl-stream-actions">${d}</div>
      </div>`}).join(""),r=Ht(t,e);return`
    <div class="pl-card">
      <div class="pl-card-head">
        ${n?`<div class="pl-card-cover-wrap">${n}</div>`:""}
        <div class="pl-card-head-info">
          <button class="pl-card-name" data-pl-rename="${i(t.id)}"
            type="button" title="\u30AF\u30EA\u30C3\u30AF\u3067\u540D\u524D\u5909\u66F4">${i(t.name)}</button>
          <span class="pl-card-count">${t.streams.length}\u4EF6</span>
        </div>
        <button class="pl-del-btn" data-pl-del="${i(t.id)}"
          type="button" title="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u524A\u9664">\u{1F5D1}</button>
      </div>
      <div class="pl-stream-list">
        ${l||'<div class="pl-stream-empty">\u914D\u4FE1\u304C\u8FFD\u52A0\u3055\u308C\u3066\u3044\u307E\u305B\u3093</div>'}
      </div>
      ${r.length||t.streams.length?`
      <div class="pl-card-footer">
        ${r.length?`
        <button class="pl-yt-share-btn" data-pl-yt-share="${i(t.id)}"
          type="button" title="YouTube\u3067\u9023\u7D9A\u518D\u751F\uFF08\u4E00\u6642\u7684\u306A\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3068\u3057\u3066\u958B\u304D\u307E\u3059\uFF09">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
          YouTube\u3067\u9023\u7D9A\u518D\u751F (${r.length}\u672C)
        </button>`:""}
        ${t.streams.length?`
        <button class="pl-yt-share-btn" data-pl-share="${i(t.id)}"
          type="button" title="\u3053\u306E\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306E\u5171\u6709\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC">${b("link")} \u30EA\u30F3\u30AF\u3092\u5171\u6709</button>`:""}
      </div>`:""}
    </div>`}function Dt(t,e){if(t.target.closest("#pl-new-btn")){ie();return}let s=t.target.closest("[data-pl-share]");if(s){let u=g().find(p=>p.id===s.dataset.plShare);if(!u)return;let o=JSON.stringify({n:u.name,s:u.streams}),v=btoa(String.fromCharCode(...new TextEncoder().encode(o))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),f=`${location.origin}${location.pathname}?pl=${v}`,d=p=>{s.innerHTML=p?`${b("check")} \u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F`:"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093",setTimeout(()=>{s.innerHTML=`${b("link")} \u30EA\u30F3\u30AF\u3092\u5171\u6709`},1600)};navigator.clipboard?.writeText(f).then(()=>d(!0)).catch(()=>{try{let p=document.createElement("textarea");p.value=f,p.style.cssText="position:fixed;opacity:0;",document.body.appendChild(p),p.select();let M=document.execCommand("copy");p.remove(),d(M)}catch{d(!1)}});return}let a=t.target.closest("[data-pl-del]");if(a){let u=a.dataset.plDel,o=g().find(v=>v.id===u);o&&confirm(`\u300C${o.name}\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F`)&&(Et(u),E());return}let n=t.target.closest("[data-pl-rm-stream]");if(n){let[u,o]=n.dataset.plRmStream.split("|:|");Vt(u,o),E();return}let l=t.target.closest("[data-pl-play-stream]");if(l){let u=l.closest(".pl-stream-row");if(u&&Bt(u,e))return;let o=l.dataset.plPlayStream,v=e.find(f=>k(f)===o);v?.url&&R(v);return}let r=t.target.closest("[data-play-music-pl]");if(r){let u=r.closest(".pl-stream-row");if(u&&Bt(u,e))return;let o=F();if(o.length){let v=Number(r.dataset.playMusicPl);import("./chunk-B4FR3TDH.js").then(f=>f.playMusicQueue(o,v))}return}let c=t.target.closest("[data-pl-rename]");if(c){let u=c.dataset.plRename,o=g().find(f=>f.id===u);if(!o)return;let v=prompt("\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u540D",o.name)?.trim();if(v){let f=g(),d=f.find(p=>p.id===u);d&&(d.name=v,P(f),E())}return}let m=t.target.closest("[data-pl-yt-share]");if(m){let u=m.dataset.plYtShare,o=g().find(v=>v.id===u);if(!o)return;le(Ht(o,e));return}}function ie(){let t=prompt("\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044")?.trim();t&&(it(t),E())}function ce(t){let e=z.data?.streams||[];for(let s of t.streams||[])if(s.startsWith("mv:")){let a=C(s);if(a?.url)return a.url}else{let a=e.find(n=>k(n)===s);if(a?.url)return a.url}return""}function ct(t,e,s={}){let a=Array.isArray(t)?t.filter(Boolean):[t].filter(Boolean);if(!a.length)return;let n=a.length>1,l=()=>{try{s.onChange?.(a.some(d=>A(d)))}catch{}},r=y("#pl-add-modal");r||(r=document.createElement("div"),r.id="pl-add-modal",r.setAttribute("role","dialog"),r.setAttribute("aria-modal","true"),document.body.appendChild(r));let c=d=>a.every(p=>(d.streams||[]).includes(p)),m=d=>{let p=c(d),M=ce(d),S=M?L(M):"";return`
      <button class="pl-modal-item${p?" is-saved":""}" data-pl-add="${i(d.id)}"
        type="button" role="checkbox" aria-checked="${p}">
        <span class="pl-modal-item-cover">
          ${S?`<img src="${i(S)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span class="pl-modal-item-cover--empty">${b("music")}</span>`}
        </span>
        <span class="pl-modal-item-info">
          <span class="pl-modal-item-name">${i(d.name)}</span>
          <span class="pl-modal-item-count">${d.streams.length}\u66F2</span>
        </span>
        <span class="pl-modal-bookmark${p?" is-saved":""}" aria-hidden="true">${ne}</span>
      </button>`},u=()=>{let d=g();return d.length?d.map(m).join(""):'<p class="pl-modal-empty">\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u304C\u3042\u308A\u307E\u305B\u3093<br><span style="font-size:11px">\u4E0B\u306E\u300C\u65B0\u3057\u3044\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u4F5C\u6210\u300D\u304B\u3089\u8FFD\u52A0\u3067\u304D\u307E\u3059</span></p>'},o=n?`${a.length}\u66F2\u3092\u307E\u3068\u3081\u3066\u4FDD\u5B58`:e||"\u914D\u4FE1",v=()=>{r.innerHTML=`
      <div class="pl-modal-backdrop" id="pl-modal-backdrop"></div>
      <div class="pl-modal-box" role="dialog" aria-modal="true" aria-label="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58">
        <div class="pl-modal-head">
          <span class="pl-modal-head-title">\u4FDD\u5B58\u5148</span>
          <button class="pl-modal-close" id="pl-modal-close" type="button" aria-label="\u9589\u3058\u308B">${b("close")}</button>
        </div>
        <div class="pl-modal-sub">${i(o)}</div>
        <div class="pl-modal-list" id="pl-modal-list">${u()}</div>
        <button class="pl-modal-new" id="pl-modal-new" type="button">
          <span class="pl-modal-new-icon">${b("plus")}</span> \u65B0\u3057\u3044\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u4F5C\u6210
        </button>
      </div>`,r.hidden=!1,r.querySelector("#pl-modal-close").addEventListener("click",f),r.querySelector("#pl-modal-backdrop").addEventListener("click",f),r.querySelector("#pl-modal-new").addEventListener("click",()=>{let d=prompt("\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u540D")?.trim();if(!d)return;let p=it(d);a.forEach($=>It(p.id,$)),rt(n?`\u300C${d}\u300D\u306B${a.length}\u66F2\u4FDD\u5B58\u3057\u307E\u3057\u305F`:`\u300C${d}\u300D\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F`);let M=r.querySelector("#pl-modal-list");M?.querySelector(".pl-modal-empty")&&(M.innerHTML=""),M&&M.insertAdjacentHTML("afterbegin",m(g().find($=>$.id===p.id))),l()}),r.querySelector("#pl-modal-list").addEventListener("click",d=>{let p=d.target.closest("[data-pl-add]");if(!p)return;let M=p.dataset.plAdd,S=g(),$=S.find(_=>_.id===M);$&&(Array.isArray($.streams)||($.streams=[]),c($)?(a.forEach(_=>{$.streams=$.streams.filter(Yt=>Yt!==_)}),P(S),rt(n?`${a.length}\u66F2\u3092\u524A\u9664\u3057\u307E\u3057\u305F`:"\u524A\u9664\u3057\u307E\u3057\u305F")):(a.forEach(_=>{$.streams.includes(_)||$.streams.push(_)}),P(S),rt(n?`\u300C${$.name}\u300D\u306B${a.length}\u66F2\u4FDD\u5B58\u3057\u307E\u3057\u305F`:`\u300C${$.name}\u300D\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F`)),p.outerHTML=m(g().find(_=>_.id===M)),l())})},f=()=>{r.hidden=!0};v(),document.addEventListener("keydown",function d(p){p.key==="Escape"&&(f(),document.removeEventListener("keydown",d))})}function rt(t){let e=y("#pl-toast");e||(e=document.createElement("div"),e.id="pl-toast",document.body.appendChild(e)),e.textContent=t,e.classList.add("pl-toast--show"),clearTimeout(e._timer),e._timer=setTimeout(()=>e.classList.remove("pl-toast--show"),2500)}function Bt(t,e){let s=g().find(l=>l.id===t.dataset.plId);if(!s)return!1;let a=[];for(let l of s.streams)if(l.startsWith("mv:")){let r=C(l);r?.url&&a.push({kind:"mv",key:l,video:r})}else{let r=e.find(c=>k(c)===l);r?.url&&a.push({kind:"stream",key:l,stream:r})}if(!a.length)return!1;let n=a.findIndex(l=>l.key===t.dataset.plSkey);return n<0&&(n=0),ut({name:s.name||"\u30DE\u30A4\u30EA\u30B9\u30C8",items:a,idx:n}),!0}function Rt(){let t=y("#panel-playlists");t&&t.querySelectorAll(".pl-stream-list").forEach(e=>{e.addEventListener("pointerdown",oe,{passive:!1})})}var I=null;function oe(t){if(I)return;let e=t.target.closest(".pl-drag-handle");if(!e)return;let s=e.closest(".pl-stream-row"),a=e.closest(".pl-stream-list");if(!s||!a)return;t.preventDefault();let n=Array.from(a.querySelectorAll(".pl-stream-row")),l=n.indexOf(s);if(l<0)return;let r=n.map(m=>{let u=m.getBoundingClientRect();return u.top+u.height/2}),c=s.getBoundingClientRect();I={list:a,row:s,rows:n,mids:r,startIdx:l,targetIdx:l,startY:t.clientY,rowH:c.height+(parseFloat(getComputedStyle(a).rowGap||getComputedStyle(a).gap)||0),plId:s.dataset.plId,moved:!1},s.classList.add("is-dragging"),a.classList.add("is-drag-active");try{s.setPointerCapture(t.pointerId)}catch{}s.addEventListener("pointermove",jt,{passive:!1}),s.addEventListener("pointerup",qt),s.addEventListener("pointercancel",Kt)}function jt(t){let e=I;if(!e)return;t.preventDefault();let s=t.clientY-e.startY;if(!e.moved&&Math.abs(s)<3)return;e.moved=!0,e.row.style.transform=`translateY(${s}px)`;let a=e.mids[e.startIdx]+s,n=0;for(let l=0;l<e.mids.length;l++)l!==e.startIdx&&a>e.mids[l]&&n++;n!==e.targetIdx&&(e.targetIdx=n,e.rows.forEach((l,r)=>{if(r===e.startIdx)return;let c=0;e.startIdx<n&&r>e.startIdx&&r<=n?c=-e.rowH:e.startIdx>n&&r>=n&&r<e.startIdx&&(c=e.rowH),l.style.transform=c?`translateY(${c}px)`:""}))}function qt(){let t=I;if(!t)return;let{plId:e,startIdx:s,targetIdx:a,moved:n}=t;if(Ot(),!n||a===s)return;let l=g(),r=l.find(c=>c.id===e);if(r&&s<r.streams.length){let c=r.streams.slice(),[m]=c.splice(s,1);c.splice(a,0,m),r.streams=c,P(l)}E()}function Kt(){Ot()}function Ot(){let t=I;t&&(t.rows.forEach(e=>{e.style.transform=""}),t.row.classList.remove("is-dragging"),t.list.classList.remove("is-drag-active"),t.row.removeEventListener("pointermove",jt),t.row.removeEventListener("pointerup",qt),t.row.removeEventListener("pointercancel",Kt),I=null)}var w="all-streams";function Q(){let t=y("#panel-playlists");if(!t)return;vt({isActive:()=>w==="music",openAddModal:(n,l)=>ct(n,l)}),At({rerender:Q}),Ct({rerender:Q});let e=z.data?.streams||[];w==="my-playlists"&&yt(()=>{w==="my-playlists"&&Q()});let s=document.activeElement?.id==="pl-music-search",a=null;if(s){try{a=document.activeElement.selectionStart}catch{}$t(document.activeElement.value)}if(t.innerHTML=`
    <nav class="panel-topnav" aria-label="\u30DA\u30FC\u30B8\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3">
      <button class="panel-topnav-btn" type="button" data-nav-tab="dashboard"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h5v7H4z"/><path d="M10 4h5v16h-5z"/><path d="M16 9h4v11h-4z"/></svg>\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="ranking"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0z"/><path d="M6 5H3v2a4 4 0 0 0 4 4"/><path d="M18 5h3v2a4 4 0 0 1-4 4"/><path d="M12 11v5"/><path d="M8 20h8"/><path d="M9 16h6v4H9z"/></svg>\u30E9\u30F3\u30AD\u30F3\u30B0</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="songs"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>\u5168\u66F2\u30EA\u30B9\u30C8</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="timeline"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 13h3"/><path d="M13 13h3"/><path d="M8 17h3"/></svg>\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="analytics"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l3-4 4 2 5-7"/><circle cx="7" cy="15" r="1"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="19" cy="6" r="1"/></svg>\u30A2\u30CA\u30EA\u30C6\u30A3\u30AF\u30B9</button>
      <button class="panel-topnav-btn active" type="button" data-nav-tab="playlists"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h10"/><path d="M5 11h10"/><path d="M5 16h7"/><path d="M18 8v10l3-2 3 2V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1z"/></svg>\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8</button>
    </nav>
    <div class="pl-wrap">
      <nav class="pl-subtabs" role="tablist" aria-label="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u30B5\u30D6\u30BF\u30D6">
        <button class="pl-subtab${w==="all-streams"?" active":""}"
          data-pl-subtab="all-streams"  role="tab"
          aria-selected="${w==="all-streams"}">\u6B4C\u67A0\u4E00\u89A7</button>
        <button class="pl-subtab${w==="music"?" active":""}"
          data-pl-subtab="music" role="tab"
          aria-selected="${w==="music"}">\u6B4C\u307F\u305F\u30FB\u30AA\u30EA\u66F2</button>
        <button class="pl-subtab${w==="my-playlists"?" active":""}"
          data-pl-subtab="my-playlists" role="tab"
          aria-selected="${w==="my-playlists"}">
          \u30DE\u30A4\u30EA\u30B9\u30C8
          <span class="pl-subtab-count">${g().length}</span>
        </button>
      </nav>
      <div class="pl-subtab-body" id="pl-subtab-body">
        ${w==="all-streams"?lt(e):w==="music"?ht():zt(e)}
      </div>
    </div>
  `,w==="music"&&gt(),s){let n=y("#pl-music-search");if(n&&(n.focus(),a!==null))try{n.setSelectionRange(a,a)}catch{}}t.onclick=n=>{let l=n.target.closest("[data-nav-tab]");if(l){document.querySelector(`[data-tab="${l.dataset.navTab}"]`)?.click();return}let r=n.target.closest("[data-pl-subtab]");if(r){w=r.dataset.plSubtab,w==="all-streams"&&Tt(),Q();return}Pt(n,e)||wt(n)||w==="my-playlists"&&Dt(n,e)},t.oninput=n=>{tt(n)},t.oncompositionend=n=>{tt(n,{immediate:!0})},t.addEventListener("error",n=>{let l=n.target;if(!l.classList.contains("pl-sg-thumb"))return;let r=l.dataset.fallback;r&&l.src!==r&&(l.src=r,delete l.dataset.fallback)},!0),w==="my-playlists"&&Rt()}export{It as addStreamToPlaylist,it as createPlaylist,Et as deletePlaylist,F as getMusicVideos,g as getPlaylists,A as isStreamInAnyPlaylist,Vt as removeStreamFromPlaylist,Q as renderPlaylists,C as resolveMusicVideoId,ct as showAddToPlaylistModal};
