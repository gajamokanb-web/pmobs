(function(){
"use strict";
var LVL={1:"Fondamental",2:"Confirmé",3:"Expert"};
var OFF={B:"BEFM",I:"IRE AIFM"};
var Q={}, ORDER=[], TH={};
D.forEach(function(t){
  TH[t.id]=t; t.ids=[];
  t.q.forEach(function(r,i){
    var id=t.id+"-"+(i+1);
    Q[id]={id:id,t:t.id,q:r[0],a:r[1],d:r[2],l:r[3]||1,o:r[4]||""};
    t.ids.push(id); ORDER.push(id);
  });
});

function $(s){return document.querySelector(s);}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function inl(s){return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");}
function md(src){
  var lines=String(src).split("\n").map(function(l){return l.trim();}).filter(Boolean);
  var h="", list=false;
  lines.forEach(function(l){
    var b=l.indexOf("• ")===0;
    if(b&&!list){h+="<ul>";list=true;}
    if(!b&&list){h+="</ul>";list=false;}
    if(b) h+="<li>"+inl(l.slice(2))+"</li>";
    else if(l.indexOf("! ")===0) h+='<p class="call warn"><span>Piège à éviter</span>'+inl(l.slice(2))+"</p>";
    else if(l.indexOf("> ")===0) h+='<p class="call mine"><span>Ton angle</span>'+inl(l.slice(2))+"</p>";
    else if(l.indexOf("§ ")===0) h+='<p class="ref"><span>Réf.</span>'+inl(l.slice(2))+"</p>";
    else h+="<p>"+inl(l)+"</p>";
  });
  if(list) h+="</ul>";
  return h;
}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var x=a[i];a[i]=a[j];a[j]=x;}return a;}
function norm(s){return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}

/* ---------- state ---------- */
var LS="prepa-pmo-v1", LSF="prepa-pmo-focus";
var st={p:{},n:{},r:0,g:{},m:{}};
var focus="all";
function loadLocal(){
  try{var raw=localStorage.getItem(LS); if(raw){var o=JSON.parse(raw); st={p:o.p||{},n:o.n||{},r:o.r||0,g:o.g||{},m:o.m||{}};}}catch(e){}
  try{var f=localStorage.getItem(LSF); if(f==="B"||f==="I"||f==="all") focus=f;}catch(e){}
}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(st));}catch(e){}}
function status(id){var v=st.p[id];return v?v[0]:0;}
function tOf(id){var v=st.p[id];return v?v[1]:0;}
function setStatus(id,s){st.p[id]=[s,Date.now()];persist();}
function noteOf(id){var v=st.n[id];return v?v[0]:"";}
function setNote(id,txt){if(noteOf(id)===txt)return;st.n[id]=[txt,Date.now()];persist();}
function persist(){saveLocal();schedulePush();}
function merge(a,b){
  var r=Math.max(a.r||0,b.r||0), out={p:{},n:{},r:r,g:{},m:{}};
  [a,b].forEach(function(src){
    var p=src.p||{}, n=src.n||{}, g=src.g||{}, mm=src.m||{};
    Object.keys(mm).forEach(function(k){var v=mm[k]; if(!Array.isArray(v)||v[2]<r)return; if(!out.m[k]||out.m[k][2]<v[2]) out.m[k]=v;});
    Object.keys(g).forEach(function(k){if(typeof g[k]==="number"&&g[k]>(out.g[k]||0))out.g[k]=g[k];});
    Object.keys(p).forEach(function(k){var v=p[k]; if(!Array.isArray(v)||!Q[k]||v[1]<r)return; if(!out.p[k]||out.p[k][1]<v[1]) out.p[k]=v;});
    Object.keys(n).forEach(function(k){var v=n[k]; if(!Array.isArray(v))return; if(!out.n[k]||out.n[k][1]<v[1]) out.n[k]=v;});
  });
  return out;
}

