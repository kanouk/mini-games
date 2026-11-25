// やまのてせん うんてんし：駅データ・環状運転・時刻のルールを確かめるテスト
// つかいかた: node tests/data.test.js
// ページの <script> から データと Trip クラスを とりだして、ブラウザなしで たしかめる。
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'yamanote.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
const cut = (from, to) => js.slice(js.indexOf(from), js.indexOf(to));
const lib = new Function(cut('/* ===== データ', '/* ちず用の いち') +
  'return {BASE,ROUTES,TYPES,SERIES,DEF,Trip,NUMC,SCENE,CITY,RIVER,CROSSING,ELEVATED,LOOP_KM,TRANSFER,HUBS,pk2,elevationAt,platformDoorStatus,stIndex};')();
const { BASE, ROUTES, TYPES, SERIES, DEF, Trip, NUMC, SCENE, CITY, RIVER, CROSSING, LOOP_KM, TRANSFER, HUBS, pk2, elevationAt, platformDoorStatus, stIndex } = lib;

let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else { fail++; console.log('NG', name, info === undefined ? '' : info); } }
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// 1) 駅：30駅、JY01〜JY30 の順、キロは増えていき、一周 34.5km
const L = BASE.yamanote, S = L.st, N = S.length;
check('30 stations', N === 30, N);
S.forEach((s, i) => {
  check('fields ' + s[0], s.length === 7 && s[1] && s[2] && typeof s[4] === 'number' && s[5] > 35.6 && s[5] < 35.75 && s[6] > 139.69 && s[6] < 139.79, JSON.stringify(s));
  check('number ' + s[0], s[3] === 'JY' + String(i + 1).padStart(2, '0') && NUMC.JY, s[3]);
  if (i > 0) check('km grows ' + s[0], s[4] > S[i - 1][4]);
});
check('unique names', new Set(S.map(s => s[0])).size === N);
const R = ROUTES[0];
check('one loop route', ROUTES.length === 1 && R.loop && R.seg.length === N);
check('loop length 34.5km', near(R.seg.reduce((a, g) => a + g.d, 0), LOOP_KM, 1e-6), R.seg.reduce((a, g) => a + g.d, 0));
// 営業キロの区切り：東京〜品川 6.8、東京〜田端 7.1、品川〜田端 20.6（山手線の正式区間）
const km = n => S[stIndex(R, n)][4];
check('東京〜田端 7.1', near(km('田端') - km('東京'), 7.1, 1e-9));
check('品川〜田端 20.6（外回りで 田端←品川）', near(km('品川') - km('田端'), 20.6, 1e-9));
check('品川〜東京 6.8', near(LOOP_KM - km('品川'), 6.8, 1e-9));
check('高輪ゲートウェイは品川と田町の間（JY26）', S[stIndex(R, '高輪ゲートウェイ')][3] === 'JY26' && stIndex(R, '品川') + 1 === stIndex(R, '高輪ゲートウェイ'));
// 座標とキロの整合：直線距離はキロとほぼ同じか短い。座標は駅舎の中心で、営業キロは0.1km単位なので 0.25km の余裕を持たせる
const hav = (a, b) => { const r = Math.PI / 180, dLa = (b[5] - a[5]) * r, dLo = (b[6] - a[6]) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[5] * r) * Math.cos(b[5] * r) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
R.seg.forEach((g, i) => { const a = S[i], b = S[(i + 1) % N], d = hav(a, b);
  check('seg ' + a[0] + '-' + b[0] + ' distance', g.d > 0.3 && g.d < 2.5 && d <= g.d * 1.12 + 0.25 && d >= g.d * 0.55, [g.d, d.toFixed(2)]); });

