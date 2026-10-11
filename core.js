/* Rules are independent of the browser: all distances use the same virtual pixels. */
(function(root){
 'use strict';
 const CONFIG=Object.freeze({width:1000,height:760,mouth:Object.freeze({x:500,y:138}),speed:360,maxAngle:1.04,swingSpeed:.65,duration:45,goal:120});
 const TYPES=Object.freeze({milk:{label:'奶茶',points:10,width:46,height:86},chicken:{label:'炸鸡腿',points:15,width:50,height:92},ice:{label:'彩虹冰淇淋',points:20,width:38,height:90},burger:{label:'汉堡',points:25,width:82,height:76},bitter:{label:'苦瓜',points:-10,width:82,height:32}});
 function seededRandom(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function random(rng){return Math.min(.999999999,Math.max(0,rng()));}
 function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function validateLayout(items){const errors=[];for(let i=0;i<items.length;i++){const a=items[i];if(a.x-a.width/2<14||a.x+a.width/2>986||a.y-a.height/2<260||a.y+a.height/2>726)errors.push('bounds:'+a.id);if(Math.abs(Math.atan2(a.x-500,a.y-138))>CONFIG.maxAngle)errors.push('unreachable:'+a.id);for(let j=0;j<i;j++){const b=items[j];if(Math.abs(a.x-b.x)<(a.width+b.width)/2+8&&Math.abs(a.y-b.y)<(a.height+b.height)/2+8)errors.push('overlap:'+a.id+','+b.id);}}return errors;}
 function generateLayout(rng=Math.random,forceFallback=false){
  const types=[];for(const [t,n] of [['milk',5],['chicken',5],['ice',4],['burger',1+Math.floor(random(rng)*2)],['bitter',6]])for(let k=0;k<n;k++)types.push(t);
  const slots=[];for(const y of [370,485,600])for(const x of y===370?[155,255,355,455,555,655,755,855]:[95,210,325,440,560,675,790,905])slots.push({x,y});
  shuffle(types,rng);shuffle(slots,rng);
  const high=t=>t==='ice'||t==='burger';
  const highIndices=types.map((t,i)=>high(t)?i:-1).filter(i=>i>=0);
  if(new Set(highIndices.map(i=>Math.sign(slots[i].x-500))).size<2){const first=highIndices[0];const other=types.findIndex((t,i)=>!high(t)&&Math.sign(slots[i].x-500)!==Math.sign(slots[first].x-500));[types[first],types[other]]=[types[other],types[first]];}
  const scales=types.map(t=>t==='bitter'?1:.9+random(rng)*.2);
  function create(jitter){return types.map((type,id)=>{const t=TYPES[type],slot=slots[id],x=slot.x+(jitter?(random(rng)-.5)*14:0),y=slot.y+(jitter?(random(rng)-.5)*18:0),scale=scales[id],width=t.width*scale,height=t.height*scale;return{id,type,x,y,width,height,rx:width/2,ry:height/2,scale,rotation:0};});}
  if(!forceFallback)for(let attempt=0;attempt<40;attempt++){const items=create(true);if(!validateLayout(items).length)return items;}
  const backup=create(false);if(validateLayout(backup).length)throw new Error('备用布局校验失败');return backup;
 }
 function segmentHit(ax,ay,bx,by,item){
  const x=(ax-item.x)/item.rx,y=(ay-item.y)/item.ry,dx=(bx-ax)/item.rx,dy=(by-ay)/item.ry;
  const c=x*x+y*y-1;if(c<=0)return 0;const a=dx*dx+dy*dy;if(a===0)return null;
  const b=2*(x*dx+y*dy),disc=b*b-4*a*c;if(disc<0)return null;const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
 }
 function rayBoundary(angle){const dx=Math.sin(angle),dy=Math.cos(angle);return Math.min((CONFIG.height-14-138)/dy,dx>0?(CONFIG.width-14-500)/dx:dx<0?(14-500)/dx:Infinity);}
 class Game{
  constructor({rng=Math.random,speed=CONFIG.speed}={}){this.rng=rng;this.speed=speed;this.status='ready';this.timeLeft=45;this.score=0;this.items=[];this.phase='aim';this.angle=-.65;this.direction=1;this.length=0;this.caught=null;this.stunLeft=0;this.elapsed=0;this.events=[];}
  start(){this.items=generateLayout(this.rng);this.status='running';this.timeLeft=45;this.score=0;this.phase='aim';this.angle=-.65;this.direction=1;this.length=0;this.caught=null;this.stunLeft=0;this.elapsed=0;this.events=[];}
  fire(){if(this.status!=='running'||this.phase!=='aim')return false;this.phase='extend';this.length=0;this.events.push({type:'fire'});return true;}
  pause(){if(this.status!=='running')return false;this.status='paused';return true;}
  resume(){if(this.status!=='paused')return false;this.status='running';return true;}
  step(dt){if(this.status!=='running'||!Number.isFinite(dt)||dt<=0)return;let left=Math.min(dt,120);while(left>1e-10&&this.status==='running'){let d=Math.min(left,1/120);if(this.phase==='retract'&&this.length>0)d=Math.min(d,this.length/this.speed);left-=d;this.tick(d);}}
  tick(dt){
   if(this.timeLeft<=dt+1e-9){this.elapsed+=this.timeLeft;this.timeLeft=0;this.status='lost';this.caught=null;this.events.push({type:'lose',score:this.score});return;}
   this.timeLeft-=dt;this.elapsed+=dt;
   if(this.phase==='stunned'){this.stunLeft=Math.max(0,this.stunLeft-dt);if(this.stunLeft<1e-9){this.stunLeft=0;this.phase='aim';}return;}
   if(this.phase==='aim'){this.angle+=this.direction*CONFIG.swingSpeed*dt;if(this.angle>CONFIG.maxAngle){this.angle=2*CONFIG.maxAngle-this.angle;this.direction=-1;}else if(this.angle<-CONFIG.maxAngle){this.angle=-2*CONFIG.maxAngle-this.angle;this.direction=1;}return;}
   const dx=Math.sin(this.angle),dy=Math.cos(this.angle);
   if(this.phase==='extend'){
    const end=Math.min(this.length+this.speed*dt,rayBoundary(this.angle)),ax=500+dx*this.length,ay=138+dy*this.length,bx=500+dx*end,by=138+dy*end;let hit=null,first=Infinity;
    for(const item of this.items){const t=segmentHit(ax,ay,bx,by,item);if(t!==null&&t<first){first=t;hit=item;}}
    if(hit){this.length+=(end-this.length)*first;this.caught=hit;this.items=this.items.filter(i=>i!==hit);this.phase='retract';this.events.push({type:'catch',item:hit});}
    else{this.length=end;if(end>=rayBoundary(this.angle)-1e-8){this.phase='retract';this.events.push({type:'miss'});}}
   }else if(this.phase==='retract'){
    this.length=Math.max(0,this.length-this.speed*dt);if(this.length<1e-7)this.length=0;
    if(this.length===0){const food=this.caught;this.caught=null;this.phase='aim';if(food){const points=TYPES[food.type].points;this.score=Math.max(0,this.score+points);this.events.push({type:points<0?'bitter':'eat',item:food,points,score:this.score});if(points<0){this.phase='stunned';this.stunLeft=1;}else if(this.score>=CONFIG.goal){this.status='won';this.events.push({type:'win',score:this.score});}}}
   }
  }
 }
 const api={CONFIG,TYPES,seededRandom,generateLayout,validateLayout,segmentHit,rayBoundary,Game};root.SnackCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