/* ---------- account sync (db capability) ---------- */
var remote={ref:null,ok:false,busy:false,dirty:false,timer:null};
function setSync(m){
  var txt=m==="cloud"?"Synchronisé avec ton compte":m==="local"?"Enregistré sur cet appareil":"Connexion…";
  ["#sync","#bSync"].forEach(function(s){var el=$(s); if(el){el.textContent=txt; el.dataset.s=m;}});
}
function initRemote(){
  if(!window.claude||typeof window.claude.use!=="function"){setSync("local");return;}
  Promise.all([window.claude.use("db"),window.claude.use("user")]).then(function(r){
    var db=r[0], user=r[1];
    if(!db||!user){setSync("local");return null;}
    return user.id().then(function(uid){
      if(!uid){setSync("local");return null;}
      remote.ref=db.doc("data/users/"+uid+"/state");
      return remote.ref.get().then(function(snap){
        remote.ok=true;
        if(snap.exists){
          var d=snap.data()||{}, rem={p:d.p||{},n:d.n||{},r:d.r||0,g:d.g||{},m:d.m||{}};
          var m=merge(st,rem);
          var changed=JSON.stringify(m)!==JSON.stringify(merge(rem,{p:{},n:{},r:0,g:{},m:{}}));
          st=m; saveLocal(); refresh();
          if(changed) schedulePush();
        } else if(Object.keys(st.p).length||Object.keys(st.n).length){ schedulePush(); }
        setSync("cloud");
      });
    });
  }).catch(function(){setSync("local");});
}
function schedulePush(){
  if(!remote.ok)return;
  remote.dirty=true; clearTimeout(remote.timer); remote.timer=setTimeout(push,1500);
}
function push(){
  if(!remote.ok||remote.busy||!remote.dirty)return;
  remote.busy=true; remote.dirty=false;
  remote.ref.set({p:st.p,n:st.n,r:st.r,g:st.g,m:st.m}).then(function(){setSync("cloud");}).catch(function(e){
    var c=e&&e.code;
    if(c==="invalid_argument"||c==="revoked"||c==="not_granted"||c==="quota_exceeded"||c==="capability_disabled"||c==="capability_removed"){remote.ok=false;setSync("local");}
    else{remote.dirty=true;}
  }).then(function(){
    remote.busy=false;
    if(remote.dirty&&remote.ok){clearTimeout(remote.timer);remote.timer=setTimeout(push,3000+Math.random()*2000);}
  });
}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden"&&remote.dirty){clearTimeout(remote.timer);push();}});

/* ---------- helpers ---------- */
function vis(id){var q=Q[id];return !q.o||focus==="all"||q.o===focus;}
function visIds(ids){return ids.filter(vis);}
function counts(ids){var g=0,a=0,u=0;ids.forEach(function(id){var s=status(id);if(s===2)g++;else if(s===1)a++;else u++;});return {g:g,a:a,u:u,n:ids.length};}
function bar(c,cls){var n=c.n||1;return '<span class="bar '+(cls||"")+'" role="img" aria-label="'+c.g+' maîtrisées, '+c.a+' à revoir, '+c.u+' non vues"><i class="g" style="width:'+(c.g/n*100)+'%"></i><i class="a" style="width:'+(c.a/n*100)+'%"></i></span>';}
function dot(s){return '<i class="dot'+(s===2?" g":s===1?" a":"")+'"></i>';}
function missing(ids){var v=visIds(ids);return v.filter(function(i){return status(i)===1;}).concat(v.filter(function(i){return status(i)===0;}));}
function plural(n,w){return n+" "+w+(n>1&&w!=="cas"?"s":"");}
var toastT=null;
function toast(msg){var el=$("#toast");el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){el.hidden=true;},2600);}

/* ---------- views ---------- */
var VIEWS=["path","lesson","done","home","theme","card","end","bilan","mods","mod","game"], cur="path";
function show(v){
  VIEWS.forEach(function(x){$("#v-"+x).hidden=(x!==v);});
  cur=v;
  $("#tabs").hidden=!(v==="path"||v==="home"||v==="bilan"||v==="theme"||v==="mods"||v==="mod");
  document.documentElement.classList.toggle("play",v==="path"||v==="lesson"||v==="done"||v==="mods"||v==="mod"||v==="game");
  $("#actions").hidden=(v!=="card");
  document.querySelectorAll("#tabs button").forEach(function(b){
    var on=b.dataset.go===v||(v==="theme"&&b.dataset.go==="home")||(v==="mod"&&b.dataset.go==="mods");
    if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
  });
  window.scrollTo(0,0);
}
function go(v){
  if(v==="home")renderHome();
  if(v==="theme")renderTheme();
  if(v==="bilan")renderBilan();
  if(v==="path")renderPath();
  if(v==="mods")renderMods();
  if(v==="mod")renderMod();
  show(v);
  if(v==="path")scrollCur();
}
function refresh(){
  if(cur==="path")renderPath();
  else if(cur==="home")renderHome();
  else if(cur==="theme")renderTheme();
  else if(cur==="bilan")renderBilan();
  else if(cur==="mods")renderMods();
  else if(cur==="mod")renderMod();
  else if(cur==="card")renderStatusChip();
}

