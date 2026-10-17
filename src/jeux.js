/* ---------- jeux : modules 2 à 7 ---------- */
var MODS=[
  {id:"quiz",no:2,n:"Quiz pièges",d:"4 réponses dont des distracteurs crédibles. L'explication tombe tout de suite.",hu:1,xp:8,unit:"questions"},
  {id:"port",no:3,n:"Analyse de portefeuille",d:"Repère les anomalies, interprète les KPI, décide s'il faut escalader.",hu:2,xp:15,unit:"fonds"},
  {id:"deci",no:4,n:"Décisions et escalade",d:"Tu es le Portfolio Oversight Manager. Chaque décision ouvre une nouvelle étape.",hu:3,xp:15,unit:"incidents"},
  {id:"kpi",no:6,n:"Atelier KPI et scorecards",d:"Classe les indicateurs, fixe des seuils, note un délégataire.",hu:4,xp:10,unit:"ateliers"},
  {id:"chal",no:7,n:"Oversight Challenge",d:"Des scénarios réalistes avec leurs chiffres. Ta première réaction compte.",hu:5,xp:12,unit:"scénarios"}
];
var CS={quiz:[],port:[],deci:[],kpi:[],chal:[]}, CBY={};
function addCase(m,o){o.m=m;o.id=m+"-"+(CS[m].length+1);CS[m].push(o);CBY[o.id]=o;}
QZ.forEach(function(r){addCase("quiz",{tag:r[0],label:r[1],q:r[1],o:r[2],exp:r[3]});});
CH.forEach(function(r){addCase("chal",{tag:r[0],label:r[1],title:r[1],sub:r[2],text:r[3],tiles:r[4],q:r[5],o:r[6],exp:r[7]});});
PF.forEach(function(r){addCase("port",{tag:r[0],label:r[1],title:r[1],ctx:r[2],tiles:r[3],flags:r[4],o:r[5],exp:r[6]});});
DC.forEach(function(r){addCase("deci",{tag:r[0],label:r[1],title:r[1],intro:r[2],steps:r[3]});});
AT.forEach(function(r){
  var k=r[0];
  if(k==="classer")addCase("kpi",{tag:"Classer",k:k,label:r[1],title:r[1],intro:r[2],items:r[3]});
  else if(k==="seuil")addCase("kpi",{tag:"Seuils",k:k,label:r[1],title:r[1],text:r[2],q:r[3],o:r[4],exp:r[5],tiles:[]});
  else addCase("kpi",{tag:"Notation",k:k,label:r[1],title:r[1],ctx:r[2],rows:r[3],ans:r[4],exp:r[5]});
});
function MOD(id){return MODS.filter(function(x){return x.id===id;})[0];}
function mdone(id){var v=st.m[id];return !!v&&v[0]>=70;}
function msave(id,score){var v=st.m[id];st.m[id]=[Math.max(score,v?v[0]:0),(v?v[1]:0)+1,Date.now()];persist();}
function mstat(id){return st.m[id]?(mdone(id)?2:1):0;}

