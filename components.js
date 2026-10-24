/* Kis design kit — component behaviour.
 * Copied from index.html. Every function keeps the original logic; the only changes are the ones marked "KIT:",
 * which remove app-specific data (transactions, sheet ids) so the helpers can be reused.
 * Expects the markup from template.html (ids: themeColor, themeSeg, scrim, scrim2, as, asTitle, asWhat, asMsg,
 * asBtns, asCancel, banner, bannerText, bannerUndo).
 */
(function(){
/* index.html:582 */
const $=id=>document.getElementById(id);

/* index.html:583-588 — formatting helpers (money, pad, todayStr, uid) */
const fmt=new Intl.NumberFormat("he-IL",{minimumFractionDigits:2,maximumFractionDigits:2});
const money=n=>fmt.format(n);
const pad=n=>String(n).padStart(2,"0");
const todayStr=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const uid=()=>"t"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);

/* index.html:638 — segmented control: the pressed button carries aria-pressed="true" */
function setSeg(seg,attr,val){seg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset[attr]===val))}

/* index.html:641-649 — theme: "auto" | "light" | "dark", saved in localStorage "kis-theme".
 * The <head> must also run the pre-paint snippet from index.html:15-18. */
function getTheme(){try{return localStorage.getItem("kis-theme")||"auto"}catch(e){return "auto"}}
function applyTheme(t){
  if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t);
  try{localStorage.setItem("kis-theme",t)}catch(e){}
  if($("themeSeg"))setSeg($("themeSeg"),"t",t); /* KIT: guarded, the seg may be absent */
  requestAnimationFrame(()=>$("themeColor").setAttribute("content",getComputedStyle(document.body).backgroundColor));
}
document.querySelectorAll("#themeSeg button").forEach(b=>b.onclick=()=>applyTheme(b.dataset.t));
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>applyTheme(getTheme()));

/* index.html:652-653 — large title collapses into the nav bar after 36px of scroll */
function onScroll(){document.documentElement.classList.toggle("scrolled",window.scrollY>36)}
window.addEventListener("scroll",onScroll,{passive:true});

/* index.html:656-676 — swipe to delete. Row markup: .swrow > button.swdel + .swcontent > button.cell */
let openSw=null;
function closeSw(row){if(!row)return;row.querySelector(".swcontent").style.transform="";row.classList.remove("open");setTimeout(()=>{if(!row.classList.contains("open"))row.classList.remove("swiping")},260);if(openSw===row)openSw=null}
function attachSwipe(row){
  const c=row.querySelector(".swcontent"),W=88;
  let sx=null,sy=0,base=0,x=0,dir=null,moved=false;
  c.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;sx=e.clientX;sy=e.clientY;dir=null;moved=false;base=row.classList.contains("open")?W:0;x=base});
  c.addEventListener("pointermove",e=>{
    if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;
    if(!dir){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;dir=Math.abs(dx)>Math.abs(dy)?"h":"v";
      if(dir==="h"){moved=true;row.classList.add("swiping");if(openSw&&openSw!==row)closeSw(openSw);try{c.setPointerCapture(e.pointerId)}catch(_){}c.style.transition="none"}}
    if(dir==="h"){x=Math.max(0,Math.min(W*1.4,base+dx));c.style.transform="translateX("+x+"px)"}
  });
  const end=()=>{if(sx==null)return;sx=null;if(dir!=="h")return;c.style.transition="";
    if(x>W/2){c.style.transform="translateX("+W+"px)";row.classList.add("open");openSw=row}else closeSw(row)};
  c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end);
  c.addEventListener("click",e=>{
    if(moved){e.stopPropagation();e.preventDefault();moved=false;return}
    if(row.classList.contains("open")){e.stopPropagation();e.preventDefault();closeSw(row)}
  },true);
}
document.addEventListener("pointerdown",e=>{if(openSw&&!openSw.contains(e.target))closeSw(openSw)});

/* index.html:786-790 — modal sheets. KIT: the app hardcodes ["sheet","recSheet"]; here every .sheet is used */
const sheetIds=()=>[...document.querySelectorAll(".sheet")].map(s=>s.id);
function openSheet(id){sheetIds().forEach(s=>$(s).hidden=s!==id);$("scrim").hidden=false;$("banner").hidden=true;document.body.style.overflow="hidden"}
function closeSheets(){$("scrim").hidden=true;sheetIds().forEach(s=>$(s).hidden=true);document.body.style.overflow=""}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheets);
$("scrim").onclick=closeSheets;
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!$("as").hidden)closeAS();else closeSheets()});