// 2) むき：内回りは番号が増える向き、外回りは減る向き
const T = TYPES.yamanote;
check('two directions', T.length === 2 && T[0].k === '内回り' && T[0].dir === 1 && T[1].k === '外回り' && T[1].dir === -1);
T.forEach(t => check('type fields ' + t.k, t.y && t.en && /^#[0-9a-f]{6}$/i.test(t.c) && t.ser.every(id => SERIES[id])));
check('E235 11 cars 4 doors', SERIES.E235.cars === 11 && SERIES.E235.doors === 4);
const tokyo = stIndex(R, '東京'), shinjuku = stIndex(R, '新宿');
const inner = new Trip(R, tokyo, shinjuku, 600, 0), outer = new Trip(R, tokyo, shinjuku, 600, 1), round = new Trip(R, tokyo, tokyo, 600, 0);
check('inner next is 神田', inner.st(1)[0] === '神田' && inner.st(-1)[0] === '有楽町');
check('outer next is 有楽町', outer.st(1)[0] === '有楽町' && outer.st(2)[0] === '新橋');
check('inner returns to 東京 after 30', inner.st(30)[0] === '東京' && inner.st(31)[0] === '神田' && inner.st(60)[0] === '東京');
check('goal 内回り 東京→新宿 is 16 stations', inner.goalK === 16 && inner.st(16)[0] === '新宿', inner.goalK);
check('goal 外回り 東京→新宿 is 14 stations', outer.goalK === 14 && outer.st(14)[0] === '新宿', outer.goalK);
check('いっしゅう goal is 30', round.goalK === 30 && round.isGoal(30) && !round.isGoal(0));
check('loop never has a terminal', [0, 1, 15, 29, 30, 31, 90].every(k => !inner.isEnd(k) && inner.isStop(k) && inner.nextStop(k) === k + 1));
check('inner direction label', inner.dest(0)[0] === '上野・池袋方面', inner.dest(0)[0]);
check('outer direction label', outer.dest(0)[0] === '品川・渋谷方面', outer.dest(0)[0]);
check('label skips the current station', new Trip(R, stIndex(R, '上野'), 0, 600, 0).dest(0)[0] === '池袋・新宿方面');
check('label reading', inner.dest(0)[1] === 'うえの・いけぶくろ ほうめん' && inner.dest(0)[2] === 'Ueno and Ikebukuro');
// 区間の距離：外回りでは 東京→有楽町 の 0.8km から
check('outer first segment 0.8km', near(outer.dist(0), 0.8) && near(inner.dist(0), 1.3) && near(inner.dist(29), 0.8));
let s1 = 0, s2 = 0; for (let k = 0; k < 30; k++) { s1 += inner.dist(k); s2 += outer.dist(k); }
check('one lap distance both ways', near(s1, LOOP_KM, 1e-6) && near(s2, LOOP_KM, 1e-6), [s1, s2]);

// 3) 時刻：1周およそ1時間。東京→新宿 内回り・外回りとも 30分前後
const lap = inner.lapMin();
check('one lap about an hour', lap > 55 && lap < 64, lap);
check('外回りの1周も同じ長さ', near(outer.lapMin(), lap, 1e-9));
const tIn = inner.arrMin(16) - inner.depMin(0), tOut = outer.arrMin(14) - outer.depMin(0);
check('東京→新宿 内回り', tIn > 26 && tIn < 35, tIn);
check('東京→新宿 外回り', tOut > 23 && tOut < 32, tOut);
let mono = true;
for (let k = 1; k <= 95; k++) { if (!(inner.arrMin(k) > inner.depMin(k - 1) && inner.depMin(k) >= inner.arrMin(k))) mono = false; }
check('times increase over three laps', mono);
check('lap boundary keeps the dwell', near(inner.depMin(30) - inner.arrMin(30), 0.5, 1e-9));
check('second lap repeats', near(inner.arrMin(46) - inner.arrMin(16), lap, 1e-9));
check('start window 4:30〜24:00', new Trip(R, 0, 1, 0, 0).start === 270 && new Trip(R, 0, 1, 9999, 0).start === 1440);

// 4) 画面上の位置：1周で繰り返し、つなぎめでも途切れない
let xs = true;
for (let k = -5; k < 95; k++) { if (!(inner.X(k + 1) > inner.X(k)) || inner.kAt(inner.X(k) + 1) !== k) xs = false; }
check('X and kAt agree across laps', xs);
check('X period is one lap', inner.X(30) - inner.X(0) === inner.X(60) - inner.X(30));

// 5) 高架：東京駅の前後（周回のつなぎめ）で高さが連続し、上野までは高架、池袋は地上
for (const t of [inner, outer]) {
  let prev = elevationAt(t, t.X(0) - 3000), maxStep = 0;
  for (let x = t.X(0) - 3000; x <= t.X(0) + 3000; x += 20) { const h = elevationAt(t, x); maxStep = Math.max(maxStep, Math.abs(h - prev)); prev = h; }
  check('elevation smooth around 東京 (' + t.type.k + ')', maxStep < 0.05 && elevationAt(t, t.X(0)) === 1 && elevationAt(t, t.X(30)) === 1, maxStep);
}
let prev = elevationAt(inner, 0), maxStep = 0;
for (let x = 0; x < inner.X(31); x += 20) { const h = elevationAt(inner, x); maxStep = Math.max(maxStep, Math.abs(h - prev)); prev = h; }
check('elevation never jumps over a lap', maxStep < 0.05, maxStep);
check('上野は高架', elevationAt(inner, inner.X(4)) === 1);
check('池袋・新宿は地上', elevationAt(inner, inner.X(12)) === 0 && elevationAt(inner, inner.X(16)) === 0);

// 6) 景色・踏切・川：くかんの名前が実在する隣どうし
const pairs = new Set(); for (let i = 0; i < N; i++) pairs.add(pk2(S[i][0], S[(i + 1) % N][0]));
Object.keys(SCENE).forEach(k => check('scene pair ' + k, pairs.has(k)));
Object.keys(RIVER).forEach(k => check('river pair ' + k, pairs.has(k)));
const ck = Object.keys(CROSSING);
check('one level crossing only', ck.length === 1 && ck[0] === pk2('駒込', '田端') && CROSSING[ck[0]].length === 1);
// 第二中里踏切：駒込から約400m（駒込〜田端 1.6km）
const f = CROSSING[ck[0]][0], fromKomagome = ck[0].startsWith('駒込') ? f : 1 - f;
check('crossing about 400m from 駒込', near(fromKomagome * 1.6, 0.4, 0.05), fromKomagome * 1.6);
S.forEach(s => check('city ' + s[0], CITY[s[0]] > 0 && CITY[s[0]] <= 1));
Object.keys(TRANSFER).forEach(n => check('transfer station ' + n, stIndex(R, n) >= 0 && TRANSFER[n][0] && TRANSFER[n][1]));
HUBS.forEach(n => check('hub ' + n, stIndex(R, n) >= 0));

// 7) ホームドア：新宿・渋谷は未設置、ほかは稼働中として描く
S.forEach((s, i) => { const t = new Trip(R, i, i, 600, 0), st = platformDoorStatus(t, 0);
  check('platform doors ' + s[0], ['新宿', '渋谷'].includes(s[0]) ? st === 'none' : st === 'active', st); });

// 8) はじめの でんしゃ
const df = DEF.yamanote;
check('default trip', stIndex(R, df[0]) >= 0 && stIndex(R, df[1]) >= 0 && T[df[2]]);

console.log(`data: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
