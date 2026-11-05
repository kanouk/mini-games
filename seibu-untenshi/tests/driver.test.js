const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../seibu.html'),'utf8');
const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
const {Trip,ROUTES,elevationAt}=new Function(cut('/* ===== データ','/* ちず用の いち')+'return {Trip,ROUTES,elevationAt};')();
const R=ROUTES[0],index=n=>R.st.findIndex(s=>s[0]===n);
const t=new Trip(R,index('大泉学園'),index('ひばりヶ丘'),600,0,'40000');
const api=vm.runInNewContext(`
 let trip,said=[],busy=false,state='stopped',bellT=0;const FRONT=290;
 const X=k=>trip.X(k),speechBusy=()=>busy,playClip=n=>said.push(n),bell=()=>{},led=()=>{};
 ${cut('function depart(){','/* ---------- のりおりする ひと')}
 ${cut('let DOORS=[];','/* しゅべつ・いきさき')}
 ({driverChangeAt,prepareDriverWaiting,beginDriverChange,updateDriverChange,depart,get waiting(){return waitingDriver},get change(){return driverChange},get said(){return said},get state(){return state},
 setup(t){trip=t;driverChange=null;waitingDriver=null;said=[];busy=false;state='stopped'},speech(b){busy=b}})
`,{Math});
let checks=0;function check(n,ok){assert(ok,n);checks++;}
api.setup(t);
check('保谷に停車する列車が対象',api.driverChangeAt(t,1));
check('他駅では交代しない',!api.driverChangeAt(t,2));
api.prepareDriverWaiting(1);const waiting=api.waiting.person,waitingX=waiting.X;
check('到着前から先頭の運転台のそばで待つ',waiting.driver&&waiting.kind==='driverWait'&&waiting.a===1&&waitingX===t.X(1)+290-35-22);
api.updateDriverChange(2);check('列車が来るまでは動かない',waiting.X===waitingX&&api.change===null);
api.prepareDriverWaiting(1);check('同じ駅の待機する人を作り直さない',api.waiting.person===waiting);
const express=new Trip(R,0,index('飯能'),600,5);
const hoya=express.line.st.findIndex(s=>s[0]==='保谷');
check('保谷を通過する急行は対象外',!express.isStop(hoya)&&!api.driverChangeAt(express,hoya));
api.beginDriverChange(1);api.depart();
check('待っていた人が位置を変えずに交代へ移る',api.change.next===waiting&&waiting.X===waitingX&&api.waiting===null);
check('交代中の手動発車を止める',api.state==='stopped');
api.speech(true);api.updateDriverChange(2);
check('到着案内の途中では挨拶を待つ',api.said.length===0&&!api.change.started);
check('到着案内中も待機する人を表示する',api.change.next.a===1&&api.change.next.X===waitingX);
api.speech(false);api.updateDriverChange(.1);api.updateDriverChange(.6);
check('男性の挨拶は一度だけ開始する',api.said.join(',')==='handover');
api.updateDriverChange(1);check('交代する人が運転台へ歩く',api.change.next.kind==='toDoor'&&api.change.next.X>waitingX&&api.change.next.X<api.change.door);
api.updateDriverChange(1.5);check('運転台に着いた人が乗り込む',api.change.next.X===api.change.door&&api.change.next.yo<0&&api.change.next.a<1);
for(let j=0;j<90;j++)api.updateDriverChange(.05);
check('交代が終わって発車できる',api.change===null);api.depart();check('通常の発車ベルへ進む',api.state==='bell');
check('毎フレーム挨拶を繰り返さない',api.said.length===1);
api.setup(t);api.beginDriverChange(1);api.speech(true);
for(let j=0;j<260;j++)api.updateDriverChange(.05);
check('音声が終わらない端末でも交代が完了する',api.change===null);
api.setup(t);api.beginDriverChange(3);check('折返しの保谷でも交代できる',!!api.change);
api.setup(t);api.prepareDriverWaiting(2);check('他駅には運転士を待機させない',api.waiting===null);
api.prepareDriverWaiting(1);api.prepareDriverWaiting(2);check('次の停車駅が変わったら待機を片づける',api.waiting===null);
api.setup(express);api.prepareDriverWaiting(hoya);check('通過する保谷には運転士を待機させない',api.waiting===null);
for(let j=0;j<=100;j++)check('大泉学園〜保谷は地上 '+j,elevationAt(t,t.X(1)*j/100)===0);
// 埋め込み音声と編集元ファイルが一致し、無音時は再生開始しない。
const audio=vm.runInNewContext(`let AC=null,master={},soundOn=false,started=0;${cut('// 音声は埋め込み。','function ensureAudio(){')}
 ({data:CLIP_DATA,playClip,setup(on){soundOn=on;AC={createBufferSource(){return {connect(){},disconnect(){},start(){started++}}}};clipBuffers.ah={};},get started(){return started}})`);
for(const [name,file] of [['ah','passenger-ah.mp3'],['handover','driver-handover.mp3']])check('埋め込み音声の一致 '+name,Buffer.from(audio.data[name],'base64').equals(fs.readFileSync(path.join(__dirname,'../assets',file))));
audio.setup(false);check('ミュート中は声を開始しない',!audio.playClip('ah')&&audio.started===0);
audio.setup(true);check('音ありなら即時に再生する',audio.playClip('ah')&&audio.started===1);
check('未読み込み音声を後から遅れて鳴らさない',!audio.playClip('handover')&&audio.started===1);
console.log(`driver/audio: ${checks} checks passed`);
