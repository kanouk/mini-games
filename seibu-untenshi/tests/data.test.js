// せいぶせん うんてんし：データと じこくの ルールを たしかめる テスト
// つかいかた: node tests/data.test.js [seibu.html の パス]
// ページの <script> から データと Trip クラスを とりだして、ブラウザなしで たしかめる。
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'seibu.html');
const html = fs.readFileSync(file, 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
const cut = (from, to) => js.slice(js.indexOf(from), js.indexOf(to));
const lib = new Function(cut('/* ===== データ', '/* ちず用の いち') +
  'return {BASE,ROUTES,TYPES,SERIES,Trip,typeOK,stopsAt,typeRange,restoreSayamaSelection,NUMC,SCENE,TUNNEL,RIVER,CROSSING,UG,UG_PORTAL,CITY,ELEVATED,elevationSection,elevationLevel,elevationAt,undergroundDepth,magicIkebukuro,platformDoorStatus};')();
const { BASE, ROUTES, TYPES, SERIES, Trip, typeOK, stopsAt, typeRange, restoreSayamaSelection, NUMC, SCENE, TUNNEL, RIVER, CROSSING, UG, UG_PORTAL, CITY, ELEVATED, elevationSection, elevationLevel, elevationAt, undergroundDepth, magicIkebukuro, platformDoorStatus } = lib;

let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else { fail++; console.log('NG', name, info || ''); } }

const allNames = new Set();
// 1) えきデータ：なまえ・よみ・ローマじ・ばんごう・キロ・いど・けいど。キロは ふえていく
for (const [id, l] of Object.entries(BASE)) {
  check('line fields ' + id, l.name && l.kana && l.en && l.c && l.sp > 0);
  l.st.forEach((s, i) => {
    allNames.add(s[0]);
    check('station ' + id + ' ' + s[0], s.length === 7 && s[1] && s[2] && typeof s[4] === 'number' && s[5] > 35 && s[5] < 36.2 && s[6] > 138.9 && s[6] < 139.9, JSON.stringify(s));
    check('station number ' + s[0], /^S[A-Z]\d\d$/.test(s[3]) && NUMC[s[3].slice(0, 2)], s[3]);
    if (i > 0) check('km grows ' + id + ' ' + s[0], s[4] > l.st[i - 1][4], s[4]);
  });
}
// おなじ えきは どの ろせんでも おなじ よみ・ばんごう（のりかえ えきは ばんごうが ちがう ことが ある）
const byName = {};
for (const l of Object.values(BASE)) for (const s of l.st) { if (byName[s[0]]) check('same reading ' + s[0], byName[s[0]][1] === s[1] && byName[s[0]][2] === s[2]); else byName[s[0]] = s; }

