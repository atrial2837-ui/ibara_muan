import{e as Y}from"./chunk-4VQQINBR.js";import{a as w,c as V,e as x,i as d,m as I,n as T,o as j}from"./chunk-3CMR4JCK.js";var U="ibara-playlists",W="ibara-music-videos-cache-v2",O=24,$="all-streams",C=1,H="newest",M="grid",f=null,E=null,L=!1,k="",N=null;function y(){try{return JSON.parse(localStorage.getItem(U)||"[]")}catch{return[]}}function S(t){try{localStorage.setItem(U,JSON.stringify(t))}catch{}}function Z(t){let s=y(),e={id:String(Date.now()),name:t.trim(),createdAt:new Date().toISOString(),streams:[]};return s.unshift(e),S(s),e}function lt(t){S(y().filter(s=>s.id!==t))}function J(t,s){let e=y(),n=e.find(a=>a.id===t);return!n||n.streams.includes(s)?!1:(n.streams.push(s),S(e),!0)}function it(t,s){let e=y(),n=e.find(a=>a.id===t);n&&(n.streams=n.streams.filter(a=>a!==s),S(e))}function kt(t){return y().some(s=>s.streams.includes(t))}function _(){let t=w("#panel-playlists");if(!t)return;let s=Y.data?.streams||[],e=document.activeElement?.id==="pl-music-search",n=null;if(e){try{n=document.activeElement.selectionStart}catch{}k=document.activeElement.value||""}if(t.innerHTML=`
    <div class="pl-wrap">
      <nav class="pl-subtabs" role="tablist" aria-label="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u30B5\u30D6\u30BF\u30D6">
        <button class="pl-subtab${$==="all-streams"?" active":""}"
          data-pl-subtab="all-streams"  role="tab"
          aria-selected="${$==="all-streams"}">\u6B4C\u67A0\u4E00\u89A7</button>
        <button class="pl-subtab${$==="music"?" active":""}"
          data-pl-subtab="music" role="tab"
          aria-selected="${$==="music"}">\u6B4C\u307F\u305F\u30FB\u30AA\u30EA\u66F2</button>
        <button class="pl-subtab${$==="my-playlists"?" active":""}"
          data-pl-subtab="my-playlists" role="tab"
          aria-selected="${$==="my-playlists"}">
          \u30DE\u30A4\u30EA\u30B9\u30C8
          <span class="pl-subtab-count">${y().length}</span>
        </button>
      </nav>
      <div class="pl-subtab-body" id="pl-subtab-body">
        ${$==="all-streams"?X(s,C):$==="music"?ot():$t(s)}
      </div>
    </div>
  `,$==="music"&&dt(),e){let a=w("#pl-music-search");if(a&&(a.focus(),n!==null))try{a.setSelectionRange(n,n)}catch{}}t.onclick=a=>{let i=a.target.closest("[data-pl-subtab]");if(i){$=i.dataset.plSubtab,$==="all-streams"&&(C=1),_();return}let v=a.target.closest("[data-pl-sort]");if(v){H=v.dataset.plSort,C=1,K(s);return}let g=a.target.closest("[data-pl-page]");if(g&&!g.disabled){C=Number(g.dataset.plPage),K(s);return}let c=a.target.closest("[data-music-view]");if(c){M=c.dataset.musicView,B();return}let u=a.target.closest("[data-play-music]");if(u&&f?.length){let b=Number(u.dataset.playMusic);import("./chunk-QQWUBF4X.js").then(p=>p.playMusicQueue(f,b));return}let r=a.target.closest("[data-watch-music]");if(r&&f?.length){let b=Number(r.dataset.watchMusic),p=f[b];p?.url&&window.__openStreamViewer?.({url:p.url,title:p.title,isMv:!0});return}let l=a.target.closest("[data-playlist-add-mv]");if(l){let b=l.dataset.playlistAddMv,p=l.dataset.streamTitle||"";St("mv:"+b,p);return}$==="my-playlists"&&_t(a,s)},t.oninput=a=>{let i=a.target.closest("#pl-music-search");i&&(k=i.value||"",clearTimeout(N),N=setTimeout(B,100))},t.oncompositionend=a=>{let i=a.target.closest("#pl-music-search");i&&(k=i.value||"",clearTimeout(N),B())},t.addEventListener("error",a=>{let i=a.target;if(!i.classList.contains("pl-sg-thumb"))return;let v=i.dataset.fallback;v&&i.src!==v&&(i.src=v,delete i.dataset.fallback)},!0)}var rt=[{key:"newest",label:"\u65B0\u3057\u3044\u9806"},{key:"oldest",label:"\u53E4\u3044\u9806"},{key:"most-songs",label:"\u66F2\u6570\u2193"},{key:"fewest-songs",label:"\u66F2\u6570\u2191"}];function ct(t,s){let e=t.slice();return s==="oldest"?e.reverse():s==="most-songs"?e.sort((n,a)=>(a.songs?.length??0)-(n.songs?.length??0)):s==="fewest-songs"?e.sort((n,a)=>(n.songs?.length??0)-(a.songs?.length??0)):e}function X(t,s){if(!t.length)return`
      <div class="pl-empty-state">
        <p>\u914D\u4FE1\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026</p>
        <p class="pl-empty-hint">\u5148\u306B\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u30BF\u30D6\u3092\u958B\u304F\u3068\u3059\u3050\u306B\u8868\u793A\u3055\u308C\u307E\u3059</p>
      </div>`;let e=ct(t,H),n=e.length,a=Math.max(1,Math.ceil(n/O)),i=Math.min(Math.max(1,s),a),v=(i-1)*O,c=e.slice(v,v+O).map(l=>{let b=x(l),p=T(l.url),m=j(l.url),o=l.songs?.length??0;return`
      <button class="pl-sg-card" type="button" data-stream-play="${d(b)}"
        title="${d(l.title||"\u914D\u4FE1")}">
        <div class="pl-sg-thumb-wrap">
          ${p?`<img class="pl-sg-thumb" src="${d(p)}"
                data-fallback="${d(m)}"
                alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="pl-sg-thumb-placeholder"></div>'}
          <span class="pl-sg-song-badge">${o}<span class="pl-sg-badge-unit">\u66F2</span></span>
        </div>
        <div class="pl-sg-info">
          <span class="pl-sg-title">${d(l.title||"\u914D\u4FE1")}</span>
          <span class="pl-sg-date">${d(V(l.date)||"")}</span>
        </div>
      </button>`}).join(""),u=a>1?`
    <div class="pl-pagination">
      <button class="pl-page-btn" data-pl-page="${i-1}"
        ${i<=1?"disabled":""} type="button" aria-label="\u524D\u306E\u30DA\u30FC\u30B8">\u524D\u3078</button>
      <span class="pl-page-info">${i} / ${a}</span>
      <button class="pl-page-btn" data-pl-page="${i+1}"
        ${i>=a?"disabled":""} type="button" aria-label="\u6B21\u306E\u30DA\u30FC\u30B8">\u6B21\u3078</button>
    </div>`:"";return`${`
    <div class="pl-sort-bar">
      ${rt.map(l=>`
        <button class="pl-sort-opt${H===l.key?" active":""}"
          data-pl-sort="${l.key}" type="button">${l.label}</button>`).join("")}
    </div>`}<div class="pl-stream-grid" id="pl-stream-grid">${c}</div>${u}`}function K(t){let s=w("#pl-subtab-body");if(!s){_();return}s.innerHTML=X(t,C);let e=w("#panel-playlists");e&&e.addEventListener("error",n=>{let a=n.target;if(!a.classList.contains("pl-sg-thumb"))return;let i=a.dataset.fallback;i&&a.src!==i&&(a.src=i,delete a.dataset.fallback)},{once:!0,capture:!0}),s.scrollIntoView({behavior:"smooth",block:"start"})}function ot(){if(f===null){let t=F();t.length&&(f=t)}return tt(f||[])}async function dt(){if(f!==null){R();return}f=F(),L=!0,R();let t=await mt();L=!1,f=Array.isArray(t)?t:[],R()}function R(){if($!=="music")return;let t=w("#pl-subtab-body");t&&(w("#pl-music-search")?B():t.innerHTML=tt(f||[]))}function tt(t){return ut(t)+`<div id="pl-music-results">${st(t)}</div>`}function ut(t){let s=z(),n=q(t).length;return`
    <div class="pl-music-viewbar">
      <label class="pl-music-search-wrap">
        <span class="pl-music-search-icon" aria-hidden="true">\u2315</span>
        <input id="pl-music-search" class="pl-music-search" type="search"
          value="${d(s)}"
          placeholder="\u66F2\u540D / \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u3067\u691C\u7D22"
          aria-label="\u6B4C\u307F\u305F\u30FB\u30AA\u30EA\u66F2\u3092\u691C\u7D22">
      </label>
      <span class="pl-music-count">${n}${n===t.length?"":` / ${t.length}`}\u4EF6</span>
      <div class="pl-music-views">
        <button class="pl-music-view-btn${M==="grid"?" active":""}" data-music-view="grid"     type="button">\u30B0\u30EA\u30C3\u30C9</button>
        <button class="pl-music-view-btn${M==="list"?" active":""}" data-music-view="list"     type="button">\u30EA\u30B9\u30C8</button>
        <button class="pl-music-view-btn${M==="category"?" active":""}" data-music-view="category" type="button">\u30AB\u30C6\u30B4\u30EA</button>
      </div>
    </div>`}function st(t){let s=q(t);return L&&!t.length?'<div class="pl-empty-state"><p>\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</p><p class="pl-empty-hint">\u691C\u7D22\u6B04\u306F\u3053\u306E\u307E\u307E\u5165\u529B\u3067\u304D\u307E\u3059</p></div>':t.length?s.length?M==="grid"?Q(s):M==="list"?yt(s):M==="category"?gt(s):Q(s):L?`<div class="pl-empty-state"><p>\u6700\u65B0\u30C7\u30FC\u30BF\u3092\u78BA\u8A8D\u4E2D\u2026</p><p class="pl-empty-hint">\u300C${d(z())}\u300D\u306E\u5019\u88DC\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059</p></div>`:'<div class="pl-empty-state"><p>\u4E00\u81F4\u3059\u308B\u52D5\u753B\u304C\u3042\u308A\u307E\u305B\u3093</p><p class="pl-empty-hint">\u300C\u66F2\u540D / \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u300D\u306E\u3088\u3046\u306B\u533A\u5207\u3063\u3066\u691C\u7D22\u3067\u304D\u307E\u3059</p></div>':'<div class="pl-empty-state"><p>\u52D5\u753B\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093</p><p class="pl-empty-hint">\u7BA1\u7406\u753B\u9762\u304B\u3089\u767B\u9332\u3067\u304D\u307E\u3059</p></div>'}function z(){let t=w("#pl-music-search");return t&&(k=t.value||""),k}function B(){let t=f||[],s=w(".pl-music-count");if(s){let n=q(t).length;s.textContent=`${n}${n===t.length?"":` / ${t.length}`}\u4EF6`}document.querySelectorAll("[data-music-view]").forEach(n=>{n.classList.toggle("active",n.dataset.musicView===M)});let e=w("#pl-music-results");e&&(e.innerHTML=st(t))}function F(){try{let t=JSON.parse(localStorage.getItem(W)||"null");return Array.isArray(t?.videos)?t.videos:[]}catch{return[]}}function pt(t){try{localStorage.setItem(W,JSON.stringify({videos:t,cachedAt:Date.now()}))}catch{}}async function mt(){return E||(E=fetch("/data/music.json",{cache:"no-store"}).then(t=>t.ok?t.json():Promise.reject(new Error(`music.json ${t.status}`))).then(t=>{let s=Array.isArray(t?.videos)?t.videos:[];return pt(s),s}).catch(()=>f||F()),E)}function et(t){return String(t||"").normalize("NFKC").toLowerCase().replace(/[！-～]/g,s=>String.fromCharCode(s.charCodeAt(0)-65248)).replace(/[‐-‒–—―ー]/g,"-").replace(/\s+/g," ").trim()}function bt(t){return et(t).split(/[\/／|｜\s]+/).map(s=>s.trim()).filter(Boolean)}function vt(t){let s=t.title||"",e=s.split(/[\/／|｜]/).map(a=>a.trim()).filter(Boolean),n=P(t).label;return et([s,...e,t.originalArtist,t.character,t.type,n].filter(Boolean).join(" "))}function q(t){let s=bt(z()),e=t.map((n,a)=>({v:n,i:a}));return s.length?e.filter(({v:n})=>{let a=vt(n);return s.every(i=>a.includes(i))}):e}function P(t){switch(t.type){case"cover":return{label:"\u30AB\u30D0\u30FC",cls:"mv-badge-cover",sub:t.originalArtist||"\u30AB\u30D0\u30FC\u66F2"};case"sugarily":return{label:"\u3057\u3085\u304C\u308A\u308A",cls:"mv-badge-sugarily",sub:"\u3057\u3085\u304C\u308A\u308A"};default:return{label:"\u30AA\u30EA\u30B8\u30CA\u30EB",cls:"mv-badge-original",sub:"\u8328\u3080\u3042\u3093"}}}function at(t,s){let e=T(t.url),n=j(t.url),{label:a,cls:i,sub:v}=P(t);return`
    <div class="mv-card">
      <button class="mv-card-thumb-btn" type="button" data-play-music="${s}" aria-label="\u518D\u751F">
        ${e?`<img class="mv-card-thumb" src="${d(e)}" data-fallback="${d(n)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="mv-card-thumb mv-card-thumb-placeholder"></div>'}
        <span class="mv-card-play-icon">\u25B6</span>
        <span class="mv-type-badge ${i}">${a}</span>
      </button>
      <div class="mv-card-info">
        <span class="mv-card-title">${d(t.title||"\u2014")}</span>
        <span class="mv-card-sub">${d(v)}</span>
      </div>
      <div class="mv-card-actions">
        <button class="mv-watch-btn" type="button" data-watch-music="${s}" title="\u52D5\u753B\u3067\u898B\u308B">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4V6zm5.5 3.5 5 3-5 3v-6z"/></svg>
        </button>
        <button class="mv-add-btn" type="button"
          data-playlist-add-mv="${d(t.id)}"
          data-stream-title="${d(t.title||"")}"
          title="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0">\uFF0B</button>
      </div>
    </div>`}function ft(t,s){let{label:e,cls:n,sub:a}=P(t);return`
    <div class="mv-list-row">
      <span class="mv-list-num">${s+1}</span>
      <button class="mv-list-play" type="button" data-play-music="${s}" aria-label="\u518D\u751F">\u25B6</button>
      <div class="mv-list-info">
        <span class="mv-list-title">${d(t.title||"\u2014")}</span>
        <span class="mv-list-sub">${d(a)}</span>
      </div>
      <span class="mv-type-badge ${n}">${e}</span>
      <button class="mv-watch-btn" type="button" data-watch-music="${s}" title="\u52D5\u753B\u3067\u898B\u308B">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4V6zm5.5 3.5 5 3-5 3v-6z"/></svg>
      </button>
      <button class="mv-add-btn" type="button"
        data-playlist-add-mv="${d(t.id)}"
        data-stream-title="${d(t.title||"")}"
        title="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0">\uFF0B</button>
    </div>`}function Q(t){return`<div class="mv-grid">${t.map(({v:s,i:e})=>at(s,e)).join("")}</div>`}function yt(t){return`<div class="mv-list">${t.map(({v:s,i:e})=>ft(s,e)).join("")}</div>`}function gt(t){return`
    <div class="mv-category">
      ${[{key:"original",label:"\u30AA\u30EA\u30B8\u30CA\u30EB\u66F2\uFF08\u500B\u4EBA\uFF09"},{key:"sugarily",label:"\u3057\u3085\u304C\u308A\u308A"},{key:"cover",label:"\u30AB\u30D0\u30FC\u66F2\uFF08\u6B4C\u307F\u305F\uFF09"}].map(({key:e,label:n})=>({label:n,items:t.filter(({v:a})=>a.type===e)})).filter(({items:e})=>e.length>0).map(({label:e,items:n})=>`
      <div class="mv-cat-section">
        <h3 class="mv-cat-heading">${e} <span class="mv-cat-count">${n.length}</span></h3>
        <div class="mv-grid">${n.map(({v:a,i})=>at(a,i)).join("")}</div>
      </div>`).join("")}
    </div>`}function Tt(){return f||[]}function ht(t){if(!t?.startsWith("mv:"))return null;let s=t.slice(3);return(f||[]).find(e=>e.id===s)||null}function $t(t){let s=y();return s.length?`
    <div class="pl-my-actions">
      <span class="pl-my-count">${s.length}\u4EF6\u306E\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8</span>
      <button class="pl-new-btn" id="pl-new-btn" type="button">\uFF0B \u65B0\u898F\u4F5C\u6210</button>
    </div>
    <div class="pl-grid">
      ${s.map(e=>wt(e,t)).join("")}
    </div>`:`
      <div class="pl-empty-state">
        <p>\u307E\u3060\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u304C\u3042\u308A\u307E\u305B\u3093</p>
        <p class="pl-empty-hint">\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306E\u914D\u4FE1\u67A0\u304B\u3089 <strong>\u2606 \u4FDD\u5B58</strong> \u3092\u62BC\u3057\u3066\u8FFD\u52A0\u3067\u304D\u307E\u3059</p>
      </div>
      <div class="pl-my-actions">
        <button class="pl-new-btn" id="pl-new-btn" type="button">\uFF0B \u65B0\u898F\u4F5C\u6210</button>
      </div>`}function wt(t,s){let e=t.streams.map(c=>{let u=c.startsWith("mv:"),r=u?ht(c):null;return{skey:c,isMv:u,mv:r,stream:u?null:s.find(l=>x(l)===c)}}),n=e.find(({stream:c,mv:u})=>c?.url||u?.url)?.stream?.url||e.find(({mv:c})=>c?.url)?.mv?.url,a=n?`<img class="pl-card-cover" src="${d(T(n))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:"",i=e.length,v=e.map(({skey:c,isMv:u,mv:r,stream:l},b)=>{let p=d(t.id+"|:|"+c),m=`
      <div class="pl-sort-btns">
        <button class="pl-sort-btn" data-pl-move="${p}|:|up"
          type="button" title="\u4E0A\u3078" ${b===0?"disabled":""}>\u2191</button>
        <button class="pl-sort-btn" data-pl-move="${p}|:|down"
          type="button" title="\u4E0B\u3078" ${b===i-1?"disabled":""}>\u2193</button>
      </div>`,o=`<button class="pl-rm-btn" data-pl-rm-stream="${p}" type="button" title="\u524A\u9664">\u2715</button>`;if(u){if(!r)return`
        <div class="pl-stream-row pl-stream-missing">${m}
          <span class="pl-stream-title">\uFF08\u52D5\u753B\u30C7\u30FC\u30BF\u306A\u3057\uFF09</span>${o}
        </div>`;let{label:h,sub:A}=P(r),nt=r.type||"original",D=(f||[]).indexOf(r);return`
        <div class="pl-stream-row">
          ${m}
          <div class="pl-stream-info">
            <span class="pl-stream-date"><span class="mv-badge-inline mv-type-${nt}">${h}</span></span>
            <span class="pl-stream-title">${d(r.title||"\u2014")}</span>
            <span class="pl-stream-meta">${d(A)}</span>
          </div>
          <div class="pl-stream-actions">
            ${D>=0?`<button class="pl-play-stream-btn" data-play-music-pl="${D}" type="button" title="\u518D\u751F">\u25B6</button>`:""}
            ${o}
          </div>
        </div>`}return l?`
      <div class="pl-stream-row">
        ${m}
        <div class="pl-stream-info">
          <span class="pl-stream-date">${V(l.date)}</span>
          <span class="pl-stream-title">${d(l.title||"\u914D\u4FE1")}</span>
          <span class="pl-stream-meta">\u7B2C${l.index}\u67A0 \xB7 ${l.songs?.length??0}\u66F2</span>
        </div>
        <div class="pl-stream-actions">
          ${l.url?`<button class="pl-play-stream-btn" data-pl-play-stream="${d(c)}"
                type="button" title="\u518D\u751F">\u25B6</button>`:""}
          ${o}
        </div>
      </div>`:`
      <div class="pl-stream-row pl-stream-missing">${m}
        <span class="pl-stream-title">\uFF08\u914D\u4FE1\u30C7\u30FC\u30BF\u306A\u3057\uFF09</span>${o}
      </div>`}).join(""),g=e.map(({stream:c,mv:u})=>{let r=c?.url||u?.url;return r?I(r):""}).filter(Boolean);return`
    <div class="pl-card">
      <div class="pl-card-head">
        ${a?`<div class="pl-card-cover-wrap">${a}</div>`:""}
        <div class="pl-card-head-info">
          <button class="pl-card-name" data-pl-rename="${d(t.id)}"
            type="button" title="\u30AF\u30EA\u30C3\u30AF\u3067\u540D\u524D\u5909\u66F4">${d(t.name)}</button>
          <span class="pl-card-count">${t.streams.length}\u4EF6</span>
        </div>
        <button class="pl-del-btn" data-pl-del="${d(t.id)}"
          type="button" title="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u524A\u9664">\u{1F5D1}</button>
      </div>
      <div class="pl-stream-list">
        ${v||'<div class="pl-stream-empty">\u914D\u4FE1\u304C\u8FFD\u52A0\u3055\u308C\u3066\u3044\u307E\u305B\u3093</div>'}
      </div>
      ${g.length||t.streams.length?`
      <div class="pl-card-footer">
        ${g.length?`
        <button class="pl-yt-share-btn" data-pl-yt-share="${d(t.id)}"
          type="button" title="YouTube\u3067\u9023\u7D9A\u518D\u751F\uFF08\u4E00\u6642\u7684\u306A\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3068\u3057\u3066\u958B\u304D\u307E\u3059\uFF09">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
          YouTube\u3067\u9023\u7D9A\u518D\u751F (${g.length}\u672C)
        </button>`:""}
        ${t.streams.length?`
        <button class="pl-yt-share-btn" data-pl-share="${d(t.id)}"
          type="button" title="\u3053\u306E\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306E\u5171\u6709\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC">\u{1F517} \u30EA\u30F3\u30AF\u3092\u5171\u6709</button>`:""}
      </div>`:""}
    </div>`}function _t(t,s){if(t.target.closest("#pl-new-btn")){Mt();return}let e=t.target.closest("[data-pl-share]");if(e){let r=y().find(o=>o.id===e.dataset.plShare);if(!r)return;let l=JSON.stringify({n:r.name,s:r.streams}),b=btoa(String.fromCharCode(...new TextEncoder().encode(l))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),p=`${location.origin}${location.pathname}?pl=${b}`,m=o=>{e.textContent=o?"\u2713 \u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F":"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093",setTimeout(()=>{e.textContent="\u{1F517} \u30EA\u30F3\u30AF\u3092\u5171\u6709"},1600)};navigator.clipboard?.writeText(p).then(()=>m(!0)).catch(()=>{try{let o=document.createElement("textarea");o.value=p,o.style.cssText="position:fixed;opacity:0;",document.body.appendChild(o),o.select();let h=document.execCommand("copy");o.remove(),m(h)}catch{m(!1)}});return}let n=t.target.closest("[data-pl-del]");if(n){let r=n.dataset.plDel,l=y().find(b=>b.id===r);l&&confirm(`\u300C${l.name}\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F`)&&(lt(r),_());return}let a=t.target.closest("[data-pl-rm-stream]");if(a){let[r,l]=a.dataset.plRmStream.split("|:|");it(r,l),_();return}let i=t.target.closest("[data-pl-play-stream]");if(i){let r=i.dataset.plPlayStream,l=s.find(b=>x(b)===r);l?.url&&window.__openStreamViewer?.(l);return}let v=t.target.closest("[data-play-music-pl]");if(v&&f?.length){let r=Number(v.dataset.playMusicPl);import("./chunk-QQWUBF4X.js").then(l=>l.playMusicQueue(f,r));return}let g=t.target.closest("[data-pl-rename]");if(g){let r=g.dataset.plRename,l=y().find(p=>p.id===r);if(!l)return;let b=prompt("\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u540D",l.name)?.trim();if(b){let p=y(),m=p.find(o=>o.id===r);m&&(m.name=b,S(p),_())}return}let c=t.target.closest("[data-pl-move]");if(c){let r=c.dataset.plMove.split("|:|"),[l,b,p]=r,m=y(),o=m.find(A=>A.id===l);if(!o)return;let h=o.streams.indexOf(b);if(h<0)return;p==="up"&&h>0?([o.streams[h-1],o.streams[h]]=[o.streams[h],o.streams[h-1]],S(m),_()):p==="down"&&h<o.streams.length-1&&([o.streams[h],o.streams[h+1]]=[o.streams[h+1],o.streams[h]],S(m),_());return}let u=t.target.closest("[data-pl-yt-share]");if(u){let r=u.dataset.plYtShare,l=y().find(m=>m.id===r);if(!l)return;let b=l.streams.map(m=>s.find(o=>x(o)===m)).filter(m=>m?.url).map(m=>I(m.url)).filter(Boolean);if(!b.length){alert("YouTube\u306EURL\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u308B\u914D\u4FE1\u304C\u3042\u308A\u307E\u305B\u3093");return}let p=`https://www.youtube.com/watch_videos?video_ids=${b.join(",")}`;window.open(p,"_blank","noopener noreferrer");return}}function Mt(){let t=prompt("\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044")?.trim();t&&(Z(t),_())}function St(t,s){let e=w("#pl-add-modal");e||(e=document.createElement("div"),e.id="pl-add-modal",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),document.body.appendChild(e));let n=y(),a=()=>{let v=y(),g=v.length?v.map(c=>{let u=c.streams.includes(t);return`
            <button class="pl-modal-item${u?" pl-modal-item--added":" pl-modal-item--free"}"
              data-pl-add="${d(c.id)}"
              ${u?'disabled aria-disabled="true"':""} type="button">
              <div class="pl-modal-item-info">
                <span class="pl-modal-item-name">${d(c.name)}</span>
                <span class="pl-modal-item-count">${c.streams.length}\u67A0</span>
              </div>
              <span class="pl-modal-item-status${u?" status--added":" status--free"}">
                ${u?'<span class="pl-modal-status-check">\u2713</span> \u767B\u9332\u6E08\u307F':"\uFF0B \u8FFD\u52A0"}
              </span>
            </button>`}).join(""):'<p class="pl-modal-empty">\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u304C\u3042\u308A\u307E\u305B\u3093<br><span style="font-size:11px">\u5148\u306B\u300C\u65B0\u3057\u3044\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u4F5C\u6210\u300D\u3057\u3066\u304F\u3060\u3055\u3044</span></p>';e.innerHTML=`
      <div class="pl-modal-backdrop" id="pl-modal-backdrop"></div>
      <div class="pl-modal-box" role="dialog" aria-modal="true" aria-label="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0">
        <div class="pl-modal-head">
          <span class="pl-modal-head-title">\u4FDD\u5B58\u5148\u3092\u9078\u629E</span>
          <button class="pl-modal-close" id="pl-modal-close" type="button" aria-label="\u9589\u3058\u308B">\u2715</button>
        </div>
        <div class="pl-modal-sub">${d(s||"\u914D\u4FE1")}</div>
        <div class="pl-modal-list" id="pl-modal-list">${g}</div>
        <button class="pl-modal-new" id="pl-modal-new" type="button">
          <span class="pl-modal-new-icon">\uFF0B</span> \u65B0\u3057\u3044\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u4F5C\u6210
        </button>
      </div>`,e.hidden=!1,e.querySelector("#pl-modal-close").addEventListener("click",i),e.querySelector("#pl-modal-backdrop").addEventListener("click",i),e.querySelector("#pl-modal-new").addEventListener("click",()=>{let c=prompt("\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u540D")?.trim();if(!c)return;let u=Z(c);J(u.id,t),i(),G(`\u300C${c}\u300D\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F`)}),e.querySelectorAll("[data-pl-add]:not([disabled])").forEach(c=>{c.addEventListener("click",()=>{let u=c.dataset.plAdd,r=y().find(l=>l.id===u);J(u,t),a(),G(`\u300C${r?.name}\u300D\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F`)})})},i=()=>{e.hidden=!0};a(),document.addEventListener("keydown",function v(g){g.key==="Escape"&&(i(),document.removeEventListener("keydown",v))})}function G(t){let s=w("#pl-toast");s||(s=document.createElement("div"),s.id="pl-toast",document.body.appendChild(s)),s.textContent=t,s.classList.add("pl-toast--show"),clearTimeout(s._timer),s._timer=setTimeout(()=>s.classList.remove("pl-toast--show"),2500)}export{J as addStreamToPlaylist,Z as createPlaylist,lt as deletePlaylist,Tt as getMusicVideos,y as getPlaylists,kt as isStreamInAnyPlaylist,it as removeStreamFromPlaylist,_ as renderPlaylists,ht as resolveMusicVideoId,St as showAddToPlaylistModal};