/* index.html:793-804 — action sheet: actionSheet({title, what, msg, buttons:[{label, destructive, fn}]}); "ביטול" is always added */
function actionSheet({title,what,msg,buttons}){
  $("asTitle").textContent=title||"";$("asTitle").hidden=!title;
  $("asWhat").textContent=what||"";$("asWhat").hidden=!what;
  $("asMsg").textContent=msg||"";$("asMsg").hidden=!msg;
  const bx=$("asBtns");bx.innerHTML="";
  buttons.forEach(bt=>{const b=document.createElement("button");b.type="button";b.className="asbtn"+(bt.destructive?" destructive":"");b.textContent=bt.label;
    b.onclick=()=>{closeAS();bt.fn&&bt.fn()};bx.appendChild(b)});
  $("scrim2").hidden=false;$("as").hidden=false;
  setTimeout(()=>$("asCancel").focus(),30);
}
function closeAS(){$("scrim2").hidden=true;$("as").hidden=true}
$("asCancel").onclick=closeAS;$("scrim2").onclick=closeAS;

/* index.html:808-813 — banner: 3s, or 5s with an undo button.
 * KIT: the app restores its txs/recs snapshot on undo; here banner(text, onUndo) takes a callback instead */
let bannerTimer=null,undoFn=null;
function banner(text,onUndo){
  $("bannerText").textContent=text;undoFn=onUndo||null;$("bannerUndo").hidden=!onUndo;$("banner").hidden=false;
  clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{$("banner").hidden=true;undoFn=null},onUndo?5000:3000);
}
$("bannerUndo").onclick=()=>{if(!undoFn)return;const f=undoFn;undoFn=null;$("banner").hidden=true;f()};

/* index.html:867-868 — stepper: buttons carry data-d="1" / data-d="-1".
 * KIT: wrapped as a helper; the app writes the same handler inline for each stepper */
function stepper(el,{min,max,get,set}){
  const sync=()=>{el.children[0].disabled=get()>=max;el.children[1].disabled=get()<=min};
  el.onclick=e=>{const d=+(e.target.closest("button")||{}).dataset?.d;if(!d)return;set(Math.max(min,Math.min(max,get()+d)));sync()};
  sync();return sync;
}

/* index.html:1172-1179 — hand a generated file to the user: iOS share sheet, else a download link */
async function deliver(blob,name){
  const file=new File([blob],name,{type:blob.type});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file]});return "ok"}catch(e){if(e&&e.name==="AbortError")return "cancel"}
  }
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);return "ok";
}

applyTheme(getTheme());
onScroll();

/* index.html:1140-1160 — bottom tab bar.
 * Markup: nav.tabbar > button.tab[data-v] (.ti icon + .tl label), button.tabplus in the middle; views are section.view#v-{name}.
 * KIT: the app's showView also clears its own badge and renders app data; here tabs(onShow) takes a callback for that */
let view=null;
function tabs(onShow){
  const show=v=>{
    view=v;
    document.querySelectorAll("section.view").forEach(s=>s.hidden=s.id!=="v-"+v);
    document.querySelectorAll(".tabbar .tab").forEach(b=>{if(b.dataset.v===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
    closeSw(openSw);window.scrollTo(0,0);onScroll();
    if(onShow)onShow(v);
  };
  document.querySelectorAll(".tabbar .tab").forEach(b=>b.onclick=()=>show(b.dataset.v));
  const first=document.querySelector('.tabbar .tab[aria-current="page"]')||document.querySelector(".tabbar .tab");
  if(first)show(first.dataset.v);
  return show;
}
/* index.html:1156-1160 — badge: a number (hidden at 0, "99+" above 99) or, with class "dot", just on/off */
function badge(el,n){
  if(el.classList.contains("dot")){el.hidden=!n;return}
  el.hidden=!n;el.textContent=n>99?"99+":String(n);
}

window.Kit={$,money,pad,todayStr,uid,setSeg,getTheme,applyTheme,attachSwipe,closeSw,openSheet,closeSheets,tabs,badge,actionSheet,closeAS,banner,stepper,deliver};
})();
