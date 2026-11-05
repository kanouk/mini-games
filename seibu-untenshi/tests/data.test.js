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
  'return {BASE,ROUTES,TYPES,SERIES,Trip,typeOK,stopsAt,typeRange,NUMC,SCENE,TUNNEL,RIVER,UG,CITY,ELEVATED,elevationSection,elevationLevel,elevationAt};')();
const { BASE, ROUTES, TYPES, SERIES, Trip, typeOK, stopsAt, typeRange, NUMC, SCENE, TUNNEL, RIVER, UG, CITY, ELEVATED, elevationSection, elevationLevel, elevationAt } = lib;

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
  for (const id of ['yurakucho', 'toshima', 'sayama']) {
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
  const makeFeatures = new Function('trip','elevationAt','TUNNEL','UG','RIVER',
    'const st=k=>trip.st(k),idx=k=>trip.idx(k),X=k=>trip.X(k),kAt=x=>trip.kAt(x),kNear=x=>Math.round(x);const hash=i=>.5;'+features+';return feat;');
  let groundCrossings=0;
  for(const trip of [t,down,up,branch]){const feature=makeFeatures(trip,elevationAt,TUNNEL,UG,RIVER);
    for(let k=0;k<trip.len*4;k++)for(const x of feature(k).cr){groundCrossings++;check('踏切は必ず地上',elevationAt(trip,x)===0);}}
  check('地上の踏切は残る',groundCrossings>0);
}

console.log(`pass ${pass} / fail ${fail}`);
process.exit(fail ? 1 : 0);
