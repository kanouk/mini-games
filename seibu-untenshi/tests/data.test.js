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
  'return {BASE,ROUTES,TYPES,SERIES,Trip,typeOK,stopsAt,typeRange,NUMC,SCENE,TUNNEL,RIVER,UG,CITY};')();
const { BASE, ROUTES, TYPES, SERIES, Trip, typeOK, stopsAt, typeRange, NUMC, SCENE, TUNNEL, RIVER, UG, CITY } = lib;

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

console.log(`pass ${pass} / fail ${fail}`);
process.exit(fail ? 1 : 0);
