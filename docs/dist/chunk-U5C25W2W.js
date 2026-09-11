import{c as v,d as b,g}from"./chunk-SWH2CPOO.js";import{a as C,b as q,l as B,o as z}from"./chunk-WIDQYDYL.js";import"./chunk-HYFYQJIG.js";import"./chunk-ZGMLTK2D.js";import{e as R}from"./chunk-FCOJKAWC.js";import{I as y,J as w,M as O,U as c,d as M,e as k,f as h,h as l,j as A,n as W,t as L,u as H,v as j,w as I,x as G}from"./chunk-W25M55W2.js";function E(e,s){return`
    <div class="analytics-grid">

      <div class="card col-6">
        <div class="card-title">${c("chart")} \u6301\u3061\u66F2\u306E\u7D2F\u7A4D\u6210\u9577 <span class="pill">\u521D\u62AB\u9732\u30D9\u30FC\u30B9</span></div>
        ${g("chart-growth")}
      </div>

      <div class="card col-6">
        <div class="card-title">${c("mic")} 1\u67A0\u3042\u305F\u308A\u306E\u66F2\u6570 <span class="pill">\u6642\u7CFB\u5217</span></div>
        ${g("chart-songs-per-stream")}
      </div>

      <div class="card col-6">
        <div class="card-title">${c("calendar")} \u66DC\u65E5\u5206\u5E03 <span class="pill">\u914D\u4FE1\u65E5</span></div>
        ${g("chart-dow",{class:"short"})}
      </div>

      <div class="card col-6">
        <div class="card-title">${c("chart")} \u6B4C\u5531\u56DE\u6570\u306E\u5206\u5E03 <span class="pill">\u30D2\u30B9\u30C8\u30B0\u30E9\u30E0</span></div>
        ${g("chart-histogram",{class:"short"})}
      </div>

      <div class="card col-12">
        <div class="card-title">${c("artist")} \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u5225 \u6B4C\u5531\u5408\u8A08 <span class="pill">TOP${R}</span></div>
        <div id="artist-bar-list" class="bar-list"></div>
      </div>

      <div class="card col-6">
        <div class="card-title">${c("sparkle")} \u4E45\u3057\u3076\u308A\u306B\u6B4C\u308F\u308C\u305F\u66F2 <span class="pill">\u524D\u56DE\u304B\u3089\u9577\u304B\u3063\u305FTOP10</span></div>
        <div id="comeback-list"></div>
      </div>

      <div class="card col-6">
        <div class="card-title">${c("time")} 1\u56DE\u3057\u304B\u6B4C\u308F\u308C\u3066\u3044\u306A\u3044\u66F2 <span class="pill">${e.filter(t=>t.count===1).length}\u66F2</span></div>
        <div id="oneshot-list"></div>
      </div>

    </div>
  `}function Y(e,s,t){J(e),Z(s),K(s),V(e),F(t.length?t:W(e)),Q(e),U(e)}function J(e){let s=v(),t=new Map;for(let u of e){if(!u.firstSung)continue;let m=A(u.firstSung);t.set(m,(t.get(m)||0)+1)}let i=Array.from(t.keys()).sort();if(!i.length)return;let a=[],r=[],n=0,o=N(i[0]),d=N(i[i.length-1]);for(;o<=d;){let u=A(o);n+=t.get(u)||0,a.push(w(o)),r.push(n),o=new Date(o.getFullYear(),o.getMonth()+1,1)}b("chart-growth","line",{labels:a,datasets:[{label:"\u7D2F\u7A4D\u6301\u3061\u66F2\u6570",data:r,borderColor:s.primaryStrong,backgroundColor:s.primary+"33",tension:.25,fill:!0,pointRadius:2,borderWidth:2}]})}function N(e){let[s,t]=e.split("-").map(Number);return new Date(s,t-1,1)}function Z(e){let s=v(),t=[...e].sort((i,a)=>i.date-a.date);b("chart-songs-per-stream","line",{labels:t.map(i=>y(i.date)),datasets:[{label:"\u66F2\u6570",data:t.map(i=>i.songs.length),borderColor:s.accentStrong,backgroundColor:s.accent+"33",tension:.2,fill:!0,pointRadius:1.5,borderWidth:1.5}]},{scales:{x:{ticks:{maxTicksLimit:8}}}})}function K(e){let s=v(),t=["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"],i=new Array(7).fill(0),a=new Array(7).fill(0);for(let r of e)i[r.dayOfWeek]+=1,a[r.dayOfWeek]+=r.songs.length;b("chart-dow","bar",{labels:t,datasets:[{label:"\u914D\u4FE1\u56DE\u6570",data:i,backgroundColor:s.primary+"cc",borderColor:s.primaryStrong,borderWidth:1,yAxisID:"y",borderRadius:6},{label:"\u6B4C\u5531\u6570",data:a,backgroundColor:s.accent+"cc",borderColor:s.accentStrong,borderWidth:1,yAxisID:"y2",borderRadius:6}]},{scales:{y:{position:"left",title:{display:!0,text:"\u914D\u4FE1",color:s.inkMute,font:{size:10}}},y2:{position:"right",title:{display:!0,text:"\u6B4C\u5531",color:s.inkMute,font:{size:10}},grid:{display:!1},beginAtZero:!0}}})}function V(e){let s=v(),t=[{label:"1\u56DE",range:[1,1]},{label:"2\u56DE",range:[2,2]},{label:"3\u56DE",range:[3,3]},{label:"4-5\u56DE",range:[4,5]},{label:"6-10\u56DE",range:[6,10]},{label:"11-20\u56DE",range:[11,20]},{label:"21\u56DE\u301C",range:[21,1/0]}],i=t.map(a=>e.filter(r=>r.count>=a.range[0]&&r.count<=a.range[1]).length);b("chart-histogram","bar",{labels:t.map(a=>a.label),datasets:[{label:"\u66F2\u6570",data:i,backgroundColor:s.primary+"cc",borderColor:s.primaryStrong,borderWidth:1,borderRadius:6}]},{plugins:{legend:{display:!1}}})}function F(e){let s=e.slice(0,R),t=h("#artist-bar-list");if(!s.length){t.innerHTML='<div class="empty-state">\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div>';return}let i=s[0]?.totalCount||1;t.innerHTML=s.map((a,r)=>{let n=Math.round(a.totalCount/i*100);return`
      <div class="bar-row" data-artist-search="${l(a.artist)}" style="cursor:pointer;" title="\u30AF\u30EA\u30C3\u30AF\u3067\u3053\u306E\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u306E\u66F2\u3092\u8868\u793A">
        <div class="bar-rank">${r+1}</div>
        <div class="bar-content">
          <div class="bar-label">${l(a.artist)} <span style="color:var(--ink-mute);font-size:11px;">\uFF08${a.songCount}\u66F2\uFF09</span></div>
          <div class="bar-bar accent" style="width:${n}%;"></div>
        </div>
        <div class="bar-value">${a.totalCount}</div>
      </div>
    `}).join("")}function Q(e){let s=L(e,10);h("#comeback-list").innerHTML=s.length?s.map((t,i)=>`
    <div class="activity-row" data-songkey="${l(t.song.key)}" data-songtitle="${l(t.song.title)}" data-songartist="${l(t.song.artist)}" style="cursor:pointer;" title="\u30AF\u30EA\u30C3\u30AF\u3067\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u7D5E\u308A\u8FBC\u307F">
      <span class="a-date">${t.maxGap}\u65E5</span>
      <span class="a-title">${l(t.song.title)} <span style="color:var(--ink-mute);">/ ${l(t.song.artist)}</span></span>
      <span class="a-meta">${y(t.gapStart)}\u2192${y(t.gapEnd)}</span>
    </div>
  `).join(""):'<div class="empty-state">\u8A72\u5F53\u30C7\u30FC\u30BF\u306A\u3057</div>'}function U(e){let s=e.filter(t=>t.count===1).sort((t,i)=>(i.lastSung?.getTime()||0)-(t.lastSung?.getTime()||0)).slice(0,10);h("#oneshot-list").innerHTML=s.length?s.map(t=>`
    <div class="activity-row" data-songkey="${l(t.key)}" data-songtitle="${l(t.title)}" data-songartist="${l(t.artist)}" style="cursor:pointer;" title="\u30AF\u30EA\u30C3\u30AF\u3067\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u7D5E\u308A\u8FBC\u307F">
      <span class="a-date">${t.lastSung?y(t.lastSung):"\u2014"}</span>
      <span class="a-title">${l(t.title)} <span style="color:var(--ink-mute);">/ ${l(t.artist)}</span></span>
      <span class="a-meta">${t.daysSinceLast!=null?t.daysSinceLast+"\u65E5\u524D":"\u2014"}</span>
    </div>
  `).join(""):'<div class="empty-state">\u8A72\u5F53\u30C7\u30FC\u30BF\u306A\u3057</div>'}function Tt(){let{songs:e,streams:s,artists:t}=k.data,a=[...e].sort((S,x)=>x.count-S.count).slice(0,5),r=a[0]?.count||1,n=s.slice(0,5),o=M(),d=h("#panel-dashboard"),u=G(s,o),m=j(s).slice(-12),p=it(e),$=`
    <div class="card dashboard-card dashboard-top-card">
      <div class="card-title">${c("rank")} TOP5 \u697D\u66F2</div>
      <div class="bar-list">
        ${a.length?a.map((S,x)=>D(S,x,r)).join(""):'<div class="empty-state">\u66F2\u30C7\u30FC\u30BF\u306A\u3057</div>'}
      </div>
    </div>
  `;d.innerHTML=`
    <div class="dashboard-grid" id="dashboard-grid">
      <div class="dashboard-trio-grid">
        ${$}
        ${tt(s)}
        <div class="card dashboard-card dashboard-genre-card">
          <div class="card-title">${c("chart")} \u30B8\u30E3\u30F3\u30EB\u5206\u5E03 <span class="pill">${e.length}\u66F2</span></div>
          ${nt(p)}
        </div>
      </div>
      <div class="dashboard-overview-grid">
        <div class="card dashboard-card dashboard-monthly-card">
          <div class="card-title">${c("music")} \u6708\u5225 \u6B4C\u5531\u6570 <span class="pill">\u76F4\u8FD112\u304B\u6708</span></div>
          ${m.length?g("chart-monthly",{class:"short"}):'<div class="empty-state">\u6708\u5225\u30C7\u30FC\u30BF\u306A\u3057</div>'}
        </div>
        <div class="card dashboard-card dashboard-heatmap-card">
          <div class="card-title">${c("calendar")} \u914D\u4FE1\u30D2\u30FC\u30C8\u30DE\u30C3\u30D7 <span class="pill">\u76F4\u8FD11\u5E74</span></div>
          ${ut(u)}
        </div>
      </div>
      ${st()}
      ${rt(n)}
      <div class="dashboard-analytics-section" id="dashboard-analytics">
        ${E(e,s)}
      </div>
    </div>
  `,et(),X(),dt(p),ct(m),Y(e,s,t);let f=d.querySelector(".heatmap-wrap");f&&(f.scrollLeft=f.scrollWidth)}function X(){let e=h("#dashboard-hits-toggle"),s=e?.closest(".dashboard-list-card");if(!e||!s)return;let t=i=>{s.querySelectorAll("[data-hits-list]").forEach(a=>{a.hidden=a.dataset.hitsList!==i}),e.querySelectorAll("[data-hits-period]").forEach(a=>{let r=a.dataset.hitsPeriod===i;a.classList.toggle("is-active",r),a.setAttribute("aria-selected",String(r))}),e.dataset.active=i};e.addEventListener("click",i=>{let a=i.target.closest("[data-hits-period]");a&&t(a.dataset.hitsPeriod)}),t("month")}function tt(e){let s=H(e,"month",M()),t=H(e,"year",M());return`
    <div class="card dashboard-card dashboard-list-card dashboard-list-hits">
      <div class="card-title">${c("rank")} \u3088\u304F\u6B4C\u308F\u308C\u305F\u66F2
        <span class="seg-control" id="dashboard-hits-toggle" data-active="month" role="tablist" aria-label="\u671F\u9593\u5207\u66FF">
          <span class="seg-thumb" aria-hidden="true"></span>
          <button class="seg-btn is-active" type="button" role="tab" aria-selected="true" data-hits-period="month">\u4ECA\u6708</button>
          <button class="seg-btn" type="button" role="tab" aria-selected="false" data-hits-period="year">\u4ECA\u5E74</button>
        </span>
      </div>
      <div class="bar-list" data-hits-list="month">
        ${s.length?s.slice(0,5).map((i,a)=>D(i,a,s[0].count)).join(""):'<div class="empty-state">\u4ECA\u6708\u306E\u6B4C\u5531\u5C65\u6B74\u306A\u3057</div>'}
      </div>
      <div class="bar-list" data-hits-list="year" hidden>
        ${t.length?t.slice(0,5).map((i,a)=>D(i,a,t[0].count)).join(""):'<div class="empty-state">\u4ECA\u5E74\u306E\u6B4C\u5531\u5C65\u6B74\u306A\u3057</div>'}
      </div>
    </div>
  `}function at(e){let s=Math.max(0,Math.floor(e)),t=Math.floor(s/3600),i=Math.floor(s%3600/60),a=s%60;return t>0?`${t}:${String(i).padStart(2,"0")}:${String(a).padStart(2,"0")}`:`${i}:${String(a).padStart(2,"0")}`}function st(){let e=C().slice(0,6);return e.length?`
    <div class="card dashboard-card dashboard-resume-card">
      <div class="card-title">${c("play")} \u7D9A\u304D\u304B\u3089\u898B\u308B
        <span class="dashboard-resume-actions">
          <button class="dashboard-resume-clear dashboard-resume-queue" id="dashboard-resume-queue" type="button" title="\u5C65\u6B74\u3092\u30AD\u30E5\u30FC\u3068\u3057\u3066\u518D\u751F">\u30AD\u30E5\u30FC\u518D\u751F</button>
          <button class="dashboard-resume-clear" id="dashboard-resume-clear" type="button" title="\u5C65\u6B74\u3092\u6D88\u53BB">\u6D88\u53BB</button>
        </span>
      </div>
      <div class="dashboard-resume-list" id="dashboard-resume-list">
        ${e.map((s,t)=>{let i=O(s.url),a=Math.floor((Date.now()-(s.updatedAt||0))/864e5),r=a<=0?"\u4ECA\u65E5":`${a}\u65E5\u524D`;return`
          <button class="dashboard-resume-item" type="button" data-resume-idx="${t}" title="${l(s.title||"")}">
            ${i?`<img class="dashboard-resume-thumb" src="${l(i)}" alt="" width="320" height="180" loading="lazy" referrerpolicy="no-referrer">`:'<div class="dashboard-resume-thumb"></div>'}
            <span class="dashboard-resume-title">${l(s.title||"\u52D5\u753B")}</span>
            <span class="dashboard-resume-meta">${c("time")} ${at(s.t)} \u304B\u3089 \u30FB ${r}</span>
          </button>`}).join("")}
      </div>
    </div>`:""}function et(){let e=h("#dashboard-resume-list");e&&(e.onclick=i=>{let a=i.target.closest("[data-resume-idx]");if(!a)return;let r=C()[Number(a.dataset.resumeIdx)];if(!r?.url)return;let n=null;r.channel!=null&&r.index!=null&&(n=(k.channelData?.combined?.streams||k.data?.streams||[]).find(d=>d.channel===r.channel&&d.index===r.index)||null),z(n||{url:r.url,title:r.title,isMv:!!r.isMv},r.t)});let s=h("#dashboard-resume-clear");s&&(s.onclick=()=>{q(),h("#panel-dashboard .dashboard-resume-card")?.remove()});let t=h("#dashboard-resume-queue");t&&(t.onclick=()=>{let i=C(),a=k.channelData?.combined?.streams||k.data?.streams||[],r=i.map((n,o)=>{let d=n.channel!=null&&n.index!=null?a.find(u=>u.channel===n.channel&&u.index===n.index):null;return d?.url?{kind:"stream",key:`${d.channel}:${d.index}`,stream:d}:n.url?{kind:"mv",key:`history:${o}`,video:{url:n.url,title:n.title||"\u52D5\u753B",isMv:!!n.isMv}}:null}).filter(Boolean);r.length&&B({name:"\u8996\u8074\u5C65\u6B74",items:r,idx:0})})}function rt(e){return`
    <div class="card dashboard-card dashboard-recent-card">
      <div class="card-title">${c("video")} \u76F4\u8FD1\u306E\u6B4C\u67A0 <span class="pill">\u6700\u65B0${e.length}\u4EF6</span></div>
      ${e.map(s=>`
        <div class="activity-row">
          <span class="a-date">${y(s.date)}</span>
          <span class="a-title">${s.url?`<a href="${l(s.url)}" target="_blank" rel="noopener">${l(s.title||"\u914D\u4FE1")}</a>`:l(s.title)}</span>
          <span class="a-meta">${c("mic")} ${s.songs.length}\u66F2</span>
        </div>
      `).join("")}
    </div>
  `}function D(e,s,t){let i=Math.round(e.count/t*100);return`
    <div class="bar-row clickable" role="button" tabindex="0" data-songkey="${l(e.key)}" data-songtitle="${l(e.title)}" data-songartist="${l(e.artist)}">
      <div class="bar-rank">${s+1}</div>
      <div class="bar-content">
        <div class="bar-label">${l(e.title)}${e.artist?` <span class="bar-label-sep">/</span> <button class="bar-label-artist artist-search-btn" type="button" data-artist-search="${l(e.artist)}" title="\u3053\u306E\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u306E\u66F2\u3092\u7D5E\u308A\u8FBC\u3080">${l(e.artist)}</button>`:""}</div>
        <div class="bar-bar" style="width:${i}%;"></div>
      </div>
      <div class="bar-value">${e.count}</div>
    </div>
  `}function it(e){let s=new Map;for(let r of e){let n=r.genre||r.genreText||"\u672A\u5206\u985E";!n||n==="\u672A\u5206\u985E"||s.set(n,(s.get(n)||0)+1)}let t=Array.from(s.entries()).sort((r,n)=>n[1]-r[1]);if(t.length<=9)return t;let i=t.slice(0,8),a=t.slice(8).reduce((r,[,n])=>r+n,0);return[...i,["\u305D\u306E\u4ED6",a]]}function _(){return["#d9a514","#5f8f45","#7ab8d9","#c97f9e","#8d86c9","#6fbfb0","#b98b52","#d49a6a","#9aa3ad"]}function nt(e){if(!e.length)return'<div class="empty-state">\u30B8\u30E3\u30F3\u30EB\u30C7\u30FC\u30BF\u306A\u3057</div>';let s=e.reduce((i,[,a])=>i+a,0),t=_();return`
    <div class="genre-doughnut" aria-label="\u30B8\u30E3\u30F3\u30EB\u5206\u5E03">
      ${g("chart-genre",{class:"genre-chart"})}
      <div class="genre-table">
        ${e.map(([i,a],r)=>`
          <div class="genre-trow" style="--gc:${t[r%t.length]}" title="${l(i)}: ${a}\u66F2">
            <span class="genre-tdot" aria-hidden="true"></span>
            <span class="genre-tname">${l(i)}</span>
            <span class="genre-tvals"><strong class="genre-tpct">${Math.round(a/s*100)}%</strong><span class="genre-tcount">(${a}\u66F2)</span></span>
          </div>
        `).join("")}
      </div>
    </div>
  `}function lt(e){return{id:"genre-pct",afterDatasetsDraw(s){let t=s.getDatasetMeta(0);if(!t?.data?.length)return;let i=s.data.datasets[0].data,a=i.reduce((n,o)=>n+o,0);if(!a)return;let{ctx:r}=s;r.save(),t.data.forEach((n,o)=>{let d=Math.round(i[o]/a*100),u=(n.startAngle+n.endAngle)/2,m=e[o%e.length];if(d>=4){let p=(n.innerRadius+n.outerRadius)/2,$=n.x+Math.cos(u)*p,f=n.y+Math.sin(u)*p;r.fillStyle="#fff",r.font='800 12px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif',r.textAlign="center",r.textBaseline="middle",r.fillText(`${d}%`,$,f)}else{let p=Math.cos(u),$=Math.sin(u),f=n.x+p*n.outerRadius,S=n.y+$*n.outerRadius,x=n.x+p*(n.outerRadius+6),T=n.y+$*(n.outerRadius+6),P=x+(p>=0?12:-12);r.strokeStyle=m,r.lineWidth=1.2,r.beginPath(),r.moveTo(f,S),r.lineTo(x,T),r.lineTo(P,T),r.stroke(),r.fillStyle=m,r.font='800 11px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif',r.textAlign=p>=0?"left":"right",r.textBaseline="middle",r.fillText(`${d}%`,P+(p>=0?3:-3),T)}}),r.restore()}}}function ot(e){return{id:"genre-center",afterDraw(s){let t=s.getDatasetMeta(0)?.data?.[0];if(!t)return;let i=v(),{ctx:a}=s;a.save(),a.textAlign="center",a.textBaseline="middle",a.fillStyle=i.ink,a.font='800 18px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif',a.fillText(`${e}\u66F2`,t.x,t.y-9),a.fillStyle=i.inkMute,a.font='500 11px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif',a.fillText("\u5168\u4F53",t.x,t.y+12),a.restore()}}}function dt(e){if(!e.length)return;let s=v(),t=_(),i=e.reduce((a,[,r])=>a+r,0);b("chart-genre","doughnut",{labels:e.map(([a])=>a),datasets:[{data:e.map(([,a])=>a),backgroundColor:e.map((a,r)=>t[r%t.length]),borderColor:s.surface,borderWidth:2}]},{cutout:"58%",layout:{padding:14},scales:{x:{display:!1},y:{display:!1}},plugins:{legend:{display:!1},tooltip:{callbacks:{label:a=>{let r=a.dataset.data.reduce((o,d)=>o+d,0),n=r?Math.round(a.parsed/r*100):0;return` ${a.label}: ${a.parsed}\u66F2 (${n}%)`}}}}},[lt(t),ot(i)])}function ct(e){if(!e.length)return;let s=e.map(i=>w(i.date).replace(/^\d{4}\//,"")),t=v();b("chart-monthly","line",{labels:s,datasets:[{label:"\u6B4C\u5531\u6570",data:e.map(i=>i.songs),borderColor:t.primaryStrong,backgroundColor:t.primary+"30",tension:.4,fill:!0,pointRadius:3,pointHoverRadius:5,borderWidth:2},{label:"\u6B4C\u67A0\u6570",data:e.map(i=>i.streams),borderColor:t.accent,backgroundColor:"transparent",tension:.4,fill:!1,pointRadius:2,pointHoverRadius:4,borderWidth:1.5,borderDash:[4,3],yAxisID:"y2"}]},{plugins:{legend:{display:!0,position:"top",align:"end",labels:{boxWidth:10,padding:10,font:{size:10}}}},scales:{y:{beginAtZero:!0},y2:{position:"right",beginAtZero:!0,grid:{drawOnChartArea:!1},ticks:{color:t.accentStrong,font:{size:10},precision:0}}}})}function ut(e){let t=["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"].map(a=>`<div>${a}</div>`).join(""),i=e.map(a=>a.inRange?`<div class="heatmap-cell ${I(a.value)}" title="${a.iso}: ${a.value}\u66F2"></div>`:'<div class="heatmap-cell" style="visibility:hidden"></div>').join("");return`
    <div class="heatmap-flex">
      <div class="heatmap-row-labels">${t}</div>
      <div class="heatmap-wrap"><div class="heatmap">${i}</div></div>
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
  `}export{Tt as renderDashboard};