/* home */
function renderHome(){
  var all=visIds(ORDER), c=counts(all);
  $("#hSub").textContent="BEFM (Blackstone) et IRE AIFM · "+all.length+" questions, "+D.length+" thèmes";
  $("#gGreen").textContent=c.g; $("#gTotal").textContent=c.n;
  $("#gBar").innerHTML=bar(c); $("#gG").textContent=c.g; $("#gA").textContent=c.a; $("#gU").textContent=c.u;
  $("#mAmberN").textContent=c.a?plural(c.a,"carte")+" à revoir":"Aucune pour l'instant";
  $("#mAmber").disabled=!c.a;
  $("#mAllN").textContent=plural(c.n,"question")+" mélangées";
  document.querySelectorAll("button[data-f]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.f===focus));});
  var h="";
  D.forEach(function(t){
    var ids=visIds(t.ids), k=counts(ids), miss=k.a+k.u;
    h+='<li><button type="button" class="theme" data-t="'+t.id+'"><span class="code">'+esc(t.c)+'</span><span class="tname">'+esc(t.n)+'<small>'+(miss?plural(miss,"point")+" à couvrir"+(k.a?" · "+k.a+" ambre"+(k.a>1?"s":""):""):"Thème maîtrisé")+'</small></span><span class="tcount'+(miss?"":" done")+'">'+k.g+"/"+k.n+"</span>"+bar(k,"sm")+"</button></li>";
  });
  $("#themes").innerHTML=h;
  runSearch();
}
var sIds=[];
function runSearch(){
  var q=norm($("#search").value.trim()), box=$("#sRes");
  if(q.length<2){box.hidden=true;box.innerHTML="";return;}
  var words=q.split(/\s+/);
  sIds=visIds(ORDER).filter(function(id){var x=Q[id],hay=norm(x.q+" "+x.a+" "+x.d);return words.every(function(w){return hay.indexOf(w)>-1;});}).slice(0,40);
  box.hidden=false;
  if(!sIds.length){box.innerHTML='<li><p class="empty">Aucun résultat. Essaie un autre terme.</p></li>';return;}
  box.innerHTML=sIds.map(function(id,i){var x=Q[id];return '<li><button type="button" data-i="'+i+'">'+dot(status(id))+'<span class="qt">'+esc(x.q)+'<small>'+esc(TH[x.t].n)+'</small></span><em>'+esc(TH[x.t].c)+"</em></button></li>";}).join("");
}

/* theme */
var curTheme=null, tFilter="all", tIds=[];
function openTheme(id){curTheme=id;tFilter="all";go("theme");}
function renderTheme(){
  var t=TH[curTheme]; if(!t)return;
  var ids=visIds(t.ids), c=counts(ids), miss=missing(t.ids);
  $("#tCode").textContent=t.c; $("#tTitle").textContent=t.n; $("#tDesc").textContent=t.s;
  $("#tBar").innerHTML=bar(c);
  $("#tLegend").innerHTML='<span><i class="dot g"></i>Vert <em>'+c.g+'</em></span><span><i class="dot a"></i>Ambre <em>'+c.a+'</em></span><span><i class="dot"></i>Non vu <em>'+c.u+"</em></span>";
  $("#tMiss").textContent=miss.length?"Réviser les manquants ("+miss.length+")":"Tout est maîtrisé";
  $("#tMiss").disabled=!miss.length;
  document.querySelectorAll("#tFilter button").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.v===tFilter));});
  tIds=ids.filter(function(id){var s=status(id);return tFilter==="all"||(tFilter==="miss"&&s!==2)||(tFilter==="amber"&&s===1)||(tFilter==="green"&&s===2);});
  $("#tList").innerHTML=tIds.length?tIds.map(function(id,i){var x=Q[id];return '<li><button type="button" data-i="'+i+'">'+dot(status(id))+'<span class="qt">'+esc(x.q)+'</span><em>'+(x.o?OFF[x.o]+" · ":"")+"N"+x.l+"</em></button></li>";}).join(""):'<li><p class="empty">Aucune question dans ce filtre.</p></li>';
}

