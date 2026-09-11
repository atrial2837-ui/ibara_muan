import{e as i}from"./chunk-4VQQINBR.js";import{b as g,c as y}from"./chunk-HDKS545O.js";import{a as d,c as f,e as v,i as o}from"./chunk-3CMR4JCK.js";function b(){let{streams:n}=i.data,r=i.timelineFilter,a=r?n.filter(t=>t.songs.some(s=>s.key===r.key)):n,l=S(a,i.timelineSort),c=d("#panel-timeline");c.innerHTML=`
    <div class="section-header">
      <h2>\u{1F4C5} \u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3</h2>
      <span class="count-pill">${l.length}\u67A0</span>
    </div>
    <div class="timeline-tools">
      <label class="timeline-sort-field" for="timeline-sort">
        <span>\u4E26\u3073\u66FF\u3048</span>
        <select id="timeline-sort" class="select-input">
          <option value="date-desc"${i.timelineSort==="date-desc"?" selected":""}>\u914D\u4FE1\u65E5\uFF08\u65B0\u3057\u3044\u9806\uFF09</option>
          <option value="date-asc"${i.timelineSort==="date-asc"?" selected":""}>\u914D\u4FE1\u65E5\uFF08\u53E4\u3044\u9806\uFF09</option>
          <option value="songs-desc"${i.timelineSort==="songs-desc"?" selected":""}>\u66F2\u6570\uFF08\u591A\u3044\u9806\uFF09</option>
          <option value="songs-asc"${i.timelineSort==="songs-asc"?" selected":""}>\u66F2\u6570\uFF08\u5C11\u306A\u3044\u9806\uFF09</option>
          <option value="index-desc"${i.timelineSort==="index-desc"?" selected":""}>\u67A0\u756A\u53F7\uFF08\u5927\u304D\u3044\u9806\uFF09</option>
          <option value="index-asc"${i.timelineSort==="index-asc"?" selected":""}>\u67A0\u756A\u53F7\uFF08\u5C0F\u3055\u3044\u9806\uFF09</option>
          <option value="title"${i.timelineSort==="title"?" selected":""}>\u30BF\u30A4\u30C8\u30EB\u9806</option>
        </select>
      </label>
    </div>
    <div id="timeline-filter-banner"></div>
    <div id="timeline" class="timeline"></div>
    <div class="timeline-controls" id="timeline-controls"></div>
  `,d("#timeline-sort")?.addEventListener("change",t=>{i.timelineSort=t.target.value||"date-desc",i.timelineLimit=g,b()});let p=d("#timeline-filter-banner");if(r){let t=l.reduce((s,u)=>s+u.songs.filter($=>$.key===r.key).length,0);p.innerHTML=`
      <div class="filter-banner">
        <span class="filter-icon">\u{1F50E}</span>
        <div class="filter-text">
          <strong>${o(r.title)}</strong>
          <span style="color:var(--ink-mute);"> / ${o(r.artist)}</span>
          <span class="meta">\u3053\u306E\u66F2\u3092\u6B4C\u3063\u305F\u914D\u4FE1\u306E\u307F\u8868\u793A\u4E2D\uFF08${l.length}\u67A0 / ${t}\u56DE\u6B4C\u5531\uFF09</span>
        </div>
        <button class="clear-btn" id="clear-filter">\u2715 \u7D5E\u308A\u8FBC\u307F\u3092\u89E3\u9664</button>
      </div>
    `,d("#clear-filter").addEventListener("click",()=>{i.timelineFilter=null,i.timelineLimit=g,b()})}if(!l.length){d("#timeline").innerHTML='<div class="empty-state">\u8A72\u5F53\u3059\u308B\u914D\u4FE1\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F420}</div>';return}let m=l.slice(0,i.timelineLimit);if(d("#timeline").innerHTML=m.map((t,s)=>k(t,s,r)).join(""),i.timelineFocus){let s=document.querySelector(`[data-streamkey="${CSS.escape(i.timelineFocus)}"]`)?.closest(".timeline-item");s?.classList.add("focus"),s?.scrollIntoView({behavior:"smooth",block:"center"}),i.timelineFocus=null}d("#timeline").onclick=async t=>{let s=t.target.closest("[data-copy-stream]");if(!s)return;t.stopPropagation();let u=m[Number(s.dataset.copyStream)];if(u)try{await navigator.clipboard.writeText(L(u)),s.textContent="\u30B3\u30D4\u30FC\u6E08\u307F",setTimeout(()=>{s.textContent="\u30BB\u30C8\u30EA\u30B3\u30D4\u30FC"},1200)}catch{s.textContent="\u5931\u6557",setTimeout(()=>{s.textContent="\u30BB\u30C8\u30EA\u30B3\u30D4\u30FC"},1200)}};let e=d("#timeline-controls");i.timelineLimit<l.length&&(e.innerHTML=`<button class="load-more-btn" id="load-more">\u25BC \u3082\u3063\u3068\u898B\u308B (\u6B8B\u308A${l.length-i.timelineLimit}\u67A0)</button>`,d("#load-more").addEventListener("click",()=>{i.timelineLimit+=y,b()}))}function k(n,r,a){let l=!a&&i.timelineSort==="date-desc"&&r<3?"recent":"",c=n.songs.map((s,u)=>{let $=a&&s.key===a.key?" hit":"",h=$?"\u30AF\u30EA\u30C3\u30AF\u3067\u7D5E\u308A\u8FBC\u307F\u89E3\u9664":"\u30AF\u30EA\u30C3\u30AF\u3067\u7D5E\u308A\u8FBC\u307F";return`<span class="setlist-song${$}" data-songkey="${o(s.key)}" data-songtitle="${o(s.title)}" data-songartist="${o(s.artist)}" title="${h}"><span class="sl-num">${u+1}</span>${o(s.title)}<span style="color:var(--ink-mute);"> / ${o(s.artist)}</span></span>`}).join(""),p=n.url?`<a href="${o(n.url)}" target="_blank" rel="noopener">${o(n.title||"\u914D\u4FE1")}</a>`:o(n.title||"\u914D\u4FE1"),m=n.url?`<span class="watch-actions"><button class="watch-link" type="button" data-stream-play="${o(v(n))}" data-inline-youtube="${o(n.url)}">\u25B6 \u518D\u751F</button><a class="watch-open-link" href="${o(n.url)}" target="_blank" rel="noopener">\u2197 \u958B\u304F</a></span>`:"",e=`<button class="timeline-save-btn" type="button" data-playlist-add="${o(v(n))}" data-stream-title="${o(n.title||"\u914D\u4FE1")}" title="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58">\u2606</button>`,t=`<button class="timeline-copy-btn" type="button" data-copy-stream="${r}">\u30BB\u30C8\u30EA\u30B3\u30D4\u30FC</button>`;return`
    <article class="timeline-item ${l}">
      <span class="stream-anchor" data-streamkey="${o(v(n))}"></span>
      <header class="timeline-head">
        <span class="timeline-date">${f(n.date)}</span>
        <span class="timeline-stream-no">\u7B2C${n.index}\u67A0</span>
        <span class="timeline-songcount">\u{1F3A4} ${n.songs.length}\u66F2</span>
        ${e}
        ${t}
        ${m}
      </header>
      <div class="timeline-title">${p}</div>
      <div class="setlist">${c}</div>
    </article>
  `}function S(n,r){let a=[...n],l=e=>e.date instanceof Date?e.date.getTime():new Date(e.date||0).getTime(),c=e=>Number(e.index)||0,p=e=>e.songs?.length||0,m=(e,t)=>l(t)-l(e)||c(t)-c(e);switch(r){case"date-asc":a.sort((e,t)=>l(e)-l(t)||c(e)-c(t));break;case"songs-desc":a.sort((e,t)=>p(t)-p(e)||m(e,t));break;case"songs-asc":a.sort((e,t)=>p(e)-p(t)||m(e,t));break;case"index-desc":a.sort((e,t)=>c(t)-c(e)||m(e,t));break;case"index-asc":a.sort((e,t)=>c(e)-c(t)||m(e,t));break;case"title":a.sort((e,t)=>String(e.title||"").localeCompare(String(t.title||""),"ja")||m(e,t));break;case"date-desc":default:a.sort(m);break}return a}function L(n){return(n.songs||[]).map(r=>{let a=String(r?.title||"").trim(),l=String(r?.artist||"").trim();return l?`${a} / ${l}`:a}).filter(Boolean).join(`
`)}export{b as renderTimeline};