/* hub */
function renderMods(){
  var h='<button type="button" class="mcard" data-m="path" style="--f:#46a302;--e:#377d02"><span class="mno">1</span><span class="mt"><span class="mh">Flashcards</span><span class="md">'+visIds(ORDER).length+' questions avec réponse courte et explication détaillée</span></span>'+CHEV+'</button>';
  MODS.forEach(function(m){
    var hu=HUES[m.hu%HUES.length], cs=CS[m.id], d=cs.filter(function(c){return mdone(c.id);}).length;
    h+='<button type="button" class="mcard" data-m="'+m.id+'" style="--f:'+hu[0]+';--e:'+hu[1]+'"><span class="mno">'+m.no+'</span><span class="mt"><span class="mh">'+esc(m.n)+'</span><span class="md">'+esc(m.d)+'</span><span class="mini"><i style="width:'+(cs.length?d/cs.length*100:0)+'%"></i></span></span><span class="cnt">'+d+"/"+cs.length+"</span>"+CHEV+"</button>";
  });
  $("#mList").innerHTML=h;
}
var curMod=null, modTag="all", modOpen={};
function modCases(){return CS[curMod].filter(function(c){return modTag==="all"||c.tag===modTag;});}
function renderMod(){
  var m=MOD(curMod), all=CS[curMod], cs=modCases();
  var d=all.filter(function(c){return mdone(c.id);}).length, t=all.filter(function(c){return st.m[c.id];}).length;
  $("#mTag").textContent="Module "+m.no; $("#mTitle").textContent=m.n; $("#mDesc").textContent=m.d;
  $("#mBar").innerHTML=bar({g:d,a:t-d,u:all.length-t,n:all.length});
  $("#mStat").textContent=d+" réussis sur "+all.length+" · "+(t-d)+" à retenter · "+(all.length-t)+" non joués";
  var tags=[], seen={}; all.forEach(function(c){if(!seen[c.tag]){seen[c.tag]=1;tags.push(c.tag);}});
  $("#mTags").innerHTML=tags.length>1?['all'].concat(tags).map(function(g){return '<button type="button" class="tg" data-tag="'+esc(g)+'" aria-pressed="'+(g===modTag)+'">'+(g==="all"?"Tous":esc(g))+"</button>";}).join(""):"";
  var n=Math.min(5,cs.length);
  $("#mPlay").textContent=n?"Jouer une série de "+n:"Aucun cas"; $("#mPlay").disabled=!n;
  var open=!!modOpen[curMod];
  $("#mTog").setAttribute("aria-expanded",String(open)); $("#mCases").hidden=!open;
  $("#mTogN").textContent=" ("+cs.length+")";
  $("#mCases").innerHTML=cs.map(function(c){var s=mstat(c.id);return '<button type="button" class="prow" data-id="'+c.id+'"><span class="dt s'+s+'" role="img" aria-label="'+(s===2?"réussi":s===1?"à retenter":"non joué")+'">'+(s===2?CHECK:"")+'</span><span class="pq"><span class="pt">'+esc(c.label)+"</span><small>"+esc(c.tag)+(st.m[c.id]?" · meilleur score "+st.m[c.id][0]+"%":"")+"</small></span></button>";}).join("");
}
function seriesIds(cs,n){
  var a=shuffle(cs.filter(function(c){return !st.m[c.id];})), b=shuffle(cs.filter(function(c){return st.m[c.id]&&!mdone(c.id);})), c2=shuffle(cs.filter(function(c){return mdone(c.id);}));
  return a.concat(b,c2).slice(0,n).map(function(c){return c.id;});
}

