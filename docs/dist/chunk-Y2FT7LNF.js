import{d as b}from"./chunk-FCOJKAWC.js";import{I as w,U as M,e as c,f as y,h as p,l as D}from"./chunk-W25M55W2.js";function v(){let{songs:t,streams:o=[]}=c.data,i=c.rankingPeriod||"all",r=y("#panel-ranking");if(!r)return;let s=i==="all"?null:N(o,i),l=s?j(t,s):[...t].sort((n,a)=>a.count-n.count||n.title.localeCompare(a.title,"ja")),e=c.rankingLimit,d=l.slice(0,e),u=!!c.channelData?.fullLoaded;r.innerHTML=`
    <div class="section-header">
      <h2>${M("rank")} \u6B4C\u5531\u56DE\u6570\u30E9\u30F3\u30AD\u30F3\u30B0</h2>
      <span class="count-pill">${t.length}\u66F2\u4E2D</span>
    </div>
    ${S(o,i,u)}
    ${s?E(s):""}
    ${s?s.counts.size===0?`
      <div class="empty-state">\u3053\u306E\u671F\u9593\u306B\u6B4C\u5531\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F420}</div>
    `:"":`
      <div class="podium">
        ${d.slice(0,3).map((n,a)=>P(n,a)).join("")}
      </div>
    `}
    ${s?.counts.size!==0||!s?`
      <div class="song-list${s?" has-delta":""}">
        ${d.map((n,a)=>H(n,a+1,s)).join("")}
      </div>
      ${e<l.length?`
        <div class="timeline-controls">
          <button class="load-more-btn" id="rank-more">\u25BC \u3082\u3063\u3068\u8868\u793A (\u6B8B\u308A${l.length-e}\u66F2)</button>
        </div>`:""}
    `:""}
  `,C(r),r.addEventListener("click",n=>{let a=n.target.closest("[data-ranking-period]");if(!a)return;let m=a.closest(".period-tabs")?.querySelector(".period-tab-track");m&&(m.style.left=a.offsetLeft+"px",m.style.width=a.offsetWidth+"px");let k=a.dataset.rankingPeriod;k!==i&&(c.rankingPeriod=k,c.rankingLimit=b,v())});let $=document.getElementById("ranking-month-select");$&&$.addEventListener("change",n=>{n.target.value&&(c.rankingMonth=n.target.value,c.rankingPeriod="month-select",c.rankingLimit=b,v())});let g=document.getElementById("ranking-compare-select");g&&g.addEventListener("change",n=>{c.rankingCompareMonth=n.target.value,v()});let f=document.getElementById("ranking-swap-compare");f&&f.addEventListener("click",()=>{let n=c.rankingMonth||"",a=c.rankingCompareMonth||"";!n||!a||(c.rankingMonth=a,c.rankingCompareMonth=n,c.rankingPeriod="month-select",c.rankingLimit=b,v())});let h=document.getElementById("rank-more");h&&h.addEventListener("click",()=>{c.rankingLimit+=50,v()})}function S(t,o,i){let r=[{key:"all",label:"\u5168\u671F\u9593"},{key:"month",label:"\u4ECA\u6708"},{key:"prev-month",label:"\u5148\u6708"},{key:"week",label:"\u76F4\u8FD17\u65E5"}],s=I(t),l=c.rankingMonth||"";return`
    <div class="ranking-period-selector">
      <div class="period-tabs" role="group" aria-label="\u8868\u793A\u671F\u9593">
        <span class="period-tab-track" aria-hidden="true"></span>
        ${r.map(e=>`
          <button
            class="period-btn${o===e.key?" active":""}"
            type="button"
            data-ranking-period="${e.key}"
            ${!i&&e.key!=="all"?'disabled title="\u914D\u4FE1\u30C7\u30FC\u30BF\u8AAD\u307F\u8FBC\u307F\u4E2D"':""}
          >${e.key==="all"||i?e.label:e.label+" \u2026"}</button>
        `).join("")}
      </div>
      ${s.length&&i?`
        <select id="ranking-month-select" class="select-input period-month-select" title="\u6708\u3092\u6307\u5B9A">
          <option value="">\u6708\u3092\u9078\u629E\u2026</option>
          ${s.map(e=>{let[d,u]=e.split("-"),$=`${d}\u5E74${Number(u)}\u6708`;return`<option value="${e}"${o==="month-select"&&l===e?" selected":""}>${$}</option>`}).join("")}
        </select>
      `:""}
      ${o!=="all"&&s.length&&i?`
        <select id="ranking-compare-select" class="select-input period-month-select" title="\u5897\u6E1B\uFF08\u2191\u2193\uFF09\u306E\u6BD4\u8F03\u5148\u3092\u9078\u3076">
          <option value="">\u6BD4\u8F03: \u76F4\u524D\u306E\u671F\u9593\uFF08\u81EA\u52D5\uFF09</option>
          ${s.map(e=>{let[d,u]=e.split("-"),$=`\u6BD4\u8F03: ${d}\u5E74${Number(u)}\u6708`;return`<option value="${e}"${(c.rankingCompareMonth||"")===e?" selected":""}>${$}</option>`}).join("")}
        </select>
        ${o==="month-select"&&l&&c.rankingCompareMonth?`
          <button id="ranking-swap-compare" class="period-btn ranking-swap-btn" type="button" title="\u8868\u793A\u6708\u3068\u6BD4\u8F03\u6708\u3092\u5165\u308C\u66FF\u3048\u308B">\u2194 \u5165\u308C\u66FF\u3048</button>
        `:""}
      `:""}
    </div>
  `}function C(t){let o=t.querySelector(".period-tabs .period-btn.active"),i=t.querySelector(".period-tab-track");!o||!i||(i.style.left=o.offsetLeft+"px",i.style.width=o.offsetWidth+"px")}function E(t){let{label:o,prevLabel:i,counts:r,totalSongs:s}=t;return`
    <div class="ranking-period-header">
      <span class="ranking-period-label">${p(o)}</span>
      <span class="ranking-period-meta">${r.size}\u66F2\u30FB\u5408\u8A08${s}\u56DE\u6B4C\u5531
        ${i?`<span class="ranking-prev-label">\uFF08\u524D\uFF1A${p(i)}\u6BD4\uFF09</span>`:""}
      </span>
    </div>
  `}function N(t,o){let i=new Date,r,s,l,e,d,u;if(o==="week")s=new Date(i),r=new Date(i),r.setDate(i.getDate()-6),r.setHours(0,0,0,0),e=new Date(r),e.setDate(e.getDate()-1),l=new Date(e),l.setDate(e.getDate()-6),l.setHours(0,0,0,0),d="\u76F4\u8FD17\u65E5",u="\u524D\u306E7\u65E5";else if(o==="month"){let n=i.getFullYear(),a=i.getMonth();r=new Date(n,a,1),s=new Date(n,a+1,0,23,59,59),l=new Date(n,a-1,1),e=new Date(n,a,0,23,59,59),d=`${n}\u5E74${a+1}\u6708`,u=`${n}\u5E74${a||12}\u6708`}else if(o==="prev-month"){let n=i.getFullYear(),a=i.getMonth()-1,m=a<0?n-1:n,k=(a%12+12)%12;r=new Date(m,k,1),s=new Date(m,k+1,0,23,59,59),l=new Date(m,k-1,1),e=new Date(m,k,0,23,59,59),d=`${m}\u5E74${k+1}\u6708\uFF08\u5148\u6708\uFF09`,u=`${m}\u5E74${k||12}\u6708`}else if(o==="month-select"&&c.rankingMonth){let[n,a]=c.rankingMonth.split("-").map(Number);r=new Date(n,a-1,1),s=new Date(n,a,0,23,59,59),l=new Date(n,a-2,1),e=new Date(n,a-1,0,23,59,59),d=`${n}\u5E74${a}\u6708`,u=`${a===1?n-1:n}\u5E74${a===1?12:a-1}\u6708`}else return null;let $=c.rankingCompareMonth||"";if($){let[n,a]=$.split("-").map(Number);n&&a&&(l=new Date(n,a-1,1),e=new Date(n,a,0,23,59,59),u=`${n}\u5E74${a}\u6708`)}let g=L(t,r,s),f=L(t,l,e),h=[...g.values()].reduce((n,a)=>n+a,0);return{label:d,prevLabel:u,start:r,end:s,counts:g,prevCounts:f,totalSongs:h}}function L(t,o,i){let r=new Map;for(let s of t){let l=s.date instanceof Date?s.date:new Date(s.date||0);if(l>=o&&l<=i)for(let e of s.songs||[])r.set(e.key,(r.get(e.key)||0)+1)}return r}function j(t,{counts:o,prevCounts:i}){let r=new Map(t.map(l=>[l.key,l])),s=[];for(let[l,e]of o){let d=r.get(l);if(!d)continue;let u=i.get(l)||0;s.push({...d,periodCount:e,delta:e-u,isNew:u===0})}return s.sort((l,e)=>e.periodCount-l.periodCount||l.title.localeCompare(e.title,"ja")),s.forEach((l,e)=>{l.periodRank=e+1}),s}function I(t){let o=new Set;for(let i of t){let r=i.date instanceof Date?i.date:new Date(i.date||0);isNaN(r)||o.add(`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}`)}return[...o].sort().reverse()}function P(t,o){let i=["1","2","3"];return`
    <div class="podium-card rank-${o+1}"
      data-songkey="${p(t.key)}"
      data-songtitle="${p(t.title)}"
      data-songartist="${p(t.artist)}"
      title="\u30AF\u30EA\u30C3\u30AF\u3067\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u7D5E\u308A\u8FBC\u307F">
      <div class="podium-medal" aria-label="${o+1}\u4F4D"><span>${i[o]}</span></div>
      <div class="song-title">${p(t.title)}</div>
      <button class="song-artist artist-search-btn" type="button" data-artist-search="${p(t.artist)}">${p(t.artist)}</button>
      <div class="count-big">${t.count}<small>\u56DE</small></div>
      <div class="last-sung">${t.lastSung?`\u6700\u7D42: ${w(t.lastSung)} (${t.daysSinceLast}\u65E5\u524D)`:"\u672A\u62AB\u9732"}</div>
    </div>
  `}function H(t,o,i){let r=i?t.periodCount:t.count,s=i?t.periodRank:t.rank??o,l=s===1?"r1":s===2?"r2":s===3?"r3":"",e=i?`<div class="count">${r}<small>\u56DE</small></div>
       <div class="rank-delta ${R(t)}">${x(t)}</div>`:`<div class="count">${r}<small>\u56DE</small></div>
       <div class="last">${t.lastSung?`<span class="last-date">${w(t.lastSung)}</span><span class="badge ${D(t.daysSinceLast)}">${t.daysSinceLast}\u65E5\u524D</span>`:'<span class="last-date">\u672A\u62AB\u9732</span><span class="badge never">\u2014</span>'}</div>`;return`
    <div class="song-row" data-songkey="${p(t.key)}" data-songtitle="${p(t.title)}" data-songartist="${p(t.artist)}" title="\u30AF\u30EA\u30C3\u30AF\u3067\u8A73\u7D30\u3092\u8868\u793A">
      <div class="rank ${l}">${s}</div>
      <div class="info">
        <div class="title">${p(t.title)}</div>
        <button class="artist artist-search-btn" type="button" data-artist-search="${p(t.artist)}">${p(t.artist)}</button>
      </div>
      <div class="song-row-side">
        ${e}
      </div>
    </div>
  `}function R(t){return t.isNew?"new":t.delta>0?"up":t.delta<0?"down":"same"}function x(t){return t.isNew?"NEW":t.delta>0?`\u25B2${t.delta}`:t.delta<0?`\u25BC${Math.abs(t.delta)}`:"\u2014"}export{v as renderRanking};
