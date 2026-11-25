// 埋め込み音声（つまずいた人の「あっ！」）が assets の元ファイルと同じで、音なしのときは鳴らないことを確かめる。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../yamanote.html'),'utf8');
const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
let checks=0;function check(n,ok){assert(ok,n);checks++;}
const audio=vm.runInNewContext(`let AC=null,master={},soundOn=false,started=0;${cut('// 音声は埋め込み。','function ensureAudio(){')}
 ({data:CLIP_DATA,playClip,setup(on){soundOn=on;AC={createBufferSource(){return {connect(){},disconnect(){},start(){started++}}}};clipBuffers.ah={};},get started(){return started}})`);
check('埋め込み音声は「あっ！」だけ',Object.keys(audio.data).join(',')==='ah');
check('埋め込み音声の一致 ah',Buffer.from(audio.data.ah,'base64').equals(fs.readFileSync(path.join(__dirname,'../assets/passenger-ah.mp3'))));
audio.setup(false);check('ミュート中は声を開始しない',!audio.playClip('ah')&&audio.started===0);
audio.setup(true);check('音ありなら即時に再生する',audio.playClip('ah')&&audio.started===1);
check('ない音声は鳴らさない',!audio.playClip('handover')&&audio.started===1);
console.log(`audio: ${checks} checks passed`);
