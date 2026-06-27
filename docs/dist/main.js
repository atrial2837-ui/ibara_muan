import{a as ae,b as ne,c as ie,i as le,j as re,k as B,l as O}from"./chunk-2SVNDSRJ.js";import{a as oe,b as ce,e as It,f as de}from"./chunk-U2GWFHGH.js";import"./chunk-2E6JXX77.js";import{a as te,b as Mt,c as ee,e as c}from"./chunk-B4LXPATM.js";import{a as et,f as Pt}from"./chunk-HDKS545O.js";import{a as r,b as M,c as T,e as Y,g as Ct,i as f,k as F,l as se}from"./chunk-3CMR4JCK.js";var x=-1,D=[],At=null,K=null,yt=null;function me(t){At=t;let e=document.createElement("div");e.id="omni-backdrop",e.hidden=!0,e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","\u30B5\u30A4\u30C8\u5185\u691C\u7D22"),e.innerHTML=`
    <div id="omni-box">
      <div class="omni-input-row">
        <span class="omni-search-icon" aria-hidden="true">\u{1F50D}</span>
        <input
          id="omni-input"
          class="omni-input"
          type="search"
          placeholder="\u66F2\u30FB\u914D\u4FE1\u30FB\u52D5\u753B\u3092\u691C\u7D22\uFF08\u30B9\u30DA\u30FC\u30B9\u533A\u5207\u308A\u3067\u7D5E\u308A\u8FBC\u307F\uFF09"
          autocomplete="off"
          spellcheck="false"
          aria-label="\u30B5\u30A4\u30C8\u5185\u691C\u7D22"
          aria-autocomplete="list"
          aria-controls="omni-listbox"
        >
        <kbd class="omni-esc-key">Esc</kbd>
      </div>
      <div id="omni-listbox" class="omni-listbox" role="listbox" aria-label="\u691C\u7D22\u7D50\u679C"></div>
      <div class="omni-footer">
        <span><kbd>\u2191</kbd><kbd>\u2193</kbd> \u79FB\u52D5</span>
        <span><kbd>Enter</kbd> \u9078\u629E</span>
        <span><kbd>Esc</kbd> \u9589\u3058\u308B</span>
      </div>
    </div>
  `,document.body.appendChild(e),e.addEventListener("click",a=>{a.target===e&&nt()});let s=document.getElementById("omni-input");s.addEventListener("input",()=>Dt(s.value)),s.addEventListener("keydown",Ye),document.getElementById("omni-listbox").addEventListener("click",a=>{let n=a.target.closest("[data-omni-idx]");n&&he(Number(n.dataset.omniIdx))})}function fe(){let t=document.getElementById("omni-backdrop");if(!t)return;t.hidden=!1,x=-1,D=[];let e=document.getElementById("omni-input");e&&(e.value="",e.focus(),e.select()),Dt(""),Oe().then(()=>{if(!qt())return;let s=document.getElementById("omni-input")?.value||"";s.trim()&&Dt(s)})}function nt(){let t=document.getElementById("omni-backdrop");t&&(t.hidden=!0),x=-1}function qt(){let t=document.getElementById("omni-backdrop");return!!(t&&!t.hidden)}function Ye(t){let e=document.querySelectorAll("#omni-listbox [data-omni-idx]");t.key==="ArrowDown"?(t.preventDefault(),x=Math.min(x+1,e.length-1),ue(e)):t.key==="ArrowUp"?(t.preventDefault(),x=Math.max(x-1,-1),ue(e)):t.key==="Enter"?(t.preventDefault(),x>=0&&D[x]&&he(x)):t.key==="Escape"&&(t.preventDefault(),nt())}function ue(t){t.forEach((e,s)=>{e.classList.toggle("is-active",s===x),e.setAttribute("aria-selected",String(s===x))}),x>=0&&t[x]?.scrollIntoView({block:"nearest"})}function he(t){let e=D[t];!e||!At||(nt(),At(e))}function Dt(t){let e=document.getElementById("omni-listbox");if(!e)return;x=-1,D=[];let s=c.data?.songs||[],a=c.data?.streams||[],n=K||[],i=W(t),l="",d=0;if(!c.data){e.innerHTML='<div class="omni-empty">\u30C7\u30FC\u30BF\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>';return}if(!i){let p=s.slice(0,8);if(p.length){l+=st("\u{1F3C6} \u3088\u304F\u6B4C\u308F\u308C\u308B\u66F2");for(let m of p)D.push({type:"song",song:m}),l+=ve(m,d++,"")}e.innerHTML=l||'<div class="omni-empty">\u691C\u7D22\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044</div>';return}let o=[];try{o=(re(t,s).results||[]).slice(0,8)}catch{}if(o.length||(o=s.filter(p=>pe(t,`${p.title} ${p.artist}`)).slice(0,8)),o.length){l+=st("\u{1F3B5} \u66F2");for(let p of o)D.push({type:"song",song:p}),l+=ve(p,d++,i)}if(n.length){let p=n.filter(m=>Ke(m,t)).slice(0,6);if(p.length){l+=st("\u{1F3AC} \u6B4C\u307F\u305F\u30FB\u30AA\u30EA\u66F2");for(let m of p)D.push({type:"music-video",video:m}),l+=Fe(m,d++,t)}}let u=new Set,v=[];for(let p of s)if(p.artist&&pe(t,p.artist)&&!u.has(p.artist)&&(u.add(p.artist),v.push(p.artist),v.length>=4))break;if(v.length){l+=st("\u{1F3A4} \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8");for(let p of v){let m=s.filter(h=>h.artist===p).length;D.push({type:"artist",artist:p}),l+=`<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${d++}">
        <span class="omni-item-icon">\u{1F3A4}</span>
        <div class="omni-item-body">
          <span class="omni-item-title">${at(f(p),i)}</span>
          <span class="omni-item-meta">${m}\u66F2 \xB7 \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u7D5E\u308A\u8FBC\u307F</span>
        </div>
      </div>`}}if(a.length){let p=a.filter(m=>{let h=W(`${m.title||""} ${(m.songs||[]).map(b=>`${b.title||""} ${b.artist||""}`).join(" ")}`),g=gt(t);return g.length>0&&g.every(b=>h.includes(b))}).slice(0,5);if(p.length){l+=st("\u{1F4C5} \u914D\u4FE1\u67A0");for(let m of p){D.push({type:"stream",stream:m});let h="";l+=`<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${d++}">
          <span class="omni-item-icon">\u{1F4C5}</span>
          <div class="omni-item-body">
            <span class="omni-item-title">${at(f(m.title||"\u914D\u4FE1"),i)}</span>
            <span class="omni-item-meta">${T(m.date)}${h?" \xB7 "+h:""} \xB7 ${m.songs?.length||0}\u66F2 \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u518D\u751F</span>
          </div>
        </div>`}}}l||(l=`<div class="omni-empty">\u300C${f(t)}\u300D\u306B\u4E00\u81F4\u3059\u308B\u7D50\u679C\u304C\u3042\u308A\u307E\u305B\u3093 \u{1F420}</div>`),e.innerHTML=l}function st(t){return`<div class="omni-section-label" role="presentation">${t}</div>`}function ve(t,e,s){return`<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${e}">
    <span class="omni-item-icon">\u{1F3B5}</span>
    <div class="omni-item-body">
      <span class="omni-item-title">${at(f(t.title),s)}</span>
      <span class="omni-item-meta">${at(f(t.artist||""),s)} \xB7 ${t.count}\u56DE\u6B4C\u5531</span>
    </div>
    <span class="omni-item-count">${t.count}<small>\u56DE</small></span>
  </div>`}function Fe(t,e,s){let a=be(t),n=t.originalArtist||t.character||a;return`<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${e}">
    <span class="omni-item-icon">\u{1F3AC}</span>
    <div class="omni-item-body">
      <span class="omni-item-title">${at(f(t.title||"\u52D5\u753B"),s)}</span>
      <span class="omni-item-meta">${f(a)}${n?" \xB7 "+f(n):""} \xB7 \u52D5\u753B\u3067\u898B\u308B</span>
    </div>
  </div>`}function Oe(){return K!==null?Promise.resolve(K):yt||(yt=fetch("/data/music.json",{cache:"no-store"}).then(t=>t.ok?t.json():Promise.reject(new Error(`music.json ${t.status}`))).then(t=>(K=Array.isArray(t?.videos)?t.videos:[],K)).catch(()=>(K=[],K)),yt)}function Ke(t,e){let s=gt(e);if(!s.length)return!1;let a=ze(t);return s.every(n=>a.includes(n))}function ze(t){let e=t.title||"",s=e.split(/[\/／|｜]/).map(a=>a.trim()).filter(Boolean);return W([e,...s,t.originalArtist,t.character,t.type,be(t)].filter(Boolean).join(" "))}function be(t){switch(t?.type){case"cover":return"\u6B4C\u307F\u305F";case"sugarily":return"\u3057\u3085\u304C\u308A\u308A";default:return"\u30AA\u30EA\u66F2"}}function gt(t){return W(t).split(/[\/／|｜\s]+/).map(e=>e.trim()).filter(Boolean)}function pe(t,e){let s=gt(t);if(!s.length)return!1;let a=W(e);return s.every(n=>a.includes(n))}function W(t){return String(t||"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim()}function at(t,e){let a=gt(e).find(l=>l&&t.toLowerCase().includes(l))||W(e);if(!a)return t;let i=t.toLowerCase().indexOf(a);return i<0?t:t.slice(0,i)+'<mark class="hl">'+t.slice(i,i+a.length)+"</mark>"+t.slice(i+a.length)}ce();ee();var Se={dashboard:()=>import("./chunk-6SZI6GTM.js").then(t=>t.renderDashboard),ranking:()=>import("./chunk-ORPQOZ24.js").then(t=>t.renderRanking),songs:()=>import("./chunk-ZTQI7VCU.js").then(t=>t.renderSongs),timeline:()=>import("./chunk-3QVD4PSE.js").then(t=>t.renderTimeline),analytics:()=>import("./chunk-VYPOGAE4.js").then(t=>t.renderAnalytics),playlists:()=>import("./chunk-E5UYFPOK.js").then(t=>t.renderPlaylists)},wt=new Map,ye=0,J=null;function Lt(t){return Object.prototype.hasOwnProperty.call(Se,t)}async function Ge(t){wt.has(t)||wt.set(t,Se[t]());try{return await wt.get(t)}catch(e){throw wt.delete(t),e}}function xe(t){return["dashboard","timeline","analytics"].includes(t)}function Qe(t,e={}){let s=r(`#panel-${t}`);if(!s)return;let a={dashboard:"\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u8A73\u7D30",ranking:"\u30E9\u30F3\u30AD\u30F3\u30B0",songs:"\u66F2\u30EA\u30B9\u30C8",timeline:"\u914D\u4FE1\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3",analytics:"\u30A2\u30CA\u30EA\u30C6\u30A3\u30AF\u30B9"};s.innerHTML=`
    <div class="state-card">
      <div class="msg">${f(a[t]||"\u8A73\u7D30\u30C7\u30FC\u30BF")}</div>
      <div class="err-detail">\u8AAD\u307F\u8FBC\u307F\u4E2D\u3067\u3059\u3002</div>
    </div>
  `}function We(t){let e=r(`#panel-${t}`);e&&(e.innerHTML=`
    <div class="state-card">
      <div class="msg">\u8A73\u7D30\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059</div>
    </div>
  `)}function Je(t){if(c.channelData?.fullLoaded)return;c.channelData=t;let e=U(c.channel)?c.channel:et,s=U(e);s&&(c.data=s),!xe(c.activeTab)&&c.data&&G(c.activeTab,{autoLoad:!1})}function Ze(t){c.channelData=t,c.channelData.fullLoaded=!0;let e=U(c.channel)?c.channel:et;Tt(e,{resetSearch:!1,updateUrl:!1,render:!1}),G(c.activeTab,{autoLoad:!1})}function _e(){return J=ne({meta:c.channelData,onSongsReady:Je}).then(Ze).finally(()=>{J=null}),J}async function Nt(){c.channelData?.fullLoaded||(J||_e(),await J)}async function G(t=c.activeTab,e={}){if(t!=="playlists"&&(!c.data||!Lt(t))||!Lt(t))return;let s=c.channelData?.partialLoaded||c.channelData?.fullLoaded,a=c.channelData?.fullLoaded;if(t==="playlists"?!1:xe(t)?!a:!s)if(e.autoLoad){We(t);try{await Nt()}catch(l){console.error("[data] full load failed",l);let d=r(`#panel-${t}`);d&&(d.innerHTML=`
            <div class="state-card">
              <div class="msg">\u8A73\u7D30\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F</div>
              <div class="err-detail">${f(l?.message||String(l))}</div>
              <button class="btn primary" type="button" data-load-full-data="${f(t)}">\u518D\u8AAD\u307F\u8FBC\u307F</button>
            </div>
          `,d.querySelector("[data-load-full-data]")?.addEventListener("click",()=>{G(t,{autoLoad:!0})}));return}}else{Qe(t,{initial:e.initial});return}let i=++ye;try{let l=await Ge(t);if(i!==ye||t!==c.activeTab||!c.data)return;t==="songs"&&le(c.data.songs||[]),l()}catch(l){console.error(`[${t}] render failed`,l);let d=r(`#panel-${t}`);d&&(d.innerHTML=`
        <div class="state-card">
          <div class="msg">\u8868\u793A\u306B\u5931\u6557\u3057\u307E\u3057\u305F</div>
          <div class="err-detail">${f(l?.message||String(l))}</div>
        </div>
      `)}}function P(t,e={}){Lt(t)||(t="dashboard");let s=r("#stream-viewer");if(t!=="player"&&s&&!s.hidden&&!C&&!j(s)){ht=t,xt=e,pt();return}c.activeTab=t,Te(t),e.updateUrl!==!1&&O({tab:t}),G(t,{autoLoad:e.autoLoad!==!1,initial:!!e.initial})}function Te(t){M(".tab-btn").forEach(e=>e.classList.toggle("active",e.dataset.tab===t)),M(".panel").forEach(e=>e.classList.toggle("active",e.id===`panel-${t}`))}function U(t){return c.channelData?t==="all"?c.channelData.combined:c.channelData.channels[t]||null:null}function Tt(t,e={}){let s=U(t);s&&(c.channel=t,Rs(t),c.data=s,c.timelineFilter=null,c.timelineFocus=null,c.timelineLimit=12,c.songsLimit=100,e.resetSearch!==!1&&(c.songsQuery="",c.songsGenre="all"),It(),M("#channel-switch [data-channel]").forEach(a=>a.classList.toggle("active",a.dataset.channel===t)),Bt(),e.updateUrl!==!1&&O({tab:c.activeTab,channel:t,q:c.songsQuery}),Vs(),e.render!==!1&&G(c.activeTab,{autoLoad:e.autoLoad!==!1,initial:!!e.initial}))}function Xe(t,e={}){c.audience=t==="singer"?"singer":"listener",c.singerMode=c.audience==="singer",c.singerMode||(c.singerPreset="all"),M(".audience-switch [data-audience]").forEach(s=>{s.classList.toggle("active",s.dataset.audience===c.audience)}),document.body.dataset.audience=c.audience,Bt(),c.audience==="singer"?(c.songsLimit=100,P("songs",{autoLoad:e.autoLoad!==!1})):c.data&&G(c.activeTab,{autoLoad:e.autoLoad!==!1,initial:!!e.initial})}function Bt(){let t=r("#mobile-menu-label");if(!t)return;let e=r("#channel-switch [data-channel].active")?.textContent?.trim()||"\u65B0ch",s=r("#audience-switch [data-audience].active")?.textContent?.trim()||"\u30EA\u30B9\u30CA\u30FC";t.textContent=`${e} / ${s}`}function ts(){let t=r("#mobile-menu-toggle"),e=r("#mobile-menu-state"),s=r("#topbar-actions");if(!t||!e||!s)return;let a=i=>{e.checked=i,s.classList.toggle("is-open",i),t.setAttribute("aria-expanded",String(i))},n=()=>{a(!1),t.focus()};t.addEventListener("click",i=>{i.stopPropagation(),requestAnimationFrame(()=>a(e.checked))}),t.addEventListener("keydown",i=>{i.key!=="Enter"&&i.key!==" "||(i.preventDefault(),a(!e.checked))}),e.addEventListener("change",()=>{a(e.checked)}),document.addEventListener("click",i=>{s.classList.contains("is-open")&&(i.target.closest("#topbar-actions")||i.target.closest("#mobile-menu-toggle")||i.target.closest("#mobile-menu-state")||n())}),document.addEventListener("keydown",i=>{i.key==="Escape"&&n()}),s.addEventListener("click",i=>{i.stopPropagation()}),Bt()}function es(){let t=r("#page-top-toast");if(!t)return;let e=t.querySelector("img[data-src]"),s=!1,a=420,n=()=>{!e||e.src||(e.src=e.dataset.src||"")},i=()=>{s=!1;let d=window.scrollY>a;d&&n(),t.hidden=!d,t.classList.toggle("is-visible",d),t.setAttribute("aria-hidden",String(!d)),t.tabIndex=d?0:-1},l=()=>{s||(s=!0,requestAnimationFrame(i))};t.hidden=!0,t.setAttribute("aria-hidden","true"),t.tabIndex=-1,t.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})}),window.addEventListener("scroll",l,{passive:!0}),i()}function ss(){if(c.channelData)for(let t of M("#channel-switch [data-channel]")){let e=t.dataset.channel,s=e==="all"?!!c.channelData.combined:!!(c.channelData.channels&&c.channelData.channels[e]);t.disabled=!s,s?t.removeAttribute("title"):t.title="\u30C7\u30FC\u30BF\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F"}}function as({key:t,title:e,artist:s}){c.timelineFilter&&c.timelineFilter.key===t&&c.activeTab==="timeline"?c.timelineFilter=null:c.timelineFilter={key:t,title:e,artist:s},c.timelineFocus=null,c.timelineLimit=12,P("timeline"),r("#panel-timeline").scrollIntoView({behavior:"smooth",block:"start"})}async function ns(t,e){let a=(c.channelData?.combined?.streams||c.data?.streams||[]).find(l=>Y(l)===e);if(!a)return;let n=(a.songs||[]).findIndex(l=>R(l.title)===R(t.title)),i=0;if(n>=0){try{let l=X(a);l[n]!=null&&(i=l[n])}catch{}if(!i&&a.channel!=null&&a.index!=null)try{let l=await fetch(`/api/timestamps/${encodeURIComponent(a.channel)}/${a.index}`);if(l.ok){let o=((await l.json()).items||[]).find(u=>u.songIndex===n);o&&(i=o.timeSeconds)}}catch{}}S(a,i>3?Math.max(0,Math.floor(i)-2):0)}function is(t,e){c.timelineFilter={key:t.key,title:t.title,artist:t.artist},c.timelineFocus=Y(e),c.timelineLimit=9999,P("timeline"),r("#panel-timeline").scrollIntoView({behavior:"smooth",block:"start"})}function ls(t){Rt(t.artist||"")}function Rt(t){let e=String(t||"").replace(/"/g,"");c.songsQuery=e?`artist:"${e}"`:"",c.songsLimit=100,O({tab:"songs",q:c.songsQuery}),P("songs",{updateUrl:!1})}function rt(t){return(c.data?.songs||[]).find(e=>e.key===t)||null}function _(t){let e=String(t||""),s=[/youtu\.be\/([A-Za-z0-9_-]{11})/,/youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{11})/,/youtube\.com\/live\/([A-Za-z0-9_-]{11})/,/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/];for(let a of s){let n=e.match(a);if(n)return n[1]}return""}function ct(t){let e=_(t);return e?`https://i.ytimg.com/vi/${e}/hqdefault.jpg`:""}function rs(t){let e=_(t);return e?`https://i.ytimg.com/vi/${e}/mqdefault.jpg`:""}function os(t){let e=_(t);return e?`https://i.ytimg.com/vi/${e}/default.jpg`:""}function mt(){kt&&(clearInterval(kt),kt=null)}function Ut(){mt(),kt=setInterval(()=>{if(L(),!!w)try{let t=w.getDuration?.()||0,e=w.getCurrentTime?.()||0;E&&ps(E,e);let s=t>0?Math.min(e/t*100,100):0,a=r("#yt-mini-progress-fill");a&&(a.style.width=`${s}%`);let i=w.getPlayerState?.()===window.YT?.PlayerState?.PLAYING,l=r("#yt-mini-play");l&&l.setAttribute("data-playing",i?"1":"0")}catch{}},400)}function ft(){if(mt(),w){try{w.destroy()}catch{}w=null}let t=r("#yt-player-container");t&&(t.innerHTML="")}function cs(){if(w?.getCurrentTime)try{return w.getCurrentTime()}catch{}return Math.max(0,ut+(Date.now()-Kt)/1e3)}function j(t=r("#stream-viewer")){return!!t&&(t.classList.contains("sv-minified")||t.classList.contains("sv-music-minified"))}function L(){let t=r("#stream-viewer");if(!j(t))return;let e=r("#sv-player-wrap"),s=t.classList.contains("sv-music-minified")?document.querySelector("#music-bar .mbar-video-wrap"):document.querySelector("#yt-player-panel .yt-mini-video-wrap");if(!e||!s)return;let a=s.getBoundingClientRect();e.style.left=`${a.left}px`,e.style.top=`${a.top}px`,e.style.width=`${a.width}px`,e.style.height=`${a.height}px`}function ds(){let t=r("#stream-viewer"),e=t?._currentStream;if(!t||!e||!y)return!1;Ft();let s=r("#yt-player-panel");if(!s)return!1;E=e;try{ut=Math.floor(y.getCurrentTime?.()??0)}catch{ut=0}Kt=Date.now();let a=r("#yt-mini-title");a&&(a.textContent=e.title||"");let n=r("#yt-mini-hint");n&&(n.textContent="\u25B2 \u30BF\u30C3\u30D7\u3057\u3066\u914D\u4FE1\u30D3\u30E5\u30FC\u30EF\u30FC\u3078\u623B\u308B"),s.classList.add("has-stream"),s.hidden=!1,w=y,y=null,t.classList.add("sv-minified"),document.body.classList.add("has-sv-mini"),document.body.style.overflow="",Et(),A(),L(),requestAnimationFrame(L),setTimeout(L,120),setTimeout(L,400),window.addEventListener("resize",L),Ut();try{let i=w.getPlayerState?.();r("#yt-mini-play")?.setAttribute("data-playing",i===window.YT?.PlayerState?.PLAYING?"1":"0")}catch{}return Z(r("#yt-mini-vol-slider"),r("#yt-mini-vol-btn"),null,z()),!0}function Ee(){let t=r("#stream-viewer");if(!t?.classList.contains("sv-minified"))return!1;window.removeEventListener("resize",L),mt(),t.classList.remove("sv-minified"),document.body.classList.remove("has-sv-mini");let e=r("#sv-player-wrap");e&&(e.style.cssText=""),y=w,w=null;let s=r("#yt-player-panel");return s&&(s.hidden=!0),zt(),A(),setTimeout(()=>{r("#sv-close")?.focus({preventScroll:!0})},50),!0}function Me(){let t=r("#stream-viewer");if(!t?.classList.contains("sv-music-minified"))return!1;window.removeEventListener("resize",L),mt(),t.classList.remove("sv-music-minified"),document.body.classList.remove("has-sv-music");let e=r("#sv-player-wrap");return e&&(e.style.cssText=""),y=w,w=null,zt(),A(),setTimeout(()=>{r("#sv-close")?.focus({preventScroll:!0})},50),!0}function Ce(){let t=r("#stream-viewer");if(!t?.classList.contains("sv-music-minified"))return!1;window.removeEventListener("resize",L),mt(),tt(),++q,t.classList.remove("sv-music-minified"),document.body.classList.remove("has-sv-music"),t.hidden=!0,t._currentStream=null;let e=r("#sv-player-wrap");return e&&(e.style.cssText="",e.innerHTML=""),ft(),E=null,A(),!0}function us(){let t=r("#stream-viewer"),e=t?._currentStream;if(!t||t.hidden||!e?.url)return;let s=Yt(B().t),a={...e,title:e.title||(e.isMv?"\u52D5\u753B":"\u6B4C\u67A0"),type:e.isMv?e.type||"original":"stream",sub:e.isMv?e.originalArtist||e.character||e.sub||"":`${T(e.date)} \u7B2C${e.index}\u67A0`,_stream:e};if(!y){import("./chunk-63MZHHGO.js").then(i=>i.playMusicBarVideo?.(a,s)).catch(()=>{});return}try{ut=Math.floor(y.getCurrentTime?.()??s)}catch{ut=s}Kt=Date.now(),w=y,y=null,E=null,C=!1,t.classList.remove("sv-fullscreen","sv-minified"),t.classList.add("sv-music-minified"),document.body.classList.remove("has-sv-fullscreen","has-sv-mini"),document.body.classList.add("has-sv-music"),document.body.style.overflow="",t.hidden=!1;let n=r("#yt-player-panel");n&&(n.hidden=!0),Et(),A(),L(),requestAnimationFrame(L),setTimeout(L,120),setTimeout(L,400),window.addEventListener("resize",L),Ut(),import("./chunk-63MZHHGO.js").then(i=>{i.adoptExternalPlayer?.(a,w,{restore:Me,close:Ce}),L(),requestAnimationFrame(L),setTimeout(L,120),setTimeout(L,400)}).catch(()=>{})}function jt(){let t=r("#stream-viewer");if(t?.classList.contains("sv-music-minified"))return Ce();if(!t?.classList.contains("sv-minified"))return!1;window.removeEventListener("resize",L),tt(),++q,t.classList.remove("sv-minified"),document.body.classList.remove("has-sv-mini"),t.hidden=!0,t._currentStream=null;let e=r("#sv-player-wrap");e&&(e.style.cssText="",e.innerHTML=""),ft();let s=r("#yt-player-panel");return s&&(s.hidden=!0),E=null,A(),!0}var Ie="ibara-muan-watch-history-v1",ge=0;function vs(){try{return JSON.parse(localStorage.getItem(Ie)||"[]")}catch{return[]}}function Pe(t,e){if(!(!t?.url||e<10))try{let s=vs().filter(a=>a.url!==t.url);s.unshift({url:t.url,title:t.title||"",t:Math.max(0,Math.floor(e)),isMv:!!t.isMv,channel:t.channel??null,index:t.index??null,date:t.date??null,updatedAt:Date.now()}),localStorage.setItem(Ie,JSON.stringify(s.slice(0,10)))}catch{}}function ps(t,e){let s=Date.now();s-ge<5e3||(ge=s,Pe(t,e))}var it=null;function Yt(t=0){let e=[y,w];for(let s of e)try{let a=s?.getCurrentTime?.();if(Number.isFinite(a))return Math.max(0,Math.floor(a))}catch{}return Math.max(0,Math.floor(Number(t)||0))}function ms(t,e=0,s={}){if(!t)return"";let a=B(),n=new URLSearchParams,i=a.channel||c.channel;return i&&i!=="new"&&n.set("ch",i),n.set("v",t),s.includeTime!==!1&&e>5&&n.set("t",String(Math.floor(e))),`${location.origin}${location.pathname}?${n}`}function A(){let t=r("#stream-viewer"),s=t&&!t.hidden&&!j(t)&&t._currentStream?.url?_(t._currentStream.url):"",a=s?Yt(B().t):0;O({v:s||"",t:a>5?a:0},{replace:!0}),s&&Pe(t._currentStream,a),s&&!it&&(it=setInterval(A,5e3)),!s&&it&&(clearInterval(it),it=null)}function fs(){if(r("#sv-share-modal"))return;let t=document.createElement("div");t.id="sv-share-modal",t.hidden=!0,t.innerHTML=`
    <div class="sv-share-backdrop"></div>
    <div class="sv-share-dialog" role="dialog" aria-modal="true" aria-label="\u52D5\u753B\u3092\u5171\u6709">
      <div class="sv-share-head">
        <span class="sv-share-head-icon">\u2661</span>
        <span class="sv-share-head-title">\u3053\u306E\u6B4C\u67A0\u3092\u304A\u3059\u305D\u308F\u3051</span>
        <button class="sv-share-close" id="sv-share-close" type="button" aria-label="\u9589\u3058\u308B">\u2715</button>
      </div>
      <div class="sv-share-charm" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="sv-share-video">
        <span class="sv-share-video-icon">\u266A</span>
        <span class="sv-share-video-title" id="sv-share-video-title"></span>
      </div>
      <label class="sv-share-ts" id="sv-share-ts-row">
        <input type="checkbox" id="sv-share-ts-check">
        <span class="sv-share-ts-toggle" aria-hidden="true"></span>
        <span class="sv-share-ts-text"><strong id="sv-share-ts-label">0:00</strong> \u304B\u3089\u8074\u3044\u3066\u3082\u3089\u3046</span>
      </label>
      <div class="sv-share-url-row">
        <input class="sv-share-url" id="sv-share-url" type="text" readonly aria-label="\u5171\u6709\u30EA\u30F3\u30AF">
        <button class="sv-share-copy" id="sv-share-copy" type="button">\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC</button>
      </div>
      <div class="sv-share-sns">
        <a class="sv-share-sns-btn sv-share-x" id="sv-share-x" href="#" target="_blank" rel="noopener">X\u306B\u306E\u305B\u308B</a>
        <a class="sv-share-sns-btn sv-share-line" id="sv-share-line" href="#" target="_blank" rel="noopener">LINE\u3067\u9001\u308B</a>
        <button class="sv-share-sns-btn sv-share-native" id="sv-share-native" type="button" hidden>\u307B\u304B\u306B\u3082\u5171\u6709</button>
      </div>
      <div class="sv-share-foot">\u597D\u304D\u306A\u3068\u3053\u308D\u304B\u3089\u3001\u305D\u3063\u3068\u5C4A\u3051\u3089\u308C\u307E\u3059</div>
    </div>`,document.body.appendChild(t);let e=()=>{t.hidden=!0};t.querySelector(".sv-share-backdrop").addEventListener("click",e),r("#sv-share-close").addEventListener("click",e),document.addEventListener("keydown",n=>{n.key==="Escape"&&!t.hidden&&(n.preventDefault(),n.stopPropagation(),e())},{capture:!0});let s=()=>{let n=t._shareState;if(!n)return;let i=r("#sv-share-ts-check")?.checked&&n.t>0,l=ms(n.id,n.t,{includeTime:i}),d=r("#sv-share-url");d&&(d.value=l);let o=n.title?`${n.title}`:"\u8328\u3080\u3042\u3093 \u6B4C\u5531\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9",u=r("#sv-share-x");u&&(u.href=`https://twitter.com/intent/tweet?text=${encodeURIComponent(o)}&url=${encodeURIComponent(l)}`);let v=r("#sv-share-line");return v&&(v.href=`https://line.me/R/share?text=${encodeURIComponent(`${o}
${l}`)}`),l};r("#sv-share-ts-check").addEventListener("change",s),t._rebuild=s,r("#sv-share-url").addEventListener("focus",n=>n.target.select()),r("#sv-share-copy").addEventListener("click",async()=>{let n=r("#sv-share-url")?.value;if(!n)return;let i=!1;try{await navigator.clipboard.writeText(n),i=!0}catch{try{r("#sv-share-url").select(),i=document.execCommand("copy")}catch{}}let l=r("#sv-share-copy");l&&(l.textContent=i?"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u3057\u305F":"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093",l.classList.add("copied"),setTimeout(()=>{l.textContent="\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC",l.classList.remove("copied")},1600))});let a=r("#sv-share-native");navigator.share&&a&&(a.hidden=!1,a.addEventListener("click",async()=>{let n=t._shareState,i=r("#sv-share-url")?.value;if(i)try{await navigator.share({title:n?.title||"",url:i})}catch{}}))}function hs(){let e=r("#stream-viewer")?._currentStream;if(!e?.url)return;let s=_(e.url);if(!s)return;fs();let a=r("#sv-share-modal"),n=Yt(B().t);a._shareState={id:s,t:n,title:e.title||""};let i=r("#sv-share-video-title");i&&(i.textContent=e.title||"(\u30BF\u30A4\u30C8\u30EB\u306A\u3057)");let l=r("#sv-share-ts-row"),d=r("#sv-share-ts-check"),o=r("#sv-share-ts-label");l&&(l.hidden=n<=5),d&&(d.checked=n>5),o&&(o.textContent=N(n)),a._rebuild?.(),a.hidden=!1}var we=new URLSearchParams(location.search).get("pl");async function bs(){if(!we)return;let t=null;try{let a=we.replace(/-/g,"+").replace(/_/g,"/"),n=Uint8Array.from(atob(a),i=>i.charCodeAt(0));t=JSON.parse(new TextDecoder().decode(n))}catch{return}if(!t||typeof t.n!="string"||!Array.isArray(t.s))return;let e=t.n.slice(0,60)||"\u5171\u6709\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8",s=t.s.filter(a=>typeof a=="string"&&a.length<100).slice(0,300);if(s.length){if(!confirm(`\u5171\u6709\u3055\u308C\u305F\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u300C${e}\u300D\uFF08${s.length}\u4EF6\uFF09\u3092\u53D6\u308A\u8FBC\u307F\u307E\u3059\u304B\uFF1F`)){O({},{replace:!0});return}try{let a=await import("./chunk-E5UYFPOK.js"),n=a.createPlaylist(e);for(let i of s)a.addStreamToPlaylist(n.id,i);O({tab:"playlists"},{replace:!0}),P("playlists",{updateUrl:!1})}catch{}}}async function ys(){let t=B();if(!t.v)return!1;let e=t.v,s=t.t;try{await Nt()}catch{}let a=[];c.channelData?.combined&&a.push(c.channelData.combined),Object.values(c.channelData?.channels||{}).forEach(n=>{n&&a.push(n)});for(let n of a){let i=(n.streams||[]).find(l=>_(l.url)===e);if(i)return S(i,s),!0}try{let l=((await(await fetch("/data/music.json")).json())?.videos||[]).find(d=>_(d.url)===e);if(l)return S({url:l.url,title:l.title,isMv:!0},s),!0}catch{}return S({url:`https://www.youtube.com/watch?v=${e}`,title:"",isMv:!0},s),!0}function St(t,e=0,s=""){let a=_(t);if(!a)return;if(window.matchMedia("(max-width: 600px)").matches){window.open(String(t||""),"_blank","noopener");return}{let o=r("#stream-viewer");if(o&&!o.hidden&&!C)if(j(o))jt();else{++q,o.hidden=!0,o._currentStream=null,y=null;let u=r("#sv-player-wrap");u&&(u.innerHTML=""),document.body.style.overflow="",E=null,xt={},Et(),A()}}Ot(),Ft();let n=r("#yt-player-container"),i=r("#yt-player-panel");if(!n||!i)return;ft();let l=r("#yt-mini-title");l&&(l.textContent=s||"\u30A4\u30F3\u30E9\u30A4\u30F3\u518D\u751F");let d=r("#yt-mini-hint");d&&(d.textContent=E?"\u25B2 \u30BF\u30C3\u30D7\u3057\u3066\u914D\u4FE1\u30D3\u30E5\u30FC\u30EF\u30FC\u3078\u623B\u308B":""),i.classList.toggle("has-stream",!!E),i.hidden=!1,qe(()=>{let o=document.createElement("div");n.appendChild(o);try{w=new window.YT.Player(o,{videoId:a,width:"100%",height:"100%",playerVars:{autoplay:1,playsinline:1,rel:0,controls:0,disablekb:1,modestbranding:1,...e>0?{start:Math.floor(e)}:{}},events:{onReady:u=>{let v=z();try{u.target.setVolume(v)}catch{}if(Z(r("#yt-mini-vol-slider"),r("#yt-mini-vol-btn"),null,v),e>5)try{u.target.seekTo(e,!0)}catch{}Ut()},onStateChange:u=>{let v=u.data===window.YT.PlayerState.PLAYING,p=r("#yt-mini-play");p&&p.setAttribute("data-playing",v?"1":"0")}}})}catch{let v=e>0?`&start=${Math.floor(e)}`:"";n.innerHTML=`<iframe src="https://www.youtube.com/embed/${a}?autoplay=1&playsinline=1${v}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`}})}function Ft(){if(r("#yt-player-panel"))return;let t=document.createElement("div");t.id="yt-player-panel",t.hidden=!0,t.innerHTML=`
    <div class="yt-mini-video-wrap">
      <div id="yt-player-container"></div>
    </div>
    <div class="yt-mini-progress-wrap">
      <div class="yt-mini-progress-bar" id="yt-mini-progress-bar" title="\u30AF\u30EA\u30C3\u30AF\u3067\u30B7\u30FC\u30AF">
        <div class="yt-mini-progress-fill" id="yt-mini-progress-fill"></div>
      </div>
    </div>
    <div class="yt-mini-bar">
      <button class="yt-mini-play-btn" id="yt-mini-play" type="button" data-playing="0" aria-label="\u518D\u751F/\u505C\u6B62"></button>
      <button class="yt-mini-info yt-mini-restore" id="yt-mini-restore" type="button" aria-label="\u914D\u4FE1\u30D3\u30E5\u30FC\u30EF\u30FC\u3078\u623B\u308B">
        <span class="yt-mini-stream-title" id="yt-mini-title">\u30A4\u30F3\u30E9\u30A4\u30F3\u518D\u751F</span>
        <span class="yt-mini-hint" id="yt-mini-hint"></span>
      </button>
      <div class="yt-mini-vol-wrap">
        <button class="vol-btn" id="yt-mini-vol-btn" type="button" aria-label="\u97F3\u91CF">\u{1F50A}</button>
        <input class="vol-slider" id="yt-mini-vol-slider" type="range" min="0" max="100" value="100" aria-label="\u97F3\u91CF">
      </div>
      <button id="yt-player-close" type="button" class="yt-mini-close-btn" aria-label="\u9589\u3058\u308B">\u2715</button>
    </div>
  `,document.body.appendChild(t),r("#yt-player-close").addEventListener("click",()=>{t.hidden=!0,!jt()&&(ft(),E=null)}),r("#yt-mini-play").addEventListener("click",()=>{if(w)try{w.getPlayerState?.()===window.YT?.PlayerState?.PLAYING?w.pauseVideo():w.playVideo()}catch{}}),r("#yt-mini-restore").addEventListener("click",()=>{Ee()||E&&S(E,cs())}),r("#yt-mini-progress-bar").addEventListener("click",a=>{if(!w)return;let i=a.currentTarget.getBoundingClientRect(),l=Math.max(0,Math.min(1,(a.clientX-i.left)/i.width));try{let d=w.getDuration?.()||0;d>0&&w.seekTo(l*d,!0)}catch{}});let e=r("#yt-mini-vol-slider"),s=r("#yt-mini-vol-btn");if(e){let a=z();e.value=a,e.style.setProperty("--pct",`${a}%`),s&&(s.textContent=dt(a)),e.addEventListener("input",n=>{let i=parseInt(n.target.value);if(n.target.style.setProperty("--pct",`${i}%`),Ht(i),s&&(s.textContent=dt(i)),w)try{w.setVolume(i)}catch{}})}if(s){let a=80;s.addEventListener("click",()=>{if(!e)return;let n=parseInt(e.value),i=n>0?0:a||80;n>0&&(a=n),Z(e,s,w,i)})}}var Ae=!1,De=[];window.onYouTubeIframeAPIReady=()=>{Ae=!0,De.splice(0).forEach(t=>t()),import("./chunk-63MZHHGO.js").then(t=>t.notifyYtReady()).catch(()=>{})};function Ot(){if(document.getElementById("yt-iframe-api-script"))return;let t=document.createElement("script");t.id="yt-iframe-api-script",t.src="https://www.youtube.com/iframe_api",document.head.appendChild(t)}function qe(t){if(Ae&&window.YT?.Player){t();return}De.push(t)}var z=()=>Math.max(0,Math.min(100,parseInt(localStorage.getItem(Pt)??"100")||100)),Ht=t=>localStorage.setItem(Pt,String(t)),dt=t=>t===0?"\u{1F507}":t<50?"\u{1F509}":"\u{1F50A}";function Z(t,e,s,a){if(t&&(t.value=a,t.style.setProperty("--pct",`${a}%`)),e&&(e.textContent=dt(a)),s)try{s.setVolume(a)}catch{}}var y=null,q=0,E=null,ut=0,Kt=0,C=!1,ht="timeline",xt={},I={},V=!1,H=!1,w=null,kt=null,$t=null;function zt(){ht=c.activeTab||"timeline",c.activeTab="player",M(".tab-btn").forEach(t=>t.classList.remove("active")),M(".panel").forEach(t=>t.classList.toggle("active",t.id==="panel-player"))}function Et(){let t=xt;xt={},P(ht||"timeline",t)}function gs(){C=!0;let t=r("#stream-viewer");if(!t)return;t.classList.add("sv-fullscreen"),document.body.classList.add("has-sv-fullscreen"),document.body.style.overflow="hidden";let e=r("#sv-close");e&&(e.title="\u901A\u5E38\u8868\u793A\u306B\u623B\u308B\uFF08Esc\uFF09");let s=r("#sv-fullscreen-btn");s&&s.setAttribute("aria-pressed","true")}function N(t){let e=Math.floor(t),s=Math.floor(e/3600),a=Math.floor(e%3600/60),n=e%60;return s>0?`${s}:${String(a).padStart(2,"0")}:${String(n).padStart(2,"0")}`:`${a}:${String(n).padStart(2,"0")}`}function Ve(t){return`ibara-ts-${t.channel||""}-${t.index||""}`}function X(t){try{return JSON.parse(localStorage.getItem(Ve(t))||"null")||{}}catch{return{}}}function Vt(t,e){try{localStorage.setItem(Ve(t),JSON.stringify(e))}catch{}}function ws(t,e,s){let a=s[e],n=a!=null?`<button class="sv-ts-badge" data-idx="${e}" data-action="seek" title="${f(N(a))} \u306B\u79FB\u52D5">${f(N(a))}</button><button class="sv-ts-del" data-idx="${e}" data-action="del-ts" aria-label="\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u524A\u9664">\u2715</button>`:"",l=(I[e]||[]).map(u=>`<button class="sv-cts-badge" data-idx="${e}" data-action="cts-seek" data-cts-seconds="${u.timeSeconds}" title="\u307F\u3093\u306A\u306E\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7: ${f(N(u.timeSeconds))}">${f(N(u.timeSeconds))}</button>`).join(""),d=`<button class="sv-cts-propose" data-idx="${e}" data-action="cts-propose" type="button">+ \u63D0\u6848</button>`,o=`<div class="sv-cts-row">${l}${d}</div>`;return`<div class="sv-song" data-idx="${e}">
    <span class="sv-song-num">${e+1}</span>
    <div class="sv-song-info">
      <span class="sv-song-title">${f(t.title)}</span>
      <span class="sv-song-artist">${f(t.artist)}</span>
    </div>
    <div class="sv-song-actions">${n}<button class="sv-ts-set" data-idx="${e}" data-action="set-ts" title="\u73FE\u5728\u306E\u518D\u751F\u6642\u523B\u3092\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u306B\u8A18\u9332">\u23F1 \u30E1\u30E2</button></div>
    ${o}
  </div>`}async function ks(t){if(I={},!t?.channel||t?.index==null)return;try{let a=`/api/timestamps/${encodeURIComponent(t.channel)}/${t.index}`,n=await fetch(a);if(!n.ok)return;let i=await n.json();for(let l of i.items||[])I[l.songIndex]||(I[l.songIndex]=[]),I[l.songIndex].push({timeSeconds:l.timeSeconds,note:l.note??null})}catch{}let e=r("#stream-viewer");if(!e||e._currentStream!==t)return;let s=r("#sv-setlist");s&&ot(s,t.songs,X(t)),Ls(t)}function $s(t,e,s){r("#sv-cts-modal")?.remove();let a=y?.getCurrentTime?.()??0,n=N(Math.floor(a)),i=document.createElement("div");i.id="sv-cts-modal",i.className="sv-cts-modal-overlay",i.innerHTML=`
    <div class="sv-cts-modal-box" role="dialog" aria-modal="true" aria-label="\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u63D0\u6848">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u63D0\u6848</span>
        <button class="sv-cts-modal-close" type="button" aria-label="\u9589\u3058\u308B">\u2715</button>
      </div>
      <p class="sv-cts-modal-song">${f(s)}</p>
      <label class="sv-cts-modal-label">
        \u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\uFF08MM:SS \u307E\u305F\u306F H:MM:SS\uFF09
        <input class="sv-cts-modal-input" id="sv-cts-ts-input" type="text" value="${f(n)}" placeholder="0:00" autocomplete="off">
      </label>
      <label class="sv-cts-modal-label">
        \u30B3\u30E1\u30F3\u30C8\uFF08\u4EFB\u610F\u30FB200\u6587\u5B57\u4EE5\u5185\uFF09
        <input class="sv-cts-modal-input" id="sv-cts-note-input" type="text" maxlength="200" placeholder="">
      </label>
      <p class="sv-cts-modal-hint">\u63D0\u6848\u306F\u7BA1\u7406\u8005\u306E\u5BE9\u67FB\u5F8C\u306B\u516C\u958B\u3055\u308C\u307E\u3059\u3002</p>
      <div class="sv-cts-modal-btns">
        <button class="sv-cts-modal-submit" id="sv-cts-submit" type="button">\u63D0\u6848\u3059\u308B</button>
        <button class="sv-cts-modal-cancel" type="button">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
      </div>
      <p class="sv-cts-modal-status" id="sv-cts-status" hidden></p>
    </div>
  `,document.body.appendChild(i);let l=()=>i.remove();i.querySelector(".sv-cts-modal-close").addEventListener("click",l),i.querySelector(".sv-cts-modal-cancel").addEventListener("click",l),i.addEventListener("click",d=>{d.target===i&&l()}),i.querySelector("#sv-cts-submit").addEventListener("click",async()=>{let d=i.querySelector("#sv-cts-ts-input").value.trim(),o=i.querySelector("#sv-cts-note-input").value.trim()||null,u=Jt(d),v=i.querySelector("#sv-cts-status");if(u===null){v.textContent="\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\uFF08\u4F8B: 1:23 \u307E\u305F\u306F 1:23:45\uFF09",v.className="sv-cts-modal-status error",v.hidden=!1;return}let p=i.querySelector("#sv-cts-submit");p.disabled=!0,p.textContent="\u9001\u4FE1\u4E2D\u2026";try{let m=await fetch(`/api/timestamps/${encodeURIComponent(t.channel)}/${t.index}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({songIndex:e,timeSeconds:u,submitterNote:o})});if(m.ok)v.textContent="\u63D0\u6848\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F\uFF01\u5BE9\u67FB\u5F8C\u306B\u516C\u958B\u3055\u308C\u307E\u3059\u3002",v.className="sv-cts-modal-status success",v.hidden=!1,p.hidden=!0,i.querySelector(".sv-cts-modal-cancel").textContent="\u9589\u3058\u308B";else{let h=await m.json().catch(()=>({}));v.textContent=`\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${h.error||m.statusText}`,v.className="sv-cts-modal-status error",v.hidden=!1,p.disabled=!1,p.textContent="\u63D0\u6848\u3059\u308B"}}catch(m){v.textContent=`\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${m.message}`,v.className="sv-cts-modal-status error",v.hidden=!1,p.disabled=!1,p.textContent="\u63D0\u6848\u3059\u308B"}}),setTimeout(()=>i.querySelector("#sv-cts-ts-input")?.focus(),50),document.addEventListener("keydown",function d(o){o.key==="Escape"&&(l(),document.removeEventListener("keydown",d))})}function Ls(t){let e=r("#sv-cts-bulk-btn");if(!e||!t?.songs?.length)return;let a=Object.keys(I).length>=t.songs.length;e.textContent=a?"\u4FEE\u6B63\u7533\u8ACB":"\u30BB\u30C8\u30EA\u767B\u9332",e.hidden=!1}function Ss(t){r("#sv-bulk-modal")?.remove();let e=X(t),n=Object.keys(I).length>=t.songs.length,i=t.songs.map((o,u)=>{let v=e[u]!=null?N(e[u]):"",p=I[u]?.[0]?.timeSeconds!=null?N(I[u][0].timeSeconds):"",m=v||p;return`
      <div class="sv-bulk-row" data-idx="${u}">
        <span class="sv-bulk-num">${u+1}</span>
        <span class="sv-bulk-title" title="${f(o.title)}">${f(o.title)}</span>
        <input class="sv-bulk-ts-input" type="text" value="${f(m)}"
          placeholder="0:00" autocomplete="off" data-bulk-ts-idx="${u}">
        <button class="sv-bulk-ts-now" type="button" title="\u73FE\u5728\u6642\u523B\u3092\u5165\u529B" data-bulk-now="${u}">\u23F1</button>
      </div>`}).join(""),l=document.createElement("div");l.id="sv-bulk-modal",l.className="sv-cts-modal-overlay",l.innerHTML=`
    <div class="sv-cts-modal-box sv-bulk-modal-box" role="dialog" aria-modal="true"
      aria-label="${n?"\u4FEE\u6B63\u7533\u8ACB":"\u30BB\u30C8\u30EA\u767B\u9332"}">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">${n?"\u4FEE\u6B63\u7533\u8ACB":"\u30BB\u30C8\u30EA\u767B\u9332"}</span>
        <button class="sv-cts-modal-close" type="button" aria-label="\u9589\u3058\u308B">\u2715</button>
      </div>
      <details class="sv-paste-area">
        <summary class="sv-paste-summary">\u914D\u4FE1\u30B3\u30E1\u30F3\u30C8\u304B\u3089\u4E00\u62EC\u5165\u529B</summary>
        <textarea class="sv-paste-textarea" placeholder="\u914D\u4FE1\u306E\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u30B3\u30E1\u30F3\u30C8\u3092\u8CBC\u308A\u4ED8\u3051&#10;\u4F8B: 23:16\u3000\u5FAE\u304B\u306A\u30AB\u30AA\u30EA / Perfume\u300027:58"></textarea>
        <div class="sv-paste-btns">
          <button class="sv-paste-apply btn ghost" type="button">\u89E3\u6790\u3057\u3066\u5165\u529B</button>
          <span class="sv-paste-result" hidden></span>
        </div>
      </details>
      <p class="sv-bulk-hint">\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u5165\u529B\u3057\u3066\u4E00\u62EC\u7533\u8ACB\u3067\u304D\u307E\u3059\u3002\u7A7A\u6B04\u306E\u66F2\u306F\u30B9\u30AD\u30C3\u30D7\u3055\u308C\u307E\u3059\u3002</p>
      <div class="sv-bulk-rows">${i}</div>
      <label class="sv-cts-modal-label" style="margin-top:10px">
        \u5171\u901A\u30B3\u30E1\u30F3\u30C8\uFF08\u4EFB\u610F\u30FB200\u6587\u5B57\u4EE5\u5185\uFF09
        <input class="sv-cts-modal-input" id="sv-bulk-note" type="text" maxlength="200" placeholder="">
      </label>
      <p class="sv-cts-modal-hint">\u63D0\u6848\u306F\u7BA1\u7406\u8005\u306E\u5BE9\u67FB\u5F8C\u306B\u516C\u958B\u3055\u308C\u307E\u3059\u3002</p>
      <div class="sv-cts-modal-btns">
        <button class="sv-cts-modal-submit" id="sv-bulk-submit" type="button">\u4E00\u62EC\u7533\u8ACB\u3059\u308B</button>
        <button class="sv-cts-modal-cancel" type="button">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
      </div>
      <p class="sv-cts-modal-status" id="sv-bulk-status" hidden></p>
    </div>
  `,document.body.appendChild(l);let d=()=>l.remove();l.querySelector(".sv-cts-modal-close").addEventListener("click",d),l.querySelector(".sv-cts-modal-cancel").addEventListener("click",d),l.addEventListener("click",o=>{o.target===l&&d()}),l.querySelector(".sv-paste-apply").addEventListener("click",()=>{let u=(l.querySelector(".sv-paste-textarea")?.value||"").split(`
`).map(m=>m.trim()).filter(Boolean),v=0;for(let m of u){let h=As(m);if(!h)continue;let g=Ds(h.title,h.artist,t.songs);if(g>=0){let b=l.querySelector(`[data-bulk-ts-idx="${g}"]`);b&&(b.value=h.start,v++)}}let p=l.querySelector(".sv-paste-result");p&&(p.textContent=v>0?`${u.length}\u884C\u3092\u89E3\u6790 \u2192 ${v}\u66F2\u306B\u5165\u529B\u3057\u307E\u3057\u305F`:"\u4E00\u81F4\u3059\u308B\u66F2\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F",p.hidden=!1)}),l.querySelector(".sv-bulk-rows").addEventListener("click",o=>{let u=o.target.closest("[data-bulk-now]");if(!u)return;let v=parseInt(u.dataset.bulkNow,10),p=y?.getCurrentTime?.();if(p!=null){let m=l.querySelector(`[data-bulk-ts-idx="${v}"]`);m&&(m.value=N(Math.floor(p)))}}),l.querySelector("#sv-bulk-submit").addEventListener("click",async()=>{let o=l.querySelector("#sv-bulk-note").value.trim()||null,u=l.querySelector("#sv-bulk-status"),v=l.querySelector("#sv-bulk-submit"),p=[];if(l.querySelectorAll("[data-bulk-ts-idx]").forEach(g=>{let b=parseInt(g.dataset.bulkTsIdx,10),k=Jt(g.value.trim());k!==null&&p.push({songIndex:b,timeSeconds:k})}),!p.length){u.textContent="\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u304C1\u3064\u3082\u5165\u529B\u3055\u308C\u3066\u3044\u307E\u305B\u3093",u.className="sv-cts-modal-status error",u.hidden=!1;return}v.disabled=!0,v.textContent=`\u7533\u8ACB\u4E2D\u2026 (0/${p.length})`,u.hidden=!0;let m=0,h=0;await Promise.all(p.map(async g=>{try{(await fetch(`/api/timestamps/${encodeURIComponent(t.channel)}/${t.index}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({songIndex:g.songIndex,timeSeconds:g.timeSeconds,submitterNote:o})})).ok?m++:h++}catch{h++}v.textContent=`\u7533\u8ACB\u4E2D\u2026 (${m+h}/${p.length})`})),h===0?(u.textContent=`${m}\u66F2\u5206\u306E\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u7533\u8ACB\u3057\u307E\u3057\u305F\uFF01\u5BE9\u67FB\u5F8C\u306B\u516C\u958B\u3055\u308C\u307E\u3059\u3002`,u.className="sv-cts-modal-status success",v.hidden=!0,l.querySelector(".sv-cts-modal-cancel").textContent="\u9589\u3058\u308B"):(u.textContent=`${m}\u4EF6\u6210\u529F / ${h}\u4EF6\u5931\u6557\u3002\u5931\u6557\u5206\u3092\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002`,u.className="sv-cts-modal-status error",v.disabled=!1,v.textContent="\u4E00\u62EC\u7533\u8ACB\u3059\u308B"),u.hidden=!1}),document.addEventListener("keydown",function o(u){u.key==="Escape"&&(d(),document.removeEventListener("keydown",o))})}function He(){try{return JSON.parse(localStorage.getItem("ibara-playlists")||"null")||[]}catch{return[]}}function xs(t){try{localStorage.setItem("ibara-playlists",JSON.stringify(t))}catch{}}function _s(t,e){let s=He(),a=s.find(n=>String(n.id)===String(t));return a?(a.streams||(a.streams=[]),a.streams.includes(e)||(a.streams.push(e),xs(s)),!0):!1}var Gt="ibaraViewerQueueCollapsed",$=null,vt=!1;function _t(t){let e=$,s=e?.items?.[t];if(s){e.idx=t,vt=!0;try{s.kind==="mv"?S({url:s.video.url,title:s.video.title,isMv:!0}):S(s.stream)}finally{vt=!1}}}window.__playMyListInViewer=t=>{t?.items?.length&&($={name:t.name||"\u30DE\u30A4\u30EA\u30B9\u30C8",items:t.items,idx:0,repeat:localStorage.getItem("ibaraListRepeat")==="1",collapsed:localStorage.getItem(Gt)==="1"},_t(Math.max(0,Math.min(t.idx||0,t.items.length-1))))};window.__openMusicQueueInViewer=(t,e=0,s=0)=>{if(!t?.length)return!1;let a=t.filter(i=>i?.url).map((i,l)=>i._stream?{kind:"stream",key:i._stream.url||`stream:${l}`,stream:i._stream}:{kind:"mv",key:`mv:${_(i.url)||l}`,video:{...i,isMv:!0}});if(!a.length)return!1;$={name:"\u97F3\u697D\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u30AD\u30E5\u30FC",items:a,idx:Math.max(0,Math.min(e,a.length-1)),repeat:localStorage.getItem("ibaraListRepeat")==="1",collapsed:localStorage.getItem(Gt)==="1"};let n=$.items[$.idx];vt=!0;try{n.kind==="mv"?S({...n.video,isMv:!0},s):S(n.stream,s)}finally{vt=!1}return!0};function Qt(){let t=$;if(!t?.items?.length)return"";let e=t.items[t.idx],s=e?.kind==="mv"?e.video?.title||"\u52D5\u753B":e?.stream?.title||"\u914D\u4FE1";return`
    <div class="sv-bp-section sv-queue-section${t.collapsed?" is-collapsed":""}">
      <div class="sv-bp-sh sv-queue-head">\u{1F4CB} ${f(t.name)}
        <span class="sv-bp-sh-sub">\uFF08${t.idx+1} / ${t.items.length}\uFF09</span>
        <span class="sv-queue-current">${f(s)}</span>
        <button class="sv-queue-toggle" type="button"
          data-svq-action="toggle" aria-expanded="${!t.collapsed}"
          title="${t.collapsed?"\u30AD\u30E5\u30FC\u3092\u958B\u304F":"\u30AD\u30E5\u30FC\u3092\u9589\u3058\u308B"}">${t.collapsed?"\u958B\u304F":"\u9589\u3058\u308B"}</button>
        <button class="sv-queue-repeat${t.repeat?" is-on":""}" type="button"
          data-svq-action="repeat" aria-pressed="${t.repeat}"
          title="\u30EA\u30B9\u30C8\u30EA\u30D4\u30FC\u30C8\uFF08ON: \u6700\u5F8C\u307E\u3067\u518D\u751F\u3057\u305F\u3089\u5148\u982D\u3078\u623B\u308B\uFF09">\u{1F501} \u30EA\u30D4\u30FC\u30C8</button>
      </div>
      <div class="sv-queue-list">
        ${t.items.map((a,n)=>{let i=a.kind==="mv"?a.video?.title||"\u52D5\u753B":a.stream?.title||"\u914D\u4FE1",l=a.kind==="mv"?"\u{1F3AC} \u52D5\u753B":`\u{1F4C5} ${T(a.stream?.date)}\u3000\u7B2C${a.stream?.index}\u67A0`;return`<button class="sv-queue-row${n===t.idx?" is-current":""}" type="button"
            data-svq-action="jump" data-svq-idx="${n}">
            <span class="sv-queue-num">${n+1}</span>
            <span class="sv-queue-title">${f(i)}</span>
            <span class="sv-queue-meta">${f(l)}</span>
          </button>`}).join("")}
      </div>
    </div>`}function Ne(t){let e=t.target.closest("[data-svq-action]");if(!e||!$)return!1;if(e.dataset.svqAction==="jump"){let s=parseInt(e.dataset.svqIdx,10);return!Number.isNaN(s)&&s!==$.idx&&_t(s),!0}if(e.dataset.svqAction==="repeat"){$.repeat=!$.repeat;try{localStorage.setItem("ibaraListRepeat",$.repeat?"1":"0")}catch{}return e.classList.toggle("is-on",$.repeat),e.setAttribute("aria-pressed",String($.repeat)),!0}if(e.dataset.svqAction==="toggle"){$.collapsed=!$.collapsed;try{localStorage.setItem(Gt,$.collapsed?"1":"0")}catch{}let s=e.closest(".sv-queue-section");return s&&(s.outerHTML=Qt()),Wt(r("#sv-below-player")),!0}return!1}function Wt(t){if($?.collapsed)return;let e=t?.querySelector?.(".sv-queue-list"),s=e?.querySelector(".sv-queue-row.is-current");e&&s&&(e.scrollTop=Math.max(0,s.offsetTop-e.clientHeight/2))}function Ts(){let t=c.data?.streams||[],s=r("#stream-viewer")?._currentStream;if(!s)return;let a=t.findIndex(n=>n.channel===s.channel&&n.index===s.index);a<0||a>=t.length-1||S(t[a+1])}async function Es(t){let e=await Re(),s=_(t?.url);if(!s||!e.length)return;let a=e.findIndex(i=>_(i.url)===s);if(a<0||a>=e.length-1)return;let n=e[a+1];S({...n,isMv:!0})}function Be(t){if(!t||j(t))return;let e=y||w;if(H&&e){try{e.seekTo(0,!0),e.playVideo()}catch{}return}if($?.items?.length){let a=$;a.idx<a.items.length-1?_t(a.idx+1):a.repeat&&_t(0);return}if(!V)return;let s=t._currentStream;s?.isMv?Es(s):Ts()}function tt(){$t&&(clearInterval($t),$t=null)}function Ms(t,e){tt();let s=!1;$t=setInterval(()=>{if(t!==q||e.hidden||!y){tt();return}try{let a=y.getPlayerState?.();a===window.YT?.PlayerState?.ENDED?(s||Be(e),s=!0):a===window.YT?.PlayerState?.PLAYING&&(s=!1)}catch{}},700)}function ke(t,e){if(!t)return`<div class="sv-bp-nav-card sv-bp-nav-empty">${f(e==="newer"?"\u6700\u65B0\u914D\u4FE1":"\u6700\u521D\u306E\u914D\u4FE1")}</div>`;let s=ct(t.url),a=e==="newer"?"\u65B0\u3057\u3044\u914D\u4FE1 \u2192":"\u2190 \u53E4\u3044\u914D\u4FE1";return`<button class="sv-bp-nav-card" type="button" data-bp-action="open-stream" data-bp-channel="${f(t.channel)}" data-bp-index="${t.index}">
    <div class="sv-bp-nav-dir">${f(a)}</div>
    ${s?`<img class="sv-bp-nav-thumb" src="${f(s)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="sv-bp-nav-thumb sv-bp-nav-thumb--empty"></div>'}
    <div class="sv-bp-nav-info">
      <div class="sv-bp-nav-title">${f(t.title||"\u914D\u4FE1")}</div>
      <div class="sv-bp-nav-meta">${T(t.date)}\u3000${t.songs.length}\u66F2</div>
    </div>
  </button>`}function Cs(t){let e=r("#sv-below-player");if(!e)return;let s=c.data?.streams||[],a=s.findIndex(v=>v.channel===t.channel&&v.index===t.index),n=a>=0&&a<s.length-1?s[a+1]:null,i=a>0?s[a-1]:null,l=new Set(t.songs.map(v=>v.title)),d=s.filter((v,p)=>p!==a).map(v=>{let p=v.songs.filter(m=>l.has(m.title));return{stream:v,overlap:p.length,sharedSongs:p.slice(0,3).map(m=>m.title)}}).filter(v=>v.overlap>0).sort((v,p)=>p.overlap-v.overlap).slice(0,8),o=He(),u=Y(t);e.innerHTML=`
    <div class="sv-bp-wrap">
      ${Qt()}

      <!-- \u9023\u7D9A\u518D\u751F + \u524D\u5F8C\u30CA\u30D3 -->
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-autoplay-bar">
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${V?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${V?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u9023\u7D9A\u518D\u751F
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${H?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${H?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u30EA\u30D4\u30FC\u30C8
          </label>
          ${n?`<span class="sv-bp-ap-hint">\u6B21\uFF1A${f(n.title||"\u6B21\u306E\u914D\u4FE1")}</span>`:'<span class="sv-bp-ap-hint sv-bp-ap-hint--end">\uFF08\u6700\u5F8C\u306E\u914D\u4FE1\uFF09</span>'}
        </div>
        <div class="sv-bp-nav-cards">
          ${ke(n,"older")}
          ${ke(i,"newer")}
        </div>
      </div>

      <!-- \u914D\u4FE1\u7D71\u8A08 -->
      <div class="sv-bp-section">
        <div class="sv-bp-sh">\u914D\u4FE1\u60C5\u5831</div>
        <div class="sv-bp-stats">
          <div class="sv-bp-stat">
            <span class="sv-bp-stat-val">${t.songs.length}</span>
            <span class="sv-bp-stat-label">\u66F2\u6570</span>
          </div>
          <div class="sv-bp-stat">
            <span class="sv-bp-stat-val">\u7B2C${t.index}\u67A0</span>
            <span class="sv-bp-stat-label">\u914D\u4FE1\u756A\u53F7</span>
          </div>
          <div class="sv-bp-stat">
            <span class="sv-bp-stat-val">${T(t.date)}</span>
            <span class="sv-bp-stat-label">\u914D\u4FE1\u65E5</span>
          </div>
        </div>
      </div>

      <!-- \u95A2\u9023\u914D\u4FE1 -->
      ${d.length?`
      <div class="sv-bp-section">
        <div class="sv-bp-sh">\u95A2\u9023\u914D\u4FE1 <span class="sv-bp-sh-sub">\uFF08\u540C\u3058\u66F2\u3092\u6B4C\u3063\u305F\u56DE\uFF09</span></div>
        <div class="sv-bp-related-list">
          ${d.map(v=>{let p=ct(v.stream.url);return`<button class="sv-bp-rel-card" type="button" data-bp-action="open-stream" data-bp-channel="${f(v.stream.channel)}" data-bp-index="${v.stream.index}">
              ${p?`<img class="sv-bp-rel-thumb" src="${f(p)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="sv-bp-rel-thumb sv-bp-rel-thumb--empty"></div>'}
              <div class="sv-bp-rel-info">
                <div class="sv-bp-rel-title">${f(v.stream.title||"\u914D\u4FE1")}</div>
                <div class="sv-bp-rel-meta">${T(v.stream.date)}</div>
                <div class="sv-bp-rel-songs">${v.sharedSongs.map(m=>f(m)).join("\u3001")}</div>
              </div>
              <div class="sv-bp-rel-badge">${v.overlap}\u66F2</div>
            </button>`}).join("")}
        </div>
      </div>
      `:""}

      <!-- \u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3078\u8FFD\u52A0 -->
      ${o.length?`
      <div class="sv-bp-section">
        <div class="sv-bp-sh">\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3078\u8FFD\u52A0</div>
        <div class="sv-bp-pl-list" id="sv-bp-pl-list">
          ${o.map(v=>{let p=(v.streams||[]).includes(u);return`<button class="sv-bp-pl-btn${p?" sv-bp-pl-btn--added":""}" type="button"
              data-bp-action="add-pl" data-bp-pl-id="${f(String(v.id))}"${p?" disabled":""}>
              <span class="sv-bp-pl-name">${f(v.name||"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8")}</span>
              <span class="sv-bp-pl-status">${p?"\u2713 \u767B\u9332\u6E08\u307F":"\uFF0B \u8FFD\u52A0"}</span>
            </button>`}).join("")}
        </div>
      </div>
      `:""}

    </div>
  `,e.onchange=v=>{let p=v.target.closest("#sv-ap-check"),m=v.target.closest("#sv-repeat-check");if(p){V=p.checked;let h=p.closest(".sv-bp-ap-switch");h&&h.classList.toggle("sv-bp-ap-switch--on",V)}if(m){H=m.checked;let h=m.closest(".sv-bp-ap-switch");h&&h.classList.toggle("sv-bp-ap-switch--on",H)}},e.onclick=v=>{if(Ne(v))return;let p=v.target.closest("[data-bp-action]");if(!p)return;let m=p.dataset.bpAction;if(m==="open-stream"){let h=p.dataset.bpChannel,g=parseInt(p.dataset.bpIndex,10),b=(c.data?.streams||[]).find(k=>k.channel===h&&k.index===g);b&&S(b)}else if(m==="add-pl"){let h=p.dataset.bpPlId;if(_s(h,u)){p.classList.add("sv-bp-pl-btn--added"),p.disabled=!0;let g=p.querySelector(".sv-bp-pl-status");g&&(g.textContent="\u2713 \u767B\u9332\u6E08\u307F")}}},Wt(e)}var lt=null;async function Re(){if(lt)return lt;try{lt=(await(await fetch("/data/music.json")).json())?.videos||[]}catch{lt=[]}return lt}function Is(t){let e=String(t||"");return e=e.replace(/【[^】]*】/g," "),e=e.replace(/^\s*MV[⌇|｜♪♬:：\-\s]*/i," "),e=e.split(/[\/／|｜]/)[0],e=e.replace(/歌ってみた|covered?\s*(by.*)?$/gi," "),e.trim()}async function Ps(t){let e=r("#sv-below-player");if(!e)return;try{await Nt()}catch{}let s=await Re();if(r("#stream-viewer")?._currentStream!==t)return;let a=c.channelData?.combined?.streams||c.data?.streams||[],n=R(Is(t.title)),i=[];if(n.length>1)for(let m of a){let h=(m.songs||[]).find(g=>{let b=R(g.title);return b===n||b.length>1&&(b.includes(n)||n.includes(b))});h&&i.push({stream:m,songTitle:h.title})}let l=i.slice(0,8),d={original:"\u30AA\u30EA\u30B8\u30CA\u30EB",sugarily:"\u3057\u3085\u304C\u308A\u308A",cover:"\u30AB\u30D0\u30FC"},o=s.find(m=>m.url===t.url),u=s.filter(m=>m.url!==t.url).sort((m,h)=>{let g=o&&m.type===o.type?1:0,b=o&&h.type===o.type?1:0;return g!==b?b-g:(h.publishedAt||"").localeCompare(m.publishedAt||"")}).slice(0,12),v=s.findIndex(m=>_(m.url)===_(t.url)),p=v>=0&&v<s.length-1?s[v+1]:null;e.innerHTML=`
    <div class="sv-bp-wrap">
      ${Qt()}
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-autoplay-bar">
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${V?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${V?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u9023\u7D9A\u518D\u751F
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${H?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${H?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u30EA\u30D4\u30FC\u30C8
          </label>
          ${p?`<span class="sv-bp-ap-hint">\u6B21\uFF1A${f(p.title||"\u6B21\u306E\u52D5\u753B")}</span>`:'<span class="sv-bp-ap-hint sv-bp-ap-hint--end">\uFF08\u6700\u5F8C\u306E\u52D5\u753B\uFF09</span>'}
        </div>
      </div>
      ${l.length?`
      <div class="sv-bp-section">
        <div class="sv-bp-sh">\u{1F3A4} \u3053\u306E\u66F2\u304C\u6B4C\u308F\u308C\u305F\u6B4C\u67A0 <span class="sv-bp-sh-sub">\uFF08\u5168${i.length}\u56DE\uFF09</span></div>
        <div class="sv-bp-related-list">
          ${l.map(m=>{let h=ct(m.stream.url);return`<button class="sv-bp-rel-card" type="button" data-mv-action="open-stream" data-mv-channel="${f(m.stream.channel)}" data-mv-index="${m.stream.index}">
              ${h?`<img class="sv-bp-rel-thumb" src="${f(h)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="sv-bp-rel-thumb sv-bp-rel-thumb--empty"></div>'}
              <div class="sv-bp-rel-info">
                <div class="sv-bp-rel-title">${f(m.stream.title||"\u914D\u4FE1")}</div>
                <div class="sv-bp-rel-meta">${T(m.stream.date)}\u3000\u7B2C${m.stream.index}\u67A0</div>
                <div class="sv-bp-rel-songs">\u{1F3B5} ${f(m.songTitle)}</div>
              </div>
            </button>`}).join("")}
        </div>
      </div>
      `:""}

      ${u.length?`
      <div class="sv-bp-section">
        <div class="sv-bp-sh">\u{1F3AC} \u307B\u304B\u306E\u52D5\u753B <button class="sv-mv-all-btn" type="button" data-mv-action="all-videos">\u3059\u3079\u3066\u898B\u308B \u2192</button></div>
        <div class="sv-mv-grid">
          ${u.map(m=>{let h=ct(m.url);return`<button class="sv-mv-card" type="button" data-mv-action="open-mv" data-mv-url="${f(m.url)}" data-mv-title="${f(m.title)}">
              ${h?`<img class="sv-mv-card-thumb" src="${f(h)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="sv-mv-card-thumb"></div>'}
              <div class="sv-mv-card-body">
                <div class="sv-mv-card-title">${f(m.title)}</div>
                <div class="sv-mv-card-type">${d[m.type]||"\u30AA\u30EA\u30B8\u30CA\u30EB"}</div>
              </div>
            </button>`}).join("")}
        </div>
      </div>
      `:""}
    </div>
  `,e.onchange=m=>{let h=m.target.closest("#sv-ap-check"),g=m.target.closest("#sv-repeat-check");if(h){V=h.checked;let b=h.closest(".sv-bp-ap-switch");b&&b.classList.toggle("sv-bp-ap-switch--on",V)}if(g){H=g.checked;let b=g.closest(".sv-bp-ap-switch");b&&b.classList.toggle("sv-bp-ap-switch--on",H)}},e.onclick=m=>{if(Ne(m))return;let h=m.target.closest("[data-mv-action]");if(!h)return;let g=h.dataset.mvAction;if(g==="open-stream"){let b=h.dataset.mvChannel,k=parseInt(h.dataset.mvIndex,10),Q=(c.channelData?.combined?.streams||c.data?.streams||[]).find(Xt=>Xt.channel===b&&Xt.index===k);Q&&S(Q)}else g==="open-mv"?S({url:h.dataset.mvUrl,title:h.dataset.mvTitle,isMv:!0}):g==="all-videos"&&P("playlists")},Wt(e)}function ot(t,e,s){t.innerHTML=e.map((a,n)=>ws(a,n,s)).join("")}function Jt(t){let e=t.match(/(\d+):(\d{2}):(\d{2})|(\d+):(\d{2})/);return e?e[1]!==void 0?parseInt(e[1])*3600+parseInt(e[2])*60+parseInt(e[3]):parseInt(e[4])*60+parseInt(e[5]):null}function As(t){let e=t.match(/^(\d{1,2}:\d{2}(?::\d{2})?)[\s　]+(.+?)\s*\/\s*(.+?)[\s　]+(\d{1,2}:\d{2}(?::\d{2})?)$/);return e?{start:e[1].trim(),title:e[2].trim(),artist:e[3].trim(),end:e[4].trim()}:null}function R(t){return(t||"").toLowerCase().replace(/[\s　]/g,"").replace(/[！-～]/g,e=>String.fromCharCode(e.charCodeAt(0)-65248)).replace(/[・｡。、，,．.！!？?「」『』【】（）()]/g,"")}function Ds(t,e,s){let a=R(t),n=R(e),i=-1,l=0;for(let d=0;d<s.length;d++){let o=R(s[d].title),u=R(s[d].artist),v=0;o===a?v+=80:a.length>1&&(o.includes(a)||a.includes(o))&&(v+=40),n&&u===n?v+=20:n&&n.length>1&&(u.includes(n)||n.includes(u))&&(v+=10),v>l&&(l=v,i=d)}return l>=40?i:-1}function Ue(){if(r("#stream-viewer"))return;let t=r("#panel-player");if(!t)return;let e=document.createElement("div");e.id="stream-viewer",e.hidden=!0,e.setAttribute("aria-label","\u914D\u4FE1\u30D7\u30EC\u30A4\u30E4\u30FC"),e.innerHTML=`
    <div class="sv-container">
      <div class="sv-header">
        <button class="sv-close-btn" id="sv-close" type="button" title="\u30DF\u30CB\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u518D\u751F\u3092\u7D9A\u3051\u306A\u304C\u3089\u623B\u308A\u307E\u3059\uFF08Esc\uFF09">
          \u2190 \u623B\u308B <span class="sv-esc-hint">Esc</span>
        </button>
        <div class="sv-title-area">
          <nav class="sv-breadcrumb" aria-label="\u73FE\u5728\u5730">
            <button class="sv-bc-btn" type="button" data-bc-tab="dashboard">\u30DB\u30FC\u30E0</button>
            <span class="sv-bc-sep" aria-hidden="true">/</span>
            <button class="sv-bc-btn" type="button" data-bc-tab="timeline">\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3</button>
            <span class="sv-bc-sep" aria-hidden="true">/</span>
            <span class="sv-bc-current" id="sv-bc-title"></span>
          </nav>
          <div class="sv-stream-meta" id="sv-stream-meta"></div>
        </div>
        <button class="sv-fullscreen-btn" id="sv-fullscreen-btn" type="button"
          title="\u5927\u753B\u9762\u3067\u518D\u751F" aria-pressed="false">\u26F6</button>
        <div class="sv-volume-wrap">
          <button class="vol-btn" id="sv-vol-btn" type="button" aria-label="\u97F3\u91CF">\u{1F50A}</button>
          <input class="vol-slider" id="sv-vol-slider" type="range" min="0" max="100" value="100" aria-label="\u97F3\u91CF">
        </div>
        <button class="sv-music-btn" id="sv-music-btn" type="button" title="\u73FE\u5728\u4F4D\u7F6E\u304B\u3089\u97F3\u697D\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u8074\u304F">\u{1F3B5} \u97F3\u697D\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u8074\u304F</button>
        <button class="sv-share-btn" id="sv-share-btn" type="button" title="\u3053\u306E\u52D5\u753B\u306E\u5171\u6709\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC">\u{1F517} \u5171\u6709</button>
        <a class="sv-yt-link" id="sv-yt-link" href="#" target="_blank" rel="noopener">\u2197 YouTube\u3067\u958B\u304F</a>
      </div>
      <div class="sv-body">
        <div class="sv-player-section">
          <div class="sv-player-wrap" id="sv-player-wrap">
            <div class="sv-player-loading">\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>
          </div>
          <div class="sv-below-player" id="sv-below-player"></div>
        </div>
        <div class="sv-panel">
          <div class="sv-panel-head">
            <span>\u30BB\u30C3\u30C8\u30EA\u30B9\u30C8</span>
            <div class="sv-panel-head-right">
              <button class="sv-import-toggle" id="sv-import-toggle" type="button">\u4E00\u62EC\u5165\u529B</button>
              <button class="sv-cts-bulk-btn" id="sv-cts-bulk-btn" type="button" hidden>\u30BB\u30C8\u30EA\u767B\u9332</button>
              <span class="sv-song-count" id="sv-song-count"></span>
            </div>
          </div>
          <div class="sv-import-area" id="sv-import-area" hidden>
            <p class="sv-import-desc">\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u30921\u884C\u306B1\u3064\u5165\u529B\uFF08\u4E0A\u304B\u3089\u9806\u306B\u66F2\u3078\u5272\u308A\u5F53\u3066\uFF09</p>
            <textarea class="sv-import-input" id="sv-import-input" rows="6"
              placeholder="\u4F8B:&#10;15:59&#10;21:12&#10;25:57&#10;1:08:13"></textarea>
            <div class="sv-import-btns">
              <button class="sv-import-apply" id="sv-import-apply" type="button">\u9069\u7528</button>
              <button class="sv-import-cancel" id="sv-import-cancel" type="button">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
            </div>
          </div>
          <div class="sv-panel-hint">\u23F1 \u3067\u73FE\u5728\u6642\u523B\u3092\u30E1\u30E2 \uFF0F \u30D0\u30C3\u30B8\u3092\u30BF\u30C3\u30D7\u3067\u79FB\u52D5</div>
          <div class="sv-setlist" id="sv-setlist"></div>
        </div>
      </div>
    </div>
  `,t.appendChild(e),r("#sv-close").addEventListener("click",()=>pt()),r("#sv-share-btn").addEventListener("click",hs),r("#sv-music-btn").addEventListener("click",us),r("#sv-fullscreen-btn").addEventListener("click",gs);let s=r("#sv-vol-slider"),a=r("#sv-vol-btn");if(s){let n=z();s.value=n,s.style.setProperty("--pct",`${n}%`),a&&(a.textContent=dt(n)),s.addEventListener("input",i=>{let l=parseInt(i.target.value);if(i.target.style.setProperty("--pct",`${l}%`),Ht(l),a&&(a.textContent=dt(l)),y)try{y.setVolume(l)}catch{}})}if(a){let n=80;a.addEventListener("click",()=>{if(!s)return;let i=parseInt(s.value),l=i>0?0:n||80;i>0&&(n=i),Z(s,a,y,l),Ht(l)})}e.querySelectorAll("[data-bc-tab]").forEach(n=>{n.addEventListener("click",()=>{ht=n.dataset.bcTab,pt()})}),r("#sv-import-toggle").addEventListener("click",()=>{let n=r("#sv-import-area");n&&(n.hidden=!n.hidden,n.hidden||r("#sv-import-input")?.focus())}),r("#sv-import-cancel").addEventListener("click",()=>{let n=r("#sv-import-area");n&&(n.hidden=!0);let i=r("#sv-import-input");i&&(i.value="")}),r("#sv-import-apply").addEventListener("click",()=>{let n=e._currentStream;if(!n)return;let i=r("#sv-import-input");if(!i)return;let d=i.value.split(`
`).map(v=>Jt(v)).filter(v=>v!==null);if(!d.length)return;let o=X(n);d.forEach((v,p)=>{p<n.songs.length&&(o[p]=v)}),Vt(n,o),ot(r("#sv-setlist"),n.songs,o);let u=r("#sv-import-area");u&&(u.hidden=!0),i.value=""}),r("#sv-cts-bulk-btn").addEventListener("click",()=>{let n=e._currentStream;n&&Ss(n)}),r("#sv-setlist").addEventListener("click",n=>{let i=n.target.closest("[data-action]");if(!i)return;let l=parseInt(i.dataset.idx,10),d=e._currentStream;if(!d)return;let o=X(d);if(i.dataset.action==="seek"){if(o[l]!=null&&y?.seekTo){y.seekTo(o[l],!0);try{y.playVideo()}catch{}}}else if(i.dataset.action==="set-ts"){let u=y?.getCurrentTime?.();u!=null&&(o[l]=Math.floor(u),Vt(d,o),ot(r("#sv-setlist"),d.songs,o))}else if(i.dataset.action==="del-ts")delete o[l],Vt(d,o),ot(r("#sv-setlist"),d.songs,o);else if(i.dataset.action==="cts-seek"){let u=Number(i.dataset.ctsSeconds);if(!isNaN(u)&&y?.seekTo){y.seekTo(u,!0);try{y.playVideo()}catch{}}}else if(i.dataset.action==="cts-propose"){let u=d.songs[l];$s(d,l,u?.title||`\u66F2 ${l+1}`)}})}function S(t,e=0){if(!t?.url)return;let s=_(t.url);if(!s){St(t.url);return}Ue(),Ot(),tt(),vt||($=null);let a=r("#stream-viewer");if(j(a)){if(a._currentStream?.url===t.url){if(!Ee()&&!window.__restoreMusicExternalPlayer?.()&&Me(),e>0)try{y?.seekTo(Math.floor(e),!0),y?.playVideo()}catch{}return}jt()}let n=window.__takeOverMusicPlayerVideo?.(t.url)||null;n||import("./chunk-63MZHHGO.js").then(b=>(b.releaseMusicPlayerVideo||b.pauseMusicPlayer)()).catch(()=>{});let i=r("#yt-player-panel");if(i&&!i.hidden){try{w?.pauseVideo()}catch{}i.hidden=!0,ft()}if(E=null,C){C=!1;let b=r("#stream-viewer");b&&b.classList.remove("sv-fullscreen"),document.body.classList.remove("has-sv-fullscreen"),document.body.style.overflow=""}C=!1,zt();let l=r("#stream-viewer");l.classList.remove("sv-fullscreen"),l.classList.toggle("sv-mv-mode",!!t.isMv),l._currentStream=t;let d=++q,o=l.querySelectorAll("[data-bc-tab]");o[1]&&(t.isMv?(o[1].dataset.bcTab="playlists",o[1].textContent="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8"):(o[1].dataset.bcTab="timeline",o[1].textContent="\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3"));let u=r("#sv-bc-title");u&&(u.textContent=t.title||"\u914D\u4FE1");let v=r("#sv-stream-meta");v&&(v.textContent=t.isMv?"":`${T(t.date)}\u3000\u7B2C${t.index}\u67A0\u3000\u{1F3A4} ${t.songs.length}\u66F2`);let p=r("#sv-yt-link");p&&(p.href=t.url);let m=r("#sv-song-count");if(m&&(m.textContent=t.isMv?"":`${t.songs.length}\u66F2`),I={},t.isMv){let b=r("#sv-setlist");b&&(b.innerHTML="");let k=r("#sv-below-player");k&&(k.innerHTML=""),Ps(t)}else{let b=X(t);ot(r("#sv-setlist"),t.songs,b),ks(t),Cs(t)}l.hidden=!1,document.body.style.overflow="",A(),setTimeout(()=>{r("#sv-close")?.focus({preventScroll:!0})},50),y=null;let h=r("#sv-player-wrap");h.innerHTML='<div class="sv-player-loading">\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>';let g=Math.floor(e||n?.currentTime||0);if(n?.player){h.innerHTML="",n.iframe?(n.iframe.style.width="100%",n.iframe.style.height="100%",h.appendChild(n.iframe)):h.innerHTML='<div class="sv-player-loading">\u518D\u751F\u3092\u5F15\u304D\u7D99\u304E\u307E\u3057\u305F</div>',y=n.player;try{y.setVolume?.(z()),g>1&&y.seekTo?.(g,!0),y.playVideo?.()}catch{}Z(r("#sv-vol-slider"),r("#sv-vol-btn"),null,z()),Ms(d,l);return}qe(()=>{if(d!==q||l.hidden)return;h.innerHTML="";let b=document.createElement("div");h.appendChild(b);try{y=new window.YT.Player(b,{videoId:s,width:"100%",height:"100%",playerVars:{autoplay:1,playsinline:1,rel:0,modestbranding:1,...g>0?{start:g}:{}},events:{onReady:k=>{let bt=z();try{k.target.setVolume(bt)}catch{}Z(r("#sv-vol-slider"),r("#sv-vol-btn"),null,bt);try{k.target.setPlaybackQuality("hd1080")}catch{}try{k.target.setPlaybackQualityRange("hd720","hd1080")}catch{}if(g>5)try{k.target.seekTo(g,!0)}catch{}},onStateChange:k=>{if(d===q){if(k.data===window.YT.PlayerState.PLAYING)try{k.target.setPlaybackQuality("hd1080")}catch{}k.data===window.YT.PlayerState.ENDED&&Be(l)}},onError:()=>{d===q&&(h.innerHTML=`<iframe src="https://www.youtube.com/embed/${f(s)}?autoplay=1&playsinline=1&rel=0${g>0?`&start=${g}`:""}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`)}}})}catch{h.innerHTML=`<iframe src="https://www.youtube.com/embed/${f(s)}?autoplay=1&playsinline=1&rel=0${g>0?`&start=${g}`:""}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`}})}function pt(){let t=r("#stream-viewer");if(!t||t.hidden||j(t))return;if(C){C=!1,t.classList.remove("sv-fullscreen"),document.body.classList.remove("has-sv-fullscreen"),document.body.style.overflow="";let s=r("#sv-close");s&&(s.title="\u30DF\u30CB\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u518D\u751F\u3092\u7D9A\u3051\u306A\u304C\u3089\u623B\u308A\u307E\u3059\uFF08Esc\uFF09");let a=r("#sv-fullscreen-btn");a&&a.setAttribute("aria-pressed","false");return}if(ds())return;++q,t.hidden=!0,t._currentStream=null,tt(),y=null;let e=r("#sv-player-wrap");e&&(e.innerHTML=""),document.body.style.overflow="",Et(),A()}window.__openStreamViewer=S;function je(t){let e=rt(t),s=r("#song-modal"),a=r("#song-modal-body"),n=r("#song-modal-title");if(!e||!s||!a||!n)return;ae(e),n.textContent=e.title;let i=(e.streamRefs||[]).slice(0,8).map(o=>({...o,thumbnail:ct(o.url),thumbnailFallback:rs(o.url),thumbnailTiny:os(o.url),detailKey:Y(o)})),l=[e.genre,...e.seasonTags||[],...e.moodTags||[],...e.singerTags||[]].filter(Boolean),d=Mt(e.key);a.innerHTML=`
    <div class="song-detail-main">
      <div>
        <button class="song-detail-artist" type="button" data-detail-action="artist" data-songkey="${f(e.key)}">${f(e.artist)}</button>
        <div class="song-detail-tags">${l.map(o=>`<span class="tag-badge">${f(o)}</span>`).join("")}</div>
      </div>
      <div class="song-detail-stats">
        <div><strong>${e.count}</strong><span>\u6B4C\u5531\u56DE\u6570</span></div>
        <div><strong>${e.displayKey||"\u2014"}</strong><span>\u30AD\u30FC</span></div>
        <div><strong>${e.daysSinceLast??"\u2014"}</strong><span>\u65E5\u524D</span></div>
        <div><strong>${T(e.firstSung)||"\u2014"}</strong><span>\u521D\u62AB\u9732</span></div>
      </div>
    </div>
    <div class="song-detail-actions">
      <button class="btn ${d?"primary":"ghost"}" type="button" data-detail-action="favorite" data-songkey="${f(e.key)}">${d?"\u2665 \u304A\u6C17\u306B\u5165\u308A\u89E3\u9664":"\u2661 \u304A\u6C17\u306B\u5165\u308A\u306B\u8FFD\u52A0"}</button>
      <button class="btn primary" type="button" data-detail-action="timeline" data-songkey="${f(e.key)}">\u6B4C\u67A0\u3092\u898B\u308B</button>
      <button class="btn ghost" type="button" data-detail-action="close">\u9589\u3058\u308B</button>
    </div>
    <div class="song-detail-history">
      <h3>\u6B4C\u3063\u305F\u6B4C\u67A0</h3>
      ${i.length?i.map(o=>`
        <div class="song-detail-stream">
          ${o.thumbnail&&o.url?`<span class="song-detail-thumb-wrap"><button class="song-detail-thumb-link" type="button" data-inline-youtube="${f(o.url)}" aria-label="\u30A4\u30F3\u30E9\u30A4\u30F3\u518D\u751F"><img class="song-detail-thumb" src="${f(o.thumbnail)}" data-fallback="${f(o.thumbnailFallback)}" data-tiny="${f(o.thumbnailTiny)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>\u518D\u751F</span></button><a class="song-detail-youtube-link" href="${f(o.url)}" target="_blank" rel="noopener">\u958B\u304F</a></span>`:'<div class="song-detail-thumb placeholder"></div>'}
          <button class="song-detail-frame" type="button" data-detail-action="stream" data-songkey="${f(e.key)}" data-streamkey="${f(o.detailKey)}">
            <span>${T(o.date)}</span>
            <strong>${f(o.title||"\u914D\u4FE1")}</strong>
          </button>
          <button class="song-detail-watch" type="button" data-detail-action="watch" data-songkey="${f(e.key)}" data-streamkey="${f(o.detailKey)}" title="\u3053\u306E\u6B4C\u5531\u306E\u982D\u51FA\u3057\u518D\u751F\uFF08\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u304C\u3042\u308C\u3070\u305D\u306E\u4F4D\u7F6E\u304B\u3089\uFF09">\u23F1 \u982D\u51FA\u3057</button>
        </div>
      `).join(""):'<p class="song-detail-empty">\u5C65\u6B74\u672A\u78BA\u8A8D</p>'}
    </div>
  `,s.hidden=!1,r("#song-modal-close")?.focus()}function qs(){let t=r("#song-modal"),e=r("#song-modal-close");if(!t||!e)return;let s=()=>{t.hidden=!0};e.addEventListener("click",s),t.addEventListener("click",a=>{a.target===t&&s();let n=a.target.closest("[data-inline-youtube]");if(n){a.preventDefault(),a.stopPropagation(),St(n.dataset.inlineYoutube);return}let i=a.target.closest("[data-detail-action]");if(i){if(a.stopPropagation(),i.dataset.detailAction==="close"&&s(),i.dataset.detailAction==="favorite"){let l=i.dataset.songkey;te(l);let d=Mt(l);i.textContent=d?"\u2665 \u304A\u6C17\u306B\u5165\u308A\u89E3\u9664":"\u2661 \u304A\u6C17\u306B\u5165\u308A\u306B\u8FFD\u52A0",i.classList.toggle("primary",d),i.classList.toggle("ghost",!d)}if(i.dataset.detailAction==="timeline"){let l=rt(i.dataset.songkey);s(),l&&as(l)}if(i.dataset.detailAction==="stream"){let l=rt(i.dataset.songkey),d=l?.streamRefs?.find(o=>Y(o)===i.dataset.streamkey);s(),l&&d&&is(l,d)}if(i.dataset.detailAction==="watch"){let l=rt(i.dataset.songkey),d=i.dataset.streamkey;s(),l&&d&&ns(l,d)}if(i.dataset.detailAction==="artist"){let l=rt(i.dataset.songkey);s(),l&&ls(l)}}}),t.addEventListener("error",a=>{let n=a.target.closest?.(".song-detail-thumb");if(!n)return;let i=n.dataset.fallback||n.dataset.tiny||"";if(i&&n.src!==i){n.src=i,n.dataset.fallback===i?delete n.dataset.fallback:delete n.dataset.tiny;return}n.closest(".song-detail-thumb-link")?.classList.add("thumb-missing")},!0),document.addEventListener("keydown",a=>{a.key==="Escape"&&!t.hidden&&s()})}var $e=!1;function Vs(){if(!c.data)return;let{stats:t,streams:e=[]}=c.data,s=e[0]?.date||null,a=Ct(s),n=t.dataGeneratedDate||c.channelData?.dataGeneratedDate||null,i=Ct(n),l=t.channelLabel||t.channelId||"",d=l?`<span class="badge accent" style="margin-right:8px;">${f(l)}</span>`:"";r("#updated-info").innerHTML=d+`\u30C7\u30FC\u30BF\u66F4\u65B0\u65E5\uFF1A<strong>${T(n)||"\u2014"}</strong>`+(i!=null?` <span class="badge">${i}\u65E5\u524D</span>`:"");let o=r("#stats-grid");if(!$e)o.innerHTML=`
      <div class="stat-card">
        <div class="stat-label">\u7DCF\u6B4C\u5531\u6570</div>
        <div class="stat-value">${F(t.total)}<span class="stat-unit">\u56DE</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">\u6301\u3061\u66F2\u6570</div>
        <div class="stat-value">${F(t.repertoire)}<span class="stat-unit">\u66F2</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">\u6B4C\u67A0\u56DE\u6570</div>
        <div class="stat-value">${F(t.streams)}<span class="stat-unit">\u56DE</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">1\u67A0\u5E73\u5747</div>
        <div class="stat-value">${t.avgPerStream}<span class="stat-unit">\u66F2</span></div>
      </div>
      <div class="stat-card accent">
        <div class="stat-label">\u6700\u65B0\u6B4C\u67A0\u304B\u3089</div>
        <div class="stat-value">${a??"\u2014"}<span class="stat-unit">\u65E5</span></div>
      </div>
      <div class="stat-card gold">
        <div class="stat-label">\u6D3B\u52D5\u671F\u9593</div>
        <div class="stat-value">${Le(c.data)}<span class="stat-unit">\u65E5</span></div>
      </div>
    `,$e=!0;else{let u=o.querySelectorAll(".stat-value");u.length>=6&&(u[0].textContent=F(t.total),u[0].innerHTML+='<span class="stat-unit">\u56DE</span>',u[1].textContent=F(t.repertoire),u[1].innerHTML+='<span class="stat-unit">\u66F2</span>',u[2].textContent=F(t.streams),u[2].innerHTML+='<span class="stat-unit">\u56DE</span>',u[3].textContent=t.avgPerStream,u[3].innerHTML+='<span class="stat-unit">\u66F2</span>',u[4].textContent=a??"\u2014",u[4].innerHTML+='<span class="stat-unit">\u65E5</span>',u[5].textContent=Le(c.data),u[5].innerHTML+='<span class="stat-unit">\u65E5</span>')}}function Le(t){if(!t.streams?.length)return"\u2014";let e=t.streams[t.streams.length-1].date,s=t.streams[0].date;return Math.floor((s-e)/864e5)+1}function Hs(){r("#loading").hidden=!1,r("#error").hidden=!0}function Ns(){r("#loading").hidden=!0}function Bs(t){let e=r("#loading"),s=r("#error"),a=r("#err-detail");e&&(e.hidden=!0),s&&(s.hidden=!1),a&&(a.textContent=t&&t.message?t.message:String(t))}function Rs(t){let e=document.getElementById("page-title");e&&(e.innerHTML='<img class="hero-title-icon" src="assets/hero-rose.svg" alt="" width="32" height="32" fetchpriority="high" decoding="sync">\u8328\u3080\u3042\u3093 \u6B4C\u5531\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9',document.title="\u8328\u3080\u3042\u3093 \u6B4C\u5531\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9")}var Us={main:{name:"\u8328\u3080\u3042\u3093 - Ibara Muan",handle:"@ibaramuan",url:"https://www.youtube.com/@ibaramuan",label:"Muan ch.",desc:`\u6CA2\u5C71\u5BDD\u3066\u3001\u6CA2\u5C71\u7B11\u3063\u3066\u3001\u6CA2\u5C71\u6B4C\u3046\u3088
\u500B\u4EBA\u52E2Vsinger \u8328\u3080\u3042\u3093(Ibara Muan)\u3067\u3059\uFF01
2021/5/2 \u30C7\u30D3\u30E5\u30FC\u{1F389} #vtuber #\u6B4C\u67A0 #karaoke`,links:[{icon:"\u{1D54F}",label:"X (Twitter)",url:"https://x.com/ibaramuan"},{icon:"\u{1F98B}",label:"Bluesky",url:"https://bsky.app/profile/ibaramuan.bsky.social"},{icon:"\u{1F6CD}",label:"BOOTH",url:"https://ibaramuan.booth.pm"}],avatarUrl:"assets/avatar.jpg",bannerUrl:"assets/banner.jpg"}};function js(t){let e=Us[t];if(!e)return"";let s=e.bannerUrl?`<img class="ch-card-banner-img" src="${f(e.bannerUrl)}" alt="" loading="lazy">
       <span class="ch-card-banner-label ch-card-banner-label--over">${f(e.label)}</span>`:`<span class="ch-card-banner-label">${f(e.label)}</span>`,a=e.avatarUrl?`<img class="ch-card-avatar-img" src="${f(e.avatarUrl)}" alt="${f(e.name)}" loading="lazy">`:"\u8328",n=e.desc?`<p class="ch-card-desc">${e.desc.split(`
`).map(l=>f(l)).join("<br>")}</p>`:"",i=e.links?.length?`
    <div class="ch-card-links">
      ${e.links.map(l=>`
        <a class="ch-card-link" href="${f(l.url)}" target="_blank" rel="noopener">
          <span class="ch-card-link-icon" aria-hidden="true">${l.icon}</span>
          <span>${f(l.label)}</span>
        </a>`).join("")}
    </div>`:"";return`
    <div class="ch-card ch-card--${t}">
      <div class="ch-card-banner ch-card-banner--${t}${e.bannerUrl?" ch-card-banner--img":""}">
        ${s}
      </div>
      <div class="ch-card-body">
        <div class="ch-card-header">
          <div class="ch-card-avatar ch-card-avatar--${t}${e.avatarUrl?" ch-card-avatar--img":""}">${a}</div>
          <div class="ch-card-meta">
            <div class="ch-card-name">${f(e.name)}</div>
            <div class="ch-card-handle">${f(e.handle)}</div>
          </div>
        </div>
        ${n}
        ${i}
        <div class="ch-card-actions">
          <a class="ch-card-yt-btn" href="${f(e.url)}" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
            YouTube\u30C1\u30E3\u30F3\u30CD\u30EB\u3078
          </a>
        </div>
      </div>
    </div>`}function Ys(t){let e=r("#ch-modal"),s=r("#ch-modal-body");!e||!s||(s.innerHTML=js("main"),e.hidden=!1,r("#ch-modal-close")?.focus())}function Fs(){let t=r("#ch-modal"),e=r("#ch-modal-close");if(!t||!e)return;let s=()=>{t.hidden=!0};e.addEventListener("click",s),t.addEventListener("click",a=>{a.target===t&&s()}),document.querySelectorAll("[data-ch-modal]").forEach(a=>{a.addEventListener("click",()=>Ys(a.dataset.chModal))})}function Os(){let t=r("#help-modal"),e=r("#help-btn"),s=r("#help-close");if(!t||!e||!s)return;let a=()=>{t.hidden=!1,s.focus()},n=()=>{t.hidden=!0,e.focus()};e.addEventListener("click",a),s.addEventListener("click",n),t.addEventListener("click",i=>{i.target===t&&n()}),document.addEventListener("keydown",i=>{i.key==="Escape"&&!t.hidden&&n()})}function Ks(){let t=r("#welcome-tip"),e=r("#welcome-close");if(!t||!e||window.matchMedia("(max-width: 760px)").matches||localStorage.getItem("ibara-muan-welcome-tip-dismissed")==="1")return;let s=()=>{t.hidden=!1};"requestIdleCallback"in window?window.requestIdleCallback(s,{timeout:5e3}):window.setTimeout(s,2500),e.addEventListener("click",()=>{t.hidden=!0,localStorage.setItem("ibara-muan-welcome-tip-dismissed","1")})}async function Zt(){Hs();try{let t=await ie();c.channelData=t,!J&&!t.fullLoaded&&_e();let e=B(),s=!!e.v;c.songsQuery=e.q,c.activeTab=s?"player":Lt(e.tab)?e.tab:"dashboard",Te(c.activeTab);let a=e.channel||c.channel||et;if(U(a)||(a=et),!U(a)){let n=Object.keys(t.channels)[0];n&&(a=n)}if(!U(a))throw new Error("No channel data could be loaded");ss(),Tt(a,{resetSearch:!1,updateUrl:!1,autoLoad:!0,initial:!0,render:!s}),s&&(await ys()||P(e.tab,{updateUrl:!1,initial:!0})),Ns(),bs()}catch(t){console.error("[init] failed:",t),Bs(t)}}function zs(){if(!c.channelData)return;let t=B();c.songsQuery=t.q,t.channel!==c.channel&&U(t.channel)&&Tt(t.channel,{resetSearch:!1,updateUrl:!1}),P(t.tab,{updateUrl:!1})}M(".tab-btn").forEach(t=>{t.addEventListener("click",()=>{let e=t.dataset.tab,s=r("#stream-viewer");if(e!=="player"&&s&&!s.hidden&&!C&&!j(s)){ht=e,pt();return}P(e)})});M(".ch-btn").forEach(t=>{t.addEventListener("click",()=>{t.dataset.channel&&(t.disabled||Tt(t.dataset.channel))})});window.addEventListener("popstate",zs);M("[data-audience]").forEach(t=>{t.addEventListener("click",()=>Xe(t.dataset.audience))});document.body.addEventListener("click",t=>{let e=t.target.closest("[data-artist-search]");if(e){t.preventDefault(),t.stopPropagation(),Rt(e.dataset.artistSearch||e.textContent||"");return}let s=t.target.closest("[data-playlist-add]");if(s){t.preventDefault(),t.stopPropagation();let l=s.dataset.playlistAdd,d=s.dataset.streamTitle||"";import("./chunk-E5UYFPOK.js").then(o=>o.showAddToPlaylistModal(l,d));return}let a=t.target.closest("[data-stream-play]");if(a){t.preventDefault(),t.stopPropagation();let l=a.dataset.streamPlay,d=(c.data?.streams||[]).find(o=>Y(o)===l);d?.url?S(d):a.dataset.inlineYoutube&&St(a.dataset.inlineYoutube);return}let n=t.target.closest("[data-inline-youtube]");if(n){t.preventDefault(),t.stopPropagation(),St(n.dataset.inlineYoutube);return}if(se(t.target))return;let i=t.target.closest("[data-songkey]");i&&je(i.dataset.songkey)});r("#retry-btn").addEventListener("click",Zt);r("#reload-btn").addEventListener("click",Zt);Os();Fs();Ft();Ue();qs();ts();es();Ks();import("./chunk-63MZHHGO.js").then(t=>{t.setApiLoader(Ot),t.initMusicPlayer()}).catch(()=>{});me(t=>{t.type==="song"?je(t.song.key):t.type==="artist"?Rt(t.artist):t.type==="stream"?S(t.stream):t.type==="music-video"&&S({...t.video,isMv:!0})});document.addEventListener("keydown",t=>{let e=document.activeElement?.tagName,s=e==="INPUT"||e==="TEXTAREA"||e==="SELECT";if(!s&&!t.metaKey&&!t.ctrlKey&&!t.altKey){let n=r("#stream-viewer");if(n&&!n.hidden&&!n.classList.contains("sv-minified")&&!n.classList.contains("sv-music-minified")&&r("#sv-share-modal")?.hidden!==!1&&y){if(t.key===" "){t.preventDefault();try{y.getPlayerState?.()===window.YT?.PlayerState?.PLAYING?y.pauseVideo():y.playVideo()}catch{}return}if(t.key==="ArrowLeft"||t.key==="ArrowRight"){t.preventDefault();try{let l=y.getCurrentTime?.()??0,d=Math.max(0,l+(t.key==="ArrowRight"?10:-10));y.seekTo(d,!0)}catch{}return}}}if(t.key==="/"&&!s&&!t.metaKey&&!t.ctrlKey||t.key==="k"&&(t.ctrlKey||t.metaKey)&&!t.shiftKey){t.preventDefault(),fe();return}if(t.key==="t"&&!s&&!t.metaKey&&!t.ctrlKey){t.preventDefault(),oe();return}if(t.key==="?"&&!s&&!t.metaKey&&!t.ctrlKey){t.preventDefault();let n=r("#help-modal");n&&n.hidden&&(n.hidden=!1,r("#help-close")?.focus());return}if(t.key==="Escape"&&!t.metaKey&&!t.ctrlKey){let n=r("#stream-viewer"),i=!!r("#panel-player.active");if(n&&!n.hidden&&(C||i)){t.preventDefault(),pt();return}if(qt()){t.preventDefault(),nt();return}let l=r("#song-modal");if(l&&!l.hidden)return;let d=r("#ch-modal");if(d&&!d.hidden){d.hidden=!0;return}let o=r("#help-modal");if(o&&!o.hidden){o.hidden=!0,r("#help-btn")?.focus();return}let u=r("#songs-search");u&&document.activeElement===u&&u.value&&(t.preventDefault(),u.value="",u.dispatchEvent(new Event("input",{bubbles:!0})))}});de(()=>{c.data&&(It(),(c.activeTab==="dashboard"||c.activeTab==="analytics")&&G())});function Gs(){Zt()}Gs();export{vs as getWatchHistory};