/* bilan */
var bMap={};
function renderBilan(){
  var h="", total=0; bMap={};
  D.forEach(function(t){
    var ids=visIds(t.ids), c=counts(ids), miss=missing(t.ids); bMap[t.id]=miss; total+=miss.length;
    h+='<details class="bt"><summary><span class="code">'+esc(t.c)+'</span><span class="tname">'+esc(t.n)+'<small>'+(miss.length?(c.a?c.a+" ambre"+(c.a>1?"s":"")+" · ":"")+(c.u?c.u+" non vue"+(c.u>1?"s":""):""):"Rien à revoir")+'</small></span>'+(miss.length?'<span class="tcount">'+miss.length+"</span>":'<span class="ok">Complet</span>')+bar(c,"sm")+"</summary>";
    if(miss.length){h+='<ul class="qlist">'+miss.map(function(id,i){return '<li><button type="button" data-t="'+t.id+'" data-i="'+i+'">'+dot(status(id))+'<span class="qt">'+esc(Q[id].q)+"</span><em>N"+Q[id].l+"</em></button></li>";}).join("")+"</ul>";}
    h+="</details>";
  });
  $("#bList").innerHTML=(total?"":'<p class="help">Tout est au vert. Lance une session « Tout, au hasard » pour garder le rythme.</p>')+h;
}

/* ---------- session ---------- */
var S=null;
function start(ids,label,mode,idx){
  if(!ids||!ids.length){toast("Rien à réviser ici pour l'instant.");return;}
  var from=(cur==="card"||cur==="end")?((S&&S.from)||"home"):cur;
  stopTimer();
  S={ids:ids.slice(),i:idx||0,label:label,mode:mode||"list",marks:{},from:from,timer:null,left:0,revealed:false};
  show("card"); renderCard();
}
function curId(){return S.ids[S.i];}
function renderStatusChip(){
  if(!S)return; var s=status(curId()), el=$("#cSt");
  el.textContent=s===2?"Vert · maîtrisé":s===1?"Ambre · à revoir":"Non vu";
  el.className="chip"+(s?" s"+s:"");
}
function renderCard(){
  var id=curId(), x=Q[id], t=TH[x.t];
  $("#cDeck").textContent=S.label;
  $("#cPos").textContent=(S.i+1)+" / "+S.ids.length;
  $("#cProg").style.width=((S.i+1)/S.ids.length*100)+"%";
  $("#cCode").textContent=t.c; $("#cLvl").textContent=LVL[x.l];
  var off=$("#cOff"); off.hidden=!x.o; off.textContent=x.o?OFF[x.o]:"";
  renderStatusChip();
  $("#cQ").textContent=x.q;
  $("#cAText").textContent=x.a; $("#cExp").innerHTML=md(x.d);
  S.revealed=false; $("#cA").hidden=true; $("#cReveal").hidden=false;
  $("#aPrev").disabled=S.i===0;
  if(S.mode==="mock")startTimer(90); else {stopTimer();$("#cTimer").hidden=true;}
  window.scrollTo(0,0);
}
function reveal(){if(!S||S.revealed)return;S.revealed=true;$("#cA").hidden=false;$("#cReveal").hidden=true;}
function mark(s){var id=curId();setStatus(id,s);S.marks[id]=s;next();}
function next(){
  stopTimer();
  if(!(curId() in S.marks))S.marks[curId()]=0;
  if(S.i<S.ids.length-1){S.i++;renderCard();}else endSession();
}
function prev(){if(S.i>0){stopTimer();S.i--;renderCard();}}
function startTimer(sec){
  stopTimer(); S.left=sec; var el=$("#cTimer"); el.hidden=false; el.classList.remove("over"); tick();
  S.timer=setInterval(function(){S.left--;tick();if(S.left<=0){clearInterval(S.timer);S.timer=null;}},1000);
}
function tick(){var el=$("#cTimer");if(S.left>0){el.textContent=Math.floor(S.left/60)+":"+String(S.left%60).padStart(2,"0");}else{el.textContent="Temps écoulé";el.classList.add("over");}}
function stopTimer(){if(S&&S.timer){clearInterval(S.timer);S.timer=null;}}
var sessionAmbers=[];
function endSession(){
  var g=0,a=0,s=0; sessionAmbers=[];
  S.ids.forEach(function(id){var m=S.marks[id];if(m===2)g++;else if(m===1){a++;sessionAmbers.push(id);}else s++;});
  $("#eEyebrow").textContent=S.mode==="mock"?"Entretien blanc terminé":"Session terminée";
  $("#eTitle").textContent=g===S.ids.length?"Sans faute":a>g?"Des points à consolider":"Bonne session";
  $("#eDesc").textContent=S.label+" · "+plural(S.ids.length,"question");
  $("#eG").textContent=g; $("#eA").textContent=a; $("#eS").textContent=s;
  $("#eAmber").hidden=!sessionAmbers.length;
  $("#eHome").textContent=S.from==="theme"?"Retour au thème":S.from==="bilan"?"Retour au bilan":"Retour aux thèmes";
  show("end");
}

