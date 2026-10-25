// node ekimei-aiueo/tests/strokes.test.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'ekimei.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(js);
const core=js.slice(js.indexOf('/* DATA */'),js.indexOf('/* APP:'));
const {STROKES,SHEETS,TH,TITLES,strokeSamples,judge,normalizeState,recordCompletion,count,level,aidLevel,sheetLevel,selectWords,localDay}=new Function(core+'\nreturn {STROKES,SHEETS,TH,TITLES,strokeSamples,judge,normalizeState,recordCompletion,count,level,aidLevel,sheetLevel,selectWords,localDay};')();
let checks=0;
const check=(name,run)=>{try{run();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};

check('embedded data matches original JSON',()=>assert.deepEqual(STROKES,JSON.parse(fs.readFileSync(path.join(root,'data/strokes-hiragana.json'),'utf8'))));
check('83 original glyphs',()=>assert.equal(Object.keys(STROKES).length,83));
check('19 + 17 + 46 words',()=>assert.deepEqual(SHEETS.map(s=>s.words.length),[19,17,46]));
check('sheet words unique',()=>{for(const s of SHEETS)assert.equal(new Set(s.words).size,s.words.length);});
for(const s of SHEETS)for(const word of s.words)for(const ch of word)check('glyph exists '+ch,()=>assert.ok(STROKES[ch]?.length));
for(const [ch,number]of Object.entries({'と':2,'う':2,'き':4,'よ':2,'あ':3,'ん':1}))check('stroke count '+ch,()=>assert.equal(STROKES[ch].length,number));
for(const [ch,paths]of Object.entries(STROKES))for(const [i,d]of paths.entries()){
  const tag=ch+' #'+(i+1);let points;
  check('valid path '+tag,()=>{
    assert.match(d,/^M/);points=strokeSamples(d);assert.equal(points.length,25);
    for(const p of points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=109&&p.y>=0&&p.y<=109);
  });
  check('forward normal '+tag,()=>assert.equal(judge(points,d).ok,true));
  check('forward wide '+tag,()=>assert.equal(judge(points,d,'wide').ok,true));
  check('reverse rejected '+tag,()=>assert.equal(judge([...points].reverse(),d).ok,false));
  check('wrong start rejected '+tag,()=>assert.equal(judge([{x:points[0].x+40,y:points[0].y},...points.slice(1)],d).why,'start'));
}
check('invalid path rejected',()=>assert.throws(()=>strokeSamples('M1 2c3 4')));
check('unknown path command rejected',()=>assert.throws(()=>strokeSamples('M1 2Q3 4 5 6')));
const line=strokeSamples('M10,20c20,0,40,0,70,0');
check('too few points',()=>assert.equal(judge([line[0],line[24]],line).why,'short'));
check('invalid coordinates',()=>assert.equal(judge([{x:NaN,y:0},...line],line).ok,false));
check('wide is more forgiving',()=>{const offset=line.map(p=>({x:p.x,y:p.y+14}));assert.equal(judge(offset,line).ok,false);assert.equal(judge(offset,line,'wide').ok,true);});
check('end is required',()=>assert.equal(judge([...line.slice(0,-1),{x:120,y:20}],line).why,'end'));
check('coverage is required',()=>assert.equal(judge([line[0],{x:40,y:80},line[24]],line).why,'cover'));
check('reverse middle rejected even with correct endpoints',()=>assert.equal(judge([line[0],...line.slice(1).reverse(),line[24]],line).why,'dir'));
for(const [name,values]of [['thresholds',TH],['titles',TITLES.map(t=>t[0])]])check(name+' strictly increasing',()=>{assert.equal(values[0],0);for(let i=1;i<values.length;i++)assert.ok(values[i]>values[i-1]);});
for(const [c,want]of [[0,0],[4,0],[5,1],[9,1],[10,2],[19,2],[20,3],[40,3]])check('aid boundary '+c,()=>{assert.equal(aidLevel(c,'auto'),want);assert.equal(aidLevel(c,'full'),0);});

let state=normalizeState(null);
check('bad stored data sanitized',()=>{
  assert.deepEqual(normalizeState(null),normalizeState([]));
  const s=normalizeState({counts:{'hira:あ':4,'hira:い':-1,'hira:う':'9','unknown:x':99},days:null,tol:'invalid',voice:'off',aid:null});
  assert.deepEqual(s.counts,{'hira:あ':4});assert.equal(s.tol,'normal');assert.equal(s.voice,'off');assert.equal(s.completed,4);assert.equal(s.aid,'auto');
});
check('word record increments normalized glyphs once',()=>{
  const original=state;state=recordCompletion(state,'tokaido','とうきょう','2026-10-25');
  assert.equal(original.completed,0);assert.equal(state.completed,1);assert.equal(count(state,'tokaido','とうきょう'),1);
  for(const ch of 'とうきよ')assert.equal(count(state,'hira',ch),1);
  assert.equal(count(state,'hira','ょ'),0);assert.deepEqual(state.days,['2026-10-25']);
});
check('repeat practice does not repeat the same day',()=>{state=recordCompletion(state,'tokaido','とうきょう','2026-10-25');assert.equal(state.completed,2);assert.equal(state.days.length,1);assert.equal(count(state,'hira','う'),2);});
check('dakuten and handakuten map to base characters',()=>{state=recordCompletion(state,'names','のぞみ','2026-10-26');assert.equal(count(state,'hira','そ'),1);assert.equal(state.days.length,2);});
check('single kana only counted once',()=>{state=recordCompletion(state,'hira','あ','2026-10-26');assert.equal(count(state,'hira','あ'),1);assert.equal(state.completed,4);});
check('save and reload keeps all state',()=>{state={...state,tol:'wide',aid:'full',autodemo:'off',voice:'off'};assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(state))),state);});
check('prototype counts migrate without double counting',()=>{const legacy={...state};delete legacy.completed;assert.equal(normalizeState(legacy).completed,state.completed);});
check('unknown word cannot create a record',()=>assert.throws(()=>recordCompletion(state,'names','unknown','2026-10-25')));
check('sheet medal is the minimum level',()=>{
  const s=normalizeState(null),sheet=SHEETS[0];for(const w of sheet.words)s.counts['names:'+w]=5;
  assert.equal(sheetLevel(s,sheet),3);s.counts['names:'+sheet.words[0]]=3;assert.equal(sheetLevel(s,sheet),2);
});
check('five distinct words prioritize unpracticed ones',()=>{
  const s=normalizeState(null),sheet=SHEETS[0];for(const w of sheet.words)s.counts['names:'+w]=40;
  for(const w of sheet.words.slice(-5))s.counts['names:'+w]=0;
  const selected=selectWords(sheet,s,()=>.5);assert.equal(selected.length,5);assert.equal(new Set(selected).size,5);assert.deepEqual(selected,sheet.words.slice(-5));
});
check('near the next threshold is prioritized',()=>{
  const s=normalizeState(null),sheet=SHEETS[0];for(const w of sheet.words)s.counts['names:'+w]=10;
  s.counts['names:'+sheet.words.at(-1)]=4;assert.equal(selectWords(sheet,s,()=>.5)[0],sheet.words.at(-1));
});
check('local calendar day',()=>assert.equal(localDay(new Date(2026,9,25,0,15)),'2026-10-25'));
check('station readings match driving game',()=>{
  const driving=fs.readFileSync(path.join(root,'../shinkansen-untenshi/shinkansen.html'),'utf8');
  const data=driving.slice(driving.indexOf('const S='),driving.indexOf('const JP_LAND'));
  const lines=new Function('MAXV',data+';return LINES;')(900);
  assert.deepEqual(SHEETS.find(s=>s.id==='tokaido').words,lines.find(l=>l.id==='tokaido').st.map(s=>s[1]));
});
check('home card is before coming soon',()=>{const home=fs.readFileSync(path.join(root,'../index.html'),'utf8');assert.ok(home.indexOf('href="ekimei-aiueo/ekimei.html"')>0);assert.ok(home.indexOf('href="ekimei-aiueo/ekimei.html"')<home.indexOf('<div class="card soon">'));});
check('no runtime stroke fetch or external application script',()=>{assert.ok(!/<script\s+[^>]*src=/.test(html));assert.ok(!/\bfetch\(/.test(js));});

const artwork=JSON.parse(js.match(/^const ART=(\{[^\n]+\});$/m)[1]);
for(const [id,file]of Object.entries({names:'train-cover',tokaido:'station-cover',hira:'kana-cover',train:'train-character'}))check('embedded artwork matches '+file,()=>{
  const bytes=fs.readFileSync(path.join(root,'assets',file+'.webp'));
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.deepEqual(Buffer.from(artwork[id].split(',')[1],'base64'),bytes);
  if(id==='train'){assert.equal(bytes.toString('ascii',12,16),'VP8X');assert.ok(bytes[20]&0x10,'Train alpha channel is preserved');}
});

const frequency=Object.fromEntries(SHEETS[2].words.map(ch=>[ch,0]));
for(const sheet of SHEETS.slice(0,2))for(const w of sheet.words)for(const ch of w){const base=({が:'か',ぎ:'き',ぐ:'く',げ:'け',ご:'こ',ざ:'さ',じ:'し',ず:'す',ぜ:'せ',ぞ:'そ',だ:'た',ぢ:'ち',づ:'つ',で:'て',ど:'と',ば:'は',び:'ひ',ぶ:'ふ',べ:'へ',ぼ:'ほ',ぱ:'は',ぴ:'ひ',ぷ:'ふ',ぺ:'へ',ぽ:'ほ',ょ:'よ',ゃ:'や',ゅ:'ゆ',っ:'つ'})[ch]||ch;if(base in frequency)frequency[base]++;}
console.log('出題語で登場3回未満の清音（あいうえおシートで単独練習できます）：'+Object.entries(frequency).filter(([,c])=>c<3).map(([ch,c])=>ch+'('+c+')').join('、'));
console.log(checks+' checks passed');
