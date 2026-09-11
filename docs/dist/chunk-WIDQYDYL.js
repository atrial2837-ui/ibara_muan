import{a as Q,b as pt}from"./chunk-HYFYQJIG.js";import{a as Ot}from"./chunk-ZGMLTK2D.js";import{I as F,K as Dt,L,M as it,O as Ut,U as b,e as C,f as r,g as Bt,h as m}from"./chunk-W25M55W2.js";var $t="ibara-watch-history-v1",jt=0;function _e(){try{return JSON.parse(localStorage.getItem($t)||"[]")}catch{return[]}}function Xe(){try{localStorage.removeItem($t)}catch{}}function xt(t,e){if(!(!t?.url||e<10))try{let s=_e().filter(a=>a.url!==t.url);s.unshift({url:t.url,title:t.title||"",t:Math.max(0,Math.floor(e)),isMv:!!t.isMv,channel:t.channel??null,index:t.index??null,date:t.date??null,updatedAt:Date.now()}),localStorage.setItem($t,JSON.stringify(s.slice(0,10)))}catch{}}function Ft(t,e){let s=Date.now();s-jt<5e3||(jt=s,xt(t,e))}var Gt=/\b\d{1,2}:\d{2}(?::\d{2})?\b/g;function mt(t){let e=String(t||"").match(/(\d+):(\d{2}):(\d{2})|(\d+):(\d{2})/);return e?e[1]!==void 0?parseInt(e[1])*3600+parseInt(e[2])*60+parseInt(e[3]):parseInt(e[4])*60+parseInt(e[5]):null}function Qt(t){let e=String(t||"").trim();if(!e)return null;let s=e.match(Gt)||[];if(!s.length)return null;let a=Se(e);if(!a)return null;let{title:n,artist:i}=ke(a);return n?{start:s[0].trim(),title:n,artist:i,end:s.length>1?s[s.length-1].trim():"",raw:a}:null}function Se(t){return String(t||"").replace(Gt," ").replace(/https?:\/\/\S+/gi," ").replace(/^\s*(?:\d+[\).．、:]|[#＃]\d+|[・\-*＊•▶▷♪♫🎵🎶]+)\s*/u,"").replace(/^[\s　\[\]【】()（）<>＜＞「」『』"'`]+|[\s　\[\]【】()（）<>＜＞「」『』"'`]+$/g,"").replace(/\s*(?:[-–—~〜→⇒>|｜]{2,}|[|｜])\s*$/g,"").replace(/[ \t　]+/g," ").trim()}function _t(t){return String(t||"").replace(/^[\s　\[\]【】()（）<>＜＞「」『』"'`・\-*＊•▶▷♪♫🎵🎶]+/u,"").replace(/[\s　\[\]【】()（）<>＜＞「」『』"'`]+$/g,"").trim()}function ke(t){let e=_t(t);if(!e)return{title:"",artist:""};let s=[/^(.+?)\s*(?:\/|／)\s*(.+)$/,/^(.+?)\s+(?:by|BY|By)\s+(.+)$/,/^(.+?)\s*(?:-|－|–|—|~|〜|｜|\|)\s*(.+)$/,/^(.+?)\s+(?:covered\s+by|cover\s+by|歌[:：])\s+(.+)$/i];for(let a of s){let n=e.match(a);if(!n)continue;let i=_t(n[1]),l=_t(n[2]);if(i&&l)return{title:i,artist:l}}return{title:e,artist:""}}function Y(t){return(t||"").toLowerCase().replace(/[\s　]/g,"").replace(/[！-～]/g,e=>String.fromCharCode(e.charCodeAt(0)-65248)).replace(/[・｡。、，,．.！!？?「」『』【】（）()]/g,"")}function Wt(t,e,s){let a=Y(t),n=Y(e),i=-1,l=0;for(let u=0;u<s.length;u++){let c=Y(s[u].title),d=Y(s[u].artist),o=0;c===a?o+=80:a.length>1&&(c.includes(a)||a.includes(c))&&(o+=40),n&&d===n?o+=20:n&&n.length>1&&(d.includes(n)||n.includes(d))&&(o+=10),o>l&&(l=o,i=u)}if(l<40&&n)for(let u=0;u<s.length;u++){let c=Y(s[u].title),d=Y(s[u].artist),o=0;c===n?o+=70:n.length>1&&(c.includes(n)||n.includes(c))&&(o+=35),d&&d===a?o+=20:a.length>1&&(d.includes(a)||a.includes(d))&&(o+=10),o>l&&(l=o,i=u)}return l>=40?i:-1}async function zt(t,e){let s=await fetch(`/api/timestamps/${encodeURIComponent(t)}/${e}`);return s.ok?(await s.json()).items||[]:null}async function St(t,e,{songIndex:s,timeSeconds:a,submitterNote:n}){let i=await fetch(`/api/timestamps/${encodeURIComponent(t)}/${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({songIndex:s,timeSeconds:a,submitterNote:n})});return i.ok?{ok:!0}:{ok:!1,error:(await i.json().catch(()=>({}))).error||i.statusText}}function kt(t,e=0){let s=String(t||""),a=L(s);if(!a)return s;let n=Math.max(0,Math.floor(Number(e)||0));return`https://www.youtube.com/watch?v=${a}${n>0?`&t=${n}s`:""}`}function Kt(t,e=0,s={}){if(!t)return"";let a=Q(),n=new URLSearchParams,i=a.channel||C.channel;return i&&i!=="main"&&n.set("ch",i),n.set("v",t),s.includeTime!==!1&&e>5&&n.set("t",String(Math.floor(e))),`${location.origin}${location.pathname}?${n}`}var Z="idle",Te={idle:["embedded","mini"],embedded:["fullscreen","mini","music-bar","idle"],fullscreen:["embedded","idle"],mini:["embedded","idle"],"music-bar":["embedded","idle"]};function us(){return Z}function vs(t){if(!["embedded","fullscreen"].includes(Z)||r("#sv-share-modal")?.hidden===!1||!p)return!1;if(t===" "){try{p.getPlayerState?.()===window.YT?.PlayerState?.PLAYING?p.pauseVideo():p.playVideo()}catch{}return!0}if(t==="ArrowLeft"||t==="ArrowRight"){try{let e=p.getCurrentTime?.()??0;p.seekTo(Math.max(0,e+(t==="ArrowRight"?10:-10)),!0)}catch{}return!0}return!1}function V(t){t!==Z&&(Te[Z]?.includes(t)||console.warn(`[player] \u4E0D\u6B63\u306A\u30E2\u30FC\u30C9\u9077\u79FB: ${Z} \u2192 ${t}`),Z=t)}var R=null;function hs(t){R=t}function ys(t){wt=t}function gs(t){ht=t}function ee(){return window.matchMedia("(max-width: 700px)").matches}function vt(){ft&&(clearInterval(ft),ft=null)}function Ct(){vt(),ft=setInterval(()=>{if(T(),!!y)try{let t=y.getDuration?.()||0,e=y.getCurrentTime?.()||0;P&&Ft(P,e);let s=t>0?Math.min(e/t*100,100):0,a=r("#yt-mini-progress-fill");a&&(a.style.width=`${s}%`);let i=y.getPlayerState?.()===window.YT?.PlayerState?.PLAYING,l=r("#yt-mini-play");l&&l.setAttribute("data-playing",i?"1":"0")}catch{}},400)}function nt(){if(vt(),y){try{y.destroy()}catch{}y=null}let t=r("#yt-player-container");t&&(t.innerHTML="")}function Le(){if(y?.getCurrentTime)try{return y.getCurrentTime()}catch{}return Math.max(0,ct+(Date.now()-Pt)/1e3)}function X(t=r("#stream-viewer")){return!!t&&(t.classList.contains("sv-minified")||t.classList.contains("sv-music-minified"))}function T(){let t=r("#stream-viewer");if(!X(t))return;let e=r("#sv-player-wrap"),s=t.classList.contains("sv-music-minified")?document.querySelector("#music-bar .mbar-video-wrap"):document.querySelector("#yt-player-panel .yt-mini-video-wrap");if(!e||!s)return;let a=s.getBoundingClientRect();e.style.left=`${a.left}px`,e.style.top=`${a.top}px`,e.style.width=`${a.width}px`,e.style.height=`${a.height}px`}function Me(){let t=r("#stream-viewer"),e=t?._currentStream;if(!t||!e||!p)return!1;ie();let s=r("#yt-player-panel");if(!s)return!1;P=e;try{ct=Math.floor(p.getCurrentTime?.()??0)}catch{ct=0}Pt=Date.now();let a=r("#yt-mini-title");a&&(a.textContent=e.title||"");let n=r("#yt-mini-hint");n&&(n.innerHTML=`${b("chevronUp")} \u30BF\u30C3\u30D7\u3057\u3066\u914D\u4FE1\u30D3\u30E5\u30FC\u30EF\u30FC\u3078\u623B\u308B`),s.classList.add("has-stream"),s.hidden=!1,y=p,p=null,t.classList.add("sv-minified"),document.body.classList.add("has-sv-mini"),document.body.style.overflow="",V("mini"),dt(),H(),T(),requestAnimationFrame(T),setTimeout(T,120),setTimeout(T,400),window.addEventListener("resize",T),Ct();try{let i=y.getPlayerState?.();r("#yt-mini-play")?.setAttribute("data-playing",i===window.YT?.PlayerState?.PLAYING?"1":"0")}catch{}return et(r("#yt-mini-vol-slider"),r("#yt-mini-vol-btn"),null,z()),!0}function se(){let t=r("#stream-viewer");if(!t?.classList.contains("sv-minified"))return!1;window.removeEventListener("resize",T),vt(),t.classList.remove("sv-minified"),document.body.classList.remove("has-sv-mini");let e=r("#sv-player-wrap");e&&(e.style.cssText=""),p=y,y=null;let s=r("#yt-player-panel");return s&&(s.hidden=!0),At(),H(),setTimeout(()=>{r("#sv-close")?.focus({preventScroll:!0})},50),!0}function ne(){let t=r("#stream-viewer");if(!t?.classList.contains("sv-music-minified"))return!1;window.removeEventListener("resize",T),vt(),t.classList.remove("sv-music-minified"),document.body.classList.remove("has-sv-music");let e=r("#sv-player-wrap");return e&&(e.style.cssText=""),p=y,y=null,At(),H(),setTimeout(()=>{r("#sv-close")?.focus({preventScroll:!0})},50),!0}function ae(){let t=r("#stream-viewer");if(!t?.classList.contains("sv-music-minified"))return!1;window.removeEventListener("resize",T),vt(),J(),++N,t.classList.remove("sv-music-minified"),document.body.classList.remove("has-sv-music"),t.hidden=!0,t._currentStream=null;let e=r("#sv-player-wrap");return e&&(e.style.cssText="",e.innerHTML=""),nt(),P=null,V("idle"),H(),!0}function Ee(){let t=r("#stream-viewer"),e=t?._currentStream;if(!t||t.hidden||!e?.url)return;let s=It(Q().t),a={...e,title:e.title||(e.isMv?"\u52D5\u753B":"\u6B4C\u67A0"),type:e.isMv?e.type||"original":"stream",sub:e.isMv?e.originalArtist||e.character||e.sub||"":`${F(e.date)} \u7B2C${e.index}\u67A0`,_stream:e};if(!p){++N,J(),O=!1,t.classList.remove("sv-fullscreen"),document.body.classList.remove("has-sv-fullscreen"),r("#sv-fullscreen-btn")?.setAttribute("aria-pressed","false"),t.hidden=!0,t._currentStream=null;let i=r("#sv-player-wrap");i&&(i.innerHTML=""),document.body.style.overflow="",P=null,V("idle"),R.setSidebarHidden(!1),dt(),H(),Ke().then(l=>l?.playVideo?.(a,s));return}try{ct=Math.floor(p.getCurrentTime?.()??s)}catch{ct=s}Pt=Date.now(),y=p,p=null,P=null,O=!1,t.classList.remove("sv-fullscreen","sv-minified"),V("music-bar"),t.classList.add("sv-music-minified"),document.body.classList.remove("has-sv-fullscreen","has-sv-mini"),document.body.classList.add("has-sv-music"),document.body.style.overflow="",t.hidden=!1;let n=r("#yt-player-panel");n&&(n.hidden=!0),dt(),H(),T(),requestAnimationFrame(T),setTimeout(T,120),setTimeout(T,400),window.addEventListener("resize",T),Ct(),W?.adoptExternalPlayer?.(a,y,{restore:ne,close:ae}),T(),requestAnimationFrame(T),setTimeout(T,120),setTimeout(T,400)}function gt(){let t=r("#stream-viewer");if(t?.classList.contains("sv-music-minified"))return ae();if(!t?.classList.contains("sv-minified"))return!1;window.removeEventListener("resize",T),J(),++N,t.classList.remove("sv-minified"),document.body.classList.remove("has-sv-mini"),t.hidden=!0,t._currentStream=null;let e=r("#sv-player-wrap");e&&(e.style.cssText="",e.innerHTML=""),nt();let s=r("#yt-player-panel");return s&&(s.hidden=!0),P=null,V("idle"),R.setSidebarHidden(!1),H(),!0}var rt=null;function It(t=0){let e=[p,y];for(let s of e)try{let a=s?.getCurrentTime?.();if(Number.isFinite(a))return Math.max(0,Math.floor(a))}catch{}return Math.max(0,Math.floor(Number(t)||0))}function H(){let t=r("#stream-viewer"),s=t&&!t.hidden&&!X(t)&&t._currentStream?.url?L(t._currentStream.url):"",a=s?It(Q().t):0;pt({v:s||"",t:a>5?a:0},{replace:!0}),s&&xt(t._currentStream,a),s&&!rt&&(rt=setInterval(H,5e3)),!s&&rt&&(clearInterval(rt),rt=null)}function Ce(){if(r("#sv-share-modal"))return;let t=document.createElement("div");t.id="sv-share-modal",t.hidden=!0,t.innerHTML=`
    <div class="sv-share-backdrop"></div>
    <div class="sv-share-dialog" role="dialog" aria-modal="true" aria-label="\u52D5\u753B\u3092\u5171\u6709">
      <div class="sv-share-head">
        <span class="sv-share-head-icon">${b("heart")}</span>
        <span class="sv-share-head-title">\u3053\u306E\u6B4C\u67A0\u3092\u304A\u3059\u305D\u308F\u3051</span>
        <button class="sv-share-close" id="sv-share-close" type="button" aria-label="\u9589\u3058\u308B">${b("close")}</button>
      </div>
      <div class="sv-share-charm" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="sv-share-video">
        <span class="sv-share-video-icon">${b("music")}</span>
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
    </div>`,document.body.appendChild(t);let e=()=>{t.hidden=!0};t.querySelector(".sv-share-backdrop").addEventListener("click",e),r("#sv-share-close").addEventListener("click",e),document.addEventListener("keydown",n=>{n.key==="Escape"&&!t.hidden&&(n.preventDefault(),n.stopPropagation(),e())},{capture:!0});let s=()=>{let n=t._shareState;if(!n)return;let i=r("#sv-share-ts-check")?.checked&&n.t>0,l=Kt(n.id,n.t,{includeTime:i}),u=r("#sv-share-url");u&&(u.value=l);let c=n.title?`${n.title}`:"\u8328\u3080\u3042\u3093 \u6B4C\u5531\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9",d=r("#sv-share-x");d&&(d.href=`https://twitter.com/intent/tweet?text=${encodeURIComponent(c)}&url=${encodeURIComponent(l)}`);let o=r("#sv-share-line");return o&&(o.href=`https://line.me/R/share?text=${encodeURIComponent(`${c}
${l}`)}`),l};r("#sv-share-ts-check").addEventListener("change",s),t._rebuild=s,r("#sv-share-url").addEventListener("focus",n=>n.target.select()),r("#sv-share-copy").addEventListener("click",async()=>{let n=r("#sv-share-url")?.value;if(!n)return;let i=!1;try{await navigator.clipboard.writeText(n),i=!0}catch{try{r("#sv-share-url").select(),i=document.execCommand("copy")}catch{}}let l=r("#sv-share-copy");l&&(l.textContent=i?"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u3057\u305F":"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093",l.classList.add("copied"),setTimeout(()=>{l.textContent="\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC",l.classList.remove("copied")},1600))});let a=r("#sv-share-native");navigator.share&&a&&(a.hidden=!1,a.addEventListener("click",async()=>{let n=t._shareState,i=r("#sv-share-url")?.value;if(i)try{await navigator.share({title:n?.title||"",url:i})}catch{}}))}function Ie(){let e=r("#stream-viewer")?._currentStream;if(!e?.url)return;let s=L(e.url);if(!s)return;Ce();let a=r("#sv-share-modal"),n=It(Q().t);a._shareState={id:s,t:n,title:e.title||""};let i=r("#sv-share-video-title");i&&(i.textContent=e.title||"(\u30BF\u30A4\u30C8\u30EB\u306A\u3057)");let l=r("#sv-share-ts-row"),u=r("#sv-share-ts-check"),c=r("#sv-share-ts-label");l&&(l.hidden=n<=5),u&&(u.checked=n>5),c&&(c.textContent=A(n)),a._rebuild?.(),a.hidden=!1}var Jt=new URLSearchParams(location.search).get("pl");async function ws(){if(!Jt)return;let t=null;try{let a=Jt.replace(/-/g,"+").replace(/_/g,"/"),n=Uint8Array.from(atob(a),i=>i.charCodeAt(0));t=JSON.parse(new TextDecoder().decode(n))}catch{return}if(!t||typeof t.n!="string"||!Array.isArray(t.s))return;let e=t.n.slice(0,60)||"\u5171\u6709\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8",s=t.s.filter(a=>typeof a=="string"&&a.length<100).slice(0,300);if(s.length){if(!confirm(`\u5171\u6709\u3055\u308C\u305F\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u300C${e}\u300D\uFF08${s.length}\u4EF6\uFF09\u3092\u53D6\u308A\u8FBC\u307F\u307E\u3059\u304B\uFF1F`)){pt({},{replace:!0});return}try{let a=await import("./chunk-QVQWP433.js"),n=a.createPlaylist(e);for(let i of s)a.addStreamToPlaylist(n.id,i);pt({tab:"playlists"},{replace:!0}),R.activateTab("playlists",{updateUrl:!1})}catch{}}}async function $s(){let t=Q();if(!t.v)return!1;let e=t.v,s=t.t;try{await R.ensureFullData()}catch{}let a=[];C.channelData?.combined&&a.push(C.channelData.combined),Object.values(C.channelData?.channels||{}).forEach(n=>{n&&a.push(n)});for(let n of a){let i=(n.streams||[]).find(l=>L(l.url)===e);if(i)return M(i,s),!0}try{let l=((await(await fetch("data/music.json")).json())?.videos||[]).find(u=>L(u.url)===e);if(l)return M({url:l.url,title:l.title,isMv:!0},s),!0}catch{}return M({url:`https://www.youtube.com/watch?v=${e}`,title:"",isMv:!0},s),!0}function Pe(t,e=0,s=""){let a=L(t);if(!a)return;if(ee()){window.open(kt(t,e),"_blank","noopener");return}{let c=r("#stream-viewer");if(c&&!c.hidden&&!O)if(X(c))gt();else{++N,c.hidden=!0,c._currentStream=null,p=null;let d=r("#sv-player-wrap");d&&(d.innerHTML=""),document.body.style.overflow="",P=null,ht={},V("idle"),dt(),H()}}oe(),ie();let n=r("#yt-player-container"),i=r("#yt-player-panel");if(!n||!i)return;nt();let l=r("#yt-mini-title");l&&(l.textContent=s||"\u30A4\u30F3\u30E9\u30A4\u30F3\u518D\u751F");let u=r("#yt-mini-hint");u&&(u.innerHTML=P?`${b("chevronUp")} \u30BF\u30C3\u30D7\u3057\u3066\u914D\u4FE1\u30D3\u30E5\u30FC\u30EF\u30FC\u3078\u623B\u308B`:""),i.classList.toggle("has-stream",!!P),i.hidden=!1,V("mini"),ce(()=>{let c=document.createElement("div");n.appendChild(c);try{y=new window.YT.Player(c,{videoId:a,width:"100%",height:"100%",playerVars:{autoplay:1,playsinline:1,rel:0,controls:0,disablekb:1,modestbranding:1,...e>0?{start:Math.floor(e)}:{}},events:{onReady:d=>{let o=z();try{d.target.setVolume(o)}catch{}if(et(r("#yt-mini-vol-slider"),r("#yt-mini-vol-btn"),null,o),e>5)try{d.target.seekTo(e,!0)}catch{}Ct()},onStateChange:d=>{let o=d.data===window.YT.PlayerState.PLAYING,v=r("#yt-mini-play");v&&v.setAttribute("data-playing",o?"1":"0")}}})}catch{let o=e>0?`&start=${Math.floor(e)}`:"";n.innerHTML=`<iframe src="https://www.youtube.com/embed/${a}?autoplay=1&playsinline=1${o}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`}})}function ie(){if(r("#yt-player-panel"))return;let t=document.createElement("div");t.id="yt-player-panel",t.hidden=!0,t.innerHTML=`
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
        <button class="vol-btn" id="yt-mini-vol-btn" type="button" aria-label="\u97F3\u91CF">${b("volume")}</button>
        <input class="vol-slider" id="yt-mini-vol-slider" type="range" min="0" max="100" value="100" aria-label="\u97F3\u91CF">
      </div>
      <button id="yt-player-close" type="button" class="yt-mini-close-btn" aria-label="\u9589\u3058\u308B">${b("close")}</button>
    </div>
  `,document.body.appendChild(t),r("#yt-player-close").addEventListener("click",()=>{t.hidden=!0,!gt()&&(nt(),P=null,V("idle"))}),r("#yt-mini-play").addEventListener("click",()=>{if(y)try{y.getPlayerState?.()===window.YT?.PlayerState?.PLAYING?y.pauseVideo():y.playVideo()}catch{}}),r("#yt-mini-restore").addEventListener("click",()=>{se()||P&&M(P,Le())}),r("#yt-mini-progress-bar").addEventListener("click",a=>{if(!y)return;let i=a.currentTarget.getBoundingClientRect(),l=Math.max(0,Math.min(1,(a.clientX-i.left)/i.width));try{let u=y.getDuration?.()||0;u>0&&y.seekTo(l*u,!0)}catch{}});let e=r("#yt-mini-vol-slider"),s=r("#yt-mini-vol-btn");if(e){let a=z();e.value=a,e.style.setProperty("--pct",`${a}%`),s&&(s.innerHTML=ot(a)),e.addEventListener("input",n=>{let i=parseInt(n.target.value);if(n.target.style.setProperty("--pct",`${i}%`),Et(i),s&&(s.innerHTML=ot(i)),y)try{y.setVolume(i)}catch{}})}if(s){let a=80;s.addEventListener("click",()=>{if(!e)return;let n=parseInt(e.value),i=n>0?0:a||80;n>0&&(a=n),et(e,s,y,i)})}}var re=!1,le=[];window.onYouTubeIframeAPIReady=()=>{re=!0,le.splice(0).forEach(t=>t()),import("./chunk-LTSXDMYX.js").then(t=>t.notifyYtReady()).catch(()=>{})};function oe(){if(document.getElementById("yt-iframe-api-script"))return;let t=document.createElement("script");t.id="yt-iframe-api-script",t.src="https://www.youtube.com/iframe_api",document.head.appendChild(t)}function ce(t){if(re&&window.YT?.Player){t();return}le.push(t)}var z=()=>Math.max(0,Math.min(100,parseInt(localStorage.getItem("ibaraVol")??"100")||100)),Et=t=>localStorage.setItem("ibaraVol",String(t)),ot=()=>b("volume");function et(t,e,s,a){if(t&&(t.value=a,t.style.setProperty("--pct",`${a}%`)),e&&(e.innerHTML=ot(a)),s)try{s.setVolume(a)}catch{}}var p=null,N=0,P=null,ct=0,Pt=0,O=!1,wt="timeline",ht={},q={},Tt=new Map,D=!1,U=!1,y=null,ft=null,bt=null,de="ibaraViewerSetlistCollapsed",B=!1;function At(){wt=C.activeTab||"timeline",V("embedded"),R.syncTabUi()}function dt(){let t=ht;ht={},R.activateTab(wt||"timeline",t)}function Ae(){O=!0,V("fullscreen");let t=r("#stream-viewer");if(!t)return;t.classList.add("sv-fullscreen"),document.body.classList.add("has-sv-fullscreen"),document.body.style.overflow="hidden";let e=r("#sv-close");e&&e.setAttribute("data-tooltip","\u901A\u5E38\u8868\u793A\u306B\u623B\u308B\uFF08Esc\uFF09");let s=r("#sv-fullscreen-btn");s&&s.setAttribute("aria-pressed","true")}function A(t){let e=Math.floor(t),s=Math.floor(e/3600),a=Math.floor(e%3600/60),n=e%60;return s>0?`${s}:${String(a).padStart(2,"0")}:${String(n).padStart(2,"0")}`:`${a}:${String(n).padStart(2,"0")}`}function ue(t){return`ibara-ts-${t.channel||""}-${t.index||""}`}function K(t){try{return JSON.parse(localStorage.getItem(ue(t))||"null")||{}}catch{return{}}}function Lt(t,e){try{localStorage.setItem(ue(t),JSON.stringify(e))}catch{}}var G=-1;function Ve(t,e,s,a){let n=e===a,i=s[e],l=q[e]||(t.t!=null?[{timeSeconds:t.t,note:null}]:[]),u=l[0]||null,c;u?c=`<button class="sv-cts-main" data-idx="${e}" data-action="cts-seek" data-cts-seconds="${u.timeSeconds}" title="\u3053\u306E\u66F2\u306E\u982D\uFF08${m(A(u.timeSeconds))}\uFF09\u3078\u79FB\u52D5">${m(A(u.timeSeconds))}</button>`:i!=null?c=`<button class="sv-ts-badge" data-idx="${e}" data-action="seek" title="\u81EA\u5206\u306E\u30E1\u30E2\uFF08${m(A(i))}\uFF09\u3078\u79FB\u52D5">${m(A(i))}</button>`:c='<span class="sv-cts-main is-empty" aria-hidden="true">\u2013</span>';let d=u&&i!=null?`<button class="sv-ts-badge is-memo" data-idx="${e}" data-action="seek" title="\u81EA\u5206\u306E\u30E1\u30E2\uFF08${m(A(i))}\uFF09\u3078\u79FB\u52D5">${m(A(i))}</button>`:"",o=i!=null?`<button class="sv-ts-del" data-idx="${e}" data-action="del-ts" aria-label="\u81EA\u5206\u306E\u30E1\u30E2\u3092\u524A\u9664">${b("close")}</button>`:"",v=l.slice(1).map(w=>`<button class="sv-cts-badge" data-idx="${e}" data-action="cts-seek" data-cts-seconds="${w.timeSeconds}" title="\u5225\u5019\u88DC: ${m(A(w.timeSeconds))}">${m(A(w.timeSeconds))}</button>`).join(""),f=v?`<div class="sv-cts-row">${v}</div>`:"";return`<div class="sv-song${n?" is-current":""}" data-idx="${e}">
    <span class="sv-song-num">${e+1}</span>
    <div class="sv-song-lead">${c}</div>
    <div class="sv-song-info">
      <span class="sv-song-title" title="${m(t.title)}">${m(t.title)}</span>
      <span class="sv-song-artist" title="${m(t.artist)}">${m(t.artist)}</span>
    </div>
    <div class="sv-song-actions">${d}${o}<button class="sv-ts-set" data-idx="${e}" data-action="set-ts" title="\u73FE\u5728\u306E\u518D\u751F\u6642\u523B\u3092\u81EA\u5206\u7528\u306B\u30E1\u30E2\u3059\u308B">${b("time")}</button><button class="sv-cts-propose" data-idx="${e}" data-action="cts-propose" type="button" title="\u3053\u306E\u66F2\u306E\u6B63\u3057\u3044\u958B\u59CB\u6642\u523B\u3092\u63D0\u6848\u3059\u308B" aria-label="\u958B\u59CB\u6642\u523B\u3092\u63D0\u6848">${b("plus")}</button></div>
    ${f}
  </div>`}async function qe(t){if(q={},!t?.channel||t?.index==null)return;let e=`${t.channel}:${t.index}`;if(Tt.has(e)){q=Tt.get(e)||{};let n=r("#stream-viewer");if(!n||n._currentStream!==t)return;let i=r("#sv-setlist");i&&tt(i,t.songs,K(t),G),Xt(t);return}try{let n=await zt(t.channel,t.index);if(!n)return;for(let i of n)q[i.songIndex]||(q[i.songIndex]=[]),q[i.songIndex].push({timeSeconds:i.timeSeconds,note:i.note??null});Tt.set(e,q)}catch{}let s=r("#stream-viewer");if(!s||s._currentStream!==t)return;let a=r("#sv-setlist");a&&tt(a,t.songs,K(t),G),Xt(t)}function He(t,e,s){r("#sv-cts-modal")?.remove();let a=p?.getCurrentTime?.()??0,n=A(Math.floor(a)),i=document.createElement("div");i.id="sv-cts-modal",i.className="sv-cts-modal-overlay",i.innerHTML=`
    <div class="sv-cts-modal-box" role="dialog" aria-modal="true" aria-label="\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u63D0\u6848">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u63D0\u6848</span>
        <button class="sv-cts-modal-close" type="button" aria-label="\u9589\u3058\u308B">${b("close")}</button>
      </div>
      <p class="sv-cts-modal-song">${m(s)}</p>
      <label class="sv-cts-modal-label">
        \u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\uFF08MM:SS \u307E\u305F\u306F H:MM:SS\uFF09
        <input class="sv-cts-modal-input" id="sv-cts-ts-input" type="text" value="${m(n)}" placeholder="0:00" autocomplete="off">
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
  `,document.body.appendChild(i);let l=()=>i.remove();i.querySelector(".sv-cts-modal-close").addEventListener("click",l),i.querySelector(".sv-cts-modal-cancel").addEventListener("click",l),i.addEventListener("click",u=>{u.target===i&&l()}),i.querySelector("#sv-cts-submit").addEventListener("click",async()=>{let u=i.querySelector("#sv-cts-ts-input").value.trim(),c=i.querySelector("#sv-cts-note-input").value.trim()||null,d=mt(u),o=i.querySelector("#sv-cts-status");if(d===null){o.textContent="\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\uFF08\u4F8B: 1:23 \u307E\u305F\u306F 1:23:45\uFF09",o.className="sv-cts-modal-status error",o.hidden=!1;return}let v=i.querySelector("#sv-cts-submit");v.disabled=!0,v.textContent="\u9001\u4FE1\u4E2D\u2026";try{let f=await St(t.channel,t.index,{songIndex:e,timeSeconds:d,submitterNote:c});f.ok?(o.textContent="\u63D0\u6848\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F\uFF01\u5BE9\u67FB\u5F8C\u306B\u516C\u958B\u3055\u308C\u307E\u3059\u3002",o.className="sv-cts-modal-status success",o.hidden=!1,v.hidden=!0,i.querySelector(".sv-cts-modal-cancel").textContent="\u9589\u3058\u308B"):(o.textContent=`\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${f.error}`,o.className="sv-cts-modal-status error",o.hidden=!1,v.disabled=!1,v.textContent="\u63D0\u6848\u3059\u308B")}catch(f){o.textContent=`\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${f.message}`,o.className="sv-cts-modal-status error",o.hidden=!1,v.disabled=!1,v.textContent="\u63D0\u6848\u3059\u308B"}}),setTimeout(()=>i.querySelector("#sv-cts-ts-input")?.focus(),50),document.addEventListener("keydown",function u(c){c.key==="Escape"&&(l(),document.removeEventListener("keydown",u))})}function Xt(t){let e=r("#sv-cts-bulk-btn");if(!e||!t?.songs?.length)return;let a=Object.keys(q).length>=t.songs.length;e.textContent=a?"\u4FEE\u6B63\u7533\u8ACB":"\u30BB\u30C8\u30EA\u767B\u9332",e.hidden=!1}function Ne(t){r("#sv-bulk-modal")?.remove();let e=K(t),n=Object.keys(q).length>=t.songs.length,i=t.songs.map((c,d)=>{let o=e[d]!=null?A(e[d]):"",v=q[d]?.[0]?.timeSeconds!=null?A(q[d][0].timeSeconds):"",f=o||v;return`
      <div class="sv-bulk-row" data-idx="${d}">
        <span class="sv-bulk-num">${d+1}</span>
        <span class="sv-bulk-title" title="${m(c.title)}">${m(c.title)}</span>
        <input class="sv-bulk-ts-input" type="text" value="${m(f)}"
          placeholder="0:00" autocomplete="off" data-bulk-ts-idx="${d}">
        <button class="sv-bulk-ts-now" type="button" title="\u73FE\u5728\u6642\u523B\u3092\u5165\u529B" data-bulk-now="${d}">${b("time")}</button>
      </div>`}).join(""),l=document.createElement("div");l.id="sv-bulk-modal",l.className="sv-cts-modal-overlay",l.innerHTML=`
    <div class="sv-cts-modal-box sv-bulk-modal-box" role="dialog" aria-modal="true"
      aria-label="${n?"\u4FEE\u6B63\u7533\u8ACB":"\u30BB\u30C8\u30EA\u767B\u9332"}">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">${n?"\u4FEE\u6B63\u7533\u8ACB":"\u30BB\u30C8\u30EA\u767B\u9332"}</span>
        <button class="sv-cts-modal-close" type="button" aria-label="\u9589\u3058\u308B">${b("close")}</button>
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
  `,document.body.appendChild(l);let u=()=>l.remove();l.querySelector(".sv-cts-modal-close").addEventListener("click",u),l.querySelector(".sv-cts-modal-cancel").addEventListener("click",u),l.addEventListener("click",c=>{c.target===l&&u()}),l.querySelector(".sv-paste-apply").addEventListener("click",()=>{let d=(l.querySelector(".sv-paste-textarea")?.value||"").split(`
`).map(f=>f.trim()).filter(Boolean),o=0;for(let f of d){let w=Qt(f);if(!w)continue;let _=Wt(w.title,w.artist,t.songs);if(_>=0){let $=l.querySelector(`[data-bulk-ts-idx="${_}"]`);$&&($.value=w.start,o++)}}let v=l.querySelector(".sv-paste-result");v&&(v.textContent=o>0?`${d.length}\u884C\u3092\u89E3\u6790 \u2192 ${o}\u66F2\u306B\u5165\u529B\u3057\u307E\u3057\u305F`:"\u4E00\u81F4\u3059\u308B\u66F2\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F",v.hidden=!1)}),l.querySelector(".sv-bulk-rows").addEventListener("click",c=>{let d=c.target.closest("[data-bulk-now]");if(!d)return;let o=parseInt(d.dataset.bulkNow,10),v=p?.getCurrentTime?.();if(v!=null){let f=l.querySelector(`[data-bulk-ts-idx="${o}"]`);f&&(f.value=A(Math.floor(v)))}}),l.querySelector("#sv-bulk-submit").addEventListener("click",async()=>{let c=l.querySelector("#sv-bulk-note").value.trim()||null,d=l.querySelector("#sv-bulk-status"),o=l.querySelector("#sv-bulk-submit"),v=[];if(l.querySelectorAll("[data-bulk-ts-idx]").forEach(_=>{let $=parseInt(_.dataset.bulkTsIdx,10),g=mt(_.value.trim());g!==null&&v.push({songIndex:$,timeSeconds:g})}),!v.length){d.textContent="\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u304C1\u3064\u3082\u5165\u529B\u3055\u308C\u3066\u3044\u307E\u305B\u3093",d.className="sv-cts-modal-status error",d.hidden=!1;return}o.disabled=!0,o.textContent=`\u7533\u8ACB\u4E2D\u2026 (0/${v.length})`,d.hidden=!0;let f=0,w=0;await Promise.all(v.map(async _=>{try{(await St(t.channel,t.index,{songIndex:_.songIndex,timeSeconds:_.timeSeconds,submitterNote:c})).ok?f++:w++}catch{w++}o.textContent=`\u7533\u8ACB\u4E2D\u2026 (${f+w}/${v.length})`})),w===0?(d.textContent=`${f}\u66F2\u5206\u306E\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u7533\u8ACB\u3057\u307E\u3057\u305F\uFF01\u5BE9\u67FB\u5F8C\u306B\u516C\u958B\u3055\u308C\u307E\u3059\u3002`,d.className="sv-cts-modal-status success",o.hidden=!0,l.querySelector(".sv-cts-modal-cancel").textContent="\u9589\u3058\u308B"):(d.textContent=`${f}\u4EF6\u6210\u529F / ${w}\u4EF6\u5931\u6557\u3002\u5931\u6557\u5206\u3092\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002`,d.className="sv-cts-modal-status error",o.disabled=!1,o.textContent="\u4E00\u62EC\u7533\u8ACB\u3059\u308B"),d.hidden=!1}),document.addEventListener("keydown",function c(d){d.key==="Escape"&&(u(),document.removeEventListener("keydown",c))})}var Vt="ibaraViewerQueueCollapsed",S=null,ut=!1;function st(t){let e=S,s=e?.items?.[t];if(s){e.idx=t,ut=!0;try{s.kind==="mv"?M({url:s.video.url,title:s.video.title,isMv:!0}):M(s.stream)}finally{ut=!1}}}function Re(t){t?.items?.length&&(S={name:t.name||"\u30DE\u30A4\u30EA\u30B9\u30C8",items:t.items,idx:0,repeat:localStorage.getItem("ibaraListRepeat")==="1",collapsed:localStorage.getItem(Vt)==="1"},st(Math.max(0,Math.min(t.idx||0,t.items.length-1))))}function xs(t,e=0,s=0){if(!t?.length)return!1;let a=t.filter(i=>i?.url).map((i,l)=>i._stream?{kind:"stream",key:i._stream.url||`stream:${l}`,stream:i._stream}:{kind:"mv",key:`mv:${L(i.url)||l}`,video:{...i,isMv:!0}});if(!a.length)return!1;S={name:"\u97F3\u697D\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u30AD\u30E5\u30FC",items:a,idx:Math.max(0,Math.min(e,a.length-1)),repeat:localStorage.getItem("ibaraListRepeat")==="1",collapsed:localStorage.getItem(Vt)==="1"};let n=S.items[S.idx];ut=!0;try{n.kind==="mv"?M({...n.video,isMv:!0},s):M(n.stream,s)}finally{ut=!1}return!0}function qt(){let t=S;if(!t?.items?.length)return"";let e=t.items[t.idx],s=e?.kind==="mv"?e.video?.title||"\u52D5\u753B":e?.stream?.title||"\u914D\u4FE1";return`
    <div class="sv-bp-section sv-queue-section${t.collapsed?" is-collapsed":""}">
      <div class="sv-bp-sh sv-queue-head">${b("playlist")} ${m(t.name)}
        <span class="sv-bp-sh-sub">\uFF08${t.idx+1} / ${t.items.length}\uFF09</span>
        <span class="sv-queue-current">${m(s)}</span>
        <button class="sv-queue-toggle" type="button"
          data-svq-action="toggle" aria-expanded="${!t.collapsed}"
          title="${t.collapsed?"\u30AD\u30E5\u30FC\u3092\u958B\u304F":"\u30AD\u30E5\u30FC\u3092\u9589\u3058\u308B"}">${t.collapsed?"\u958B\u304F":"\u9589\u3058\u308B"}</button>
        <button class="sv-queue-repeat${t.repeat?" is-on":""}" type="button"
          data-svq-action="repeat" aria-pressed="${t.repeat}"
          title="\u30EA\u30B9\u30C8\u30EA\u30D4\u30FC\u30C8\uFF08ON: \u6700\u5F8C\u307E\u3067\u518D\u751F\u3057\u305F\u3089\u5148\u982D\u3078\u623B\u308B\uFF09">${b("repeat")} \u30EA\u30D4\u30FC\u30C8</button>
      </div>
      <div class="sv-queue-list">
        ${t.items.map((a,n)=>{let i=a.kind==="mv"?a.video?.title||"\u52D5\u753B":a.stream?.title||"\u914D\u4FE1",l=a.kind==="mv"?b("video"):b("calendar"),u=a.kind==="mv"?"\u52D5\u753B":`${F(a.stream?.date)}\u3000\u7B2C${a.stream?.index}\u67A0`;return`<button class="sv-queue-row${n===t.idx?" is-current":""}" type="button"
            data-svq-action="jump" data-svq-idx="${n}">
            <span class="sv-queue-num">${n+1}</span>
            <span class="sv-queue-title">${m(i)}</span>
            <span class="sv-queue-meta">${l} ${m(u)}</span>
          </button>`}).join("")}
      </div>
    </div>`}function ve(t){let e=t.target.closest("[data-svq-action]");if(!e||!S)return!1;if(e.dataset.svqAction==="jump"){let s=parseInt(e.dataset.svqIdx,10);return!Number.isNaN(s)&&s!==S.idx&&st(s),!0}if(e.dataset.svqAction==="repeat"){S.repeat=!S.repeat;try{localStorage.setItem("ibaraListRepeat",S.repeat?"1":"0")}catch{}return e.classList.toggle("is-on",S.repeat),e.setAttribute("aria-pressed",String(S.repeat)),!0}if(e.dataset.svqAction==="toggle"){S.collapsed=!S.collapsed;try{localStorage.setItem(Vt,S.collapsed?"1":"0")}catch{}let s=e.closest(".sv-queue-section");return s&&(s.outerHTML=qt()),Ht(r("#sv-below-player")),!0}return!1}function Ht(t){if(S?.collapsed)return;let e=t?.querySelector?.(".sv-queue-list"),s=e?.querySelector(".sv-queue-row.is-current");e&&s&&(e.scrollTop=Math.max(0,s.offsetTop-e.clientHeight/2))}function pe(){let t=C.data?.streams||[],s=r("#stream-viewer")?._currentStream;if(!s)return;let a=t.findIndex(n=>n.channel===s.channel&&n.index===s.index);a<0||a>=t.length-1||M(t[a+1])}async function me(t){let e=await Nt(),s=L(t?.url);if(!s||!e.length)return;let a=e.findIndex(i=>L(i.url)===s);if(a<0||a>=e.length-1)return;let n=e[a+1];M({...n,isMv:!0})}async function Ye(t){let e=await Nt(),s=L(t?.url);if(!s||!e.length)return;let a=e.findIndex(n=>L(n.url)===s);a<=0||M({...e[a-1],isMv:!0})}function fe(t){if(!t||X(t))return;let e=p||y;if(U&&e){try{e.seekTo(0,!0),e.playVideo()}catch{}return}if(S?.items?.length){let a=S;a.idx<a.items.length-1?st(a.idx+1):a.repeat&&st(0);return}if(!D)return;let s=t._currentStream;s?.isMv?me(s):pe()}function J(){bt&&(clearInterval(bt),bt=null)}function Be(t,e){J();let s=!1;bt=setInterval(()=>{if(t!==N||e.hidden||!p){J();return}try{let a=p.getPlayerState?.();a===window.YT?.PlayerState?.ENDED?(s||fe(e),s=!0):a===window.YT?.PlayerState?.PLAYING&&(s=!1);let n=p.getCurrentTime?.()??0,i=e._currentStream;if(i?.songs?.length){let l=K(i),u=-1;for(let c=0;c<i.songs.length;c++)l[c]!=null&&n>=l[c]&&(u=c);u!==G&&(G=u,De(u))}}catch{}},700)}function De(t){let e=r("#sv-setlist");if(!e)return;e.querySelectorAll(".sv-song").forEach((a,n)=>a.classList.toggle("is-current",n===t))}function be(t){B=!!t;try{localStorage.setItem(de,B?"1":"0")}catch{}let e=r("#stream-viewer .sv-panel"),s=r("#sv-setlist-toggle");e&&e.classList.toggle("is-setlist-collapsed",B),s&&(s.textContent=B?"\u958B\u304F":"\u7573\u3080",s.setAttribute("data-tooltip",B?"\u30BB\u30C3\u30C8\u30EA\u30B9\u30C8\u3092\u958B\u304F":"\u30BB\u30C3\u30C8\u30EA\u30B9\u30C8\u3092\u6298\u308A\u305F\u305F\u3080"),s.setAttribute("aria-expanded",String(!B)))}function Ue(){try{B=localStorage.getItem(de)==="1"}catch{}be(B)}function Oe(){let t=C.data?.streams||[],s=r("#stream-viewer")?._currentStream;if(!s)return;let a=t.findIndex(n=>n.channel===s.channel&&n.index===s.index);a<=0||M(t[a-1])}function he(){let t=p||y;if(t)try{t.getPlayerState?.()===window.YT?.PlayerState?.PLAYING?t.pauseVideo?.():t.playVideo?.()}catch{}}function yt(t){Bt('.sv-bp-control-btn[data-bp-action="toggle-play"]').forEach(e=>{e.innerHTML=t?b("pause"):b("play"),e.setAttribute("data-tooltip",t?"\u4E00\u6642\u505C\u6B62":"\u518D\u751F"),e.setAttribute("aria-label",t?"\u4E00\u6642\u505C\u6B62":"\u518D\u751F"),e.setAttribute("aria-pressed",String(t))})}function ye(){return'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>'}function ge(t){return Ot().some(e=>(e.streams||[]).includes(t))}function we(t,e,s){import("./chunk-QVQWP433.js").then(a=>{a.showAddToPlaylistModal(t,e,{onChange:n=>{s?.classList.toggle("is-saved",!!n),s?.setAttribute("aria-pressed",String(!!n)),s&&s.setAttribute("data-tooltip",n?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58")}})}).catch(()=>{})}function je(t){return t.length?t.map(e=>{let s=Ut(e.stream.url)||it(e.stream.url);return`<button class="sv-side-rel-card" type="button" data-bp-action="open-stream" data-bp-channel="${m(e.stream.channel)}" data-bp-index="${e.stream.index}">
      ${s?`<img class="sv-side-rel-thumb" src="${m(s)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<span class="sv-side-rel-thumb sv-side-rel-thumb--empty"></span>'}
      <span class="sv-side-rel-body">
        <span class="sv-side-rel-title">${m(e.stream.title||"\u914D\u4FE1")}</span>
        <span class="sv-side-rel-meta">${F(e.stream.date)} / ${e.overlap}\u66F2\u4E00\u81F4</span>
        <span class="sv-side-rel-songs">${e.sharedSongs.map(a=>m(a)).join("\u3001")}</span>
      </span>
    </button>`}).join(""):'<div class="sv-side-empty">\u540C\u3058\u66F2\u3092\u6B4C\u3063\u305F\u914D\u4FE1\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093</div>'}function Fe(t){let e=r("#sv-side-related");e&&(e.innerHTML=`
    <div class="sv-side-related-head">
      <span>\u95A2\u9023\u914D\u4FE1</span>
      <span>${t.length?`${t.length}\u4EF6`:""}</span>
    </div>
    <div class="sv-side-related-list">${je(t)}</div>
  `)}function $e(t){return/縦型|たて配信|タテ|#?shorts|ショート|vertical/i.test(t?.title||"")||/\/shorts\//.test(t?.url||"")}function Zt(t,e){if(!t)return`<div class="sv-bp-nav-card sv-bp-nav-empty">${m(e==="newer"?"\u6700\u65B0\u914D\u4FE1":"\u6700\u521D\u306E\u914D\u4FE1")}</div>`;let s=it(t.url),a=e==="newer"?"\u65B0\u3057\u3044\u914D\u4FE1 \u2192":"\u2190 \u53E4\u3044\u914D\u4FE1";return`<button class="sv-bp-nav-card ${$e(t)?"sv-bp-nav-card--portrait":"sv-bp-nav-card--landscape"}" type="button" data-bp-action="open-stream" data-bp-channel="${m(t.channel)}" data-bp-index="${t.index}">
    <div class="sv-bp-nav-dir">${m(a)}</div>
    ${s?`<img class="sv-bp-nav-thumb" src="${m(s)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="sv-bp-nav-thumb sv-bp-nav-thumb--empty"></div>'}
    <div class="sv-bp-nav-info">
      <div class="sv-bp-nav-title">${m(t.title||"\u914D\u4FE1")}</div>
      <div class="sv-bp-nav-meta">${F(t.date)}\u3000${t.songs.length}\u66F2</div>
    </div>
  </button>`}function Ge(t){let e=r("#sv-below-player");if(!e)return;let s=C.data?.streams||[],a=s.findIndex(o=>o.channel===t.channel&&o.index===t.index),n=a>=0&&a<s.length-1?s[a+1]:null,i=a>0?s[a-1]:null,l=new Set(t.songs.map(o=>o.title)),u=s.filter((o,v)=>v!==a).map(o=>{let v=o.songs.filter(f=>l.has(f.title));return{stream:o,overlap:v.length,sharedSongs:v.slice(0,3).map(f=>f.title)}}).filter(o=>o.overlap>0).sort((o,v)=>v.overlap-o.overlap).slice(0,8),c=Dt(t),d=ge(c);e.innerHTML=`
    <div class="sv-bp-wrap">
      ${qt()}

      <!-- \u64CD\u4F5C + \u524D\u5F8C\u30CA\u30D3 -->
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-control-bar">
          <button class="sv-bp-control-btn" type="button" data-bp-action="prev-stream"
            ${i?"":"disabled"} data-tooltip="\u524D\u306E\u914D\u4FE1" aria-label="\u524D\u306E\u914D\u4FE1">${b("previous")}</button>
          <button class="sv-bp-control-btn sv-bp-control-btn--play" type="button" data-bp-action="toggle-play"
            data-tooltip="\u518D\u751F / \u4E00\u6642\u505C\u6B62" aria-label="\u518D\u751F / \u4E00\u6642\u505C\u6B62">${b("play")}</button>
          <button class="sv-bp-control-btn" type="button" data-bp-action="next-stream"
            ${n?"":"disabled"} data-tooltip="\u6B21\u306E\u914D\u4FE1" aria-label="\u6B21\u306E\u914D\u4FE1">${b("next")}</button>
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${D?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${D?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u9023\u7D9A\u518D\u751F
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${U?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${U?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u30EA\u30D4\u30FC\u30C8
          </label>
          <button class="sv-bp-control-btn sv-bp-bookmark-btn${d?" is-saved":""}" type="button"
            data-bp-action="bookmark-stream" aria-pressed="${d}" data-tooltip="${d?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58"}"
            aria-label="${d?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58"}">${ye()}</button>
        </div>
        <div class="sv-bp-next-hint">
          ${n?`\u6B21\uFF1A${m(n.title||"\u6B21\u306E\u914D\u4FE1")}`:"\u6700\u5F8C\u306E\u914D\u4FE1\u3067\u3059"}
        </div>
        <div class="sv-bp-nav-cards">
          ${Zt(i,"newer")}
          ${Zt(n,"older")}
        </div>
        <div class="sv-bp-info-compact">
          <span>${F(t.date)}</span>
          <span>\u7B2C${t.index}\u67A0</span>
          <span>${t.songs.length}\u66F2</span>
        </div>
      </div>

    </div>
  `,Fe(u),e.onchange=o=>{let v=o.target.closest("#sv-ap-check"),f=o.target.closest("#sv-repeat-check");if(v){D=v.checked;let w=v.closest(".sv-bp-ap-switch");w&&w.classList.toggle("sv-bp-ap-switch--on",D)}if(f){U=f.checked;let w=f.closest(".sv-bp-ap-switch");w&&w.classList.toggle("sv-bp-ap-switch--on",U)}},e.onclick=o=>{if(ve(o))return;let v=o.target.closest("[data-bp-action]");if(!v)return;let f=v.dataset.bpAction;if(f==="open-stream"){let w=v.dataset.bpChannel,_=parseInt(v.dataset.bpIndex,10),$=(C.data?.streams||[]).find(g=>g.channel===w&&g.index===_);$&&M($)}else f==="prev-stream"?Oe():f==="next-stream"?pe():f==="toggle-play"?he():f==="bookmark-stream"&&we(c,t.title||"\u914D\u4FE1",v)},Ht(e);try{let o=(p||y)?.getPlayerState?.()===window.YT?.PlayerState?.PLAYING;yt(o)}catch{}}var lt=null;async function Nt(){if(lt)return lt;try{lt=(await(await fetch("data/music.json")).json())?.videos||[]}catch{lt=[]}return lt}function Qe(t){let e=String(t||"");return e=e.replace(/【[^】]*】/g," "),e=e.replace(/^\s*MV[⌇|｜♪♬:：\-\s]*/i," "),e=e.split(/[\/／|｜]/)[0],e=e.replace(/歌ってみた|covered?\s*(by.*)?$/gi," "),e.trim()}async function We(t){let e=r("#sv-below-player");if(!e)return;try{await R.ensureFullData()}catch{}let s=await Nt();if(r("#stream-viewer")?._currentStream!==t)return;let a=C.channelData?.combined?.streams||C.data?.streams||[],n=Y(Qe(t.title)),i=[];if(n.length>1)for(let h of a){let x=(h.songs||[]).find(E=>{let I=Y(E.title);return I===n||I.length>1&&(I.includes(n)||n.includes(I))});x&&i.push({stream:h,songTitle:x.title})}let l=i.slice(0,8),u={original:"\u30AA\u30EA\u30B8\u30CA\u30EB",office:"Re:AcT",character:"\u30AD\u30E3\u30E9\u30BD\u30F3",cover:"\u30AB\u30D0\u30FC"},c=s.find(h=>h.url===t.url),d=s.filter(h=>h.url!==t.url).sort((h,x)=>{let E=c&&h.type===c.type?1:0,I=c&&x.type===c.type?1:0;return E!==I?I-E:(x.publishedAt||"").localeCompare(h.publishedAt||"")}).slice(0,12),o=s.findIndex(h=>L(h.url)===L(t.url)),v=o>=0&&o<s.length-1?s[o+1]:null,f=o>0?s[o-1]:null,w=c||s.find(h=>L(h.url)===L(t.url)),_=w?"mv:"+w.id:"",$=_?ge(_):!1,g=S,k=!!g?.items?.length,j=k&&g.idx>0||!!f,at=k&&g.idx<g.items.length-1||!!v;e.innerHTML=`
    <div class="sv-bp-wrap">
      ${qt()}
      <!-- \u64CD\u4F5C\uFF08\u6B4C\u67A0\u30D3\u30E5\u30FC\u30EF\u30FC\u3068\u540C\u3058: \u524D\u3078 / \u518D\u751F\u505C\u6B62 / \u6B21\u3078 / \u9023\u7D9A\u518D\u751F / \u30EA\u30D4\u30FC\u30C8 / \u681E\uFF09-->
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-control-bar">
          <button class="sv-bp-control-btn" type="button" data-mv-action="mv-prev"
            ${j?"":"disabled"} data-tooltip="\u524D\u306E\u52D5\u753B" aria-label="\u524D\u306E\u52D5\u753B">${b("previous")}</button>
          <button class="sv-bp-control-btn sv-bp-control-btn--play" type="button" data-mv-action="toggle-play"
            data-tooltip="\u518D\u751F / \u4E00\u6642\u505C\u6B62" aria-label="\u518D\u751F / \u4E00\u6642\u505C\u6B62">${b("play")}</button>
          <button class="sv-bp-control-btn" type="button" data-mv-action="mv-next"
            ${at?"":"disabled"} data-tooltip="\u6B21\u306E\u52D5\u753B" aria-label="\u6B21\u306E\u52D5\u753B">${b("next")}</button>
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${D?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${D?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u9023\u7D9A\u518D\u751F
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${U?" sv-bp-ap-switch--on":""}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${U?" checked":""}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            \u30EA\u30D4\u30FC\u30C8
          </label>
          <button class="sv-bp-control-btn sv-bp-bookmark-btn${$?" is-saved":""}" type="button"
            data-mv-action="bookmark-mv" data-mv-key="${m(_)}" aria-pressed="${$}"
            data-tooltip="${$?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58"}"
            aria-label="${$?"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u6E08\u307F":"\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58"}">${ye()}</button>
        </div>
        <div class="sv-bp-next-hint">
          ${v?`\u6B21\uFF1A${m(v.title||"\u6B21\u306E\u52D5\u753B")}`:'<span class="sv-bp-ap-hint--end">\uFF08\u6700\u5F8C\u306E\u52D5\u753B\uFF09</span>'}
        </div>
      </div>
      ${l.length?`
      <div class="sv-bp-section">
        <div class="sv-bp-sh">${b("mic")} \u3053\u306E\u66F2\u304C\u6B4C\u308F\u308C\u305F\u6B4C\u67A0 <span class="sv-bp-sh-sub">\uFF08\u5168${i.length}\u56DE\uFF09</span></div>
        <div class="sv-bp-related-list">
          ${l.map(h=>{let x=it(h.stream.url);return`<button class="sv-bp-rel-card" type="button" data-mv-action="open-stream" data-mv-channel="${m(h.stream.channel)}" data-mv-index="${h.stream.index}">
              ${x?`<img class="sv-bp-rel-thumb" src="${m(x)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="sv-bp-rel-thumb sv-bp-rel-thumb--empty"></div>'}
              <div class="sv-bp-rel-info">
                <div class="sv-bp-rel-title">${m(h.stream.title||"\u914D\u4FE1")}</div>
                <div class="sv-bp-rel-meta">${F(h.stream.date)}\u3000\u7B2C${h.stream.index}\u67A0</div>
                <div class="sv-bp-rel-songs">${b("music")} ${m(h.songTitle)}</div>
              </div>
            </button>`}).join("")}
        </div>
      </div>
      `:""}

      ${d.length?`
      <div class="sv-bp-section">
        <div class="sv-bp-sh">${b("video")} \u307B\u304B\u306E\u52D5\u753B <button class="sv-mv-all-btn" type="button" data-mv-action="all-videos">\u3059\u3079\u3066\u898B\u308B \u2192</button></div>
        <div class="sv-mv-grid">
          ${d.map(h=>{let x=it(h.url);return`<button class="sv-mv-card" type="button" data-mv-action="open-mv" data-mv-url="${m(h.url)}" data-mv-title="${m(h.title)}">
              ${x?`<img class="sv-mv-card-thumb" src="${m(x)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="sv-mv-card-thumb"></div>'}
              <div class="sv-mv-card-body">
                <div class="sv-mv-card-title">${m(h.title)}</div>
                <div class="sv-mv-card-type">${u[h.type]||"\u30AA\u30EA\u30B8\u30CA\u30EB"}</div>
              </div>
            </button>`}).join("")}
        </div>
      </div>
      `:""}
    </div>
  `,e.onchange=h=>{let x=h.target.closest("#sv-ap-check"),E=h.target.closest("#sv-repeat-check");if(x){D=x.checked;let I=x.closest(".sv-bp-ap-switch");I&&I.classList.toggle("sv-bp-ap-switch--on",D)}if(E){U=E.checked;let I=E.closest(".sv-bp-ap-switch");I&&I.classList.toggle("sv-bp-ap-switch--on",U)}},e.onclick=h=>{if(ve(h))return;let x=h.target.closest("[data-mv-action]");if(!x)return;let E=x.dataset.mvAction;if(E==="open-stream"){let I=x.dataset.mvChannel,xe=parseInt(x.dataset.mvIndex,10),Rt=(C.channelData?.combined?.streams||C.data?.streams||[]).find(Yt=>Yt.channel===I&&Yt.index===xe);Rt&&M(Rt)}else E==="open-mv"?M({url:x.dataset.mvUrl,title:x.dataset.mvTitle,isMv:!0}):E==="all-videos"?R.activateTab("playlists"):E==="toggle-play"?he():E==="mv-prev"?k&&g.idx>0?st(g.idx-1):Ye(t):E==="mv-next"?k&&g.idx<g.items.length-1?st(g.idx+1):me(t):E==="bookmark-mv"&&we(x.dataset.mvKey,t.title||"\u52D5\u753B",x)},Ht(e);try{let h=(p||y)?.getPlayerState?.()===window.YT?.PlayerState?.PLAYING;yt(h)}catch{}}function tt(t,e,s,a){t.innerHTML=e.map((n,i)=>Ve(n,i,s,a)).join("")}function ze(){if(r("#stream-viewer"))return;let t=r("#panel-player");if(!t)return;let e=document.createElement("div");e.id="stream-viewer",e.hidden=!0,e.setAttribute("aria-label","\u914D\u4FE1\u30D7\u30EC\u30A4\u30E4\u30FC"),e.innerHTML=`
    <div class="sv-container">
      <div class="sv-header">
        <button class="sv-close-btn" id="sv-close" type="button" data-tooltip="\u30DF\u30CB\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u518D\u751F\u3092\u7D9A\u3051\u306A\u304C\u3089\u623B\u308A\u307E\u3059\uFF08Esc\uFF09">
          ${b("arrowLeft")} <span class="sv-close-label">\u623B\u308B</span><span class="sv-esc-hint">Esc</span>
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
          data-tooltip="\u5927\u753B\u9762\u3067\u518D\u751F" aria-label="\u5927\u753B\u9762\u3067\u518D\u751F" aria-pressed="false">${b("external")}</button>
        <div class="sv-volume-wrap">
          <button class="vol-btn" id="sv-vol-btn" type="button" aria-label="\u97F3\u91CF">${b("volume")}</button>
          <input class="vol-slider" id="sv-vol-slider" type="range" min="0" max="100" value="100" aria-label="\u97F3\u91CF">
        </div>
        <button class="sv-music-btn" id="sv-music-btn" type="button" data-tooltip="\u73FE\u5728\u4F4D\u7F6E\u304B\u3089\u97F3\u697D\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u8074\u304F">
          <span class="sv-music-icon">${b("music")}</span><span class="sv-music-label">\u97F3\u697D\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u8074\u304F</span>
        </button>
        <button class="sv-share-btn" id="sv-share-btn" type="button" data-tooltip="\u3053\u306E\u52D5\u753B\u306E\u5171\u6709\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC">
          <span class="sv-share-icon">${b("link")}</span><span class="sv-share-label">\u5171\u6709</span>
        </button>
        <a class="sv-yt-link" id="sv-yt-link" href="#" target="_blank" rel="noopener" data-tooltip="YouTube\u3067\u958B\u304F">
          <span class="sv-yt-icon">${b("external")}</span><span class="sv-yt-label">YouTube\u3067\u958B\u304F</span>
        </a>
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
              <button class="sv-setlist-toggle" id="sv-setlist-toggle" type="button" aria-expanded="true">\u7573\u3080</button>
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
      <div class="sv-panel-hint">${b("time")} \u3067\u73FE\u5728\u6642\u523B\u3092\u30E1\u30E2 \uFF0F \u30D0\u30C3\u30B8\u3092\u30BF\u30C3\u30D7\u3067\u79FB\u52D5</div>
          <div class="sv-setlist" id="sv-setlist"></div>
          <div class="sv-side-related" id="sv-side-related"></div>
        </div>
      </div>
    </div>
  `,t.appendChild(e),r("#sv-close").addEventListener("click",()=>te()),r("#sv-share-btn").addEventListener("click",Ie),r("#sv-music-btn").addEventListener("click",Ee),r("#sv-fullscreen-btn").addEventListener("click",Ae),r("#sv-setlist-toggle")?.addEventListener("click",()=>be(!B)),r("#sv-side-related")?.addEventListener("click",n=>{let i=n.target.closest('[data-bp-action="open-stream"]');if(!i)return;let l=i.dataset.bpChannel,u=parseInt(i.dataset.bpIndex,10),c=(C.data?.streams||[]).find(d=>d.channel===l&&d.index===u);c&&M(c)});let s=r("#sv-vol-slider"),a=r("#sv-vol-btn");if(s){let n=z();s.value=n,s.style.setProperty("--pct",`${n}%`),a&&(a.innerHTML=ot(n)),s.addEventListener("input",i=>{let l=parseInt(i.target.value);if(i.target.style.setProperty("--pct",`${l}%`),Et(l),a&&(a.innerHTML=ot(l)),p)try{p.setVolume(l)}catch{}})}if(a){let n=80;a.addEventListener("click",()=>{if(!s)return;let i=parseInt(s.value),l=i>0?0:n||80;i>0&&(n=i),et(s,a,p,l),Et(l)})}e.querySelectorAll("[data-bc-tab]").forEach(n=>{n.addEventListener("click",()=>{n.dataset.dashboardSection||(wt=n.dataset.bcTab,te())})}),r("#sv-import-toggle").addEventListener("click",()=>{let n=r("#sv-import-area");n&&(n.hidden=!n.hidden,n.hidden||r("#sv-import-input")?.focus())}),r("#sv-import-cancel").addEventListener("click",()=>{let n=r("#sv-import-area");n&&(n.hidden=!0);let i=r("#sv-import-input");i&&(i.value="")}),r("#sv-import-apply").addEventListener("click",()=>{let n=e._currentStream;if(!n)return;let i=r("#sv-import-input");if(!i)return;let u=i.value.split(`
`).map(o=>mt(o)).filter(o=>o!==null);if(!u.length)return;let c=K(n);u.forEach((o,v)=>{v<n.songs.length&&(c[v]=o)}),Lt(n,c),tt(r("#sv-setlist"),n.songs,c,G);let d=r("#sv-import-area");d&&(d.hidden=!0),i.value=""}),r("#sv-cts-bulk-btn").addEventListener("click",()=>{let n=e._currentStream;n&&Ne(n)}),r("#sv-setlist").addEventListener("click",n=>{let i=n.target.closest("[data-action]");if(!i)return;let l=parseInt(i.dataset.idx,10),u=e._currentStream;if(!u)return;let c=K(u);if(i.dataset.action==="seek"){if(c[l]!=null&&p?.seekTo){p.seekTo(c[l],!0);try{p.playVideo()}catch{}}}else if(i.dataset.action==="set-ts"){let d=p?.getCurrentTime?.();d!=null&&(c[l]=Math.floor(d),Lt(u,c),tt(r("#sv-setlist"),u.songs,c,G))}else if(i.dataset.action==="del-ts")delete c[l],Lt(u,c),tt(r("#sv-setlist"),u.songs,c,G);else if(i.dataset.action==="cts-seek"){let d=Number(i.dataset.ctsSeconds);if(!isNaN(d)&&p?.seekTo){p.seekTo(d,!0);try{p.playVideo()}catch{}}}else if(i.dataset.action==="cts-propose"){let d=u.songs[l];He(u,l,d?.title||`\u66F2 ${l+1}`)}})}function M(t,e=0){if(!t?.url)return;let s=L(t.url);if(!s){Pe(t.url);return}if(ee()){window.open(kt(t.url,e),"_blank","noopener");return}ze(),oe(),J(),ut||(S=null);let a=r("#stream-viewer");if(X(a)){if(a._currentStream?.url===t.url){if(!se()&&!W?.restoreExternalPlayer?.()&&ne(),e>0)try{p?.seekTo(Math.floor(e),!0),p?.playVideo()}catch{}return}gt()}let n=W?.takeOverVideo?.(t.url)||null;n||(W?.releaseVideo||W?.pause)?.();let i=r("#yt-player-panel");if(i&&!i.hidden){try{y?.pauseVideo()}catch{}i.hidden=!0,nt()}if(P=null,O){O=!1;let g=r("#stream-viewer");g&&g.classList.remove("sv-fullscreen"),document.body.classList.remove("has-sv-fullscreen"),document.body.style.overflow=""}O=!1,At();let l=r("#stream-viewer");l.classList.remove("sv-fullscreen"),l.classList.toggle("sv-mv-mode",!!t.isMv);let u=$e(t);l.classList.toggle("sv-portrait",u),l._currentStream=t,Ue();let c=++N,d=l.querySelectorAll("[data-bc-tab]");d[1]&&(t.isMv?(d[1].dataset.bcTab="playlists",d[1].textContent="\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8"):(d[1].dataset.bcTab="timeline",d[1].textContent="\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3"));let o=r("#sv-bc-title");o&&(o.textContent=t.title||"\u914D\u4FE1");let v=r("#sv-stream-meta");v&&(v.innerHTML=t.isMv?"":`${F(t.date)}\u3000\u7B2C${t.index}\u67A0\u3000${b("mic")} ${t.songs.length}\u66F2`);let f=r("#sv-yt-link");f&&(f.href=t.url);let w=r("#sv-song-count");if(w&&(w.textContent=t.isMv?"":`${t.songs.length}\u66F2`),q={},t.isMv){let g=r("#sv-setlist");g&&(g.innerHTML="");let k=r("#sv-below-player");k&&(k.innerHTML="");let j=r("#sv-side-related");j&&(j.innerHTML=""),We(t)}else{let g=K(t);tt(r("#sv-setlist"),t.songs,g,G),qe(t),Ge(t)}l.hidden=!1,document.body.style.overflow="",H(),window.scrollTo({top:0,behavior:"auto"}),setTimeout(()=>{r("#sv-close")?.focus({preventScroll:!0})},50);try{p?.destroy()}catch{}p=null;let _=r("#sv-player-wrap");_.innerHTML='<div class="sv-player-loading">\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>';let $=Math.floor(e||n?.currentTime||0);if(n?.player){_.innerHTML="",n.iframe?(n.iframe.style.width="100%",n.iframe.style.height="100%",_.appendChild(n.iframe)):_.innerHTML='<div class="sv-player-loading">\u518D\u751F\u3092\u5F15\u304D\u7D99\u304E\u307E\u3057\u305F</div>',p=n.player;try{p.setVolume?.(z()),$>1&&p.seekTo?.($,!0),p.playVideo?.()}catch{}et(r("#sv-vol-slider"),r("#sv-vol-btn"),null,z()),yt(!0),Be(c,l);return}ce(()=>{if(c!==N||l.hidden)return;_.innerHTML="";let g=document.createElement("div");_.appendChild(g);try{p=new window.YT.Player(g,{videoId:s,width:"100%",height:"100%",playerVars:{autoplay:1,playsinline:1,origin:location.origin,rel:0,modestbranding:1,...$>0?{start:$}:{}},events:{onReady:k=>{let j=z();try{k.target.setVolume(j)}catch{}et(r("#sv-vol-slider"),r("#sv-vol-btn"),null,j);try{k.target.setPlaybackQuality("hd1080")}catch{}try{k.target.setPlaybackQualityRange("hd720","hd1080")}catch{}if($>5)try{k.target.seekTo($,!0)}catch{}},onStateChange:k=>{if(c===N){if(yt(k.data===window.YT.PlayerState.PLAYING),k.data===window.YT.PlayerState.PLAYING)try{k.target.setPlaybackQuality("hd1080")}catch{}k.data===window.YT.PlayerState.ENDED&&fe(l)}},onError:()=>{if(c===N){try{p?.destroy()}catch{}p=null,_.innerHTML=`<iframe src="https://www.youtube.com/embed/${m(s)}?autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}${$>0?`&start=${$}`:""}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`}}}})}catch{_.innerHTML=`<iframe src="https://www.youtube.com/embed/${m(s)}?autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}${$>0?`&start=${$}`:""}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`}})}function te(){let t=r("#stream-viewer");if(!t||t.hidden||X(t))return;if(O){O=!1,t.classList.remove("sv-fullscreen"),document.body.classList.remove("has-sv-fullscreen"),document.body.style.overflow="";let s=r("#sv-close");s&&s.setAttribute("data-tooltip","\u30DF\u30CB\u30D7\u30EC\u30A4\u30E4\u30FC\u3067\u518D\u751F\u3092\u7D9A\u3051\u306A\u304C\u3089\u623B\u308A\u307E\u3059\uFF08Esc\uFF09");let a=r("#sv-fullscreen-btn");a&&a.setAttribute("aria-pressed","false"),V("embedded");return}if(Me())return;++N,t.hidden=!0,t._currentStream=null,J(),p=null;let e=r("#sv-player-wrap");e&&(e.innerHTML=""),document.body.style.overflow="",V("idle"),R.setSidebarHidden(!1),dt(),H()}function _s(){let t=r("#stream-viewer");if(X(t))return gt(),!0;let e=r("#yt-player-panel");return e&&!e.hidden?(e.hidden=!0,nt(),P=null,V("idle"),!0):!1}var W=null,Mt=null;function Ss(t){W=t}function Ke(){return Mt||(Mt=import("./chunk-LTSXDMYX.js").then(t=>(t.initMusicPlayer(),W)).catch(()=>null)),Mt}window.__ibaraDebug={openStreamViewer:M,playMyListInViewer:Re};export{_e as a,Xe as b,us as c,vs as d,hs as e,ys as f,gs as g,ws as h,$s as i,ie as j,oe as k,Re as l,xs as m,ze as n,M as o,te as p,_s as q,Ss as r};
