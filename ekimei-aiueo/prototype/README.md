# えきめい あいうえお（試作）

電車のことば（新幹線の名前・駅名）を指でなぞって、ひらがなをおぼえるアプリの**試作**です。本番の仕様は [Issue #5](https://github.com/kanouk/mini-games/issues/5) にまとめてあります。本番は `ekimei-aiueo/ekimei.html` として作り直す前提で、このフォルダは出発点・参考用です。

## ファイル

| ファイル | 内容 |
|---|---|
| `ekimei-prototype.html` | 試作アプリ本体。1ファイルで動く（ブラウザで開くだけ）。説明文なし、音声と絵で進む本番イメージ |
| `kikaku.html` | 企画書（大人向け）。なぞりとシールちょうの仕組みを触って確かめられるモックつき |
| `../data/strokes-hiragana.json` | ひらがな 83 文字（清音・濁音・半濁音・小さい字）の筆順データ。試作の HTML にも同じものが埋め込まれている |
| `../tools/fetch-kanjivg.js` | 上の JSON を KanjiVG から作り直すスクリプト（`node ekimei-aiueo/tools/fetch-kanjivg.js`） |

## 試作でできること

- タイトル → シールちょう（しんかんせん／えき／あいうえお）→ ことばのマス → なぞり → できた、の一連の流れ
- 新幹線名 19・東海道新幹線 17 駅・あいうえお 46 のすべてをなぞれる
- 判定（ふつう／ひろい）、お手本の自動再生、2回迷うと自動お手本、不合格でも×を出さない
- 練習回数でマスが育ち（1・3・5・10・20・40 回）、銅・銀・金でお手伝い（レール → 点線 → 影 → 白紙）が減る
- ⚙（おうちの人）で設定と記録。保存はブラウザ内（`localStorage`）

## 試作で仮のもの

- 絵は絵文字、効果音は合成音。本番は描き下ろしの電車と前作のチャイムに差し替える
- 判定のしきい値・段階のしきい値・称号名は仮の既定値（Issue #5 の「未決事項」）

## 出典とライセンス

- 筆順データ：[KanjiVG](https://github.com/KanjiVG/kanjivg) © Ulrich Apel、[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)。`strokes-hiragana.json` とそれを埋め込んだ HTML は KanjiVG の派生物なので、同じライセンスと出典表記が必要です。
- 字体：[Klee One](https://fonts.google.com/specimen/Klee+One)（Google Fonts）
