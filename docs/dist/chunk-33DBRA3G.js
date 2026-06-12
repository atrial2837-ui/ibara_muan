import{d as h}from"./chunk-FCOJKAWC.js";import{e as d}from"./chunk-4VQQINBR.js";import{a as w,c as f,h as y,i as c}from"./chunk-3CMR4JCK.js";function b(){let{songs:t,streams:l=[]}=d.data,a=d.rankingPeriod||"all",s=w("#panel-ranking");if(!s)return;let n=a==="all"?null:S(l,a),i=n?C(t,n):[...t].sort(($,o)=>o.count-$.count||$.title.localeCompare(o.title,"ja")),e=d.rankingLimit,u=i.slice(0,e),p=!!d.channelData?.fullLoaded;s.innerHTML=`
    <div class="section-header">
      <h2>\u{1F3C6} \u6B4C\u5531\u56DE\u6570\u30E9\u30F3\u30AD\u30F3\u30B0</h2>
      <span class="count-pill">${t.length}\u66F2\u4E2D</span>
    </div>
    ${M(l,a,p)}
    ${n?L(n):""}
    ${n?n.counts.size===0?`
      <div class="empty-state">\u3053\u306E\u671F\u9593\u306B\u6B4C\u5531\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F420}</div>
    `:"":`
      <div class="podium">
        ${u.slice(0,3).map(($,o)=>j($,o)).join("")}
      </div>
    `}
    ${n?.counts.size!==0||!n?`
      <div class="song-list${n?" has-delta":""}">
        ${u.map(($,o)=>E($,o+1,n)).join("")}
      </div>
      ${e<i.length?`
        <div class="timeline-controls">
          <button class="load-more-btn" id="rank-more">\u25BC \u3082\u3063\u3068\u8868\u793A (\u6B8B\u308A${i.length-e}\u66F2)</button>
        </div>`:""}
    `:""}
  `,s.addEventListener("click",$=>{let o=$.target.closest("[data-ranking-period]");if(!o)return;let r=o.dataset.rankingPeriod;r!==a&&(d.rankingPeriod=r,d.rankingLimit=h,b())});let v=document.getElementById("ranking-month-select");v&&v.addEventListener("change",$=>{$.target.value&&(d.rankingMonth=$.target.value,d.rankingPeriod="month-select",d.rankingLimit=h,b())});let k=document.getElementById("rank-more");k&&k.addEventListener("click",()=>{d.rankingLimit+=50,b()})}function M(t,l,a){let s=[{key:"all",label:"\u5168\u671F\u9593"},{key:"month",label:"\u4ECA\u6708"},{key:"prev-month",label:"\u5148\u6708"},{key:"week",label:"\u76F4\u8FD17\u65E5"}],n=N(t),i=d.rankingMonth||"";return`
    <div class="ranking-period-selector">
      ${s.map(e=>`
        <button
          class="period-btn${l===e.key?" active":""}"
          type="button"
          data-ranking-period="${e.key}"
          ${!a&&e.key!=="all"?'disabled title="\u914D\u4FE1\u30C7\u30FC\u30BF\u8AAD\u307F\u8FBC\u307F\u4E2D"':""}
        >${e.key==="all"||a?e.label:e.label+" \u2026"}</button>
      `).join("")}
      ${n.length&&a?`
        <select id="ranking-month-select" class="select-input period-month-select" title="\u6708\u3092\u6307\u5B9A">
          <option value="">\u6708\u3092\u9078\u629E\u2026</option>
          ${n.map(e=>{let[u,p]=e.split("-"),v=`${u}\u5E74${Number(p)}\u6708`;return`<option value="${e}"${l==="month-select"&&i===e?" selected":""}>${v}</option>`}).join("")}
        </select>
      `:""}
    </div>
  `}function L(t){let{label:l,prevLabel:a,counts:s,totalSongs:n}=t;return`
    <div class="ranking-period-header">
      <span class="ranking-period-label">${c(l)}</span>
      <span class="ranking-period-meta">${s.size}\u66F2\u30FB\u5408\u8A08${n}\u56DE\u6B4C\u5531
        ${a?`<span class="ranking-prev-label">\uFF08\u524D\uFF1A${c(a)}\u6BD4\uFF09</span>`:""}
      </span>
    </div>
  `}function S(t,l){let a=new Date,s,n,i,e,u,p;if(l==="week")n=new Date(a),s=new Date(a),s.setDate(a.getDate()-6),s.setHours(0,0,0,0),e=new Date(s),e.setDate(e.getDate()-1),i=new Date(e),i.setDate(e.getDate()-6),i.setHours(0,0,0,0),u="\u76F4\u8FD17\u65E5",p="\u524D\u306E7\u65E5";else if(l==="month"){let o=a.getFullYear(),r=a.getMonth();s=new Date(o,r,1),n=new Date(o,r+1,0,23,59,59),i=new Date(o,r-1,1),e=new Date(o,r,0,23,59,59),u=`${o}\u5E74${r+1}\u6708`,p=`${o}\u5E74${r||12}\u6708`}else if(l==="prev-month"){let o=a.getFullYear(),r=a.getMonth()-1,m=r<0?o-1:o,g=(r%12+12)%12;s=new Date(m,g,1),n=new Date(m,g+1,0,23,59,59),i=new Date(m,g-1,1),e=new Date(m,g,0,23,59,59),u=`${m}\u5E74${g+1}\u6708\uFF08\u5148\u6708\uFF09`,p=`${m}\u5E74${g||12}\u6708`}else if(l==="month-select"&&d.rankingMonth){let[o,r]=d.rankingMonth.split("-").map(Number);s=new Date(o,r-1,1),n=new Date(o,r,0,23,59,59),i=new Date(o,r-2,1),e=new Date(o,r-1,0,23,59,59),u=`${o}\u5E74${r}\u6708`,p=`${r===1?o-1:o}\u5E74${r===1?12:r-1}\u6708`}else return null;let v=D(t,s,n),k=D(t,i,e),$=[...v.values()].reduce((o,r)=>o+r,0);return{label:u,prevLabel:p,start:s,end:n,counts:v,prevCounts:k,totalSongs:$}}function D(t,l,a){let s=new Map;for(let n of t){let i=n.date instanceof Date?n.date:new Date(n.date||0);if(i>=l&&i<=a)for(let e of n.songs||[])s.set(e.key,(s.get(e.key)||0)+1)}return s}function C(t,{counts:l,prevCounts:a}){let s=new Map(t.map(i=>[i.key,i])),n=[];for(let[i,e]of l){let u=s.get(i);if(!u)continue;let p=a.get(i)||0;n.push({...u,periodCount:e,delta:e-p,isNew:p===0})}return n.sort((i,e)=>e.periodCount-i.periodCount||i.title.localeCompare(e.title,"ja")),n.forEach((i,e)=>{i.periodRank=e+1}),n}function N(t){let l=new Set;for(let a of t){let s=a.date instanceof Date?a.date:new Date(a.date||0);isNaN(s)||l.add(`${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,"0")}`)}return[...l].sort().reverse()}function j(t,l){let a=["\u{1F947}","\u{1F948}","\u{1F949}"];return`
    <div class="podium-card rank-${l+1}"
      data-songkey="${c(t.key)}"
      data-songtitle="${c(t.title)}"
      data-songartist="${c(t.artist)}"
      title="\u30AF\u30EA\u30C3\u30AF\u3067\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u7D5E\u308A\u8FBC\u307F">
      <div class="podium-medal">${a[l]}</div>
      <div class="song-title">${c(t.title)}</div>
      <button class="song-artist artist-search-btn" type="button" data-artist-search="${c(t.artist)}">${c(t.artist)}</button>
      <div class="count-big">${t.count}<small>\u56DE</small></div>
      <div class="last-sung">${t.lastSung?`\u6700\u7D42: ${f(t.lastSung)} (${t.daysSinceLast}\u65E5\u524D)`:"\u672A\u62AB\u9732"}</div>
    </div>
  `}function E(t,l,a){let s=a?t.periodCount:t.count,n=a?t.periodRank:t.rank??l,i=n===1?"r1":n===2?"r2":n===3?"r3":"",e=a?`<div class="count">${s}<small>\u56DE</small></div>
       <div class="rank-delta ${P(t)}">${I(t)}</div>`:`<div class="count">${s}<small>\u56DE</small></div>
       <div class="last">${t.lastSung?`<span class="last-date">${f(t.lastSung)}</span><span class="badge ${y(t.daysSinceLast)}">${t.daysSinceLast}\u65E5\u524D</span>`:'<span class="last-date">\u672A\u62AB\u9732</span><span class="badge never">\u2014</span>'}</div>`;return`
    <div class="song-row" data-songkey="${c(t.key)}" data-songtitle="${c(t.title)}" data-songartist="${c(t.artist)}" title="\u30AF\u30EA\u30C3\u30AF\u3067\u8A73\u7D30\u3092\u8868\u793A">
      <div class="rank ${i}">${n}</div>
      <div class="info">
        <div class="title">${c(t.title)}</div>
        <button class="artist artist-search-btn" type="button" data-artist-search="${c(t.artist)}">${c(t.artist)}</button>
      </div>
      <div class="song-row-side">
        ${e}
      </div>
    </div>
  `}function P(t){return t.isNew?"new":t.delta>0?"up":t.delta<0?"down":"same"}function I(t){return t.isNew?"NEW":t.delta>0?`\u25B2${t.delta}`:t.delta<0?`\u25BC${Math.abs(t.delta)}`:"\u2014"}export{b as renderRanking};
