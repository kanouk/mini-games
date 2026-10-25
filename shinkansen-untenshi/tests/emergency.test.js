// 緊急停止から運転再開まで、ゲーム本体の状態遷移を確かめる。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'shinkansen.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(js); // ページ全体の構文も確認する。
const source = js.slice(js.indexOf('/* ---------- きんきゅう ていし'), js.indexOf('/* ---------- え ---------- */'));
function game() {
  return new Function(`
    let state='running',v=100,pos=100,target=1,segEstop=false,busy=false;
    const SP=1000,JOINT=100,AC=null,banner={hidden:true},messages=[];
    const canEmergency=()=>state==='running'||state==='braking';
    const stopSpeech=()=>{},led=()=>{},carChime=()=>{},paxUpdate=()=>{};
    const announce=(...args)=>messages.push(args),speechBusy=()=>busy;
    const showBanner=()=>{banner.hidden=false;},$=()=>banner;
    const st=()=>['品川'],fmt=String,arrMin=()=>400,arrive=()=>{state='stopped';};
    let hornT=0,crewT=0;
    ${source}
    return {reasons:EREASONS,emergency,update,waitSeconds:emergencyWaitSeconds,
      snapshot:()=>({state,v,pos,delay,estT,estWait,est,segEstop,bannerHidden:banner.hidden,messages}),
      busy:value=>{busy=value;},
      nearStation:()=>{pos=999.9;v=900;state='braking';}};
  `)();
}

// 遅れと待ち時間は対数で対応し、長い遅れほど増え方が緩やかになる。
{
  const wait=game().waitSeconds;
  assert.equal(wait(3),7);
  assert.equal(wait(8),11);
  assert.equal(wait(90),23);
  assert.ok(wait(90)-wait(30)<wait(30)-wait(3));
}

// 人身事故は停止後に90分の遅れが付き、23秒までは再開しない。
{
  const g=game(),reason=g.reasons.find(r=>r.t==='じんしんじこ');
  g.emergency(reason);g.update(1);
  assert.equal(g.snapshot().state,'estopWait');
  assert.equal(g.snapshot().delay,90);
  assert.equal(g.snapshot().v,0);
  assert.equal(g.snapshot().bannerHidden,false);
  assert.match(g.snapshot().messages[0][0],/じんしんじこ.*きゅうご.*90ぷん/);
  const pos=g.snapshot().pos;
  g.emergency(g.reasons[1]); // 待機中の再操作で理由・タイマーを変えない。
  g.update(22.5);
  assert.equal(g.snapshot().state,'estopWait');
  assert.equal(g.snapshot().pos,pos);
  assert.equal(g.snapshot().delay,90);
  g.update(0.5);
  assert.equal(g.snapshot().state,'running');
  assert.equal(g.snapshot().v,0);
  assert.equal(g.snapshot().bannerHidden,true);
  assert.match(g.snapshot().messages[1][0],/90ふん おくれて/);
}

// 読み上げ終了を待つ場合も最大32秒で再開する。
{
  const g=game();g.emergency(g.reasons[0]);g.update(1);g.busy(true);
  g.update(31.5);assert.equal(g.snapshot().state,'estopWait');
  g.update(0.5);assert.equal(g.snapshot().state,'running');
}

// 駅直前のブレーキ中でも到着処理で見合わせを飛ばさない。
{
  const g=game();g.nearStation();g.emergency(g.reasons[0]);g.update(0.05);
  assert.equal(g.snapshot().state,'estopWait');
  assert.equal(g.snapshot().delay,90);
  assert.ok(g.snapshot().pos<1000);
  assert.equal(g.snapshot().v,0);
}

// 既存の理由は3〜8分の遅れを維持し、今回の遅れに応じた秒数で再開する。
for(const reason of game().reasons.slice(1)) {
  const g=game();g.emergency(reason);g.update(1);
  assert.ok(g.snapshot().delay>=3&&g.snapshot().delay<=8);
  const wait=g.snapshot().estWait;
  assert.ok(wait>=7&&wait<=11);
  g.update(wait-0.5);assert.equal(g.snapshot().state,'estopWait');
  g.update(0.5);assert.equal(g.snapshot().state,'running');
}
assert.equal(game().reasons.length,9);
assert.ok(!html.includes('おまかせ'));
console.log('Emergency stop checks passed');
