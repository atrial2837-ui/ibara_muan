import{d as tt,e as st,f as R,g as et,h as nt,j as it,l as k}from"./chunk-X42FA5SW.js";import{c as q,d as _,e as K,n as j,p as Z}from"./chunk-LP3AFVMO.js";import{a as W,b as B,e as s}from"./chunk-4VQQINBR.js";import{a as c,c as D,h as z,i as a,j as X,p as Q}from"./chunk-3CMR4JCK.js";var $,E,w,G,O,H,dt,C,pt=null,ct="ibara-setlist-v1",x=[],T=null,M=null;function Gt(){Lt(),kt(),tt(s.data?.songs||[]);let t=c("#panel-songs");t.innerHTML=`
    <div class="section-header">
      <h2>${s.singerMode?"\u{1F399} \u9078\u66F2\u30DC\u30FC\u30C9":"\u{1F3B5} \u5168\u66F2\u30EA\u30B9\u30C8"}</h2>
      <span class="count-pill" id="songs-count">\u2014</span>
    </div>
    <div class="mobile-panel-switch">
      <button class="btn ghost active" type="button" data-mobile-panel-toggle="filters">\u7D5E\u308A\u8FBC\u307F</button>
    </div>
    <div id="songs-filter-panel" class="mobile-panel mobile-panel-filters is-open">
      <div class="controls">
        <div class="search-input-wrap">
          <input id="songs-search" class="text-input" type="search" placeholder="\u{1F50D} \u66F2\u540D\u30FB\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u30FB\u96F0\u56F2\u6C17\u3067\u691C\u7D22\uFF08\u4F8B\uFF1A\u30C1\u30EB\u306A\u66F2 / \u3042\u3064\u3044 / \u30DC\u30AB\u30ED \u5B9A\u756A\uFF09" value="${a(s.songsQuery)}">
          <div id="search-history-dropdown" class="search-history-dropdown" hidden></div>
        </div>
        <select id="songs-sort" class="select-input">
          <option value="count-desc">\u56DE\u6570\uFF08\u591A\uFF09</option>
          <option value="count-asc">\u56DE\u6570\uFF08\u5C11\uFF09</option>
          <option value="recent">\u6700\u7D42\u62AB\u9732\uFF08\u65B0\uFF09</option>
          <option value="oldest">\u6700\u7D42\u62AB\u9732\uFF08\u53E4\uFF09</option>
          <option value="title">\u66F2\u540D\uFF08\u3042\u2192\u3093\uFF09</option>
          <option value="artist">\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8</option>
        </select>
        <select id="songs-genre" class="select-input genre-select" title="\u30B8\u30E3\u30F3\u30EB\u3067\u7D5E\u308A\u8FBC\u307F">
          ${ft()}
        </select>
      </div>
      <!-- \u96F0\u56F2\u6C17\u30B5\u30B8\u30A7\u30B9\u30C8\u30C1\u30C3\u30D7\uFF08\u5E38\u6642\u8868\u793A\u30FB8\u7A2E\u306E\u307F\uFF09 -->
      <div id="search-suggest" class="suggest-strip" role="group" aria-label="\u96F0\u56F2\u6C17\u3067\u7D20\u65E9\u304F\u691C\u7D22">
        ${[["\u{1F60C} chill","\u30C1\u30EB\u306A\u66F2"],["\u26A1 \u3042\u3064\u3044","\u3042\u3064\u3044\u66F2"],["\u{1F319} \u3057\u3063\u3068\u308A","\u3057\u3063\u3068\u308A"],["\u{1F4AB} \u30A8\u30E2\u3044","\u30A8\u30E2\u3044"],["\u{1F525} \u304B\u3063\u3053\u3044\u3044","\u304B\u3063\u3053\u3044\u3044"],["\u{1F342} \u5207\u306A\u3044","\u5207\u306A\u3044"],["\u{1F4FB} \u61D0\u304B\u3057\u3044","\u61D0\u304B\u3057\u3044"],["\u{1F338} \u304B\u308F\u3044\u3044","\u304B\u308F\u3044\u3044"]].map(([n,o])=>`<button type="button" class="suggest-chip" data-suggest="${a(o)}">${n}</button>`).join("")}
      </div>
      <!-- \u7D5E\u308A\u8FBC\u307F\u30DC\u30BF\u30F3\u884C -->
      <div class="controls" id="songs-filters">
        <button class="btn ghost" data-filter="all">\u3059\u3079\u3066</button>
        <button class="btn ghost" data-filter="fresh">\u{1F7E2} \u6700\u8FD1</button>
        <button class="btn ghost" data-filter="stale">\u{1F7E0} \u4E45\u3057\u3076\u308A</button>
        <button class="btn ghost" data-filter="never">\u26AA \u672A\u78BA\u8A8D</button>
        <button class="btn ghost" data-filter="favorites">\u2764\uFE0F \u304A\u6C17\u306B\u5165\u308A</button>
        ${s.singerMode?"":'<button class="btn ghost" id="recommend-btn" type="button">\u{1F4A1} \u304A\u3059\u3059\u3081</button><button class="btn ghost" id="todays-song-btn" type="button">\u{1F3B2} \u4ECA\u65E5\u306E\u4E00\u66F2</button>'}
      </div>
      <p class="search-help">
        ${s.singerMode?"\uFF0B\u3067\u30BB\u30C8\u30EA\u306B\u8FFD\u52A0\u3067\u304D\u307E\u3059\u3002\u{1F3B2}\u30E9\u30F3\u30C0\u30E0\u8FFD\u52A0\u306F\u73FE\u5728\u306E\u691C\u7D22\u30FB\u7D5E\u308A\u8FBC\u307F\u6761\u4EF6\u304B\u3089\u9078\u3073\u307E\u3059\u3002":"\u300C\u30C1\u30EB\u306A\u66F2\u300D\u300C\u3042\u3064\u3044\u300D\u300C\u30DC\u30AB\u30ED \u5B9A\u756A\u300D\u306A\u3069\u81EA\u7136\u8A9E\u3067\u691C\u7D22\u3067\u304D\u307E\u3059\u3002\u30C1\u30C3\u30D7\u3092\u30BF\u30C3\u30D7\u3067\u7D20\u65E9\u304F\u7D5E\u308A\u8FBC\u307F\u3002"}
      </p>
      ${s.singerMode?`
        <div class="songs-tools">
          <button class="btn ghost" data-singer-preset="keyed" type="button">\u30AD\u30FC\u78BA\u8A8D\u6E08\u307F</button>
          <button class="btn ghost" data-singer-preset="classic" type="button">\u5B9A\u756A</button>
          <button class="btn ghost" data-singer-preset="stale" type="button">\u4E45\u3057\u3076\u308A</button>
          <button class="btn ghost" data-singer-preset="rare" type="button">\u30EC\u30A2</button>
          <button class="btn ghost" data-singer-preset="chill" type="button">Chill</button>
          <button class="btn ghost" data-singer-preset="energetic" type="button">\u6FC0\u3057\u3044</button>
          <button class="btn ghost" data-singer-preset="nostalgic" type="button">\u30CE\u30B9\u30BF\u30EB\u30B8\u30C3\u30AF</button>
          <button class="btn ghost" id="compact-btn" type="button">\u8868\u793A: ${s.songsView==="compact"?"\u30B3\u30F3\u30D1\u30AF\u30C8":"\u8A73\u7D30"}</button>
          <button class="btn ghost" id="todays-song-btn" type="button">\u{1F3B2} \u4ECA\u65E5\u306E\u4E00\u66F2</button>
          <button class="btn primary" id="setlist-toggle-btn" type="button" aria-controls="setlist-planner" aria-expanded="${s.setlistExpanded?"true":"false"}">${s.setlistExpanded?"\u30BB\u30C8\u30EA\u5236\u4F5C\u3092\u9589\u3058\u308B":"\u30BB\u30C8\u30EA\u5236\u4F5C\u3092\u958B\u304F"}</button>
        </div>
      `:""}
    </div>
    ${s.singerMode?'<div id="setlist-planner" class="setlist-planner mobile-panel mobile-panel-setlist"></div>':""}
    <div id="recommend-box" class="todays-song-box" hidden></div>
    <div id="todays-song-box" class="todays-song-box" hidden></div>
    <div class="genre-strip" id="songs-genre-chips">${bt()}</div>
    <div id="songs-list" class="song-list"></div>
    <div class="timeline-controls" id="songs-more-wrap"></div>
  `,$=c("#songs-search"),E=c("#songs-sort"),w=c("#songs-genre"),G=c("#songs-filters"),O=c("#songs-genre-chips"),H=c("#songs-list"),dt=c("#songs-count"),C=c("#songs-more-wrap"),E.value=s.songsSort,w.value=yt(s.songsGenre)?s.songsGenre:"all",s.songsGenre=w.value,ot(),U(),N();let e=document.getElementById("search-suggest"),i=X(()=>{s.songsQuery=$.value,s.songsLimit=100,R(s.songsQuery),P(),k({tab:"songs",q:s.songsQuery},{replace:!0}),U(),b()},120);$.addEventListener("input",()=>{i()}),$.addEventListener("focus",()=>{at()}),$.addEventListener("blur",()=>{setTimeout(()=>{P()},200)}),e&&e.addEventListener("click",n=>{let o=n.target.closest("[data-suggest]");if(!o)return;let l=o.dataset.suggest;$.value===l?($.value="",s.songsQuery=""):($.value=l,s.songsQuery=l),s.songsLimit=100,R(s.songsQuery||l),k({tab:"songs",q:s.songsQuery},{replace:!0}),U(),b()}),E.addEventListener("change",()=>{s.songsSort=E.value,b()}),w.addEventListener("change",()=>{s.songsGenre=w.value,s.songsLimit=100,N(),b()}),G.addEventListener("click",n=>{let o=n.target.closest("[data-filter]");o&&(o.dataset.filter==="favorites"?s.favoritesFilter=!s.favoritesFilter:(s.songsFilter=o.dataset.filter,s.favoritesFilter=!1),s.songsLimit=100,ot(),b())}),O.addEventListener("click",n=>{let o=n.target.closest("[data-genre]");o&&(s.songsGenre=o.dataset.genre,w.value=s.songsGenre,s.songsLimit=100,N(),b())});for(let n of t.querySelectorAll("[data-singer-preset]"))n.addEventListener("click",()=>{s.singerMode=!0,s.singerPreset=s.singerPreset===n.dataset.singerPreset?"all":n.dataset.singerPreset,s.songsLimit=100,b()});c("#compact-btn")?.addEventListener("click",()=>{s.songsView=s.songsView==="compact"?"comfortable":"compact",b()}),c("#setlist-toggle-btn")?.addEventListener("click",()=>vt()),c("#recommend-btn")?.addEventListener("click",()=>$t()),c("#todays-song-btn")?.addEventListener("click",()=>lt());for(let n of t.querySelectorAll("[data-mobile-panel-toggle]"))n.addEventListener("click",()=>mt(n.dataset.mobilePanelToggle));t.onclick=n=>{if(n.target.closest("#search-history-clear")){n.preventDefault(),n.stopPropagation(),nt(),P();return}let l=n.target.closest(".search-history-remove");if(l){n.preventDefault(),n.stopPropagation(),et(l.dataset.remove),at();return}let u=n.target.closest(".search-history-item");if(u){n.preventDefault(),n.stopPropagation();let m=u.dataset.query;s.songsQuery=m,$.value=m,s.songsLimit=100,P(),k({tab:"songs",q:m}),b();return}if(n.target.closest("[data-recommend-dismiss]")){n.preventDefault(),n.stopPropagation();let m=c("#recommend-box");m&&(m.hidden=!0,m.innerHTML="");return}if(n.target.closest("[data-todays-song-dismiss]")){n.preventDefault(),n.stopPropagation();let m=c("#todays-song-box");m&&(m.hidden=!0,m.innerHTML="");return}if(n.target.closest("[data-todays-song-reroll]")){n.preventDefault(),n.stopPropagation(),lt();return}let g=n.target.closest("[data-setlist-action]");if(g){n.stopPropagation(),Et(g);return}let f=n.target.closest("[data-artist-search]");if(f){n.stopPropagation();let m=String(f.dataset.artistSearch||"").replace(/"/g,"");s.songsQuery=`artist:"${m}"`,$.value=s.songsQuery,s.songsLimit=100,k({tab:"songs",q:s.songsQuery}),b();return}let p=n.target.closest("[data-fav-toggle]");if(p){n.preventDefault(),n.stopPropagation();let m=p.dataset.favToggle;W(m);let A=B(m);p.classList.toggle("is-active",A),p.setAttribute("aria-pressed",String(A)),p.textContent=A?"\u2665":"\u2661";return}let h=n.target.closest("[data-tag-search]");if(!h)return;n.stopPropagation();let S=h.dataset.tagType||"tag";s.songsQuery=`${S}:${h.dataset.tagSearch}`,$.value=s.songsQuery,s.songsLimit=100,k({tab:"songs",q:s.songsQuery}),b()},t.oninput=n=>{n.target.id==="setlist-theme"&&(s.setlist.theme=n.target.value,L())},t.onchange=n=>{n.target.id==="setlist-copy-format"&&(s.setlist.copyFormat=n.target.value,L())},t.onkeydown=n=>{n.key==="Enter"&&(!n.target.closest(".setlist-custom-add")&&!n.target.closest(".setlist-custom-details")||n.target.tagName!=="BUTTON"&&(n.preventDefault(),ut()))},b()}function at(){let t=st(),e=c("#search-history-dropdown");e&&(pt=e,t.length?e.innerHTML=`
      <div class="search-history-header">
        <span>\u691C\u7D22\u5C65\u6B74</span>
        <button class="search-history-clear-btn" type="button" id="search-history-clear">\u3059\u3079\u3066\u524A\u9664</button>
      </div>
      ${t.map(i=>`
        <div class="search-history-item" data-query="${a(i)}">
          <span class="search-history-query">${a(i)}</span>
          <button class="search-history-remove" type="button" data-remove="${a(i)}" aria-label="\u524A\u9664">\xD7</button>
        </div>
      `).join("")}
    `:e.innerHTML='<div class="search-history-empty">\u691C\u7D22\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093</div>',e.hidden=!1)}function P(){let t=c("#search-history-dropdown");t&&(t.hidden=!0)}function mt(t){let e=c("#songs-filter-panel"),i=c("#setlist-planner");if(t==="setlist"&&!s.singerMode){e?.classList.add("is-open"),i?.classList.remove("is-open");for(let o of document.querySelectorAll("[data-mobile-panel-toggle]"))o.classList.toggle("active",o.dataset.mobilePanelToggle==="filters");return}if(s.singerMode){e?.classList.add("is-open"),e?.scrollIntoView({behavior:"smooth",block:"start"});for(let l of document.querySelectorAll("[data-mobile-panel-toggle]"))l.classList.toggle("active",l.dataset.mobilePanelToggle==="filters");return}let n=t==="setlist";e?.classList.toggle("is-open",!n),i?.classList.toggle("is-open",n);for(let o of document.querySelectorAll("[data-mobile-panel-toggle]"))o.classList.toggle("active",o.dataset.mobilePanelToggle===t)}function vt(){if(!s.singerMode)return;s.setlistExpanded=!s.setlistExpanded,y();let t=c("#setlist-planner");s.setlistExpanded&&t?.scrollIntoView({behavior:"smooth",block:"start"})}function I(t){return String(t.genre||"\u672A\u5206\u985E").trim()||"\u672A\u5206\u985E"}function Y(){let t=new Map;for(let e of s.data.songs||[]){let i=I(e);t.set(i,(t.get(i)||0)+1)}return[...t.entries()].sort((e,i)=>i[1]-e[1]||e[0].localeCompare(i[0],"ja"))}function yt(t){return t==="all"||Y().some(([e])=>e===t)}function ft(){let t=['<option value="all">\u5168\u30B8\u30E3\u30F3\u30EB</option>'];for(let[e,i]of Y())t.push(`<option value="${a(e)}">${a(e)} (${i})</option>`);return t.join("")}function bt(){let t=['<button class="genre-chip" type="button" data-genre="all">\u5168\u30B8\u30E3\u30F3\u30EB</button>'];for(let[e,i]of Y())t.push(`
      <button class="genre-chip" type="button" data-genre="${a(e)}">
        <span>${a(e)}</span><small>${i}</small>
      </button>
    `);return t.join("")}function N(){for(let t of O.querySelectorAll("[data-genre]"))t.classList.toggle("active",t.dataset.genre===s.songsGenre)}function ot(){for(let t of G.querySelectorAll("[data-filter]"))t.dataset.filter==="favorites"?(t.classList.toggle("primary",s.favoritesFilter),t.classList.toggle("ghost",!s.favoritesFilter)):(t.classList.toggle("primary",t.dataset.filter===s.songsFilter&&!s.favoritesFilter),t.classList.toggle("ghost",t.dataset.filter!==s.songsFilter||s.favoritesFilter))}function U(){let t=document.getElementById("search-suggest");if(!t)return;let e=(s.songsQuery||"").trim();for(let i of t.querySelectorAll("[data-suggest]"))i.classList.toggle("is-active",i.dataset.suggest===e)}function b(){let{songs:t}=s.data,e=q(t,s.songsGenre,I),i=K(e,{singerMode:s.singerMode,preset:s.singerPreset,keyPublished:s.data?.stats?.keyPublished}),n=_(i,s.songsFilter),{results:o,tokens:l}=it(s.songsQuery,n),u=s.songsQuery.trim()?o.filter(r=>n.includes(r)):n;if(s.favoritesFilter&&(u=u.filter(r=>s.favorites.has(r.key))),u=j(u,s.songsSort,!!s.songsQuery.trim()),x=u,dt.textContent=`${u.length} / ${t.length}\u66F2`,!u.length){H.innerHTML='<div class="empty-state">\u8A72\u5F53\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F420}</div>',C.innerHTML="";return}let d=u.slice(0,s.songsLimit);H.classList.toggle("compact",s.songsView==="compact");for(let r of document.querySelectorAll("[data-singer-preset]")){let v=s.singerMode&&s.singerPreset===r.dataset.singerPreset;r.classList.toggle("primary",v),r.classList.toggle("ghost",!v)}c("#compact-btn")&&(c("#compact-btn").textContent=`\u8868\u793A: ${s.songsView==="compact"?"\u30B3\u30F3\u30D1\u30AF\u30C8":"\u8A73\u7D30"}`),H.innerHTML=d.map(r=>Bt(r,l)).join(""),y(),s.songsLimit<u.length?(C.innerHTML=`<button class="load-more-btn" id="songs-more">\u25BC \u3082\u3063\u3068\u8868\u793A (\u6B8B\u308A${u.length-s.songsLimit}\u66F2)</button>`,c("#songs-more").addEventListener("click",()=>{s.songsLimit+=200,b()})):C.innerHTML=""}function lt(){let t=c("#todays-song-box");if(!t)return;if(!x.length){t.hidden=!1,t.innerHTML='<div class="empty-state">\u6761\u4EF6\u306B\u5408\u3046\u66F2\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F3B2}</div>';return}let e=x[Math.floor(Math.random()*x.length)];t.hidden=!1,t.innerHTML=ht(e)}function ht(t){let e=t.lastSung?`${D(t.lastSung)} \xB7 ${t.daysSinceLast}\u65E5\u524D`:"\u5C65\u6B74\u672A\u78BA\u8A8D",i=t.displayKey?`<span class="todays-song-key">\u30AD\u30FC ${a(t.displayKey)}</span>`:"",n=s.singerMode?`<button class="btn primary" type="button" data-setlist-action="todays-song-add" data-songkey="${a(t.key)}">\uFF0B\u30BB\u30C8\u30EA\u306B\u8FFD\u52A0</button>`:"";return`
    <div class="todays-song-card">
      <div class="todays-song-header">
        <span class="todays-song-label">\u{1F3B2} \u4ECA\u65E5\u306E\u4E00\u66F2</span>
        <button class="todays-song-dismiss" type="button" data-todays-song-dismiss aria-label="\u9589\u3058\u308B">\xD7</button>
      </div>
      <div class="todays-song-info">
        <div class="todays-song-title">${a(t.title)}</div>
        <div class="todays-song-artist">${a(t.artist)}</div>
        <div class="todays-song-meta">
          <span class="todays-song-count">${t.count}\u56DE</span>
          <span class="todays-song-last">${e}</span>
          ${i}
        </div>
      </div>
      <div class="todays-song-actions">
        ${n}
        <button class="btn ghost" type="button" data-todays-song-reroll>\u5225\u306E\u3082\u3046\u4E00\u56DE</button>
      </div>
    </div>
  `}function $t(){let t=c("#recommend-box"),e=j(K(_(q(s.data.songs,"all",I),s.songsFilter),{singerMode:s.singerMode,preset:s.singerPreset,keyPublished:s.data?.stats?.keyPublished}).filter(o=>o.lastSung&&(o.displayKey||!s.data.stats.keyPublished)),"oldest",!1);if(!e.length){t.hidden=!1,t.innerHTML='<div class="empty-state">\u6761\u4EF6\u306B\u5408\u3046\u304A\u3059\u3059\u3081\u5019\u88DC\u304C\u3042\u308A\u307E\u305B\u3093</div>';return}let i=e.slice(0,Math.min(80,e.length)),n=i[Math.floor(Math.random()*i.length)];t.hidden=!1,t.innerHTML=`
    <div class="recommend-card" data-songkey="${a(n.key)}" data-songtitle="${a(n.title)}" data-songartist="${a(n.artist)}">
      <div>
        <div class="recommend-label">\u4ECA\u65E5\u306E\u5019\u88DC</div>
        <strong>${a(n.title)}</strong>
        <span>/ ${a(n.artist)}</span>
      </div>
      <div class="recommend-meta">
        <span>${n.count}\u56DE</span>
        <span>${n.daysSinceLast??"\u2014"}\u65E5\u524D</span>
        ${n.displayKey?`<span>\u30AD\u30FC ${a(n.displayKey)}</span>`:""}
      </div>
      <button class="recommend-dismiss" type="button" data-recommend-dismiss aria-label="\u304A\u3059\u3059\u3081\u9078\u66F2\u3092\u9589\u3058\u308B">\xD7</button>
    </div>
  `}function Lt(){try{let t=localStorage.getItem(ct);if(!t)return;let e=JSON.parse(t);s.setlist.theme=String(e.theme||""),s.setlist.copyFormat=e.copyFormat==="timestamp"?"timestamp":"simple",s.setlist.items=Array.isArray(e.items)?e.items:[]}catch{s.setlist.items=[]}}function St(){let t=s.setlist.items;if(!t.length)return window.location.href.split("?")[0];let e=btoa(unescape(encodeURIComponent(JSON.stringify(t)))),i=new URL(window.location.href.split("?")[0]);return i.searchParams.set("setlist",e),i.toString()}function kt(){try{let e=new URLSearchParams(window.location.search).get("setlist");if(!e)return;let i=decodeURIComponent(escape(atob(e))),n=JSON.parse(i);if(!Array.isArray(n)||!n.length)return;let o=new Set(s.setlist.items.map(u=>u.key)),l=n.filter(u=>!o.has(u.key));l.length&&(s.setlist.items=[...s.setlist.items,...l],L())}catch{}}async function wt(){let t=St();if(!s.setlist.items.length){y("\u5171\u6709\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093");return}try{await navigator.clipboard.writeText(t),y("\u5171\u6709URL\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F")}catch{y("\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}}function L(){localStorage.setItem(ct,JSON.stringify(s.setlist))}function V(t){return(s.data.songs||[]).find(e=>e.key===t)||null}function F(t){t&&(s.setlist.items.push({key:t.key,title:t.title,artist:t.artist,displayKey:t.displayKey||"",genre:t.genre||"",moodTags:t.moodTags||[],seasonTags:t.seasonTags||[],daysSinceLast:t.daysSinceLast}),L(),y("\u8FFD\u52A0\u3057\u307E\u3057\u305F"))}function ut(){let t=c("#setlist-custom-title"),e=c("#setlist-custom-artist"),i=c("#setlist-custom-key"),n=String(t?.value||"").trim(),o=String(e?.value||"").trim(),l=String(i?.value||"").trim();if(!n){y("\u66F2\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");return}s.setlist.items.push({key:`custom:${Date.now()}:${Math.random().toString(36).slice(2,8)}`,custom:!0,title:n,artist:o,displayKey:l,genre:"\u65B0\u898F",moodTags:[],seasonTags:[],daysSinceLast:null}),L(),y("\u65B0\u3057\u3044\u66F2\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F")}function xt(t){if(t.custom)return t;let e=V(t.key);return e?{...t,...e}:t}function Et(t){let e=t.dataset.setlistAction,i=Number(t.dataset.index);if(e==="add"&&F(V(t.dataset.songkey)),e==="todays-song-add"&&F(V(t.dataset.songkey)),e==="remove"&&s.setlist.items.splice(i,1),e==="up"&&i>0&&([s.setlist.items[i-1],s.setlist.items[i]]=[s.setlist.items[i],s.setlist.items[i-1]]),e==="down"&&i<s.setlist.items.length-1&&([s.setlist.items[i+1],s.setlist.items[i]]=[s.setlist.items[i],s.setlist.items[i+1]]),e==="copy-item"){At(i);return}if(e==="add-custom"){ut();return}if(e==="random"&&Tt(),e==="copy"&&It(),e==="share"){wt();return}e==="clear"&&confirm("\u30BB\u30C8\u30EA\u3092\u7A7A\u306B\u3057\u307E\u3059\u304B\uFF1F")&&(s.setlist.items=[]),L(),["add","random","copy"].includes(e)||y()}function Tt(){let t=new Set(s.setlist.items.map(n=>n.key)),e=(x.length?x:s.data.songs).filter(n=>n.key&&!t.has(n.key));if(!e.length){y("\u8FFD\u52A0\u3067\u304D\u308B\u5019\u88DC\u304C\u3042\u308A\u307E\u305B\u3093");return}let i=e[Math.floor(Math.random()*e.length)];F(i)}function J(){return s.setlist.items.map(xt)}function Mt(t){let e=i=>{let n=new Map;for(let o of t)for(let l of i(o))l&&n.set(l,(n.get(l)||0)+1);return[...n.entries()].sort((o,l)=>l[1]-o[1]).slice(0,3)};return{genres:e(i=>[i.genre||"\u672A\u5206\u985E"]),moods:e(i=>i.moodTags||[]),keys:t.filter(i=>i.displayKey).length,stale:t.filter(i=>i.daysSinceLast>=180).length}}function y(t=""){let e=c("#setlist-planner");if(!e)return;if(Dt(),e.hidden=!s.singerMode||!s.setlistExpanded,e.classList.toggle("is-open",s.singerMode&&s.setlistExpanded),!s.singerMode){e.innerHTML="";return}let i=J(),n=Mt(i),o=i.length*5;e.innerHTML=`
    <div class="setlist-head">
      <div>
        <div class="recommend-label">Setlist Builder</div>
        <h3>\u4ECA\u65E5\u306E\u30BB\u30C8\u30EA</h3>
      </div>
      <div class="setlist-total">${i.length}\u66F2 / \u7D04${o}\u5206</div>
    </div>
    <input id="setlist-theme" class="text-input setlist-theme" type="text" placeholder="\u6B4C\u67A0\u30C6\u30FC\u30DE\u30E1\u30E2" value="${a(s.setlist.theme)}">
    <div class="setlist-search-add">
      <div class="setlist-search-wrap">
        <input id="setlist-search-input" class="text-input setlist-search-input"
               type="text" placeholder="\u{1F50D} \u66F2\u540D\u3092\u5165\u529B\u3057\u3066\u8FFD\u52A0\u2026" autocomplete="off" spellcheck="false">
        <div id="setlist-search-dropdown" class="setlist-search-dropdown" hidden></div>
      </div>
      <details class="setlist-custom-details">
        <summary>\u691C\u7D22\u3067\u898B\u3064\u304B\u3089\u306A\u3044\u66F2\u3092\u8FFD\u52A0\u3059\u308B</summary>
        <div class="setlist-custom-add">
          <input id="setlist-custom-title" class="text-input" type="text"
                 placeholder="\u66F2\u540D\uFF08\u4F8B\uFF1A\u30B7\u30E3\u30EB\u30EB\uFF09" autocomplete="off">
          <div class="setlist-custom-row2">
            <input id="setlist-custom-artist" class="text-input" type="text"
                   placeholder="\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u540D\uFF08\u4EFB\u610F\uFF09" autocomplete="off">
            <input id="setlist-custom-key" class="text-input setlist-custom-key-inp" type="text"
                   placeholder="\u30AD\u30FC" maxlength="5" autocomplete="off">
            <button class="btn primary" type="button" data-setlist-action="add-custom">\u8FFD\u52A0</button>
          </div>
        </div>
      </details>
    </div>
    <div class="setlist-balance">
      ${rt("\u30B8\u30E3\u30F3\u30EB",n.genres)}
      ${rt("\u96F0\u56F2\u6C17",n.moods)}
      <span>\u30AD\u30FC ${n.keys}/${i.length}</span>
      <span>\u4E45\u3057\u3076\u308A ${n.stale}</span>
    </div>
    <div class="setlist-items">
      ${i.length?i.map((l,u)=>Pt(l,u)).join(""):'<div class="setlist-empty">\u66F2\u306E\u300C\uFF0B\u30BB\u30C8\u30EA\u300D\u304B\u30E9\u30F3\u30C0\u30E0\u8FFD\u52A0\u304B\u3089\u4F5C\u308C\u307E\u3059</div>'}
    </div>
    <div class="setlist-actions">
      <select id="setlist-copy-format" class="select-input">
        <option value="simple"${s.setlist.copyFormat==="simple"?" selected":""}>\u66F2\u540D / \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8</option>
        <option value="timestamp"${s.setlist.copyFormat==="timestamp"?" selected":""}>\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u5165\u529B\u7528</option>
      </select>
      <button class="btn ghost" type="button" data-setlist-action="random">\u30E9\u30F3\u30C0\u30E0\u8FFD\u52A0</button>
      <button class="btn primary" type="button" data-setlist-action="copy">\u30B3\u30D4\u30FC</button>
      <button class="btn ghost" type="button" data-setlist-action="share">\u{1F517} \u5171\u6709</button>
      <button class="btn ghost" type="button" data-setlist-action="clear">\u30AF\u30EA\u30A2</button>
      ${t?`<span class="setlist-message">${a(t)}</span>`:""}
    </div>
  `,Ht(),Ct()}function rt(t,e){return e.length?`<span>${t} ${e.map(([i,n])=>`${a(i)} ${n}`).join(" / ")}</span>`:`<span>${t} \u2014</span>`}function Pt(t,e){return`
    <div class="setlist-item" data-index="${e}">
      <div class="setlist-drag-handle" title="\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3073\u66FF\u3048" aria-label="\u30C9\u30E9\u30C3\u30B0\u30CF\u30F3\u30C9\u30EB">\u283F</div>
      <div class="setlist-no">${e+1}</div>
      <div class="setlist-info">
        <strong>${a(t.title)}</strong>
        <span>${t.artist?a(t.artist):"\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u672A\u5165\u529B"}${t.displayKey?` \xB7 key ${a(t.displayKey)}`:""}${t.custom?" \xB7 \u65B0\u898F":""}</span>
      </div>
      <div class="setlist-move">
        <button class="setlist-copy-one" type="button" data-setlist-action="copy-item" data-index="${e}" aria-label="${a(t.title)}\u3092\u30B3\u30D4\u30FC">\u29C9</button>
        <button type="button" data-setlist-action="up" data-index="${e}" aria-label="\u4E0A\u3078">\u2191</button>
        <button type="button" data-setlist-action="down" data-index="${e}" aria-label="\u4E0B\u3078">\u2193</button>
        <button type="button" data-setlist-action="remove" data-index="${e}" aria-label="\u524A\u9664">\xD7</button>
      </div>
    </div>
  `}function Ht(){let t=document.getElementById("setlist-search-input"),e=document.getElementById("setlist-search-dropdown");if(!t||!e)return;let i=[],n=-1;function o(d){let r=d.trim().toLowerCase();if(!r){e.hidden=!0,i=[],n=-1;return}let g=(s.data?.songs||[]).filter(p=>p.title.toLowerCase().includes(r)||(p.artist||"").toLowerCase().includes(r)).sort((p,h)=>{let S=p.title.toLowerCase().startsWith(r)?2:p.title.toLowerCase().includes(r)?1:0,m=h.title.toLowerCase().startsWith(r)?2:h.title.toLowerCase().includes(r)?1:0;return S!==m?m-S:h.count-p.count}).slice(0,8),f={_isNew:!0,title:d.trim()};g.length?(e.innerHTML=g.map((p,h)=>`
          <div class="setlist-dd-item" data-dd-idx="${h}">
            <span class="setlist-dd-icon">\u{1F3B5}</span>
            <div class="setlist-dd-body">
              <div class="setlist-dd-title">${a(p.title)}</div>
              <div class="setlist-dd-meta">${a(p.artist||"\u2014")} \xB7 ${p.count}\u56DE</div>
            </div>
          </div>`).join("")+`<div class="setlist-dd-item setlist-dd-new" data-dd-idx="${g.length}">
          <span class="setlist-dd-plus">\uFF0B</span>
          <div class="setlist-dd-body">
            <div class="setlist-dd-title">\u300C${a(d.trim())}\u300D\u3092\u65B0\u898F\u8FFD\u52A0</div>
            <div class="setlist-dd-meta">\u66F2\u30EA\u30B9\u30C8\u306B\u306A\u3044\u66F2\u3068\u3057\u3066\u8FFD\u52A0</div>
          </div>
        </div>`,i=[...g,f]):(e.innerHTML=`
        <div class="setlist-dd-item setlist-dd-new" data-dd-idx="0">
          <span class="setlist-dd-plus">\uFF0B</span>
          <div class="setlist-dd-body">
            <div class="setlist-dd-title">\u300C${a(d.trim())}\u300D\u3092\u65B0\u898F\u8FFD\u52A0</div>
            <div class="setlist-dd-meta">\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u540D\u3092\u5165\u529B\u3057\u3066\u8FFD\u52A0\u3067\u304D\u307E\u3059</div>
          </div>
        </div>`,i=[f]),n=-1,e.hidden=!1,l()}function l(){e.querySelectorAll("[data-dd-idx]").forEach((d,r)=>d.classList.toggle("is-selected",r===n))}function u(d){let r=i[d];if(r)if(e.hidden=!0,i=[],n=-1,r._isNew){let v=document.querySelector(".setlist-custom-details"),g=document.getElementById("setlist-custom-title");v&&g?(v.open=!0,g.value=r.title,t.value="",document.getElementById("setlist-custom-artist")?.focus()):t.value=""}else t.value="",F(r)}t.addEventListener("input",()=>o(t.value)),t.addEventListener("keydown",d=>{if(e.hidden)return;let r=i.length;d.key==="ArrowDown"?(d.preventDefault(),n=(n+1)%r,l()):d.key==="ArrowUp"?(d.preventDefault(),n=(n-1+r)%r,l()):d.key==="Enter"?(d.preventDefault(),d.stopPropagation(),u(n>=0?n:0)):d.key==="Escape"&&(e.hidden=!0,n=-1)}),e.addEventListener("mousedown",d=>{let r=d.target.closest("[data-dd-idx]");r&&(d.preventDefault(),u(Number(r.dataset.ddIdx)))}),T&&document.removeEventListener("click",T),T=d=>{!t.contains(d.target)&&!e.contains(d.target)&&(e.hidden=!0,n=-1)},document.addEventListener("click",T)}function Ct(){M&&(M(),M=null);let t=document.querySelector(".setlist-items");if(!t)return;let e=null,i=-1,n=null,o=0,l=null;function u(v){if(!e)return;let g=e.getBoundingClientRect();n.style.top=`${v.clientY-o}px`,n.style.left=`${g.left}px`,n.style.width=`${g.width}px`,n.style.visibility="hidden";let f=document.elementFromPoint(v.clientX,v.clientY);n.style.visibility="";let p=f?.closest(".setlist-item:not(.is-dragging)");l!==p&&(l?.classList.remove("drag-over"),p?.classList.add("drag-over"),l=p)}function d(v){document.removeEventListener("pointermove",u),document.removeEventListener("pointerup",d),document.removeEventListener("pointercancel",r);let g=l?Number(l.dataset.index):-1;n?.remove(),n=null,e?.classList.remove("is-dragging"),l?.classList.remove("drag-over");let f=i;if(e=null,i=-1,l=null,g!==-1&&g!==f){let p=s.setlist.items,[h]=p.splice(f,1),S=g>f?g-1:g;p.splice(S,0,h),L(),y()}}function r(){document.removeEventListener("pointermove",u),document.removeEventListener("pointerup",d),document.removeEventListener("pointercancel",r),n?.remove(),n=null,e?.classList.remove("is-dragging"),l?.classList.remove("drag-over"),e=null,i=-1,l=null}t.addEventListener("pointerdown",v=>{if(!v.target.closest(".setlist-drag-handle"))return;let g=v.target.closest(".setlist-item");if(!g)return;v.preventDefault(),e=g,i=Number(g.dataset.index);let f=g.getBoundingClientRect();o=v.clientY-f.top,n=g.cloneNode(!0),n.className=n.className+" setlist-drag-ghost",Object.assign(n.style,{position:"fixed",top:`${f.top}px`,left:`${f.left}px`,width:`${f.width}px`,pointerEvents:"none",zIndex:"9999"}),document.body.appendChild(n),g.classList.add("is-dragging"),document.addEventListener("pointermove",u),document.addEventListener("pointerup",d),document.addEventListener("pointercancel",r)}),M=r}function Ft(){let t=J(),e=[];return s.setlist.theme&&e.push(`# ${s.setlist.theme}`,""),t.forEach(i=>{e.push(gt(i))}),e.join(`
`)}function gt(t){let e=String(t?.title||"").trim(),i=String(t?.artist||"").trim(),n=i?`${e} / ${i}`:e;return s.setlist.copyFormat==="timestamp"?`00:00\u3000${n}\u300000:00`:n}async function It(){let t=Ft();if(!t.trim()){y("\u30B3\u30D4\u30FC\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093");return}try{await navigator.clipboard.writeText(t),y("\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F")}catch{y("\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}}async function At(t){let e=J()[t];if(!e){y("\u30B3\u30D4\u30FC\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093");return}try{await navigator.clipboard.writeText(gt(e)),y("1\u66F2\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F")}catch{y("\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}}function Bt(t,e){let i=t.rank===1?"r1":t.rank===2?"r2":t.rank===3?"r3":"",n=t.lastSung?`<span class="last-date">${D(t.lastSung)}</span><span class="badge ${z(t.daysSinceLast)}">${t.daysSinceLast}\u65E5\u524D</span>`:'<span class="last-date">\u5C65\u6B74\u672A\u78BA\u8A8D</span><span class="badge never">\u8981\u78BA\u8A8D</span>',o=Q(t.title,e),l=Q(t.artist,e),u=Z(t,s.songsQuery),d=B(t.key);return`
    <div class="song-row" data-songkey="${a(t.key)}" data-songtitle="${a(t.title)}" data-songartist="${a(t.artist)}" title="\u30AF\u30EA\u30C3\u30AF\u3067\u66F2\u8A73\u7D30\u3092\u8868\u793A">
      <div class="rank ${i}">${t.rank}</div>
      <div class="info">
        <div class="title song-title-line"><span class="song-title-text">${o}</span><button class="fav-btn ${d?"is-active":""}" type="button" data-fav-toggle="${a(t.key)}" aria-label="\u304A\u6C17\u306B\u5165\u308A" aria-pressed="${d?"true":"false"}" title="\u304A\u6C17\u306B\u5165\u308A">${d?"\u2665":"\u2661"}</button></div>
        <button class="artist artist-search-btn" type="button" data-artist-search="${a(t.artist)}">${l}</button>
        <div class="song-meta-line">
          <span class="genre-badge">${a(I(t))}</span>
          ${Qt(t)}
          ${u.map(r=>`<span class="match-badge">${a(r)}\u4E00\u81F4</span>`).join("")}
        </div>
        ${qt(t)}
      </div>
      <div class="song-row-side">
        <div class="count">${t.count}<small>\u56DE</small></div>
        <div class="last">${n}</div>
      </div>
    </div>
  `}function Dt(){let t=c("#setlist-toggle-btn");if(!t)return;let e=s.setlist.items.length;t.setAttribute("aria-expanded",s.setlistExpanded?"true":"false"),t.textContent=s.setlistExpanded?`\u30BB\u30C8\u30EA\u5236\u4F5C\u3092\u9589\u3058\u308B${e?` (${e})`:""}`:`\u30BB\u30C8\u30EA\u5236\u4F5C\u3092\u958B\u304F${e?` (${e})`:""}`}function Qt(t){return[...(t.seasonTags||[]).map(i=>({tag:i,type:"season"})),...(t.moodTags||[]).map(i=>({tag:i,type:"mood"})),...s.singerMode?(t.singerTags||[]).map(i=>({tag:i,type:"tag"})):[]].slice(0,s.songsView==="compact"?2:5).map(({tag:i,type:n})=>`
    <button class="tag-badge tag-click" type="button" data-tag-type="${n}" data-tag-search="${a(i)}">${a(i)}</button>
  `).join("")}function qt(t){if(!s.singerMode)return"";let e=`<button class="setlist-add-btn" type="button" data-setlist-action="add" data-songkey="${a(t.key)}">\uFF0B\u30BB\u30C8\u30EA</button>`;if(!s.data?.stats?.keyPublished)return`<div class="song-key-line song-key-actions">${e}</div>`;let i=String(t.displayKey||"").trim();return i?`
    <div class="song-key-line song-key-actions">
      <button type="button" class="song-key-badge" title="\u7D71\u5408\u96C6\u8A08 T/U\u5217\u306E\u30AD\u30FC">
        <span>\u30AD\u30FC</span><strong>${a(i)}</strong>
      </button>
      ${e}
    </div>
  `:`<div class="song-key-line song-key-actions"><span class="song-key-empty">\u30AD\u30FC\u672A\u767B\u9332</span>${e}</div>`}export{Gt as renderSongs};