/* moteur de partie */
var G=null, doneTo="path", LET=["A","B","C","D"], BK=["KPI","KRI","Contrôle","Escalade"], RATE=["Vert · suivi normal","Ambre · surveillance renforcée","Rouge · plan d'action et escalade"];
function startGame(mid,ids,back){
  if(!ids.length)return;
  G={m:mid,ids:ids,i:0,sum:0,n:0,xp:0,back:back||"mod",pm:null};
  show("game"); gRender();
}
function gc(){return CBY[G.ids[G.i]];}
function gProg(done){$("#gProg").style.width=((G.i+(done?1:0))/G.ids.length*100)+"%";$("#gCount").textContent=(G.i+1)+" / "+G.ids.length;}
function gBody(h,keep){$("#gBody").innerHTML=h;if(!keep)window.scrollTo(0,0);}
function gFoot(h,cls){var f=$("#gFoot");f.hidden=!h;f.className="lfoot"+(cls?" "+cls:"");$("#gIn").innerHTML=h||"";}
function gScrollTo(id){var el=document.getElementById(id);if(el)setTimeout(function(){el.scrollIntoView({block:"nearest",behavior:"smooth"});},60);}
function tilesHtml(t){return t&&t.length?'<div class="tiles">'+t.map(function(x){return '<div class="tile"><span>'+esc(x[0])+'</span><b class="t-'+(x[2]||"n")+'">'+esc(x[1])+"</b></div>";}).join("")+"</div>":"";}
function scnHtml(c,sub,text,pill){
  return '<div class="scn"><div class="scn-h"><h2>'+esc(c.title)+'</h2><span class="pill2">'+esc(pill)+"</span></div>"+(sub?'<p class="scn-sub">'+esc(sub)+"</p>":"")+(text?'<p class="scn-t">'+esc(text)+"</p>":"")+tilesHtml(c.tiles)+"</div>";
}
function optsHtml(arr,perm,cls){
  return '<div class="opts" id="opts">'+perm.map(function(src,k){return '<button type="button" class="opt'+(cls?" "+cls:"")+'" data-o="'+k+'"><span class="rad"></span><span class="ot">'+(cls==="rate"?"":"<b>"+LET[k]+".</b> ")+esc(arr[src])+"</span></button>";}).join("")+"</div>";
}
function expHtml(label,best,exp){return '<div class="lans" id="gx"><div class="alabel">'+label+"</div>"+(best?"<p><b>"+esc(best)+"</b></p>":"")+"<p>"+esc(exp)+"</p></div>";}
function gResult(score,t1,t2){
  var c=gc(), m=MOD(G.m);
  msave(c.id,score);
  var xp=Math.max(2,Math.round(score/100*m.xp)); addXp(xp); G.xp+=xp; G.sum+=score; G.n++;
  var ok=score>=70; gProg(true);
  gFoot('<div class="fb"><div class="fbt">'+esc(t1)+'</div><div class="fbx">'+esc(t2)+" · +"+xp+' XP</div><button type="button" class="pbtn '+(ok?"green":"redf")+'" data-a="next">Continuer</button></div>',ok?"good":"bad");
  vibrate(ok?15:[25,40,25]);
}
function gNext(){if(G.i<G.ids.length-1){G.i++;gRender();}else gEnd();}
function gEnd(){
  var bonus=G.ids.length>1?10:0; if(bonus){G.xp+=bonus;addXp(bonus);}
  var avg=G.n?Math.round(G.sum/G.n):0, after=todayXp(), before=after-G.xp;
  doneTo=G.back==="mod"?"mod":"mods";
  $("#dTitle").textContent=avg>=85?"Excellent !":avg>=70?"Bien joué !":"À retravailler";
  $("#dSub").textContent=MOD(G.m).n+" · "+plural(G.ids.length,"cas");
  $("#dXp").textContent="+"+G.xp; $("#dAcc").textContent=avg+"%"; $("#dStr").textContent=streak();
  $("#dGoal").textContent=(before<DAILY_GOAL&&after>=DAILY_GOAL)?"Objectif du jour atteint : "+DAILY_GOAL+" XP !":after>=DAILY_GOAL?"Objectif du jour déjà atteint.":"Encore "+(DAILY_GOAL-after)+" XP pour ton objectif du jour.";
  show("done"); if(avg>=70){vibrate([20,30,20,30,40]);confetti();}
}
function gRender(){
  var c=gc(); G.pm=null; gProg(false);
  if(c.m==="quiz"||c.m==="chal"||(c.m==="kpi"&&c.k==="seuil"))return mcqStart(c);
  if(c.m==="port")return portStart(c);
  if(c.m==="deci")return deciStart(c);
  if(c.k==="classer")return classStart(c);
  return noterStart(c);
}
var SKIP='<button type="button" class="pbtn ghost" data-a="skip">Passer ce cas</button>';

/* QCM : quiz, challenge, seuils */
function mcqStart(c){
  G.pm={perm:shuffle([0,1,2,3]),done:false};
  var pre="";
  if(c.m==="chal")pre=scnHtml(c,c.sub,c.text,"Cas pratique");
  else if(c.m==="kpi")pre=scnHtml(c,"Atelier KPI · seuils",c.text,"Seuils");
  else pre='<span class="lchip2">'+esc(c.tag)+"</span>";
  gBody(pre+'<h3 class="gq">'+esc(c.q)+"</h3>"+optsHtml(c.o,G.pm.perm)+'<div id="gxw"></div>');
  gFoot(SKIP);
}
function mcqPick(k){
  if(G.pm.done)return; G.pm.done=true;
  var c=gc(), ok=G.pm.perm[k]===0;
  document.querySelectorAll("#opts .opt").forEach(function(b,i){b.disabled=true;if(G.pm.perm[i]===0)b.classList.add("ok");else if(i===k)b.classList.add("ko");});
  $("#gxw").innerHTML=expHtml("Explication","Bonne réponse : "+c.o[0],c.exp);
  gResult(ok?100:0,ok?PRAISE[Math.floor(Math.random()*PRAISE.length)]:"Pas tout à fait",ok?"Réponse exacte":"Relis l'explication");
  gScrollTo("gx");
}