/* ---------- sheet ---------- */
var sheetFor=null, lastFocus=null, noteT=null;
function openSheet(idArg,notesOnly){
  var id=(typeof idArg==="string")?idArg:curId(), x=Q[id]; sheetFor=id; lastFocus=document.activeElement;
  $("#shCode").textContent=TH[x.t].c+" · "+LVL[x.l];
  $("#shTitle").textContent=x.q;
  $("#shBody").innerHTML=md(x.d); $("#shBody").hidden=!!notesOnly;
  $("#shNote").value=noteOf(id); $("#shSaved").textContent=noteOf(id)?"Note enregistrée":"";
  $("#scrim").hidden=false; $("#sheet").hidden=false; $("#sheet").scrollTop=0;
  $("#shClose").focus();
}
function saveNote(){if(sheetFor){setNote(sheetFor,$("#shNote").value);}}
function closeSheet(){
  if($("#sheet").hidden)return;
  clearTimeout(noteT); saveNote();
  $("#scrim").hidden=true; $("#sheet").hidden=true; sheetFor=null;
  if(lastFocus&&lastFocus.focus)lastFocus.focus();
}

/* ---------- decks ---------- */
function deckDaily(){
  var ids=visIds(ORDER);
  var am=ids.filter(function(i){return status(i)===1;}).sort(function(x,y){return tOf(x)-tOf(y);});
  var un=shuffle(ids.filter(function(i){return status(i)===0;}));
  var gr=ids.filter(function(i){return status(i)===2;}).sort(function(x,y){return tOf(x)-tOf(y);});
  return am.concat(un,gr).slice(0,15);
}
function deckMock(){
  var ids=visIds(ORDER);
  function pick(pool,n){return shuffle(pool.slice()).slice(0,n);}
  var p=pick(ids.filter(function(i){return Q[i].t==="pitch";}),2);
  var c=pick(ids.filter(function(i){return Q[i].t==="case";}),2);
  var rest=pick(ids.filter(function(i){var t=Q[i].t;return t!=="pitch"&&t!=="case"&&t!=="en";}),6);
  return [p[0]].concat(shuffle(rest.concat(c))).concat(p.slice(1)).filter(Boolean);
}

/* ---------- parcours ludique ---------- */
var DAILY_GOAL=50, LESSON_SIZE=5, GOLD="#ffc800", GOLD_E="#d9a800";
var HUES=[["#46a302","#377d02"],["#1899d6","#1479a9"],["#c96f00","#9c5700"],["#9a55d1","#7a3fa8"],["#e03b3b","#b02a2a"],["#00997a","#007560"]];
var OFFS=[0,-34,-52,-34,0,34,52,34];
var STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
var FLAME='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C12 6 7 8.5 7 14a5 5 0 0 0 10 0c0-2.2-1-3.8-2-5-.3 1.5-1.2 2.5-2.2 3 .6-3.6-.2-7.6-.8-10z"/></svg>';
var PRAISE=["Bien joué !","Excellent !","Dans le mille !","Solide !","Propre !","Exactement !"];

