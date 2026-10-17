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
var st={p:{},n:{},r:0};
var focus="all";
function loadLocal(){
  try{var raw=localStorage.getItem(LS); if(raw){var o=JSON.parse(raw); st={p:o.p||{},n:o.n||{},r:o.r||0};}}catch(e){}
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
  var r=Math.max(a.r||0,b.r||0), out={p:{},n:{},r:r};
  [a,b].forEach(function(src){
    var p=src.p||{}, n=src.n||{};
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
          var d=snap.data()||{}, rem={p:d.p||{},n:d.n||{},r:d.r||0};
          var m=merge(st,rem);
          var changed=JSON.stringify(m)!==JSON.stringify(merge(rem,{p:{},n:{},r:0}));
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
  remote.ref.set({p:st.p,n:st.n,r:st.r}).then(function(){setSync("cloud");}).catch(function(e){
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
function plural(n,w){return n+" "+w+(n>1?"s":"");}
var toastT=null;
function toast(msg){var el=$("#toast");el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){el.hidden=true;},2600);}

/* ---------- views ---------- */
var VIEWS=["home","theme","card","end","bilan"], cur="home";
function show(v){
  VIEWS.forEach(function(x){$("#v-"+x).hidden=(x!==v);});
  cur=v;
  $("#tabs").hidden=!(v==="home"||v==="bilan"||v==="theme");
  $("#actions").hidden=(v!=="card");
  document.querySelectorAll("#tabs button").forEach(function(b){
    var on=b.dataset.go===v||(v==="theme"&&b.dataset.go==="home");
    if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
  });
  window.scrollTo(0,0);
}
function go(v){
  if(v==="home")renderHome();
  if(v==="theme")renderTheme();
  if(v==="bilan")renderBilan();
  show(v);
}
function refresh(){
  if(cur==="home")renderHome();
  else if(cur==="theme")renderTheme();
  else if(cur==="bilan")renderBilan();
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
  document.querySelectorAll("#focus button").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.f===focus));});
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
  $("#cAText").textContent=x.a;
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
function openSheet(){
  var id=curId(), x=Q[id]; sheetFor=id; lastFocus=document.activeElement;
  $("#shCode").textContent=TH[x.t].c+" · "+LVL[x.l];
  $("#shTitle").textContent=x.q;
  $("#shBody").innerHTML=md(x.d);
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

/* ---------- events ---------- */
$("#focus").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;focus=b.dataset.f;try{localStorage.setItem(LSF,focus);}catch(err){}renderHome();});
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
$("#cInfo").addEventListener("click",openSheet);
$("#cMore").addEventListener("click",openSheet);
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
  st.p={};st.r=Date.now();persist();renderBilan();toast("Progression remise à zéro.");
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
  else if(e.key==="i"){openSheet();}
  else if(e.key==="Escape"){stopTimer();go(S?S.from:"home");}
});

/* ---------- boot ---------- */
loadLocal();
renderHome();
show("home");
setSync("pending");
initRemote();
})();
