import{a as ot,e as rt,f as K,g as lt,h as dt,j as ct}from"./chunk-B4S6T2G5.js";import{b as k}from"./chunk-P5XWWZXF.js";import{G as j,I as nt,J as it,L as R,U as at,W as G,X as f,a as st,b as D,e,f as c,h as r,l as et,p as _,q as Q,r as q}from"./chunk-W7UWNHP7.js";var gt="ibara-setlist-v1",M=null,H=null,pt=()=>e.data?.songs||[];function mt({getCandidatePool:t}){t&&(pt=t)}function ft(){try{let t=localStorage.getItem(gt);if(!t)return;let s=JSON.parse(t);e.setlist.theme=String(s.theme||""),e.setlist.copyFormat=s.copyFormat==="timestamp"?"timestamp":"simple",e.setlist.items=Array.isArray(s.items)?s.items:[]}catch{e.setlist.items=[]}}function wt(){let t=e.setlist.items;if(!t.length)return window.location.href.split("?")[0];let s=btoa(unescape(encodeURIComponent(JSON.stringify(t)))),i=new URL(window.location.href.split("?")[0]);return i.searchParams.set("setlist",s),i.toString()}function vt(){try{let s=new URLSearchParams(window.location.search).get("setlist");if(!s)return;let i=decodeURIComponent(escape(atob(s))),n=JSON.parse(i);if(!Array.isArray(n)||!n.length)return;let l=new Set(e.setlist.items.map(o=>o.key)),u=n.filter(o=>!l.has(o.key));u.length&&(e.setlist.items=[...e.setlist.items,...u],L())}catch{}}async function kt(){let t=wt();if(!e.setlist.items.length){y("\u5171\u6709\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093");return}try{await navigator.clipboard.writeText(t),y("\u5171\u6709URL\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F")}catch{y("\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}}function L(){localStorage.setItem(gt,JSON.stringify(e.setlist))}function U(t){return(e.data.songs||[]).find(s=>s.key===t)||null}function I(t){t&&(e.setlist.items.push({key:t.key,title:t.title,artist:t.artist,displayKey:t.displayKey||"",genre:t.genre||"",moodTags:t.moodTags||[],seasonTags:t.seasonTags||[],daysSinceLast:t.daysSinceLast}),L(),y("\u8FFD\u52A0\u3057\u307E\u3057\u305F"))}function O(){let t=c("#setlist-custom-title"),s=c("#setlist-custom-artist"),i=c("#setlist-custom-key"),n=String(t?.value||"").trim(),l=String(s?.value||"").trim(),u=String(i?.value||"").trim();if(!n){y("\u66F2\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");return}e.setlist.items.push({key:`custom:${Date.now()}:${Math.random().toString(36).slice(2,8)}`,custom:!0,title:n,artist:l,displayKey:u,genre:"\u65B0\u898F",moodTags:[],seasonTags:[],daysSinceLast:null}),L(),y("\u65B0\u3057\u3044\u66F2\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F")}function xt(t){if(t.custom)return t;let s=U(t.key);return s?{...t,...s}:t}function yt(t){let s=t.dataset.setlistAction,i=Number(t.dataset.index);if(s==="add"&&I(U(t.dataset.songkey)),s==="todays-song-add"&&I(U(t.dataset.songkey)),s==="remove"&&e.setlist.items.splice(i,1),s==="up"&&i>0&&([e.setlist.items[i-1],e.setlist.items[i]]=[e.setlist.items[i],e.setlist.items[i-1]]),s==="down"&&i<e.setlist.items.length-1&&([e.setlist.items[i+1],e.setlist.items[i]]=[e.setlist.items[i],e.setlist.items[i+1]]),s==="copy-item"){Ct(i);return}if(s==="add-custom"){O();return}if(s==="random"&&Et(),s==="copy"&&Pt(),s==="share"){kt();return}s==="clear"&&confirm("\u30BB\u30C8\u30EA\u3092\u7A7A\u306B\u3057\u307E\u3059\u304B\uFF1F")&&(e.setlist.items=[]),L(),["add","random","copy"].includes(s)||y()}function Et(){let t=new Set(e.setlist.items.map(n=>n.key)),s=(pt()||[]).filter(n=>n.key&&!t.has(n.key));if(!s.length){y("\u8FFD\u52A0\u3067\u304D\u308B\u5019\u88DC\u304C\u3042\u308A\u307E\u305B\u3093");return}let i=s[Math.floor(Math.random()*s.length)];I(i)}function N(){return e.setlist.items.map(xt)}function ht(){if(!e.singerMode)return;e.setlistExpanded=!e.setlistExpanded,y();let t=c("#setlist-planner");e.setlistExpanded&&t?.scrollIntoView({behavior:"smooth",block:"start"})}function Tt(){let t=c("#setlist-toggle-btn");if(!t)return;let s=e.setlist.items.length;t.setAttribute("aria-expanded",e.setlistExpanded?"true":"false"),t.textContent=e.setlistExpanded?`\u30BB\u30C8\u30EA\u5236\u4F5C\u3092\u9589\u3058\u308B${s?` (${s})`:""}`:`\u30BB\u30C8\u30EA\u5236\u4F5C\u3092\u958B\u304F${s?` (${s})`:""}`}function y(t=""){let s=c("#setlist-planner");if(!s)return;if(Tt(),s.hidden=!e.singerMode||!e.setlistExpanded,s.classList.toggle("is-open",e.singerMode&&e.setlistExpanded),!e.singerMode){s.innerHTML="";return}let i=N(),n=it(i),l=i.length*5;s.innerHTML=`
    <div class="setlist-head">
      <div>
        <div class="recommend-label">Setlist Builder</div>
        <h3>\u4ECA\u65E5\u306E\u30BB\u30C8\u30EA</h3>
      </div>
      <div class="setlist-total">${i.length}\u66F2 / \u7D04${l}\u5206</div>
    </div>
    <input id="setlist-theme" class="text-input setlist-theme" type="text" placeholder="\u6B4C\u67A0\u30C6\u30FC\u30DE\u30E1\u30E2" value="${r(e.setlist.theme)}">
    <div class="setlist-search-add">
      <div class="setlist-search-wrap">
        <input id="setlist-search-input" class="text-input setlist-search-input"
               type="text" placeholder="\u66F2\u540D\u3092\u5165\u529B\u3057\u3066\u8FFD\u52A0\u2026" autocomplete="off" spellcheck="false">
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
      ${ut("\u30B8\u30E3\u30F3\u30EB",n.genres)}
      ${ut("\u96F0\u56F2\u6C17",n.moods)}
      <span>\u30AD\u30FC ${n.keys}/${i.length}</span>
      <span>\u4E45\u3057\u3076\u308A ${n.stale}</span>
    </div>
    <div class="setlist-items">
      ${i.length?i.map((u,o)=>Mt(u,o)).join(""):'<div class="setlist-empty">\u66F2\u306E\u300C\u30BB\u30C8\u30EA\u300D\u30DC\u30BF\u30F3\u304B\u30E9\u30F3\u30C0\u30E0\u8FFD\u52A0\u304B\u3089\u4F5C\u308C\u307E\u3059</div>'}
    </div>
    <div class="setlist-actions">
      <select id="setlist-copy-format" class="select-input">
        <option value="simple"${e.setlist.copyFormat==="simple"?" selected":""}>\u66F2\u540D / \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8</option>
        <option value="timestamp"${e.setlist.copyFormat==="timestamp"?" selected":""}>\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u5165\u529B\u7528</option>
      </select>
      <button class="btn ghost" type="button" data-setlist-action="random">\u30E9\u30F3\u30C0\u30E0\u8FFD\u52A0</button>
      <button class="btn primary" type="button" data-setlist-action="copy">\u30B3\u30D4\u30FC</button>
      <button class="btn ghost" type="button" data-setlist-action="share">${f("link")} \u5171\u6709</button>
      <button class="btn ghost" type="button" data-setlist-action="clear">\u30AF\u30EA\u30A2</button>
      ${t?`<span class="setlist-message">${r(t)}</span>`:""}
    </div>
  `,Ht(),It()}function ut(t,s){return s.length?`<span>${t} ${s.map(([i,n])=>`${r(i)} ${n}`).join(" / ")}</span>`:`<span>${t} \u2014</span>`}function Mt(t,s){return`
    <div class="setlist-item" data-index="${s}">
      <div class="setlist-no">${s+1}</div>
      <div class="setlist-drag-handle" title="\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3073\u66FF\u3048" aria-label="\u30C9\u30E9\u30C3\u30B0\u30CF\u30F3\u30C9\u30EB">${f("drag")}</div>
      <div class="setlist-info">
        <strong>${r(t.title)}</strong>
        <span>${t.artist?r(t.artist):"\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u672A\u5165\u529B"}${t.displayKey?` \xB7 key ${r(t.displayKey)}`:""}${t.custom?" \xB7 \u65B0\u898F":""}</span>
      </div>
      <div class="setlist-move">
        <button class="setlist-copy-one" type="button" data-setlist-action="copy-item" data-index="${s}" aria-label="${r(t.title)}\u3092\u30B3\u30D4\u30FC">\u29C9</button>
        <button type="button" data-setlist-action="up" data-index="${s}" aria-label="\u4E0A\u3078">\u2191</button>
        <button type="button" data-setlist-action="down" data-index="${s}" aria-label="\u4E0B\u3078">\u2193</button>
        <button type="button" data-setlist-action="remove" data-index="${s}" aria-label="\u524A\u9664">\xD7</button>
      </div>
    </div>
  `}function Ht(){let t=document.getElementById("setlist-search-input"),s=document.getElementById("setlist-search-dropdown");if(!t||!s)return;let i=[],n=-1;function l(d){let a=d.trim().toLowerCase();if(!a){s.hidden=!0,i=[],n=-1;return}let p=(e.data?.songs||[]).filter(m=>m.title.toLowerCase().includes(a)||(m.artist||"").toLowerCase().includes(a)).sort((m,$)=>{let w=m.title.toLowerCase().startsWith(a)?2:m.title.toLowerCase().includes(a)?1:0,v=$.title.toLowerCase().startsWith(a)?2:$.title.toLowerCase().includes(a)?1:0;return w!==v?v-w:$.count-m.count}).slice(0,8),b={_isNew:!0,title:d.trim()};p.length?(s.innerHTML=p.map((m,$)=>`
          <div class="setlist-dd-item" data-dd-idx="${$}">
            <span class="setlist-dd-icon">${f("music")}</span>
            <div class="setlist-dd-body">
              <div class="setlist-dd-title">${r(m.title)}</div>
              <div class="setlist-dd-meta">${r(m.artist||"\u2014")} \xB7 ${m.count}\u56DE</div>
            </div>
          </div>`).join("")+`<div class="setlist-dd-item setlist-dd-new" data-dd-idx="${p.length}">
          <span class="setlist-dd-plus">${f("plus")}</span>
          <div class="setlist-dd-body">
            <div class="setlist-dd-title">\u300C${r(d.trim())}\u300D\u3092\u65B0\u898F\u8FFD\u52A0</div>
            <div class="setlist-dd-meta">\u66F2\u30EA\u30B9\u30C8\u306B\u306A\u3044\u66F2\u3068\u3057\u3066\u8FFD\u52A0</div>
          </div>
        </div>`,i=[...p,b]):(s.innerHTML=`
        <div class="setlist-dd-item setlist-dd-new" data-dd-idx="0">
          <span class="setlist-dd-plus">${f("plus")}</span>
          <div class="setlist-dd-body">
            <div class="setlist-dd-title">\u300C${r(d.trim())}\u300D\u3092\u65B0\u898F\u8FFD\u52A0</div>
            <div class="setlist-dd-meta">\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u540D\u3092\u5165\u529B\u3057\u3066\u8FFD\u52A0\u3067\u304D\u307E\u3059</div>
          </div>
        </div>`,i=[b]),n=-1,s.hidden=!1,u()}function u(){s.querySelectorAll("[data-dd-idx]").forEach((d,a)=>d.classList.toggle("is-selected",a===n))}function o(d){let a=i[d];if(a)if(s.hidden=!0,i=[],n=-1,a._isNew){let g=document.querySelector(".setlist-custom-details"),p=document.getElementById("setlist-custom-title");g&&p?(g.open=!0,p.value=a.title,t.value="",document.getElementById("setlist-custom-artist")?.focus()):t.value=""}else t.value="",I(a)}t.addEventListener("input",()=>l(t.value)),t.addEventListener("keydown",d=>{if(s.hidden)return;let a=i.length;d.key==="ArrowDown"?(d.preventDefault(),n=(n+1)%a,u()):d.key==="ArrowUp"?(d.preventDefault(),n=(n-1+a)%a,u()):d.key==="Enter"?(d.preventDefault(),d.stopPropagation(),o(n>=0?n:0)):d.key==="Escape"&&(s.hidden=!0,n=-1)}),s.addEventListener("mousedown",d=>{let a=d.target.closest("[data-dd-idx]");a&&(d.preventDefault(),o(Number(a.dataset.ddIdx)))}),M&&document.removeEventListener("click",M),M=d=>{!t.contains(d.target)&&!s.contains(d.target)&&(s.hidden=!0,n=-1)},document.addEventListener("click",M)}function It(){H&&(H(),H=null);let t=document.querySelector(".setlist-items");if(!t)return;let s=null,i=()=>{s&&(s.rows.forEach(o=>{o.style.transform=""}),s.row.classList.remove("is-dragging"),t.classList.remove("is-drag-active"),s.row.removeEventListener("pointermove",n),s.row.removeEventListener("pointerup",l),s.row.removeEventListener("pointercancel",u),s=null)};function n(o){if(!s)return;o.preventDefault();let d=o.clientY-s.startY;if(!s.moved&&Math.abs(d)<3)return;s.moved=!0,s.row.style.transform=`translateY(${d}px)`;let a=s.mids[s.startIdx]+d,g=0;for(let p=0;p<s.mids.length;p++)p!==s.startIdx&&a>s.mids[p]&&g++;g!==s.targetIdx&&(s.targetIdx=g,s.rows.forEach((p,b)=>{if(b===s.startIdx)return;let m=0;s.startIdx<g&&b>s.startIdx&&b<=g?m=-s.rowH:s.startIdx>g&&b>=g&&b<s.startIdx&&(m=s.rowH),p.style.transform=m?`translateY(${m}px)`:""}))}function l(){if(!s)return;let{startIdx:o,targetIdx:d,moved:a}=s;if(i(),!a||d===o)return;let g=e.setlist.items;if(o<g.length){let[p]=g.splice(o,1);g.splice(d,0,p),L(),y()}}function u(){i()}t.addEventListener("pointerdown",o=>{if(s||o.button!=null&&o.button!==0)return;let d=!!o.target.closest(".setlist-drag-handle");if(o.pointerType==="touch"&&!d||o.target.closest("button, a, input, select, textarea"))return;let a=o.target.closest(".setlist-item");if(!a)return;o.preventDefault();let g=Array.from(t.querySelectorAll(".setlist-item")),p=g.indexOf(a);if(p<0)return;let b=g.map($=>{let w=$.getBoundingClientRect();return w.top+w.height/2}),m=a.getBoundingClientRect();s={rows:g,mids:b,startIdx:p,targetIdx:p,startY:o.clientY,rowH:m.height+(parseFloat(getComputedStyle(t).rowGap||getComputedStyle(t).gap)||0),row:a,moved:!1},a.classList.add("is-dragging"),t.classList.add("is-drag-active");try{a.setPointerCapture(o.pointerId)}catch{}a.addEventListener("pointermove",n,{passive:!1}),a.addEventListener("pointerup",l),a.addEventListener("pointercancel",u)}),H=i}function Ft(){let t=N(),s=[];return e.setlist.theme&&s.push(`# ${e.setlist.theme}`,""),t.forEach(i=>{s.push(bt(i))}),s.join(`
`)}function bt(t){let s=String(t?.title||"").trim(),i=String(t?.artist||"").trim(),n=i?`${s} / ${i}`:s;return e.setlist.copyFormat==="timestamp"?`00:00\u3000${n}\u300000:00`:n}async function Pt(){let t=Ft();if(!t.trim()){y("\u30B3\u30D4\u30FC\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093");return}try{await navigator.clipboard.writeText(t),y("\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F")}catch{y("\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}}async function Ct(t){let s=N()[t];if(!s){y("\u30B3\u30D4\u30FC\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093");return}try{await navigator.clipboard.writeText(bt(s)),y("1\u66F2\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F")}catch{y("\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}}var S,F,x,W,z,C,Lt,B,Bt=null,E=[],T=null;function X(){T&&(T.disconnect(),T=null)}function At(t){if(X(),e.songsLimit>=t)return;let s=document.getElementById("songs-infinite-sentinel");s&&(T=new IntersectionObserver(i=>{i[0].isIntersecting&&(e.songsLimit+=100,h())},{rootMargin:"200px"}),T.observe(s))}function is(){X(),mt({getCandidatePool:()=>E.length?E:e.data?.songs||[]}),ft(),vt(),ot(e.data?.songs||[]);let t=c("#panel-songs");t.innerHTML=`
    <div class="section-header">
      <h2>${e.singerMode?`${f("mic")} \u9078\u66F2\u30DC\u30FC\u30C9`:`${f("music")} \u5168\u66F2\u30EA\u30B9\u30C8`}</h2>
      <span class="count-pill" id="songs-count">\u2014</span>
    </div>
    <div id="songs-filter-panel" class="mobile-panel mobile-panel-filters is-open">
      <div class="songs-search-shell">
        <div class="search-input-wrap">
          <span class="songs-search-icon" aria-hidden="true">${f("search")}</span>
          <input id="songs-search" class="text-input songs-search-input" type="search" placeholder="\u66F2\u540D\u30FB\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u30FB\u96F0\u56F2\u6C17\u3067\u691C\u7D22" value="${r(e.songsQuery)}">
          <div id="search-history-dropdown" class="search-history-dropdown" hidden></div>
        </div>
        <button class="songs-fav-toggle ${e.favoritesFilter?"is-active":""}" type="button" data-filter="favorites" aria-pressed="${e.favoritesFilter?"true":"false"}" aria-label="\u304A\u6C17\u306B\u5165\u308A\u3060\u3051\u8868\u793A" data-tooltip="\u304A\u6C17\u306B\u5165\u308A\u3060\u3051\u8868\u793A">${f("heart")}</button>
        ${e.singerMode?'<button class="songs-setlist-mini btn primary" id="setlist-toggle-btn" type="button" aria-controls="setlist-planner" aria-expanded="'+(e.setlistExpanded?"true":"false")+'">'+(e.setlistExpanded?"\u30BB\u30C8\u30EA\u3092\u9589\u3058\u308B":"\u30BB\u30C8\u30EA\u5236\u4F5C")+"</button>":""}
      </div>
      <!-- \u96F0\u56F2\u6C17\u30B5\u30B8\u30A7\u30B9\u30C8\u30C1\u30C3\u30D7\uFF08\u5E38\u6642\u8868\u793A\u30FB8\u7A2E\u306E\u307F\uFF09 -->
      <div id="search-suggest" class="suggest-strip songs-suggest-strip" role="group" aria-label="\u96F0\u56F2\u6C17\u3067\u7D20\u65E9\u304F\u691C\u7D22">
        ${[["chill","\u30C1\u30EB\u306A\u66F2"],["\u3042\u3064\u3044","\u3042\u3064\u3044\u66F2"],["\u3057\u3063\u3068\u308A","\u3057\u3063\u3068\u308A"],["\u30A8\u30E2\u3044","\u30A8\u30E2\u3044"],["\u304B\u308F\u3044\u3044","\u304B\u308F\u3044\u3044"]].map(([n,l])=>`<button type="button" class="suggest-chip" data-suggest="${r(l)}">${n}</button>`).join("")}
      </div>
      <details class="songs-advanced">
        <summary>
          <span>\u7D5E\u308A\u8FBC\u307F</span>
          <small>\u4E26\u3073\u9806\u30FB\u30B8\u30E3\u30F3\u30EB\u30FB\u72B6\u614B</small>
        </summary>
        <div class="songs-advanced-body">
          <div class="controls songs-control-grid">
        <select id="songs-sort" class="select-input">
          <option value="count-desc">\u56DE\u6570\uFF08\u591A\uFF09</option>
          <option value="count-asc">\u56DE\u6570\uFF08\u5C11\uFF09</option>
          <option value="recent">\u6700\u7D42\u62AB\u9732\uFF08\u65B0\uFF09</option>
          <option value="oldest">\u6700\u7D42\u62AB\u9732\uFF08\u53E4\uFF09</option>
          <option value="title">\u66F2\u540D\uFF08\u3042\u2192\u3093\uFF09</option>
          <option value="artist">\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8</option>
        </select>
        <select id="songs-genre" class="select-input genre-select" title="\u30B8\u30E3\u30F3\u30EB\u3067\u7D5E\u308A\u8FBC\u307F">
          ${_t()}
        </select>
          </div>
      <!-- \u7D5E\u308A\u8FBC\u307F\u30DC\u30BF\u30F3\u884C -->
      <div class="controls songs-filter-row" id="songs-filters">
        <button class="btn ghost" data-filter="all">\u3059\u3079\u3066</button>
        <button class="btn ghost" data-filter="fresh">\u{1F7E2} \u6700\u8FD1</button>
        <button class="btn ghost" data-filter="stale">\u{1F7E0} \u4E45\u3057\u3076\u308A</button>
        <button class="btn ghost" data-filter="never">\u26AA \u672A\u78BA\u8A8D</button>
        <button class="btn ghost songs-favorites-filter" data-filter="favorites">${f("heart")} \u304A\u6C17\u306B\u5165\u308A</button>
        ${e.singerMode?"":`<button class="btn ghost" id="recommend-btn" type="button">${f("lightbulb")} \u304A\u3059\u3059\u3081</button><button class="btn ghost" id="todays-song-btn" type="button">${f("dice")} \u4ECA\u65E5\u306E\u4E00\u66F2</button>`}
      </div>
      ${e.singerMode?`
        <div class="songs-tools">
          <button class="btn ghost" data-singer-preset="keyed" type="button">\u30AD\u30FC\u78BA\u8A8D\u6E08\u307F</button>
          <button class="btn ghost" data-singer-preset="classic" type="button">\u5B9A\u756A</button>
          <button class="btn ghost" data-singer-preset="stale" type="button">\u4E45\u3057\u3076\u308A</button>
          <button class="btn ghost" data-singer-preset="rare" type="button">\u30EC\u30A2</button>
          <button class="btn ghost" data-singer-preset="chill" type="button">Chill</button>
          <button class="btn ghost" data-singer-preset="energetic" type="button">\u6FC0\u3057\u3044</button>
          <button class="btn ghost" data-singer-preset="nostalgic" type="button">\u30CE\u30B9\u30BF\u30EB\u30B8\u30C3\u30AF</button>
          <button class="btn ghost" id="compact-btn" type="button">\u8868\u793A: ${e.songsView==="compact"?"\u30B3\u30F3\u30D1\u30AF\u30C8":"\u8A73\u7D30"}</button>
          <button class="btn ghost" id="todays-song-btn" type="button">${f("dice")} \u4ECA\u65E5\u306E\u4E00\u66F2</button>
        </div>
      `:""}
          <div class="genre-strip" id="songs-genre-chips">${Qt()}</div>
        </div>
      </details>
    </div>
    ${e.singerMode?'<div id="setlist-planner" class="setlist-planner mobile-panel mobile-panel-setlist"></div>':""}
    <div id="todays-song-box" class="todays-song-box" hidden></div>
    <div id="songs-list" class="song-list"></div>
    <div class="timeline-controls" id="songs-more-wrap"></div>
  `,S=c("#songs-search"),F=c("#songs-sort"),x=c("#songs-genre"),W=c("#songs-filters"),z=c("#songs-genre-chips"),C=c("#songs-list"),Lt=c("#songs-count"),B=c("#songs-more-wrap"),F.value=e.songsSort,x.value=Dt(e.songsGenre)?e.songsGenre:"all",e.songsGenre=x.value,V(),J(),Y();let s=document.getElementById("search-suggest"),i=at(()=>{e.songsQuery=S.value,e.songsLimit=100,K(e.songsQuery),P(),k({tab:"songs",q:e.songsQuery},{replace:!0}),J(),h()},120);S.addEventListener("input",()=>{i()}),S.addEventListener("focus",()=>{$t()}),S.addEventListener("blur",()=>{setTimeout(()=>{P()},200)}),s&&s.addEventListener("click",n=>{let l=n.target.closest("[data-suggest]");if(!l)return;let u=l.dataset.suggest;S.value===u?(S.value="",e.songsQuery=""):(S.value=u,e.songsQuery=u),e.songsLimit=100,K(e.songsQuery||u),k({tab:"songs",q:e.songsQuery},{replace:!0}),J(),h()}),F.addEventListener("change",()=>{e.songsSort=F.value,h()}),x.addEventListener("change",()=>{e.songsGenre=x.value,e.songsLimit=100,Y(),h()}),W.addEventListener("click",n=>{let l=n.target.closest("[data-filter]");l&&(l.dataset.filter==="favorites"?e.favoritesFilter=!e.favoritesFilter:(e.songsFilter=l.dataset.filter,e.favoritesFilter=!1),e.songsLimit=100,V(),h())}),t.querySelector(".songs-fav-toggle")?.addEventListener("click",()=>{e.favoritesFilter=!e.favoritesFilter,e.favoritesFilter&&(e.songsFilter="all"),e.songsLimit=100,V(),h()}),z.addEventListener("click",n=>{let l=n.target.closest("[data-genre]");l&&(e.songsGenre=l.dataset.genre,x.value=e.songsGenre,e.songsLimit=100,Y(),h())});for(let n of t.querySelectorAll("[data-singer-preset]"))n.addEventListener("click",()=>{e.singerMode=!0,e.singerPreset=e.singerPreset===n.dataset.singerPreset?"all":n.dataset.singerPreset,e.songsLimit=100,h()});c("#compact-btn")?.addEventListener("click",()=>{e.songsView=e.songsView==="compact"?"comfortable":"compact",h()}),c("#setlist-toggle-btn")?.addEventListener("click",()=>ht()),c("#recommend-btn")?.addEventListener("click",()=>jt()),c("#todays-song-btn")?.addEventListener("click",()=>St()),t.onclick=n=>{if(n.target.closest("#search-history-clear")){n.preventDefault(),n.stopPropagation(),dt(),P();return}let u=n.target.closest(".search-history-remove");if(u){n.preventDefault(),n.stopPropagation(),lt(u.dataset.remove),$t();return}let o=n.target.closest(".search-history-item");if(o){n.preventDefault(),n.stopPropagation();let v=o.dataset.query;e.songsQuery=v,S.value=v,e.songsLimit=100,P(),k({tab:"songs",q:v}),h();return}if(n.target.closest("[data-recommend-dismiss]")){n.preventDefault(),n.stopPropagation();let v=c("#recommend-box");v&&(v.hidden=!0,v.innerHTML="");return}if(n.target.closest("[data-todays-song-dismiss]")){n.preventDefault(),n.stopPropagation();let v=c("#todays-song-box");v&&(v.hidden=!0,v.innerHTML="");return}if(n.target.closest("[data-todays-song-reroll]")){n.preventDefault(),n.stopPropagation(),St();return}let p=n.target.closest("[data-setlist-action]");if(p){n.stopPropagation(),yt(p);return}let b=n.target.closest("[data-artist-search]");if(b){n.stopPropagation();let v=String(b.dataset.artistSearch||"").replace(/"/g,"");e.songsQuery=`artist:"${v}"`,S.value=e.songsQuery,e.songsLimit=100,k({tab:"songs",q:e.songsQuery}),h();return}let m=n.target.closest("[data-fav-toggle]");if(m){n.preventDefault(),n.stopPropagation();let v=m.dataset.favToggle;st(v);let tt=D(v);m.classList.toggle("is-active",tt),m.setAttribute("aria-pressed",String(tt)),m.innerHTML=f("heart");return}let $=n.target.closest("[data-tag-search]");if(!$)return;n.stopPropagation();let w=$.dataset.tagType||"tag";e.songsQuery=`${w}:${$.dataset.tagSearch}`,S.value=e.songsQuery,e.songsLimit=100,k({tab:"songs",q:e.songsQuery}),h()},t.oninput=n=>{n.target.id==="setlist-theme"&&(e.setlist.theme=n.target.value,L())},t.onchange=n=>{n.target.id==="setlist-copy-format"&&(e.setlist.copyFormat=n.target.value,L())},t.onkeydown=n=>{n.key==="Enter"&&(!n.target.closest(".setlist-custom-add")&&!n.target.closest(".setlist-custom-details")||n.target.tagName!=="BUTTON"&&(n.preventDefault(),O()))},h()}function $t(){let t=rt(),s=c("#search-history-dropdown");s&&(Bt=s,t.length?s.innerHTML=`
      <div class="search-history-header">
        <span>\u691C\u7D22\u5C65\u6B74</span>
        <button class="search-history-clear-btn" type="button" id="search-history-clear">\u3059\u3079\u3066\u524A\u9664</button>
      </div>
      ${t.map(i=>`
        <div class="search-history-item" data-query="${r(i)}">
          <span class="search-history-query">${r(i)}</span>
          <button class="search-history-remove" type="button" data-remove="${r(i)}" aria-label="\u524A\u9664">\xD7</button>
        </div>
      `).join("")}
    `:s.innerHTML='<div class="search-history-empty">\u691C\u7D22\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093</div>',s.hidden=!1)}function P(){let t=c("#search-history-dropdown");t&&(t.hidden=!0)}function A(t){return String(t.genre||"\u672A\u5206\u985E").trim()||"\u672A\u5206\u985E"}function Z(){let t=new Map;for(let s of e.data.songs||[]){let i=A(s);t.set(i,(t.get(i)||0)+1)}return[...t.entries()].sort((s,i)=>i[1]-s[1]||s[0].localeCompare(i[0],"ja"))}function Dt(t){return t==="all"||Z().some(([s])=>s===t)}function _t(){let t=['<option value="all">\u5168\u30B8\u30E3\u30F3\u30EB</option>'];for(let[s,i]of Z())t.push(`<option value="${r(s)}">${r(s)} (${i})</option>`);return t.join("")}function Qt(){let t=['<button class="genre-chip" type="button" data-genre="all">\u5168\u30B8\u30E3\u30F3\u30EB</button>'];for(let[s,i]of Z())t.push(`
      <button class="genre-chip" type="button" data-genre="${r(s)}">
        <span>${r(s)}</span><small>${i}</small>
      </button>
    `);return t.join("")}function Y(){for(let t of z.querySelectorAll("[data-genre]"))t.classList.toggle("active",t.dataset.genre===e.songsGenre)}function V(){for(let s of W.querySelectorAll("[data-filter]"))s.dataset.filter==="favorites"?(s.classList.toggle("primary",e.favoritesFilter),s.classList.toggle("ghost",!e.favoritesFilter)):(s.classList.toggle("primary",s.dataset.filter===e.songsFilter&&!e.favoritesFilter),s.classList.toggle("ghost",s.dataset.filter!==e.songsFilter||e.favoritesFilter));let t=document.querySelector(".songs-fav-toggle");t&&(t.classList.toggle("is-active",e.favoritesFilter),t.setAttribute("aria-pressed",String(e.favoritesFilter)),t.innerHTML=f("heart"))}function J(){let t=document.getElementById("search-suggest");if(!t)return;let s=(e.songsQuery||"").trim();for(let i of t.querySelectorAll("[data-suggest]"))i.classList.toggle("is-active",i.dataset.suggest===s)}function h(){let{songs:t}=e.data,s=_(t,e.songsGenre,A),i=q(s,{singerMode:e.singerMode,preset:e.singerPreset,keyPublished:e.data?.stats?.keyPublished}),n=Q(i,e.songsFilter),{results:l,tokens:u}=ct(e.songsQuery,n),o=e.songsQuery.trim()?l.filter(a=>n.includes(a)):n;if(e.favoritesFilter&&(o=o.filter(a=>e.favorites.has(a.key))),o=j(o,e.songsSort,!!e.songsQuery.trim()),E=o,Lt.textContent=`${o.length} / ${t.length}\u66F2`,!o.length){C.innerHTML='<div class="empty-state">\u8A72\u5F53\u3059\u308B\u66F2\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F420}</div>',B.innerHTML="";return}let d=o.slice(0,e.songsLimit);C.classList.toggle("compact",e.songsView==="compact");for(let a of document.querySelectorAll("[data-singer-preset]")){let g=e.singerMode&&e.singerPreset===a.dataset.singerPreset;a.classList.toggle("primary",g),a.classList.toggle("ghost",!g)}c("#compact-btn")&&(c("#compact-btn").textContent=`\u8868\u793A: ${e.songsView==="compact"?"\u30B3\u30F3\u30D1\u30AF\u30C8":"\u8A73\u7D30"}`),C.innerHTML=d.map(a=>Rt(a,u)).join(""),y(),e.songsLimit<o.length?(B.innerHTML=`
      <div id="songs-infinite-sentinel" style="height:1px;width:100%;"></div>
      <button class="load-more-btn" id="songs-more">\u25BC \u3082\u3063\u3068\u8868\u793A (\u6B8B\u308A${o.length-e.songsLimit}\u66F2)</button>
    `,c("#songs-more").addEventListener("click",()=>{e.songsLimit+=200,h()}),At(o.length)):(X(),B.innerHTML="")}function St(){let t=c("#todays-song-box");if(!t)return;if(!E.length){t.hidden=!1,t.innerHTML='<div class="empty-state">\u6761\u4EF6\u306B\u5408\u3046\u66F2\u304C\u3042\u308A\u307E\u305B\u3093</div>';return}let s=E[Math.floor(Math.random()*E.length)];t.hidden=!1,t.innerHTML=qt(s)}function qt(t){let s=t.lastSung?`${R(t.lastSung)} \xB7 ${t.daysSinceLast}\u65E5\u524D`:"\u5C65\u6B74\u672A\u78BA\u8A8D",i=String(t.displayKey||"").split(",").map(l=>l.trim()).filter(Boolean).map(l=>`<span class="todays-song-key">\u30AD\u30FC ${r(l)}</span>`).join(""),n=e.singerMode?`<button class="btn primary" type="button" data-setlist-action="todays-song-add" data-songkey="${r(t.key)}">${f("plus")} \u30BB\u30C8\u30EA\u306B\u8FFD\u52A0</button>`:"";return`
    <div class="todays-song-card">
      <div class="todays-song-header">
        <span class="todays-song-label">${f("dice")} \u4ECA\u65E5\u306E\u4E00\u66F2</span>
        <button class="todays-song-dismiss" type="button" data-todays-song-dismiss aria-label="\u9589\u3058\u308B">\xD7</button>
      </div>
      <div class="todays-song-info">
        <div class="todays-song-title">${r(t.title)}</div>
        <div class="todays-song-artist">${r(t.artist)}</div>
        <div class="todays-song-meta">
          <span class="todays-song-count">${t.count}\u56DE</span>
          <span class="todays-song-last">${s}</span>
          ${i}
        </div>
      </div>
      <div class="todays-song-actions">
        ${n}
        <button class="btn ghost" type="button" data-todays-song-reroll>\u5225\u306E\u3082\u3046\u4E00\u56DE</button>
      </div>
    </div>
  `}function jt(){let t=c("#recommend-box"),s=j(q(Q(_(e.data.songs,"all",A),e.songsFilter),{singerMode:e.singerMode,preset:e.singerPreset,keyPublished:e.data?.stats?.keyPublished}).filter(l=>l.lastSung&&(l.displayKey||!e.data.stats.keyPublished)),"oldest",!1);if(!s.length){t.hidden=!1,t.innerHTML='<div class="empty-state">\u6761\u4EF6\u306B\u5408\u3046\u304A\u3059\u3059\u3081\u5019\u88DC\u304C\u3042\u308A\u307E\u305B\u3093</div>';return}let i=s.slice(0,Math.min(80,s.length)),n=i[Math.floor(Math.random()*i.length)];t.hidden=!1,t.innerHTML=`
    <div class="recommend-card" data-songkey="${r(n.key)}" data-songtitle="${r(n.title)}" data-songartist="${r(n.artist)}">
      <div>
        <div class="recommend-label">\u4ECA\u65E5\u306E\u5019\u88DC</div>
        <strong>${r(n.title)}</strong>
        <span>/ ${r(n.artist)}</span>
      </div>
      <div class="recommend-meta">
        <span>${n.count}\u56DE</span>
        <span>${n.daysSinceLast??"\u2014"}\u65E5\u524D</span>
        ${String(n.displayKey||"").split(",").map(l=>l.trim()).filter(Boolean).map(l=>`<span>\u30AD\u30FC ${r(l)}</span>`).join("")}
      </div>
      <button class="recommend-dismiss" type="button" data-recommend-dismiss aria-label="\u304A\u3059\u3059\u3081\u9078\u66F2\u3092\u9589\u3058\u308B">\xD7</button>
    </div>
  `}function Rt(t,s){let i=t.rank===1?"r1":t.rank===2?"r2":t.rank===3?"r3":"",n=t.lastSung?`<span class="last-date">${R(t.lastSung)}</span><span class="badge ${et(t.daysSinceLast)}">${t.daysSinceLast}\u65E5\u524D</span>`:'<span class="last-date">\u5C65\u6B74\u672A\u78BA\u8A8D</span><span class="badge never">\u8981\u78BA\u8A8D</span>',l=G(t.title,s),u=G(t.artist,s),o=nt(t,e.songsQuery),d=D(t.key);return`
    <div class="song-row" data-songkey="${r(t.key)}" data-songtitle="${r(t.title)}" data-songartist="${r(t.artist)}" title="\u30AF\u30EA\u30C3\u30AF\u3067\u66F2\u8A73\u7D30\u3092\u8868\u793A">
      <div class="rank ${i}">${t.rank}</div>
      <div class="info">
        <div class="title song-title-line"><span class="song-title-text">${l}</span><button class="fav-btn ${d?"is-active":""}" type="button" data-fav-toggle="${r(t.key)}" aria-label="\u304A\u6C17\u306B\u5165\u308A" aria-pressed="${d?"true":"false"}" data-tooltip="\u304A\u6C17\u306B\u5165\u308A">${f("heart")}</button></div>
        <button class="artist artist-search-btn" type="button" data-artist-search="${r(t.artist)}">${u}</button>
        <div class="song-meta-line">
          <span class="genre-badge">${r(A(t))}</span>
          ${Gt(t)}
          ${o.map(a=>`<span class="match-badge">${r(a)}\u4E00\u81F4</span>`).join("")}
        </div>
        ${Kt(t)}
      </div>
      <div class="song-row-side">
        <div class="count">${t.count}<small>\u56DE</small></div>
        <div class="last">${n}</div>
      </div>
    </div>
  `}function Gt(t){return[...(t.seasonTags||[]).map(i=>({tag:i,type:"season"})),...(t.moodTags||[]).map(i=>({tag:i,type:"mood"})),...e.singerMode?(t.singerTags||[]).map(i=>({tag:i,type:"tag"})):[]].slice(0,e.songsView==="compact"?2:5).map(({tag:i,type:n})=>`
    <button class="tag-badge tag-click" type="button" data-tag-type="${n}" data-tag-search="${r(i)}">${r(i)}</button>
  `).join("")}function Kt(t){if(!e.singerMode)return"";let s=`<button class="setlist-add-btn" type="button" data-setlist-action="add" data-songkey="${r(t.key)}">${f("plus")} \u30BB\u30C8\u30EA</button>`;if(!e.data?.stats?.keyPublished)return`<div class="song-key-line song-key-actions">${s}</div>`;let i=String(t.displayKey||"").split(",").map(l=>l.trim()).filter(Boolean);return i.length?`<div class="song-key-line song-key-actions">${i.map(l=>`<button type="button" class="song-key-badge" data-tooltip="\u914D\u4FE1\u3067\u4F7F\u308F\u308C\u305F\u53C2\u8003\u30AD\u30FC"><span>\u30AD\u30FC</span><strong>${r(l)}</strong></button>`).join("")}${s}</div>`:`<div class="song-key-line song-key-actions"><span class="song-key-empty">\u30AD\u30FC\u672A\u767B\u9332</span>${s}</div>`}export{is as renderSongs};
