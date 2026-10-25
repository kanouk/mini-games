// KanjiVG から ひらがな（U+3041〜U+3093）の筆順データを取り出して JSON にする。
// つかいかた: node ekimei-aiueo/tools/fetch-kanjivg.js [出力先]
//   既定の出力先: ekimei-aiueo/data/strokes-hiragana.json
// 出力の形: { "と": ["M35.5,18.38c...", "M78.12,25.5c..."], ... }  座標は KanjiVG と同じ 109×109。
// 出典: KanjiVG https://github.com/KanjiVG/kanjivg  © Ulrich Apel, CC BY-SA 3.0
// （この JSON は KanjiVG の派生物なので、同じライセンスと出典表記が必要）
const fs = require('fs');
const path = require('path');
const https = require('https');

const FROM = 0x3041, TO = 0x3093; // ぁ〜ん（濁音・半濁音・小さい字を含む 83 文字）
const out = process.argv[2] || path.join(__dirname, '..', 'data', 'strokes-hiragana.json');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(res.statusCode + ' ' + url)); }
      let s = ''; res.setEncoding('utf8'); res.on('data', d => s += d); res.on('end', () => resolve(s));
    }).on('error', reject);
  });
}

function strokesOf(svg) {
  // <path id="kvg:03068-s1" ... d="..."> を 画数の順に ならべる
  return [...svg.matchAll(/<path id="kvg:[0-9a-f]+-s(\d+)"[^>]*\sd="([^"]+)"/g)]
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(m => m[2]);
}

(async () => {
  const result = {};
  for (let cp = FROM; cp <= TO; cp++) {
    const hex = cp.toString(16).padStart(5, '0');
    const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
    const svg = await get(url);
    const st = strokesOf(svg);
    if (st.length) result[String.fromCodePoint(cp)] = st;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result) + '\n');
  console.log(Object.keys(result).length + ' 文字を ' + out + ' に かきだしました');
})().catch(e => { console.error(e); process.exit(1); });
