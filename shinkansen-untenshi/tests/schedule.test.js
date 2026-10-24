// しんかんせん うんてんし：じこくの ルールを たしかめる テスト
// つかいかた: node tests/schedule.test.js [shinkansen.html の パス]
// ページの <script> から データと Trip クラスを とりだして、ブラウザなしで けいさんを たしかめる。
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'shinkansen.html');
const html = fs.readFileSync(file, 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
const cut = (from, to) => js.slice(js.indexOf(from), js.indexOf(to));
const MAXV = 900;
const lib = new Function('MAXV', cut('const S=', 'const JP_LAND') + cut('/* ---------- のる でんしゃ（Trip）', 'let trip=') +
  'return {LINES,FAST,Trip};')(MAXV);
const { LINES, FAST, Trip } = lib;
const fmt = t => { const m = ((Math.round(t) % 1440) + 1440) % 1440; return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };

let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else { fail++; console.log('NG', name, info || ''); } }

// 1) えきデータ：ぜんぶの えきに なまえ・よみ・ローマじ・いど・けいど が ある
for (const l of LINES) for (const s of l.st)
  check('station data ' + l.id + ' ' + s[0], s.length === 5 && typeof s[3] === 'number' && typeof s[4] === 'number' && s[1] && s[2]);

// 2) はやい でんしゃの えきは その ろせんに ある
for (const [id, [nm, list]] of Object.entries(FAST)) {
  const l = LINES.find(x => x.id === id); check('fast line exists ' + id, !!l);
  if (l) for (const n of list) check('fast stop on line ' + id + ' ' + n, l.st.some(s => s[0] === n));
}

// 3) じこくの ルール（ぜんろせん × ぜんぶ／はやい × しはつ・ひる・しゅうでん × 6おうふく）
const isNight = m => { const x = ((m % 1440) + 1440) % 1440; return x < 360 - 1e-6; };
for (const l of LINES) for (const fast of [false, true]) {
  const last = l.st.length - 1;
  for (const [a, b] of [[0, last], [last, 0], [1, last - 1]]) {
    if (a === b) continue;
    const probe = new Trip(l, a, b, 0, fast);
    for (const start of [0, 720, 9999]) {
      const t = new Trip(l, a, b, start, fast);
      const tag = `${l.id} ${fast ? 'fast' : 'all'} ${l.st[a][0]}→${l.st[b][0]} ${fmt(t.start)}`;
      check('start within first..last ' + tag, t.start >= probe.firstStart() && t.start <= probe.lastStart());
      for (let k = 0; k < t.len * 6; k++) {
        const d = t.depMin(k), ar = t.arrMin(k + 1);
        check('time moves forward ' + tag + ' k' + k, ar > d - 1e-9, `${fmt(d)}→${fmt(ar)}`);
        if (!t.isConv(k)) {
          const day = Math.floor((d + 1e-6) / 1440);
          check('shinkansen not 0-6 ' + tag + ' k' + k, !isNight(d) && ar <= 1440 * (day + 1) + 1e-6, `${fmt(d)}→${fmt(ar)}`);
        }
        if (k > 0 && t.isStop(k)) check('dwell ' + tag + ' k' + k, Math.abs(t.depMin(k) - t.arrMin(k) - 1) < 1e-9 || t.isEnd(k));
        if (k > 0 && !t.isStop(k)) check('pass has no dwell ' + tag + ' k' + k, Math.abs(t.depMin(k) - t.arrMin(k)) < 1e-9);
      }
    }
  }
}

// 4) ちょくつう ろせんは もとの 2ろせんを たした じかん（のりかえ駅の ていしゃ 1ぷん）
for (const [id, parts] of [['tokaido-sanyo', ['tokaido', 'sanyo']], ['sanyo-kyushu', ['sanyo', 'kyushu']], ['tohoku-hokkaido', ['tohoku', 'hokkaido']]]) {
  const L = LINES.find(x => x.id === id), whole = new Trip(L, 0, L.st.length - 1, 720, false);
  const sum = parts.map(pid => { const l = LINES.find(x => x.id === pid); const t = new Trip(l, 0, l.st.length - 1, 720, false); return t.arrMin(t.len) - t.depMin(0); }).reduce((x, y) => x + y) + 1;
  check('through line duration ' + id, Math.abs((whole.arrMin(whole.len) - whole.depMin(0)) - sum) < 1e-6);
}

// 5) さいこうそくど（ほんものの くかん べつ）
const kmh = (id, from, to) => { const l = LINES.find(x => x.id === id), a = l.st.findIndex(s => s[0] === from); const t = new Trip(l, a, a + 1, 720, false); return t.segKmh(0); };
check('tokaido 285', kmh('tokaido', '東京', '品川') === 285);
check('sanyo east of himeji 275', kmh('sanyo', '新大阪', '新神戸') === 275);
check('sanyo west of himeji 300', kmh('sanyo', '姫路', '相生') === 300);
check('tohoku tokyo-ueno 110', kmh('tohoku', '東京', '上野') === 110);
check('tohoku 320', kmh('tohoku', '宇都宮', '那須塩原') === 320);
check('seikan 160', kmh('hokkaido', '奥津軽いまべつ', '木古内') === 160);
check('nishikyushu 260', kmh('nishikyushu', '武雄温泉', '嬉野温泉') === 260);
check('yamagata conventional 130', kmh('yamagata', '福島', '米沢') === 130);
check('through line keeps parts speed', kmh('tohoku-hokkaido', '奥津軽いまべつ', '木古内') === 160);

// 6) 新庄 5:40 はつ 東京ゆき が えらべる（宗佑くんの しつもん）
{ const l = LINES.find(x => x.id === 'yamagata'); const t = new Trip(l, l.st.length - 1, 0, 340, false);
  check('shinjo 5:40 selectable', t.start === 340, fmt(t.start)); }

console.log(`${pass} OK / ${fail} NG`);
process.exit(fail ? 1 : 0);