function dayKey(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addXp(n){var k=dayKey();st.g[k]=(st.g[k]||0)+n;persist();}
function totalXp(){return Object.keys(st.g).reduce(function(s,k){return s+(+st.g[k]||0);},0);}
function todayXp(){return +st.g[dayKey()]||0;}
function streak(){var n=0,d=new Date();if(!st.g[dayKey(d)])d.setDate(d.getDate()-1);while(st.g[dayKey(d)]>0){n++;d.setDate(d.getDate()-1);}return n;}
function vibrate(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}

var CHEV='<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var pathThemes=[], openTh={}, anchorTh=null;
function renderPath(){
  document.querySelectorAll("button[data-f]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.f===focus));});
  var s=streak(), td=todayXp();
  $("#pStreak").textContent=s; $("#pFlame").classList.toggle("off",s===0);
  $("#pXp").textContent=totalXp();
  $("#pGoalTxt").textContent=Math.min(td,DAILY_GOAL)+" / "+DAILY_GOAL+" XP aujourd'hui";
  $("#pGoalBar").style.width=Math.min(100,td/DAILY_GOAL*100)+"%";
  var h="", left=0; pathThemes=[];
  D.forEach(function(t,ti){
    var ids=visIds(t.ids); if(!ids.length)return;
    var hu=HUES[ti%HUES.length], c=counts(ids), idx=pathThemes.length, open=!!openTh[t.id];
    var first=-1; ids.forEach(function(i,k){if(first<0&&status(i)!==2)first=k;});
    left+=c.a+c.u;
    pathThemes.push({id:t.id,ids:ids,label:t.n,hue:hu[0]});
    h+='<section class="psec"><h3 class="ph"><button type="button" class="pban" data-th="'+t.id+'" aria-expanded="'+open+'" aria-controls="pl-'+t.id+'" style="--f:'+hu[0]+';--e:'+hu[1]+'"><span class="pbt"><span class="k">Thème '+(idx+1)+' · '+esc(t.c)+'</span><span class="h">'+esc(t.n)+'</span><span class="mini"><i style="width:'+(c.g/c.n*100)+'%"></i></span></span><span class="cnt">'+c.g+"/"+c.n+"</span>"+CHEV+"</button></h3>";
    h+='<div class="plist" id="pl-'+t.id+'"'+(open?"":" hidden")+'><button type="button" class="pbtn green pgo" data-ti="'+idx+'" data-i="'+(first<0?0:first)+'">'+(first<0?"Tout revoir":c.g||c.a?"Continuer le thème":"Commencer le thème")+"</button>";
    ids.forEach(function(id,i){
      var x=Q[id], v=status(id);
      h+='<button type="button" class="prow" data-ti="'+idx+'" data-i="'+i+'"><span class="dt s'+v+'" role="img" aria-label="'+(v===2?"maîtrisée":v===1?"à revoir":"non vue")+'">'+(v===2?CHECK:"")+'</span><span class="pq"><span class="pt">'+esc(x.q)+"</span><small>"+LVL[x.l]+(x.o?" · "+OFF[x.o]:"")+"</small></span></button>";
    });
    h+="</div></section>";
  });
  if(pathThemes.length&&!left)h='<p class="pdone">Tout est maîtrisé. Rouvre un thème pour t\'entraîner.</p>'+h;
  $("#pList").innerHTML=h;
}
function scrollCur(){
  var el=anchorTh&&document.querySelector('.pban[data-th="'+anchorTh+'"]');
  if(el)setTimeout(function(){el.scrollIntoView({block:"start"});},40);
}

/* leçon */
var L=null;
function startLesson(ids,label,hue){
  L={q:ids.slice(),i:0,label:label,hue:hue,re:{},xp:0,combo:0,green1:0,total:ids.length,phase:"ask"};
  $("#v-lesson").style.setProperty("--hue",hue);
  show("lesson"); renderLesson();
}
function lid(){return L.q[L.i];}
function setPhase(p){
  L.phase=p;
  ["ask","grade","fb"].forEach(function(n){$("#lf-"+n).hidden=(n!==p);});
  $("#lAns").hidden=(p==="ask"); $("#lExp").hidden=(p==="ask");
  var f=$("#lFoot"); f.classList.remove("good","bad");
}
function renderLesson(){
  var id=lid(), x=Q[id], t=TH[x.t];
  $("#lProg").style.width=(L.i/L.q.length*100)+"%";
  $("#lChip").textContent=t.c+" · "+LVL[x.l]+(x.o?" · "+OFF[x.o]:"");
  $("#lQ").textContent=x.q; $("#lAText").textContent=x.a; $("#lExpBody").innerHTML=md(x.d);
  var cb=$("#lCombo"); cb.hidden=L.combo<2; cb.innerHTML=FLAME+L.combo;
  setPhase("ask"); window.scrollTo(0,0);
}
function lessonMark(s){
  var id=lid(), retry=!!L.re[id], gain, ok=(s===2), t1, t2;
  setStatus(id,s);
  if(ok){
    gain=retry?5:10; L.combo++; if(!retry)L.green1++;
    t1=PRAISE[Math.floor(Math.random()*PRAISE.length)];
    t2="+"+gain+" XP"+(L.combo>=2?" · série de "+L.combo:"");
  }else{
    gain=2; L.combo=0;
    if(!retry){L.re[id]=1;L.q.push(id);t1="À revoir";t2="+"+gain+" XP · on te la repose à la fin";}
    else{t1="Encore à revoir";t2="+"+gain+" XP · relis l'explication détaillée";}
  }
  L.xp+=gain; addXp(gain);
  $("#lProg").style.width=((L.i+1)/L.q.length*100)+"%";
  setPhase("fb");
  var f=$("#lFoot"); f.classList.add(ok?"good":"bad");
  $("#lFbT").textContent=t1; $("#lFbX").textContent=t2;
  var nb=$("#lNext"); nb.className="pbtn "+(ok?"green":"redf");
  vibrate(ok?15:[25,40,25]);
}
function lessonSkip(){var id=lid();if(!L.re[id]){L.re[id]=1;L.q.push(id);}L.combo=0;lessonNext();}
function lessonNext(){if(L.i<L.q.length-1){L.i++;renderLesson();}else finishLesson();}
function finishLesson(){
  var before=todayXp();
  L.xp+=10; addXp(10);
  var after=todayXp(), acc=Math.round(L.green1/L.total*100);
  $("#dTitle").textContent=acc>=80?"Excellent !":"Leçon terminée !";
  $("#dSub").textContent=L.label+" · "+plural(L.total,"question");
  $("#dXp").textContent="+"+L.xp; $("#dAcc").textContent=acc+"%"; $("#dStr").textContent=streak();
  $("#dGoal").textContent=(before<DAILY_GOAL&&after>=DAILY_GOAL)?"Objectif du jour atteint : "+DAILY_GOAL+" XP !":after>=DAILY_GOAL?"Objectif du jour déjà atteint.":"Encore "+(DAILY_GOAL-after)+" XP pour ton objectif du jour.";
  show("done"); vibrate([20,30,20,30,40]); confetti();
}
function confetti(){
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  var c=$("#confetti"); c.hidden=false;
  var ctx=c.getContext("2d"), w=c.width=window.innerWidth, h=c.height=window.innerHeight;
  var cols=["#58cc02","#1cb0f6","#ffc800","#ff9600","#ce82ff","#ff4b4b"], P=[];
  for(var i=0;i<90;i++)P.push({x:Math.random()*w,y:-Math.random()*h*.5,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,s:6+Math.random()*7,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[i%cols.length]});
  var t0=performance.now();
  (function f(t){
    var k=t-t0; ctx.clearRect(0,0,w,h);
    P.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.04;p.r+=p.vr;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);ctx.restore();});
    if(k<2600)requestAnimationFrame(f);else{ctx.clearRect(0,0,w,h);c.hidden=true;}
  })(t0);
}
$("#pList").addEventListener("click",function(e){
  var ban=e.target.closest(".pban");
  if(ban){var id=ban.dataset.th, open=ban.getAttribute("aria-expanded")!=="true"; openTh[id]=open; ban.setAttribute("aria-expanded",String(open)); document.getElementById("pl-"+id).hidden=!open; return;}
  var b=e.target.closest("[data-ti]"); if(!b)return;
  var m=pathThemes[+b.dataset.ti]; if(!m)return;
  anchorTh=m.id; startLesson(m.ids.slice(+b.dataset.i),m.label,m.hue);
});
$("#lShow").addEventListener("click",function(){setPhase("grade");});
$("#lSkip").addEventListener("click",lessonSkip);
$("#lWrong").addEventListener("click",function(){lessonMark(1);});
$("#lRight").addEventListener("click",function(){lessonMark(2);});
$("#lNext").addEventListener("click",lessonNext);
$("#lMore").addEventListener("click",function(){openSheet(lid(),true);});
$("#lClose").addEventListener("click",function(){go("path");});
$("#dGo").addEventListener("click",function(){$("#confetti").hidden=true;var t=doneTo;doneTo="path";go(t);});

