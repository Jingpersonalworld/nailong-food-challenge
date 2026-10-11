(function(){
 'use strict';
 const {Game,CONFIG,TYPES}=SnackCore;
 const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
 const model=new Game(),images={},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let loaded=false,last=0,clock=0,feedback=0,bitterFeedback=0,floats=[],lastSecond=45,celebrationFrozen=false;
 let soundOn=true,audio=null,volume=null,activeSounds=new Set();
 function unlockAudio(){try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();volume=audio.createGain();volume.gain.value=.16;volume.connect(audio.destination);}if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{soundOn=false;$('sound').textContent='♫ 音效不可用';$('sound').setAttribute('aria-pressed','false');}}
 function quiet(){for(const o of activeSounds)try{o.stop();}catch{}activeSounds.clear();}
 function tone(frequency,duration=.15,delay=0,type='sine',end=frequency){if(!soundOn||!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(volume);o.start(t);o.stop(t+duration+.015);activeSounds.add(o);o.onended=()=>{activeSounds.delete(o);o.disconnect();g.disconnect();};}
 function sound(kind){if(kind==='fire')tone(220,.17,0,'sine',450);if(kind==='catch')tone(640,.08);if(kind==='eat'){tone(660,.13);tone(880,.15,.09);}if(kind==='bitter'){tone(210,.25,0,'triangle',80);tone(150,.22,.18,'triangle',65);}if(kind==='miss')tone(260,.1,0,'sine',170);if(kind==='tick')tone(720,.05);if(kind==='win')[523,659,784,1046,1318,1046].forEach((n,i)=>tone(n,.27,i*.15,'triangle'));if(kind==='lose'){tone(330,.25);tone(220,.35,.2);}}
 function announce(text){$('announcer').textContent=text;}
 function clearEffects(){floats=[];feedback=0;bitterFeedback=0;quiet();lastSecond=45;celebrationFrozen=false;document.body.classList.remove('frozen');}
 function start(){if(!loaded)return;unlockAudio();clearEffects();model.start();$('home').hidden=true;$('paused').hidden=true;$('result').hidden=true;$('result').className='overlay result';$('pause').disabled=false;$('retry').disabled=false;canvas.focus({preventScroll:true});last=performance.now();updateHUD();announce('挑战开始！45秒内吃到120美味值。');}
 function pause(reason='时间和动作已暂停，准备好再继续。'){if(model.pause()){$('paused').hidden=false;$('pause-reason').textContent=reason;$('pause').textContent='▶ 继续';quiet();document.body.classList.add('frozen');$('resume').focus({preventScroll:true});updateHUD();}else if(model.status==='won'&&!$('result').hidden){celebrationFrozen=true;document.body.classList.add('frozen');quiet();$('pause').disabled=false;$('pause').textContent='▶ 继续庆祝';}}
 function resume(){if(model.resume()){$('paused').hidden=true;$('pause').textContent='Ⅱ 暂停';document.body.classList.remove('frozen');unlockAudio();last=performance.now();canvas.focus({preventScroll:true});updateHUD();}else if(celebrationFrozen){celebrationFrozen=false;document.body.classList.remove('frozen');$('pause').textContent='Ⅱ 暂停';$('pause').disabled=true;}}
 function togglePause(){if(model.status==='paused'||celebrationFrozen)resume();else pause();}
 function fire(){if(model.fire()){unlockAudio();drainEvents();updateHUD();}}
 function showResult(win){$('paused').hidden=true;$('result').hidden=false;$('result').className='overlay result '+(win?'winning':'losing');$('pause').disabled=true;$('pause').textContent='Ⅱ 暂停';$('final-score').textContent=model.score;$('result-tag').textContent=win?'美味任务 · 大成功':'美味任务 · 再来一次';$('result-title').textContent=win?'奶娃，开怀大笑！':'再一口，就更接近！';$('result-description').textContent=win?'美味超能力觉醒，快乐加倍！':'这次的美食之旅也很棒。看准方向，下次一定更拿手！';$('final-note').textContent=win?`提前达标 · 还剩 ${Math.ceil(model.timeLeft)} 秒`:`目标 120 分 · 还差 ${120-model.score} 分`;$('again').focus({preventScroll:true});announce(win?`挑战成功，${model.score}美味值，奶龙变成奶娃！`:`时间到，${model.score}美味值，可以再玩一次。`);}
 function drainEvents(){for(const e of model.events.splice(0)){sound(e.type);if(e.type==='eat'||e.type==='bitter'){feedback=.55;if(e.type==='bitter')bitterFeedback=1;floats.push({text:(e.points>0?'+':'')+e.points,x:500,y:105,life:1.1,color:e.points>0?'#d88338':'#729a4b'});announce(TYPES[e.item.type].label+'，当前'+e.score+'美味值');}if(e.type==='win'||e.type==='lose')showResult(e.type==='win');}}
 function updateHUD(){const second=Math.ceil(Math.max(0,model.timeLeft));$('time').textContent=second;$('score').textContent=model.score;$('progress').value=model.score;$('timer-panel').classList.toggle('urgent',second<=10&&model.status==='running');$('timer-note').textContent=second<=10&&model.status==='running'?'最后几口，加油！':'慢慢瞄准，抓住美味';const labels={ready:'美食已经准备好了',paused:'稍作休息 · 时间已停',won:'目标达成 · 快乐变身',lost:'本轮结束 · 欢迎再来',running:model.phase==='aim'?'看准方向 · 点击或空格出舌':model.phase==='extend'?'弹力舌头 · 寻找美食':model.phase==='retract'?'美味回家 · 到嘴才计分':'苦瓜来啦 · 打结 1 秒'};$('stage-status').textContent=labels[model.status];$('hint').textContent=model.phase==='stunned'&&model.status==='running'?'苦苦苦！舌头打结了，等 1 秒再开吃。':'✦ 看准方向，再伸舌头。美食回到嘴里才计分。';if(second<lastSecond&&second<=10&&model.status==='running')sound('tick');lastSecond=second;}
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function star(x,y,r,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,d=i%2?r*.32:r;ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);}ctx.closePath();ctx.fill();ctx.restore();}
 function background(){
  const g=ctx.createLinearGradient(0,0,0,760);g.addColorStop(0,'#fff1d5');g.addColorStop(.38,'#fff7e6');g.addColorStop(1,'#f4e3c1');ctx.fillStyle=g;ctx.fillRect(0,0,1000,760);
  const sun=ctx.createRadialGradient(500,95,10,500,95,250);sun.addColorStop(0,'#ffe7a899');sun.addColorStop(1,'#ffe7a800');ctx.fillStyle=sun;ctx.fillRect(230,0,540,300);
  ctx.fillStyle='#eddec14a';ctx.beginPath();ctx.moveTo(0,254);ctx.bezierCurveTo(140,182,230,228,370,249);ctx.bezierCurveTo(610,290,800,172,1000,237);ctx.lineTo(1000,760);ctx.lineTo(0,760);ctx.fill();
  // Quiet picnic-cloth texture stays beneath targets and never resembles food.
  ctx.strokeStyle='#e4cfa32b';ctx.lineWidth=1;for(let y=310;y<760;y+=38){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}for(let x=0;x<=1000;x+=38){ctx.beginPath();ctx.moveTo(x,280);ctx.lineTo(x,760);ctx.stroke();}
  ellipse(500,253,139,16,'#cba25f1c');ellipse(500,245,126,12,'#fffaf0');
  ctx.strokeStyle='#eadbbf';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(500,245,126,12,0,0,Math.PI*2);ctx.stroke();
  star(119,131,9,'#e9bf7870');star(868,142,12,'#e9bf7870');star(894,91,6,'#e9bf7850');
  ctx.font='11px "Microsoft YaHei", sans-serif';ctx.fillStyle='#bd9e70';ctx.textAlign='center';ctx.fillText('零 食 乐 园',500,716);
  ctx.fillStyle='#dabc8530';for(const [x,y,r] of [[35,690,9],[952,659,8],[63,285,5],[929,276,6]])ellipse(x,y,r,r,'#dabc8530');
 }
 function food(item,x=item.x,y=item.y,carried=false){const im=images[item.type];if(!im)return;ctx.save();if(carried){ctx.translate(x,y);ctx.rotate(Math.sin(clock*9)*.05);x=0;y=0;}else ellipse(x,y+item.height/2+4,item.width*.36,4,'#aa824325');ctx.drawImage(im,x-item.width/2,y-item.height/2,item.width,item.height);ctx.restore();}
 function character(){const origin=CONFIG.mouth;ctx.save();ctx.translate(origin.x,origin.y);let sx=1,sy=1,rot=0;if(!reduced){if(model.phase==='extend'){sx=1.025;sy=.97;rot=-Math.sin(model.angle)*.025;}else if(model.phase==='retract'){sx=.98;sy=1.025;rot=Math.sin(model.angle)*.025;}else{sx=1+Math.sin(clock*2.5)*.008;sy=1-Math.sin(clock*2.5)*.006;}if(feedback>0){sx+=Math.sin(feedback*30)*feedback*.065;sy-=Math.sin(feedback*30)*feedback*.05;}if(bitterFeedback>0)rot+=Math.sin(clock*42)*.045*bitterFeedback;}ctx.rotate(rot);ctx.scale(sx,sy);if(images.nailong)ctx.drawImage(images.nailong,-78,-60,156,203);ctx.restore();
  if(bitterFeedback>0){ctx.font='bold 19px "Microsoft YaHei",sans-serif';ctx.fillStyle='#69934d';ctx.textAlign='center';ctx.fillText('苦～',500,55);for(let i=0;i<3;i++)star(465+i*35,77+Math.sin(clock*6+i)*4,5,'#8bad6477');}
 }
 function tongue(){const {x,y}=CONFIG.mouth,dx=Math.sin(model.angle),dy=Math.cos(model.angle),len=model.length,ex=x+dx*len,ey=y+dy*len;ctx.save();
  if(model.phase==='aim'){
   ctx.strokeStyle='#cd9d6766';ctx.lineWidth=2;ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(x+dx*25,y+dy*25);ctx.lineTo(x+dx*126,y+dy*126);ctx.stroke();ctx.setLineDash([]);const tipx=x+dx*135,tipy=y+dy*135;ctx.translate(tipx,tipy);ctx.rotate(-model.angle);ctx.fillStyle='#d69b6199';ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-6,-4);ctx.lineTo(6,-4);ctx.closePath();ctx.fill();ctx.restore();return;
  }
  if(model.phase==='stunned'){
   ctx.strokeStyle='#efa0ac';ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-5,y+9,x-18,y+18,x-4,y+28);ctx.bezierCurveTo(x+17,y+45,x+24,y+5,x+6,y+17);ctx.bezierCurveTo(x-14,y+30,x+4,y+46,x+17,y+37);ctx.stroke();ctx.strokeStyle='#ffd5db';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-7,y+23);ctx.quadraticCurveTo(x,y+17,x+10,y+26);ctx.stroke();ctx.restore();return;
  }
  if(len>0){
   // The tip follows the exact collision ray; only the soft shaft bends.
   const bend=reduced?0:Math.sin(clock*8)*Math.min(10,len*.025),cx=x+dx*len*.55+dy*bend,cy=y+dy*len*.55-dx*bend;
   ellipse(x,y+1,10,6,'#74412b');ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=15;ctx.strokeStyle='#e991a0';ctx.beginPath();ctx.moveTo(x,y+1);ctx.quadraticCurveTo(cx,cy,ex,ey);ctx.stroke();ctx.lineWidth=11;ctx.strokeStyle='#f4b0bb';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(cx,cy-1,ex,ey);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#ffdde399';ctx.beginPath();ctx.moveTo(x,y-3);ctx.quadraticCurveTo(cx,cy-3,ex,ey-3);ctx.stroke();ellipse(ex,ey,8,8,'#f1a4b3');if(model.caught)food(model.caught,ex,ey,true);
  }
  ctx.restore();
 }
 function draw(){const ratio=Math.min(devicePixelRatio||1,2),w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(canvas.width/1000,0,0,canvas.height/760,0,0);background();for(const item of model.items)food(item);character();tongue();for(const f of floats){ctx.globalAlpha=Math.min(1,f.life*2);ctx.font='bold 29px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle=f.color;ctx.fillText(f.text,f.x+70,f.y-(1.1-f.life)*55);ctx.globalAlpha=1;}}
 function frame(now){let dt=last?Math.max(0,(now-last)/1000):0;last=now;const active=model.status==='running';if(active){if(dt>.5){pause('画面刚刚中断，已为你暂停。点击继续，不会丢失挑战时间。');dt=0;}else{model.step(dt);feedback=Math.max(0,feedback-dt);bitterFeedback=Math.max(0,bitterFeedback-dt);floats=floats.filter(f=>(f.life-=dt)>0);clock+=dt;drainEvents();}}else if(model.status==='ready'&&!document.hidden)clock+=Math.min(dt,.05);draw();updateHUD();requestAnimationFrame(frame);}
 $('start').addEventListener('click',start);$('retry').addEventListener('click',start);$('again').addEventListener('click',start);$('restart-paused').addEventListener('click',start);$('resume').addEventListener('click',resume);$('pause').addEventListener('click',togglePause);
 $('sound').addEventListener('click',()=>{soundOn=!soundOn;if(soundOn)unlockAudio();else quiet();$('sound').textContent=soundOn?'♫ 音效开':'♫ 音效关';$('sound').setAttribute('aria-pressed',String(soundOn));});
 $('back-home').addEventListener('click',()=>{clearEffects();model.status='ready';model.timeLeft=45;model.score=0;model.items=[];model.phase='aim';model.caught=null;model.length=0;$('result').hidden=true;$('home').hidden=false;$('pause').disabled=true;$('retry').disabled=true;$('start').focus({preventScroll:true});updateHUD();});
 canvas.addEventListener('pointerdown',e=>{if(e.button===0){canvas.focus({preventScroll:true});fire();}});
 window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&e.target.tagName!=='BUTTON'&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();fire();}else if(e.code==='Escape'&&!e.repeat){e.preventDefault();togglePause();}});
 window.addEventListener('blur',()=>pause('窗口已离开，时间和动作都停住了。回来后点击继续。'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('页面暂时不可见，已自动暂停。回来后点击继续。');});
 Promise.all(['nailong','milk','ice','burger','chicken','naiwa','laugh','bitter'].map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[name]=im;resolve();};im.onerror=()=>reject(new Error(name+'.png'));im.src='assets/'+name+'.png';}))).then(()=>{loaded=true;$('start').disabled=false;$('start').innerHTML='开饭啦！<span>→</span>';}).catch(e=>{$('asset-error').hidden=false;$('error-detail').textContent='缺失或损坏：'+e.message;});
 requestAnimationFrame(frame);
 // Expose the real state for developer tests; no hidden gameplay advantages.
 window.SnackApp={model,start,pause,resume,draw,get loaded(){return loaded;}};
})();
