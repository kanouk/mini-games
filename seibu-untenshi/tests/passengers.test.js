// 乗降処理を本番HTMLから取り出し、乱数と時間だけを制御して確認する。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../seibu.html'),'utf8');
const source=html.slice(html.indexOf('let DOORS=[];'),html.indexOf('/* しゅべつ・いきさき'));
let seed=7,depth=0,rotations=0,checks=0;
const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
const ctx={save(){depth++;},restore(){depth--;},rotate(a){assert(Number.isFinite(a));rotations++;}};
for(const name of ['translate','fillRect','beginPath','arc','fill','moveTo','lineTo','stroke'])ctx[name]=(...args)=>assert(args.every(x=>typeof x!=='number'||Number.isFinite(x)));
const api=vm.runInNewContext(`
  let pos=0,state='stopped',doorAnim=1,stopT=5;const bw=1000,reduced=false;let calls=[];function playClip(name){calls.push(name);}
  const X=k=>k*10000,kNear=x=>Math.round(x/10000),isEnd=()=>false,railY=()=>100;function rr(){}
  ${source}
  ({person,pickStumbler,stumblePose,spawnWaiting,spawnAlight,paxBusy,doorBusy,paxUpdate,drawPeople,markPlatformDeparture,
    get people(){return people},set people(p){people=p},get calls(){return calls},
    setup(o={}){state=o.state??'stopped';pos=o.pos??0;doorAnim=o.doorAnim??1;stopT=o.stopT??5;DOORS=o.doors??[0,100];}})
`,{Math:math,ctx});
function check(name,ok){assert(ok,name);checks++;}
const make=(x=-20,kind='wait',door=0)=>api.person(x,kind,door,0,0);
const p=make();api.people=[p];p.willTrip=true;
api.paxUpdate(.05);check('乗車する人はまずドアへ向かう',p.kind==='toDoor');
api.paxUpdate(.05);check('選ばれた人だけが転ぶ',p.kind==='stumble'&&!p.willTrip&&p.fallDir===-1);
check('転んだ瞬間に声を再生する',api.calls.join(',')==='ah');
check('転んでも乗降待ちが終わらなくならない',!api.paxBusy()&&!api.doorBusy(0));
for(let j=0;j<36;j++)api.paxUpdate(.05);
check('起き上がって乗り遅れる',p.kind==='missed'&&p.a===1&&p.X===-20);
check('転んでいる間に声を繰り返さない',api.calls.length===1);
api.setup({stopT:100});for(let j=0;j<200;j++)api.paxUpdate(.05);
check('長く停車していても今回の電車には乗らない',p.kind==='missed'&&p.X===-20);
api.markPlatformDeparture(0);api.spawnWaiting(1);
check('次の駅の人を生成しても見送る人は残る',p.departed&&api.people.includes(p));
check('次の駅の待つ人は今の発車を妨げない',!api.paxBusy());
api.setup({state:'running',doorAnim:0});for(let j=0;j<53;j++)api.paxUpdate(.05);
check('見送った後はホームを歩いて離れる',p.kind==='away'&&p.dir===-1);

api.setup();const ordinary=make();api.people=[ordinary];
for(let j=0;j<45;j++)api.paxUpdate(.05);
check('通常の人はこれまで通り乗車できる',!api.people.includes(ordinary));
const alighting=make(0,'inside');api.people=[alighting];
api.paxUpdate(.05);check('降車中の人は発車待ちの対象',alighting.kind==='exit'&&api.paxBusy()&&api.doorBusy(0));
for(let j=0;j<10;j++)api.paxUpdate(.05);
check('降車が終わると発車待ちから外れる',alighting.kind==='away'&&!api.paxBusy());
const closed=make();api.people=[closed];api.setup({doorAnim:0});api.paxUpdate(1);
check('閉まったドアには乗り込まない',closed.kind==='wait');
const distant=make();distant.kind='stumble';api.people=[distant];api.setup({pos:2100});api.paxUpdate(.05);
check('画面から離れた演出は片づける',api.people.length===0);

const eligible=[make(-20),make(120,'wait',100)];let selected=0;
for(let j=0;j<1000;j++){let n=0;const result=api.pickStumbler(eligible,()=>n++===0?(j+.5)/1000:0);if(result)selected++;}
check('転ぶ頻度は停車ごとに8%',selected===80);
check('乗る人がいない駅では発生しない',api.pickStumbler([],()=>0)===null);
check('降りる人は選ばれない',api.pickStumbler([make(0,'inside')],()=>0)===null);
check('ドア直前やホームの端の人は選ばれない',api.pickStumbler([make(-3),make(-275,'wait',-260)],()=>0)===null);
api.setup({doors:[-250,-150,-50,50,150,250]});
for(let j=0;j<300;j++){api.people=[];api.spawnWaiting(0);check('1停車で転ぶのは最大1人',api.people.filter(p=>p.willTrip).length<=1);}
check('転ぶ動きは最後に元の姿勢へ戻る',api.stumblePose(0)===0&&api.stumblePose(.5)===1&&api.stumblePose(1.8)===0);
check('動きを減らす設定では途中の回転を抑える',api.stumblePose(.1,true)===api.stumblePose(1,true)&&api.stumblePose(1.5,true)===0);
api.setup();const fallen=make(-20);fallen.kind='stumble';fallen.fallDir=-1;fallen.t=.5;
const missed=make(20);missed.kind='missed';missed.fallDir=1;missed.departed=true;missed.leaveT=.5;
api.people=[fallen,missed];api.drawPeople(0);
check('回転した後に描画状態を必ず元へ戻す',depth===0&&rotations>0);
console.log(`passengers: ${checks} checks passed`);
