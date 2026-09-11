import{c as k}from"./chunk-ZGMLTK2D.js";import{b as h,c as g}from"./chunk-FCOJKAWC.js";import{L as v,N as $,X as u,e as r,f as d,h as c}from"./chunk-W7UWNHP7.js";function S(s){let o=new Map;for(let t of s){let n=t.date instanceof Date?t.date:new Date(t.date||0),i=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`,l=`${n.getFullYear()}\u5E74${n.getMonth()+1}\u6708`;o.has(i)||o.set(i,{key:i,label:l,streams:[]}),o.get(i).streams.push(t)}return[...o.values()]}function L(s,o){let t=[...s],n=e=>e.date instanceof Date?e.date.getTime():new Date(e.date||0).getTime(),i=e=>Number(e.index)||0,l=e=>e.songs?.length||0,m=(e,a)=>n(a)-n(e)||i(a)-i(e);switch(o){case"date-asc":t.sort((e,a)=>n(e)-n(a)||i(e)-i(a));break;case"songs-desc":t.sort((e,a)=>l(a)-l(e)||m(e,a));break;case"songs-asc":t.sort((e,a)=>l(e)-l(a)||m(e,a));break;case"index-desc":t.sort((e,a)=>i(a)-i(e)||m(e,a));break;case"index-asc":t.sort((e,a)=>i(e)-i(a)||m(e,a));break;case"title":t.sort((e,a)=>String(e.title||"").localeCompare(String(a.title||""),"ja")||m(e,a));break;case"date-desc":default:t.sort(m);break}return t}function T(s){return(s.songs||[]).map(o=>{let t=String(o?.title||"").trim(),n=String(o?.artist||"").trim();return n?`${t} / ${n}`:t}).filter(Boolean).join(`
`)}var E=u("copy"),H=u("play");function y(){let{streams:s}=r.data,o=r.timelineFilter,t=o?s.filter(e=>e.songs.some(a=>a.key===o.key)):s,n=L(t,r.timelineSort),i=r.timelineSort==="date-desc"||r.timelineSort==="date-asc",l=d("#panel-timeline");l.innerHTML=`
    <div class="section-header">
      <h2>${u("calendar")} \u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3</h2>
      <span class="count-pill">${n.length}\u67A0</span>
    </div>
    <div class="timeline-tools">
      <label class="timeline-sort-field" for="timeline-sort">
        <span>\u4E26\u3073\u66FF\u3048</span>
        <select id="timeline-sort" class="select-input">
          <option value="date-desc"${r.timelineSort==="date-desc"?" selected":""}>\u914D\u4FE1\u65E5\uFF08\u65B0\u3057\u3044\u9806\uFF09</option>
          <option value="date-asc"${r.timelineSort==="date-asc"?" selected":""}>\u914D\u4FE1\u65E5\uFF08\u53E4\u3044\u9806\uFF09</option>
          <option value="songs-desc"${r.timelineSort==="songs-desc"?" selected":""}>\u66F2\u6570\uFF08\u591A\u3044\u9806\uFF09</option>
          <option value="songs-asc"${r.timelineSort==="songs-asc"?" selected":""}>\u66F2\u6570\uFF08\u5C11\u306A\u3044\u9806\uFF09</option>
          <option value="index-desc"${r.timelineSort==="index-desc"?" selected":""}>\u67A0\u756A\u53F7\uFF08\u5927\u304D\u3044\u9806\uFF09</option>
          <option value="index-asc"${r.timelineSort==="index-asc"?" selected":""}>\u67A0\u756A\u53F7\uFF08\u5C0F\u3055\u3044\u9806\uFF09</option>
          <option value="title"${r.timelineSort==="title"?" selected":""}>\u30BF\u30A4\u30C8\u30EB\u9806</option>
        </select>
      </label>
      ${i?`<label class="timeline-sort-field" for="timeline-month-jump">
        <span>\u6708\u3078\u79FB\u52D5</span>
        <select id="timeline-month-jump" class="select-input">
          <option value="">\u9078\u629E\u2026</option>
        </select>
      </label>`:""}
    </div>
    <div id="timeline-filter-banner"></div>
    <div id="timeline" class="timeline"></div>
    <div class="timeline-controls" id="timeline-controls"></div>
  `,d("#timeline-sort")?.addEventListener("change",e=>{r.timelineSort=e.target.value||"date-desc",r.timelineLimit=h,y()});let m=d("#timeline-filter-banner");if(o){let e=n.reduce((a,b)=>a+b.songs.filter(f=>f.key===o.key).length,0);m.innerHTML=`
      <div class="filter-banner">
        <span class="filter-icon">${u("search")}</span>
        <div class="filter-text">
          <strong>${c(o.title)}</strong>
          <span style="color:var(--ink-mute);"> / ${c(o.artist)}</span>
          <span class="meta">\u3053\u306E\u66F2\u3092\u6B4C\u3063\u305F\u914D\u4FE1\u306E\u307F\u8868\u793A\u4E2D\uFF08${n.length}\u67A0 / ${e}\u56DE\u6B4C\u5531\uFF09</span>
        </div>
        <button class="clear-btn" id="clear-filter">${u("close")} \u7D5E\u308A\u8FBC\u307F\u3092\u89E3\u9664</button>
      </div>
    `,d("#clear-filter").addEventListener("click",()=>{r.timelineFilter=null,r.timelineLimit=h,y()})}if(!n.length){d("#timeline").innerHTML='<div class="empty-state">\u8A72\u5F53\u3059\u308B\u914D\u4FE1\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F420}</div>';return}i?w(n,o):A(n,o)}function w(s,o){let t=S(s),n=d("#timeline-month-jump");if(n&&(n.innerHTML='<option value="">\u9078\u629E\u2026</option>'+t.map(i=>`<option value="${c(i.key)}">${c(i.label)}\uFF08${i.streams.length}\u67A0\uFF09</option>`).join(""),n.addEventListener("change",()=>{let i=n.value;if(!i)return;let l=document.getElementById(`tl-month-${i}`);l&&(l.open=!0,l.scrollIntoView({behavior:"smooth",block:"start"}),n.value="")})),d("#timeline").innerHTML=t.map((i,l)=>{let m=i.streams.map((e,a)=>M(e,a,o)).join("");return`
      <details class="timeline-month-group" id="tl-month-${c(i.key)}"${l===0?" open":""}>
        <summary class="timeline-month-summary">
          <span class="timeline-month-label">${c(i.label)}</span>
          <span class="count-pill">${i.streams.length}\u67A0</span>
        </summary>
        <div class="timeline-month-items">${m}</div>
      </details>
    `}).join(""),r.timelineFocus){let l=document.querySelector(`[data-streamkey="${CSS.escape(r.timelineFocus)}"]`)?.closest(".timeline-item");l&&(l.closest(".timeline-month-group")?.setAttribute("open",""),l.classList.add("focus"),l.scrollIntoView({behavior:"smooth",block:"center"})),r.timelineFocus=null}I(s)}function A(s,o){let t=s.slice(0,r.timelineLimit);if(d("#timeline").innerHTML=t.map((i,l)=>M(i,l,o)).join(""),r.timelineFocus){let l=document.querySelector(`[data-streamkey="${CSS.escape(r.timelineFocus)}"]`)?.closest(".timeline-item");l?.classList.add("focus"),l?.scrollIntoView({behavior:"smooth",block:"center"}),r.timelineFocus=null}let n=d("#timeline-controls");r.timelineLimit<s.length&&(n.innerHTML=`<button class="load-more-btn" id="load-more">${u("chevronDown")} \u3082\u3063\u3068\u898B\u308B (\u6B8B\u308A${s.length-r.timelineLimit}\u67A0)</button>`,d("#load-more").addEventListener("click",()=>{r.timelineLimit+=g,y()})),I(t)}function I(s){d("#timeline").onclick=async o=>{let t=o.target.closest("[data-copy-key]");if(!t)return;o.preventDefault(),o.stopPropagation();let n=t.dataset.copyKey,i=s.find(l=>$(l)===n);if(i)try{await navigator.clipboard.writeText(T(i)),t.classList.add("is-copied"),t.setAttribute("aria-label","\u30B3\u30D4\u30FC\u6E08\u307F"),t.setAttribute("data-tooltip","\u30B3\u30D4\u30FC\u6E08\u307F"),setTimeout(()=>{t.classList.remove("is-copied"),t.setAttribute("aria-label","\u30BB\u30C8\u30EA\u3092\u30B3\u30D4\u30FC"),t.setAttribute("data-tooltip","\u30BB\u30C8\u30EA\u3092\u30B3\u30D4\u30FC")},1200)}catch{t.classList.add("is-error"),t.setAttribute("aria-label","\u30B3\u30D4\u30FC\u306B\u5931\u6557"),t.setAttribute("data-tooltip","\u30B3\u30D4\u30FC\u306B\u5931\u6557"),setTimeout(()=>{t.classList.remove("is-error"),t.setAttribute("aria-label","\u30BB\u30C8\u30EA\u3092\u30B3\u30D4\u30FC"),t.setAttribute("data-tooltip","\u30BB\u30C8\u30EA\u3092\u30B3\u30D4\u30FC")},1200)}}}function M(s,o,t){let n=!t&&r.timelineSort==="date-desc"&&o<3?"recent":"",i=s.songs.map((p,x)=>`
      <li class="setlist-item${t&&p.key===t.key?" hit":""}">
        <span class="setlist-num">${x+1}.</span>
        <button class="setlist-title" type="button"
          data-songkey="${c(p.key)}"
          data-songtitle="${c(p.title)}"
          data-songartist="${c(p.artist)}"
          title="\u66F2\u8A73\u7D30\u3092\u8868\u793A">${c(p.title)}</button>
        ${p.artist?`
        <span class="setlist-separator">/</span>
        <button class="setlist-artist" type="button"
          data-artist-search="${c(p.artist)}"
          title="\u5168\u66F2\u30EA\u30B9\u30C8\u3067\u7D5E\u308A\u8FBC\u307F">${c(p.artist)}</button>`:""}
      </li>`).join(""),l=s.url?`<a href="${c(s.url)}" target="_blank" rel="noopener">${c(s.title||"\u914D\u4FE1")}</a>`:c(s.title||"\u914D\u4FE1"),m=s.url?`<span class="watch-actions"><a class="watch-open-link" href="${c(s.url)}" target="_blank" rel="noopener" aria-label="YouTube\u3067\u958B\u304F" data-tooltip="YouTube\u3067\u958B\u304F" data-tooltip-pos="left">${H}</a></span>`:"",e=$(s),a=k(e),b=`<button class="timeline-save-btn${a?" is-saved":""}" type="button" data-playlist-add="${c(e)}" data-stream-title="${c(s.title||"\u914D\u4FE1")}" aria-label="${a?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58"}" data-tooltip="${a?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58"}" data-tooltip-pos="left">${u("bookmark")}</button>`,f=`<button class="timeline-copy-btn" type="button" data-copy-key="${c(e)}" aria-label="\u30BB\u30C8\u30EA\u3092\u30B3\u30D4\u30FC" data-tooltip="\u30BB\u30C8\u30EA\u3092\u30B3\u30D4\u30FC" data-tooltip-pos="left">${E}</button>`;return`
    <details class="timeline-item ${n}"${t?" open":""}>
      <span class="stream-anchor" data-streamkey="${c($(s))}"></span>
      <summary class="timeline-summary">
        <span class="timeline-date-badge">${v(s.date).replace(/^\d{4}\//,"")}</span>
        <span class="timeline-summary-main">
          <span class="timeline-head">
            <span class="timeline-stream-no">\u7B2C${s.index}\u67A0</span>
            <span class="timeline-songcount">${s.songs.length}\u66F2</span>
          </span>
          <span class="timeline-title">${l}</span>
        </span>
        <span class="timeline-actions">
          ${b}
          ${f}
          ${m}
        </span>
      </summary>
      <div class="timeline-setlist"><ol class="setlist-list">${i}</ol></div>
    </details>
  `}export{y as renderTimeline};