/* ---------- events ---------- */
document.addEventListener("click",function(e){var b=e.target.closest("button[data-f]");if(!b)return;focus=b.dataset.f;try{localStorage.setItem(LSF,focus);}catch(err){}refresh();});
$("#mDaily").addEventListener("click",function(){start(deckDaily(),"Session du jour","daily");});
$("#mAmber").addEventListener("click",function(){var ids=visIds(ORDER).filter(function(i){return status(i)===1;}).sort(function(x,y){return tOf(x)-tOf(y);});start(ids,"Mes ambres","list");});
$("#mMock").addEventListener("click",function(){start(deckMock(),"Entretien blanc","mock");});
$("#mAll").addEventListener("click",function(){start(shuffle(visIds(ORDER)),"Tout, au hasard","list");});
$("#search").addEventListener("input",runSearch);
$("#sRes").addEventListener("click",function(e){var b=e.target.closest("button[data-i]");if(!b)return;start(sIds,"Recherche","list",+b.dataset.i);});
$("#themes").addEventListener("click",function(e){var b=e.target.closest("button[data-t]");if(b)openTheme(b.dataset.t);});
$("#tBack").addEventListener("click",function(){go("home");});
$("#tAll").addEventListener("click",function(){var t=TH[curTheme];start(visIds(t.ids),t.n,"list");});
$("#tMiss").addEventListener("click",function(){var t=TH[curTheme];start(missing(t.ids),t.n+" · manquants","list");});
$("#tFilter").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;tFilter=b.dataset.v;renderTheme();});
$("#tList").addEventListener("click",function(e){var b=e.target.closest("button[data-i]");if(!b)return;var t=TH[curTheme];start(tIds,t.n,"list",+b.dataset.i);});
$("#bList").addEventListener("click",function(e){var b=e.target.closest("button[data-i]");if(!b)return;var t=TH[b.dataset.t];start(bMap[t.id],t.n+" · manquants","list",+b.dataset.i);});
$("#tabs").addEventListener("click",function(e){var b=e.target.closest("button[data-go]");if(b)go(b.dataset.go);});
$("#cClose").addEventListener("click",function(){stopTimer();go(S?S.from:"home");});
$("#cReveal").addEventListener("click",reveal);
$("#cMore").addEventListener("click",function(){openSheet(curId(),true);});
$("#aGreen").addEventListener("click",function(){mark(2);});
$("#aAmber").addEventListener("click",function(){mark(1);});
$("#aSkip").addEventListener("click",next);
$("#aPrev").addEventListener("click",prev);
$("#eAmber").addEventListener("click",function(){start(sessionAmbers,"Ambres de la session","list");});
$("#eHome").addEventListener("click",function(){go(S?S.from:"home");});
$("#scrim").addEventListener("click",closeSheet);
$("#shClose").addEventListener("click",closeSheet);
$("#shNote").addEventListener("input",function(){clearTimeout(noteT);$("#shSaved").textContent="…";noteT=setTimeout(function(){saveNote();$("#shSaved").textContent="Note enregistrée";},600);});