/* Analyse de portefeuille */
function portStart(c){
  var order=shuffle(c.flags.map(function(_,i){return i;}));
  G.pm={order:order,sel:{},stage:0};
  gBody(scnHtml(c,"Scénario fictif · "+c.tag,c.ctx,"Analyse")+'<h3 class="gq">Coche les anomalies et les signaux d\'alerte</h3><p class="help2">Plusieurs réponses possibles. Certaines lignes sont normales.</p><div class="chks" id="chks">'+order.map(function(fi){return '<button type="button" class="chk" data-f="'+fi+'" aria-pressed="false"><span class="box"></span><span class="ot">'+esc(c.flags[fi][0])+'</span></button><p class="why" id="why'+fi+'" hidden></p>';}).join("")+"</div>");
  gFoot('<button type="button" class="pbtn blue" data-a="pval">Valider mon analyse</button>');
}
function portToggle(btn){
  if(G.pm.stage!==0)return; var f=btn.dataset.f, on=btn.getAttribute("aria-pressed")!=="true";
  btn.setAttribute("aria-pressed",String(on)); G.pm.sel[f]=on;
}
function portValidate(){
  var c=gc(), good=0;
  G.pm.stage=1;
  c.flags.forEach(function(f,i){
    var sel=!!G.pm.sel[i], an=!!f[1], right=(sel===an); if(right)good++;
    var b=document.querySelector('.chk[data-f="'+i+'"]'); b.disabled=true; b.classList.add(right?"ok":"ko");
    var verdict=an?(sel?"Bien repéré":"Anomalie manquée"):(sel?"Fausse alerte":"Bien écarté");
    var w=document.getElementById("why"+i); w.hidden=false; w.innerHTML="<b>"+verdict+".</b> "+esc(f[2]);
  });
  G.pm.good=good; G.pm.aScore=Math.round(good/c.flags.length*50);
  gFoot('<div class="fb"><div class="fbt" style="color:var(--pl-ink)">Analyse : '+good+" / "+c.flags.length+' lignes bien jugées</div><button type="button" class="pbtn blue" data-a="pdec">Passer à la décision</button></div>');
  gScrollTo("why"+G.pm.order[0]);
}
function portToDecision(){
  var c=gc(); G.pm.stage=2; G.pm.perm=shuffle([0,1,2,3]); G.pm.done=false;
  gBody(scnHtml(c,"Scénario fictif · "+c.tag,"",  "Décision")+'<div class="lans"><div class="alabel">Ton analyse</div><p>'+G.pm.good+" lignes sur "+c.flags.length+" bien jugées ("+G.pm.aScore+" / 50 points).</p></div><h3 class=\"gq\">Quelle décision prends-tu ?</h3>"+optsHtml(c.o,G.pm.perm)+'<div id="gxw"></div>');
  gFoot(null);
}
function portPick(k){
  if(G.pm.done)return; G.pm.done=true;
  var c=gc(), src=G.pm.perm[k], pts=[50,20,0,0][src], total=G.pm.aScore+pts;
  document.querySelectorAll("#opts .opt").forEach(function(b,i){b.disabled=true;if(G.pm.perm[i]===0)b.classList.add("ok");else if(i===k)b.classList.add(src===1?"mid":"ko");});
  $("#gxw").innerHTML=expHtml("Explication","Meilleure décision : "+c.o[0],c.exp);
  gResult(total,total>=85?"Analyse solide":total>=70?"Plutôt bien vu":total>=40?"À affiner":"Signaux manqués","Analyse "+G.pm.aScore+" / 50 · Décision "+pts+" / 50");
  gScrollTo("gx");
}

