import{c as p,d as g,g as v}from"./chunk-7LFO6CZV.js";import{e as h}from"./chunk-FCOJKAWC.js";import{L as d,M as w,X as l,e as f,f as c,h as e,j as b,n as $,t as k}from"./chunk-W7UWNHP7.js";function z(){let{songs:s,streams:a,artists:t}=f.data,n=c("#panel-analytics");n.innerHTML=`
    <div class="section-header">
      <h2>${l("analytics")} \u30A2\u30CA\u30EA\u30C6\u30A3\u30AF\u30B9</h2>
      <span class="count-pill">${a.length}\u67A0 \xD7 ${s.length}\u66F2\u3092\u5206\u6790</span>
    </div>

    <div class="analytics-grid">

      <div class="card col-6">
        <div class="card-title">${l("chart")} \u6301\u3061\u66F2\u306E\u7D2F\u7A4D\u6210\u9577 <span class="pill">\u521D\u62AB\u9732\u30D9\u30FC\u30B9</span></div>
        ${v("chart-growth")}
      </div>

      <div class="card col-6">
        <div class="card-title">${l("mic")} 1\u67A0\u3042\u305F\u308A\u306E\u66F2\u6570 <span class="pill">\u6642\u7CFB\u5217</span></div>
        ${v("chart-songs-per-stream")}
      </div>

      <div class="card col-6">
        <div class="card-title">${l("calendar")} \u66DC\u65E5\u5206\u5E03 <span class="pill">\u914D\u4FE1\u65E5</span></div>
        ${v("chart-dow",{class:"short"})}
      </div>

      <div class="card col-6">
        <div class="card-title">${l("chart")} \u6B4C\u5531\u56DE\u6570\u306E\u5206\u5E03 <span class="pill">\u30D2\u30B9\u30C8\u30B0\u30E9\u30E0</span></div>
        ${v("chart-histogram",{class:"short"})}
      </div>

      <div class="card col-12">
        <div class="card-title">${l("artist")} \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u5225 \u6B4C\u5531\u5408\u8A08 <span class="pill">TOP${h}</span></div>
        <div id="artist-bar-list" class="bar-list"></div>
      </div>

      <div class="card col-6">
        <div class="card-title">${l("sparkle")} \u4E45\u3057\u3076\u308A\u306B\u6B4C\u308F\u308C\u305F\u66F2 <span class="pill">\u524D\u56DE\u304B\u3089\u9577\u304B\u3063\u305FTOP10</span></div>
        <div id="comeback-list"></div>
      </div>

      <div class="card col-6">
        <div class="card-title">${l("time")} 1\u56DE\u3057\u304B\u6B4C\u308F\u308C\u3066\u3044\u306A\u3044\u66F2 <span class="pill">${s.filter(r=>r.count===1).length}\u66F2</span></div>
        <div id="oneshot-list"></div>
      </div>

    </div>
  `,M(s),T(a),x(a),A(s),L(t.length?t:$(s)),H(s),W(s)}function M(s){let a=p(),t=new Map;for(let m of s){if(!m.firstSung)continue;let y=b(m.firstSung);t.set(y,(t.get(y)||0)+1)}let n=Array.from(t.keys()).sort();if(!n.length)return;let r=[],i=[],u=0,o=C(n[0]),S=C(n[n.length-1]);for(;o<=S;){let m=b(o);u+=t.get(m)||0,r.push(w(o)),i.push(u),o=new Date(o.getFullYear(),o.getMonth()+1,1)}g("chart-growth","line",{labels:r,datasets:[{label:"\u7D2F\u7A4D\u6301\u3061\u66F2\u6570",data:i,borderColor:a.primaryStrong,backgroundColor:a.primary+"33",tension:.25,fill:!0,pointRadius:2,borderWidth:2}]})}function C(s){let[a,t]=s.split("-").map(Number);return new Date(a,t-1,1)}function T(s){let a=p(),t=[...s].sort((n,r)=>n.date-r.date);g("chart-songs-per-stream","line",{labels:t.map(n=>d(n.date)),datasets:[{label:"\u66F2\u6570",data:t.map(n=>n.songs.length),borderColor:a.accentStrong,backgroundColor:a.accent+"33",tension:.2,fill:!0,pointRadius:1.5,borderWidth:1.5}]},{scales:{x:{ticks:{maxTicksLimit:8}}}})}function x(s){let a=p(),t=["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"],n=new Array(7).fill(0),r=new Array(7).fill(0);for(let i of s)n[i.dayOfWeek]+=1,r[i.dayOfWeek]+=i.songs.length;g("chart-dow","bar",{labels:t,datasets:[{label:"\u914D\u4FE1\u56DE\u6570",data:n,backgroundColor:a.primary+"cc",borderColor:a.primaryStrong,borderWidth:1,yAxisID:"y",borderRadius:6},{label:"\u6B4C\u5531\u6570",data:r,backgroundColor:a.accent+"cc",borderColor:a.accentStrong,borderWidth:1,yAxisID:"y2",borderRadius:6}]},{scales:{y:{position:"left",title:{display:!0,text:"\u914D\u4FE1",color:a.inkMute,font:{size:10}}},y2:{position:"right",title:{display:!0,text:"\u6B4C\u5531",color:a.inkMute,font:{size:10}},grid:{display:!1},beginAtZero:!0}}})}function A(s){let a=p(),t=[{label:"1\u56DE",range:[1,1]},{label:"2\u56DE",range:[2,2]},{label:"3\u56DE",range:[3,3]},{label:"4-5\u56DE",range:[4,5]},{label:"6-10\u56DE",range:[6,10]},{label:"11-20\u56DE",range:[11,20]},{label:"21\u56DE\u301C",range:[21,1/0]}],n=t.map(r=>s.filter(i=>i.count>=r.range[0]&&i.count<=r.range[1]).length);g("chart-histogram","bar",{labels:t.map(r=>r.label),datasets:[{label:"\u66F2\u6570",data:n,backgroundColor:a.primary+"cc",borderColor:a.primaryStrong,borderWidth:1,borderRadius:6}]},{plugins:{legend:{display:!1}}})}function L(s){let a=s.slice(0,h),t=c("#artist-bar-list");if(!a.length){t.innerHTML='<div class="empty-state">\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div>';return}let n=a[0]?.totalCount||1;t.innerHTML=a.map((r,i)=>{let u=Math.round(r.totalCount/n*100);return`
      <div class="bar-row" data-artist-search="${e(r.artist)}" style="cursor:pointer;" title="\u30AF\u30EA\u30C3\u30AF\u3067\u3053\u306E\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u306E\u66F2\u3092\u8868\u793A">
        <div class="bar-rank">${i+1}</div>
        <div class="bar-content">
          <div class="bar-label">${e(r.artist)} <span style="color:var(--ink-mute);font-size:11px;">\uFF08${r.songCount}\u66F2\uFF09</span></div>
          <div class="bar-bar accent" style="width:${u}%;"></div>
        </div>
        <div class="bar-value">${r.totalCount}</div>
      </div>
    `}).join("")}function H(s){let a=k(s,10);c("#comeback-list").innerHTML=a.length?a.map((t,n)=>`
    <div class="activity-row" data-songkey="${e(t.song.key)}" data-songtitle="${e(t.song.title)}" data-songartist="${e(t.song.artist)}" style="cursor:pointer;" title="\u30AF\u30EA\u30C3\u30AF\u3067\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u7D5E\u308A\u8FBC\u307F">
      <span class="a-date">${t.maxGap}\u65E5</span>
      <span class="a-title">${e(t.song.title)} <span style="color:var(--ink-mute);">/ ${e(t.song.artist)}</span></span>
      <span class="a-meta">${d(t.gapStart)}\u2192${d(t.gapEnd)}</span>
    </div>
  `).join(""):'<div class="empty-state">\u8A72\u5F53\u30C7\u30FC\u30BF\u306A\u3057</div>'}function W(s){let a=s.filter(t=>t.count===1).sort((t,n)=>(n.lastSung?.getTime()||0)-(t.lastSung?.getTime()||0)).slice(0,10);c("#oneshot-list").innerHTML=a.length?a.map(t=>`
    <div class="activity-row" data-songkey="${e(t.key)}" data-songtitle="${e(t.title)}" data-songartist="${e(t.artist)}" style="cursor:pointer;" title="\u30AF\u30EA\u30C3\u30AF\u3067\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u7D5E\u308A\u8FBC\u307F">
      <span class="a-date">${t.lastSung?d(t.lastSung):"\u2014"}</span>
      <span class="a-title">${e(t.title)} <span style="color:var(--ink-mute);">/ ${e(t.artist)}</span></span>
      <span class="a-meta">${t.daysSinceLast!=null?t.daysSinceLast+"\u65E5\u524D":"\u2014"}</span>
    </div>
  `).join(""):'<div class="empty-state">\u8A72\u5F53\u30C7\u30FC\u30BF\u306A\u3057</div>'}export{z as renderAnalytics};