var armed=null;
$("#bReset").addEventListener("click",function(){
  var b=$("#bReset");
  if(!armed){b.textContent="Confirmer la remise à zéro";b.classList.add("armed");armed=setTimeout(function(){armed=null;b.textContent="Remettre la progression à zéro";b.classList.remove("armed");},4000);return;}
  clearTimeout(armed);armed=null;b.textContent="Remettre la progression à zéro";b.classList.remove("armed");
  st.p={};st.m={};st.r=Date.now();persist();renderBilan();toast("Progression remise à zéro.");
});

/* tap card to reveal, swipe to navigate */
var tx=0,ty=0,swiped=false;
var card=$("#card");
card.addEventListener("touchstart",function(e){var t=e.changedTouches[0];tx=t.clientX;ty=t.clientY;swiped=false;},{passive:true});
card.addEventListener("touchend",function(e){var t=e.changedTouches[0],dx=t.clientX-tx,dy=t.clientY-ty;if(Math.abs(dx)>60&&Math.abs(dy)<50){swiped=true;if(dx<0)next();else prev();}},{passive:true});
card.addEventListener("click",function(e){if(swiped){swiped=false;return;}if(e.target.closest("button"))return;reveal();});

document.addEventListener("keydown",function(e){
  if(!$("#sheet").hidden){if(e.key==="Escape")closeSheet();return;}
  if(cur!=="card")return;
  var tag=(e.target.tagName||"").toLowerCase();
  if(tag==="textarea"||tag==="input")return;
  if(e.key==="ArrowRight"){e.preventDefault();next();}
  else if(e.key==="ArrowLeft"){e.preventDefault();prev();}
  else if(e.key===" "&&tag!=="button"){e.preventDefault();reveal();}
  else if(e.key==="Escape"){stopTimer();go(S?S.from:"home");}
});