// 2) しゅべつ：とまる えき・はんい は その ろせんに ある。しゃりょうは ある
for (const R of ROUTES) {
  check('route seg count ' + R.id, R.seg.length === R.st.length - 1);
  R.seg.forEach((g, i) => check('seg dist ' + R.id + ' ' + i, g.d > 0.2 && g.d < 8, g.d));
  const T = TYPES[R.id];
  check('types exist ' + R.id, T && T.length > 0);
  for (const t of T || []) {
    check('type fields ' + R.id + ' ' + t.k, t.k && t.y && t.en && /^#[0-9a-f]{6}$/i.test(t.c) && t.ser && t.ser.length);
    (t.stops || []).forEach(n => check('stop on route ' + R.id + ' ' + t.k + ' ' + n, R.st.some(s => s[0] === n)));
    (t.range || []).forEach(n => check('range on route ' + R.id + ' ' + t.k + ' ' + n, R.st.some(s => s[0] === n)));
    (t.ser || []).forEach(sid => check('series exists ' + sid, !!SERIES[sid]));
    if (t.t) check('time window ' + R.id + ' ' + t.k, t.t[0] >= 240 && t.t[1] <= 1500 && t.t[0] <= t.t[1]);
    // どこか 2えきの あいだで はしれる
    let any = false; const n = R.st.length;
    for (let a = 0; a < n && !any; a++) for (let b = 0; b < n && !any; b++) if (typeOK(R, t, a, b)) any = true;
    check('type usable ' + R.id + ' ' + t.k, any);
  }
}
for (const [id, S] of Object.entries(SERIES)) check('series ' + id, S.name && S.cars > 0 && [1, 2, 3, 4].includes(S.doors) && S.body && S.ui && S.front);
for (const k of [...Object.keys(TUNNEL), ...Object.keys(RIVER), ...Object.keys(UG), ...Object.keys(SCENE)])
  k.split('|').forEach(n => check('scenery station ' + n, allNames.has(n)));
Object.keys(CITY).forEach(n => check('city station ' + n, allNames.has(n)));

// 3) じこくの ルール：じかんは すすむ・はしる じかんの はんい
const fmt = t => { const m = ((Math.round(t) % 1440) + 1440) % 1440; return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };
for (const R of ROUTES) TYPES[R.id].forEach((ty, ti) => {
  const n = R.st.length; const pairs = [];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (typeOK(R, ty, a, b)) pairs.push([a, b]);
  const pick = [pairs[0], pairs[pairs.length - 1], pairs[Math.floor(pairs.length / 2)]];
  for (const [a, b] of pick) for (const start of [0, 720, 9999]) {
    const t = new Trip(R, a, b, start, ti, null);
    const tag = `${R.id} ${ty.k} ${R.st[a][0]}→${R.st[b][0]} ${fmt(t.start)}`;
    check('trip ok ' + tag, t.ok && t.ti === ti);
    check('start window ' + tag, t.start >= t.firstStart() && t.start <= t.lastStart());
    check('series allowed ' + tag, ty.ser.includes(t.ser));
    for (let k = 0; k < t.len * 4; k++) {
      const d = t.depMin(k), ar = t.arrMin(k + 1);
      check('time forward ' + tag + ' k' + k, ar > d, `${fmt(d)}→${fmt(ar)}`);
      check('x forward ' + tag + ' k' + k, t.X(k + 1) > t.X(k) && t.kAt(t.X(k) + 1) === k);
    }
    check('ends stop ' + tag, t.isStop(0) && t.isStop(t.len));
  }
});

// 4) げんじつの とまりかた：よく しられた れい
const R = id => ROUTES.find(r => r.id === id);
const ty = (rid, k) => TYPES[rid].find(t => t.k === k);
const i = (rid, n) => R(rid).st.findIndex(s => s[0] === n);
function stops(rid, k, n) { const r = R(rid), t = ty(rid, k); return stopsAt(r, t, i(rid, n)); }
check('各停 all', R('ikebukuro').st.every((s, j) => j > i('ikebukuro', '飯能') || stops('ikebukuro', '各停', s[0])));
check('準急 passes 中村橋', !stops('ikebukuro', '準急', '中村橋') && stops('ikebukuro', '準急', '練馬') && stops('ikebukuro', '準急', '大泉学園'));
check('通勤準急 passes 石神井公園', !stops('ikebukuro', '通勤準急', '石神井公園') && stops('ikebukuro', '通勤準急', '大泉学園'));
check('快速 passes 大泉学園・保谷', !stops('ikebukuro', '快速', '大泉学園') && !stops('ikebukuro', '快速', '保谷') && stops('ikebukuro', '快速', '東久留米'));
check('通勤急行 passes ひばりヶ丘', !stops('ikebukuro', '通勤急行', 'ひばりヶ丘') && stops('ikebukuro', '通勤急行', '東久留米'));
check('急行 passes 練馬・東久留米', !stops('ikebukuro', '急行', '練馬') && !stops('ikebukuro', '急行', '東久留米') && stops('ikebukuro', '急行', '西所沢'));
check('快速急行 passes 西所沢', !stops('ikebukuro', '快速急行', '西所沢') && stops('ikebukuro', '快速急行', '小手指') && stops('ikebukuro', '快速急行', '正丸'));
check('ちちぶ stops 横瀬', stops('ikebukuro', '特急ちちぶ', '横瀬') && !stops('ikebukuro', '特急ちちぶ', '芦ヶ久保'));
check('むさし ends 飯能', !typeOK(R('ikebukuro'), ty('ikebukuro', '特急むさし'), i('ikebukuro', '池袋'), i('ikebukuro', '西武秩父')));
check('通勤急行 up only', !typeOK(R('ikebukuro'), ty('ikebukuro', '通勤急行'), i('ikebukuro', '池袋'), i('ikebukuro', '飯能')) && typeOK(R('ikebukuro'), ty('ikebukuro', '通勤急行'), i('ikebukuro', '飯能'), i('ikebukuro', '池袋')));
check('新宿線 急行 passes 武蔵関', !stops('shinjuku', '急行', '武蔵関') && stops('shinjuku', '急行', '花小金井'));
check('新宿線 準急 stops 武蔵関', stops('shinjuku', '準急', '武蔵関') && !stops('shinjuku', '準急', '井荻'));
check('小江戸', ['西武新宿', '高田馬場', '東村山', '所沢', '狭山市', '本川越'].every(n => stops('shinjuku', '特急小江戸', n)) && !stops('shinjuku', '特急小江戸', '田無'));
check('拝島ライナー skips 田無', !stops('haijima', '拝島ライナー', '田無') && stops('haijima', '拝島ライナー', '萩山'));
check('S-TRAIN thru', TYPES.yurakucho.filter(t => t.k === 'S-TRAIN').length === 4);
{
  const id = 'sayama-through', route = R(id), services = TYPES[id];
  const a = i(id, '池袋'), b = i(id, '西武球場前');
  const local = ty(id, '各停'), semi = ty(id, '準急');
  const shuttle = R('sayama-local');
  check('狭山線内の駅候補', shuttle.st.map(s => s[0]).join(',') === '西所沢,下山口,西武球場前');
  check('狭山線内は7000系の各停', TYPES[shuttle.id].length === 1 && ty(shuttle.id, '各停')?.ser[0] === '7000');
  for (const [from, to] of [[a, b], [b, a]]) {
    const t = new Trip(route, from, to, 720, services.indexOf(local), null);
    check('池袋〜西武球場前の直通各停 ' + from, t.ok && t.type === local && t.stopCount() === route.st.length);
    const s = new Trip(route, from, to, 720, services.indexOf(semi), null);
    check('池袋〜西武球場前の直通準急 ' + from, s.ok && s.type === semi && s.stopCount() === 13);
  }
  check('狭山線直通準急の停車駅', route.st.every(([name], index) => stopsAt(route, semi, index) ===
    (name === '池袋' || name === '練馬' || index >= i(id, '石神井公園'))));
  const oldShuttle = restoreSayamaSelection({lineId:'sayama',tripA:19,tripB:17,ti:0,ser:'7000'});
  check('旧狭山線内の逆方向を復元', oldShuttle.lineId === shuttle.id && oldShuttle.tripA === 2 && oldShuttle.tripB === 0 && oldShuttle.ti === 0 && oldShuttle.ser === '7000');
  ['急行', '特急', '各停', '準急'].forEach((name, index) => {
    const saved = restoreSayamaSelection({lineId:'sayama',tripA:0,tripB:19,ti:index+1});
    check('旧直通の種別を復元 ' + name, saved.lineId === id && saved.tripA === a && saved.tripB === b && services[saved.ti]?.k === name);
  });
}
// 「○○から さきは かくえき」
{ const r = R('ikebukuro'), t = new Trip(r, 0, i('ikebukuro', '飯能'), 720, TYPES.ikebukuro.indexOf(ty('ikebukuro', '急行')), null);
  check('allFrom 所沢', t.st(t.allFrom(0))[0] === '所沢');
  const lt = new Trip(r, 0, i('ikebukuro', '西武秩父'), 720, TYPES.ikebukuro.indexOf(ty('ikebukuro', '特急ちちぶ')), null);
  check('no allFrom for 特急', lt.allFrom(0) === -1); }

// 高架：共通区間・上り下り・折返しと、地上への滑らかな接続。
{
  const train = (id, a, b) => new Trip(R(id), i(id, a), i(id, b), 720, 0);
  const t = train('ikebukuro', '江古田', '大泉学園');
  check('江古田は地上', elevationAt(t, 0) === 0);
  check('桜台は高架', elevationAt(t, t.X(1)) === 1);
  check('練馬は高架', elevationAt(t, t.X(2)) === 1);
  check('大泉学園ホームは地上', elevationAt(t, t.X(t.len)) === 0);
  check('池袋線の帰りも高架', elevationAt(t, t.X(t.len + 1)) === 1);
  check('勾配の途中は中間の高さ', elevationLevel({a:4.75,b:4.91,from:4.75,to:12.2}, .5) > .49 && elevationLevel({a:4.75,b:4.91,from:4.75,to:12.2}, .5) < .51);
  for (const id of ['yurakucho', 'toshima', 'sayama-through']) {
    const r=R(id),a=i(id,'練馬'),b=i(id,'桜台');
    if(a>=0&&b>=0)check('共通の高架 '+id,elevationLevel(elevationSection(r,a,b),.5)===1);
    else if(a>=0)check('地下から練馬へは高架の本線に接続 '+id,elevationLevel(elevationSection(r,a,a+1),.5)===1);
  }
  const down=train('shinjuku','久米川','所沢'),up=train('shinjuku','所沢','久米川');
  check('東村山の下りは高架',elevationAt(down,down.X(1))===1);
  check('東村山の上りは地上',elevationAt(up,up.X(1))===0);
  check('折返した上りは地上',elevationAt(down,down.X(3))===0);
  check('折返した下りは高架',elevationAt(up,up.X(3))===1);
  const branch=train('kokubunji','国分寺','東村山');
  check('未高架化の国分寺線は地上',branch._heights.every(s=>s===null));
  for (const [from,to] of [['新桜台','中村橋'],['中村橋','新桜台'],['新桜台','練馬'],['練馬','新桜台']]) {
    const trip=train('yurakucho',from,to);
    const nerima=trip.X(from==='練馬'?0:1);
    const shin=trip.X(from==='新桜台'?0:trip.len);
    const tunnelPortal=shin+(nerima-shin)*.55;
    const halfway=(tunnelPortal+nerima)/2;
    const mid=elevationAt(trip,halfway);
    check('練馬のホーム全体が高架 '+from+'→'+to,[-310,0,310].every(dx=>elevationAt(trip,nerima+dx)===1));
    check('新桜台側のトンネル出口と勾配 '+from+'→'+to,elevationAt(trip,tunnelPortal+Math.sign(shin-nerima))===0&&mid>0&&mid<1);
    let prev=elevationAt(trip,0);
    let smooth=true;
    for(let px=10;px<=trip._D;px+=10){
      const next=elevationAt(trip,px);
      if(Math.abs(next-prev)>=.02)smooth=false;
      prev=next;
    }
    check('練馬の通過と折り返しで高さが飛ばない '+from+'→'+to,smooth);
  }
  const toshimaBranch=train('toshima','練馬','豊島園');
  const toshimaThrough=train('toshima','豊島園','桜台');
  for(const trip of [toshimaBranch,toshimaThrough]){
    for(let k=0;k<=trip.len*2;k++){
      const station=trip.st(k)[0];
      const expected=station==='豊島園'?0:1;
      check('豊島線のホーム全体が水平 '+station,[-310,0,310].every(dx=>elevationAt(trip,trip.X(k)+dx)===expected));
    }
    let previous=elevationAt(trip,0),smooth=true;
    for(let x=10;x<=trip._D;x+=10){
      const level=elevationAt(trip,x);
      if(Math.abs(previous-level)>.02)smooth=false;
      previous=level;
    }
    check('豊島線の往復で線路の高さが飛ばない',smooth);
  }
  const subway=train('yurakucho','練馬','小竹向原');
  check('練馬は地上より上', undergroundDepth(subway,0)===0&&elevationAt(subway,0)===1);
  for(const k of [1,2,3])check('地下ホームの全体が同じ深さ '+k,[-310,0,310].every(dx=>undergroundDepth(subway,subway.X(k)+dx)===1));
  let previous=0,continuous=true;
  for(let x=10;x<=subway._D;x+=10){
    const depth=undergroundDepth(subway,x);
    if(Math.abs(previous-depth)>.02||depth*elevationAt(subway,x)>1e-8)continuous=false;
    previous=depth;
  }
  check('地下と高架を段差なく往復',continuous);
  for (const trip of [t,down,up,branch,train('shinjuku','久米川','東村山')]) {
    let last=elevationAt(trip,-1000);
    for(let x=-990;x<=trip._D+1000;x+=10){const h=elevationAt(trip,x);
      check('高さは0〜1',Number.isFinite(h)&&h>=0&&h<=1);
      check('勾配・折返しで高さが飛ばない',Math.abs(h-last)<.06);
      check('周回しても同じ地形',Math.abs(h-elevationAt(trip,x+trip._D))<1e-8);last=h;
    }
  }
  // 本番と同じ踏切生成処理を実行して、高架・勾配上には作られないことを確認。
  const features = cut('function pairKey(k)', '/* ---------- 保存');
  const makeFeatures = new Function('trip','elevationAt','TUNNEL','UG','UG_PORTAL','RIVER','CROSSING',
    'const st=k=>trip.st(k),idx=k=>trip.idx(k),X=k=>trip.X(k),kAt=x=>trip.kAt(x),kNear=x=>Math.round(x);const hash=i=>.5;'+features+';return feat;');
  let groundCrossings=0;
  for(const trip of [t,down,up,branch,subway,toshimaThrough]){const feature=makeFeatures(trip,elevationAt,TUNNEL,UG,UG_PORTAL,RIVER,CROSSING);
    for(let k=0;k<trip.len*4;k++)for(const x of feature(k).cr){groundCrossings++;check('踏切は必ず地上',elevationAt(trip,x)===0);}}
  check('地上の踏切は残る',groundCrossings>0);
  // 踏切は行きと帰りで同じ場所。練馬〜豊島園は豊島園の手前に必ず1つ。
  {const R=ROUTES.find(r=>r.id==='toshima'),a=R.st.findIndex(s=>s[0]==='練馬'),trip=new Trip(R,a,a+1,600,0),feature=makeFeatures(trip,elevationAt,TUNNEL,UG,UG_PORTAL,RIVER,CROSSING);
    const gap=trip.X(1)-trip.X(0),out=feature(0).cr.map(x=>x-trip.X(0)),back=feature(1).cr.map(x=>gap-(x-trip.X(1)));
    check('練馬〜豊島園に踏切が1つ',out.length===1&&Math.abs(out[0]/gap-.8)<1e-9);
    check('帰りも同じ場所に踏切',back.length===1&&Math.abs(back[0]-out[0])<1e-6);}
}

// 2026-11-06 の設置状況。駅名だけで決められない番線も両方向で確認する。
{
  const tripFor = (id, from, to, type = '各停') => {
    const R = ROUTES.find(route => route.id === id);
    const idx = name => R.st.findIndex(station => station[0] === name);
    return new Trip(R, idx(from), idx(to), 600, TYPES[id].findIndex(entry => entry.k === type));
  };
  const stationK = (trip, name) => Array.from({length: trip.len + 1}, (_, k) => k)
    .find(k => trip.st(k)[0] === name);
  for (const trip of [
    tripFor('toshima', '池袋', '豊島園'),
    tripFor('toshima', '豊島園', '池袋')
  ]) {
    const k = stationK(trip, '池袋');
    check('Ikebukuro platform 1 from ' + trip.st(0)[0], magicIkebukuro(trip,k) && platformDoorStatus(trip,k) === 'none');
    check('Toshimaen itself has no platform doors', platformDoorStatus(trip,stationK(trip,'豊島園')) === 'none');
  }
  for (const [id, from, to, station, expected, type] of [
    ['toshima','池袋','練馬','池袋','active'],
    ['ikebukuro','池袋','飯能','池袋','active'],
    ['ikebukuro','池袋','飯能','池袋','none','特急むさし'],
    ['sayama-through','池袋','西武球場前','池袋','none','特急'],
    ['ikebukuro','練馬','練馬高野台','富士見台','installed'],
    ['ikebukuro','練馬高野台','練馬','富士見台','active'],
    ['ikebukuro','富士見台','練馬高野台','富士見台','installed'],
    ['shinjuku','久米川','所沢','東村山','active'],
    ['shinjuku','所沢','久米川','東村山','none'],
    ['kokubunji','国分寺','東村山','東村山','none'],
    ['seibuen','東村山','西武園','東村山','none'],
    ['tamako','国分寺','多摩湖','国分寺','active'],
    ['yurakucho','練馬','小竹向原','小竹向原','active'],
    ['yurakucho','小竹向原','練馬','新桜台','none']
  ]) {
    const trip = tripFor(id, from, to, type);
    const k = stationK(trip,station);
    check(`doors ${from}→${to} ${station} ${type || 'Local'}`,
      trip.ok && trip.type.k === (type || '各停') && !magicIkebukuro(trip,k) && platformDoorStatus(trip,k) === expected);
  }
  const withDoors = new Set();
  for (const R of ROUTES) {
    for (const [a,b] of [[0,R.st.length-1],[R.st.length-1,0]]) {
      const trip = new Trip(R,a,b,600,0);
      for (let k=0;k<=trip.len;k++) if (platformDoorStatus(trip,k)!=='none') withDoors.add(trip.st(k)[0]);
    }
  }
  const expected = ['池袋','練馬','中村橋','富士見台','練馬高野台','石神井公園','保谷','所沢','西武新宿','高田馬場','東村山','新所沢','国分寺','小竹向原'];
  check('only confirmed stations have doors', withDoors.size === expected.length && expected.every(name => withDoors.has(name)), [...withDoors]);
}
console.log(`pass ${pass} / fail ${fail}`);
process.exit(fail ? 1 : 0);