/* Décisions et escalade */
function dNext(o){return o[2].length>=30?o[2]:o[1]>=3?"La situation est prise en main et la suite repose sur des faits documentés.":o[1]>=1?"Le sujet est traité en partie, mais une zone de risque reste ouverte.":"Le sujet n'est pas traité : le risque persiste et devient plus difficile à gérer.";}
function dWhy(o){return o[3].length>=30?o[3]:o[1]>=3?"Réponse proportionnée : elle s'appuie sur des faits, passe par la bonne gouvernance et laisse une trace.":o[1]>=1?"Réponse partielle ou disproportionnée : il manque l'analyse, la gouvernance ou une mesure proportionnée.":"Cette option ne répond pas au risque et peut aggraver le manquement.";}
function deciStart(c){
  G.pm={s:0,picks:[],perm:null};
  gBody(scnHtml({title:c.title,tiles:[]},"Incident · "+c.tag,c.intro,"Incident")+'<p class="help2">Tu vas prendre '+c.steps.length+" décisions. Chaque choix ouvre la suite. Les conséquences sont expliquées à la fin.</p>");
  gFoot('<button type="button" class="pbtn green" data-a="dstart">Commencer</button>');
}
function deciStep(){
  var c=gc(), s=G.pm.s, step=c.steps[s];
  G.pm.perm=shuffle(step[1].map(function(_,i){return i;}));
  var prev=s>0?dNext(c.steps[s-1][1][G.pm.picks[s-1]]):"";
  gBody((prev?'<div class="lans"><div class="alabel">Entre-temps</div><p>'+esc(prev)+"</p></div>":"")+'<span class="lchip2">Décision '+(s+1)+" sur "+c.steps.length+'</span><h3 class="gq">'+esc(step[0])+"</h3>"+'<div class="opts" id="opts">'+G.pm.perm.map(function(src,k){return '<button type="button" class="opt" data-o="'+k+'"><span class="rad"></span><span class="ot">'+esc(step[1][src][0])+"</span></button>";}).join("")+"</div>");
  gFoot(null);
}
function deciPick(k){
  var c=gc(), s=G.pm.s; if(G.pm.picks[s]!==undefined)return;
  G.pm.picks[s]=G.pm.perm[k];
  var b=document.querySelectorAll("#opts .opt")[k]; if(b)b.classList.add("sel");
  setTimeout(function(){if(s<c.steps.length-1){G.pm.s++;deciStep();}else deciEnd();},180);
}
function deciEnd(){
  var c=gc(), tot=0, max=0, h="";
  c.steps.forEach(function(step,i){
    var best=0, bi=0; step[1].forEach(function(o,j){if(o[1]>best){best=o[1];bi=j;}});
    var p=G.pm.picks[i], o=step[1][p]; tot+=o[1]; max+=best;
    h+='<div class="rcp"><div class="rcp-h"><span>Décision '+(i+1)+'</span><span class="bdg b'+(o[1]>=best?"3":o[1]>0?"2":"0")+'">'+o[1]+" / "+best+'</span></div><p class="rq">'+esc(step[0])+'</p><p><b>Ton choix :</b> '+esc(o[0])+'</p><p class="rw">'+esc(dWhy(o))+"</p>"+(p!==bi?'<p class="rb"><b>Meilleur choix :</b> '+esc(step[1][bi][0])+" "+esc(dWhy(step[1][bi]))+"</p>":"")+"</div>";
  });
  var score=Math.round(tot/max*100), last=dNext(c.steps[c.steps.length-1][1][G.pm.picks[c.steps.length-1]]);
  gBody('<div class="scn"><div class="scn-h"><h2>Bilan de l\'incident</h2><span class="pill2">'+score+' %</span></div><p class="scn-sub">'+esc(c.title)+'</p><p class="scn-t"><b>Dénouement.</b> '+esc(last)+"</p></div>"+h+'<div id="gx"></div>');
  gResult(score,score>=85?"Gestion exemplaire":score>=70?"Gestion solide":score>=40?"Gestion perfectible":"Gestion risquée",tot+" / "+max+" points de décision");
}

/* Atelier : classer */
function classStart(c){
  G.pm={sel:[],done:false};
  gBody('<span class="lchip2">Classer</span><h3 class="gq">'+esc(c.title)+'</h3><div class="lans"><p>'+esc(c.intro)+'</p><p class="leg"><b>KPI</b> mesure la performance ou l\'atteinte d\'un objectif. <b>KRI</b> signale un risque qui monte. <b>Contrôle</b> est une vérification ou une action planifiée. <b>Escalade</b> est un événement qui déclenche une remontée immédiate.</p></div>'+c.items.map(function(it,i){return '<div class="citem"><p>'+esc(it[0])+'</p><div class="bks">'+BK.map(function(b,k){return '<button type="button" class="bk" data-i="'+i+'" data-b="'+k+'" aria-pressed="false">'+b+"</button>";}).join("")+'</div><p class="why" id="cw'+i+'" hidden></p></div>';}).join("")+'<div id="gx"></div>');
  gFoot('<button type="button" class="pbtn blue" data-a="cval" disabled>Valider</button>');
}
function classPick(btn){
  if(G.pm.done)return; var i=+btn.dataset.i, b=+btn.dataset.b;
  G.pm.sel[i]=b;
  document.querySelectorAll('.bk[data-i="'+i+'"]').forEach(function(x){x.setAttribute("aria-pressed",String(+x.dataset.b===b));});
  var c=gc(), all=c.items.every(function(_,j){return G.pm.sel[j]!==undefined;});
  var v=document.querySelector('[data-a="cval"]'); if(v)v.disabled=!all;
}
function classValidate(){
  var c=gc(), good=0; G.pm.done=true;
  c.items.forEach(function(it,i){
    var ok=G.pm.sel[i]===it[1]; if(ok)good++;
    document.querySelectorAll('.bk[data-i="'+i+'"]').forEach(function(x){var k=+x.dataset.b;x.disabled=true;if(k===it[1])x.classList.add("ok");else if(k===G.pm.sel[i])x.classList.add("ko");});
    var w=document.getElementById("cw"+i); w.hidden=false; w.innerHTML="<b>"+(ok?"Exact":"Réponse : "+BK[it[1]])+".</b> "+esc(it[2]);
  });
  var score=Math.round(good/c.items.length*100);
  gResult(score,score>=85?"Bien classé":score>=70?"Presque":"À retravailler",good+" / "+c.items.length+" indicateurs bien classés");
  gScrollTo("cw0");
}

/* Atelier : notation d'un délégataire */
function noterStart(c){
  G.pm={done:false};
  gBody('<div class="scn"><div class="scn-h"><h2>'+esc(c.title)+'</h2><span class="pill2">Notation</span></div><p class="scn-sub">Atelier KPI · scorecard</p><p class="scn-t">'+esc(c.ctx)+'</p><div class="rtab">'+c.rows.map(function(r){return '<div class="rrow"><span class="rk">'+esc(r[0])+'</span><b class="t-'+(r[3]||"n")+'">'+esc(r[1])+'</b><span class="rs">'+esc(r[2])+"</span></div>";}).join("")+'</div></div><h3 class="gq">Quelle note attribues-tu à ce délégataire ?</h3>'+optsHtml(RATE,[0,1,2],"rate")+'<div id="gxw"></div>');
  gFoot(SKIP);
}
function noterPick(k){
  if(G.pm.done)return; G.pm.done=true;
  var c=gc(), d=Math.abs(k-c.ans), score=d===0?100:d===1?40:0;
  document.querySelectorAll("#opts .opt").forEach(function(b,i){b.disabled=true;if(i===c.ans)b.classList.add("ok");else if(i===k)b.classList.add(d===1?"mid":"ko");});
  $("#gxw").innerHTML=expHtml("Explication","Note attendue : "+RATE[c.ans],c.exp);
  gResult(score,d===0?"Bonne note":d===1?"Note proche":"Note éloignée",d===0?"Note exacte":"Écart d'un cran");
  gScrollTo("gx");
}

/* événements des jeux */
function gOpt(k){
  var c=gc(); if(!c)return;
  if(c.m==="deci")deciPick(k);
  else if(c.m==="port"){if(G.pm.stage===2)portPick(k);}
  else if(c.m==="kpi"&&c.k==="noter")noterPick(k);
  else mcqPick(k);
}
$("#gBody").addEventListener("click",function(e){
  if(!G)return;
  var o=e.target.closest(".opt"); if(o&&!o.disabled){gOpt(+o.dataset.o);return;}
  var ck=e.target.closest(".chk"); if(ck&&!ck.disabled){portToggle(ck);return;}
  var bk=e.target.closest(".bk"); if(bk&&!bk.disabled){classPick(bk);}
});
$("#gFoot").addEventListener("click",function(e){
  var b=e.target.closest("button[data-a]"); if(!b||b.disabled||!G)return;
  var a=b.dataset.a;
  if(a==="next"||a==="skip")gNext();
  else if(a==="pval")portValidate();
  else if(a==="pdec")portToDecision();
  else if(a==="dstart")deciStep();
  else if(a==="cval")classValidate();
});
$("#gClose").addEventListener("click",function(){go(G&&G.back==="mod"?"mod":"mods");});
$("#mList").addEventListener("click",function(e){
  var b=e.target.closest("[data-m]"); if(!b)return;
  if(b.dataset.m==="path"){go("path");return;}
  curMod=b.dataset.m; modTag="all"; go("mod");
});
$("#mBack").addEventListener("click",function(){go("mods");});
$("#mTags").addEventListener("click",function(e){var b=e.target.closest("[data-tag]");if(!b)return;modTag=b.dataset.tag;renderMod();});
$("#mPlay").addEventListener("click",function(){startGame(curMod,seriesIds(modCases(),5),"mod");});
$("#mTog").addEventListener("click",function(){modOpen[curMod]=!modOpen[curMod];renderMod();});
$("#mCases").addEventListener("click",function(e){var b=e.target.closest("[data-id]");if(b)startGame(curMod,[b.dataset.id],"mod");});

