# 路線・列車の補足データ

`station-lines.json`と`train-history.json`は、HTMLに同じ内容を内蔵しています。実行時の取得はありません。変更後はHTMLも更新し、`tests/strokes.test.js`で一致を検証してください。

## 駅と路線

`station-lines.json`の路線ID・色・駅の順番・漢字名・読みは、同リポジトリの`shinkansen-untenshi/shinkansen.html`の通常10路線に合わせています。山形・秋田は運転士ゲームと同じく東京からの直通区間を含みます。

既存の東海道はID `tokaido`と各駅の読みを維持しています。同じ読みの駅が別路線に登場した場合も、各路線の練習回数は別々です。従来どおり、含まれるひらがなの練習回数には加算します。

## 新幹線名の年と表示順

画面では依頼に合わせ「1992年開業」のように表記します。年は**その列車名が新幹線として運行を始めた年**で、路線そのものの開業年や、同名の在来線特急の運行開始年ではありません。日付の古い順に並べ、同日の列車はデータの順を保ちます。

「むかしの しんかんせん」は、通常運行を終えた列車名の練習用です。「まっくす…」はMaxをひらがなでなぞります。記念の臨時運行まで禁止されたという意味ではありません。「こだま」は現役の一覧に残しています。

確認日：2026-10-25。

## 主な出典

- [JR東海：新幹線の歩み](https://recommend.jr-central.co.jp/gooddayexpress/history/) — 東海道開業時のひかり・こだま、1992年ののぞみ。
- [JR東海：こだま・ひかり・のぞみの停車駅](https://faq.jr-central.co.jp/a46db8eb-bb92-41b8-9530-10360f0102ba) — こだまを含む現役の列車区分。
- [JR東日本：新幹線の概要](https://www.jreast.co.jp/youran/pdf/2014-2015/jre_youran_group_p26_31.pdf) — 東北・上越・山形・秋田・長野の開業。
- [JR東日本：会社要覧2012–2013](https://www.jreast.co.jp/youran/pdf/jre_youran_all.pdf) — つばさ、なすの、こまち、あさま、はやての導入の経緯。
- [JR東日本：上越新幹線40周年・年表](https://www.jreast.co.jp/niigata/joetsu40th/) — とき・あさひ、1994年のMaxとき・Maxあさひ、1997年のたにがわ・Maxたにがわ、愛称の改称とMaxの定期運行終了。
- [JR東日本：東北新幹線40周年のあおば記念列車](https://www.jreast.co.jp/press/2022/sendai/20220519_s01.pdf) — 開業当時のあおば。
- [JR東日本：はやぶさ10周年](https://www.jreast.co.jp/morioka/e510/) — 2011年3月5日の運行開始。
- [JR九州：つばめ20周年](https://www.jrkyushu.co.jp/train/tsubamehatachi/) — 2004年3月13日の運行開始。
- [JR西日本：沿革](https://www.westjr.co.jp/company/info/history/) — 2011年3月12日のみずほ・さくら。
- [JR西日本：北陸新幹線の運行計画](https://www.westjr.co.jp/press/article/2014/08/page_6073.html) — 2015年3月14日のかがやき・はくたか・つるぎ。
- [JR九州：西九州新幹線かもめ開業記念](https://www.jrkyushu.co.jp/train/kamomegakudan/) — 2022年9月23日のかもめ。

## 引退年

画面の引退年は、列車名として通常運行を終えた年です。車両形式そのものの引退年とは分けています。

| 列車名 | 開業年 | 引退年 | 根拠 |
|---|---:|---:|---|
| あおば | 1982 | 1997 | [鉄道プレスネット：あおばの経緯](https://news.railway-pressnet.com/archives/40093) |
| あさひ | 1982 | 2002 | [JR東日本：2002年の愛称変更](https://www.jreast.co.jp/niigata/joetsu40th/) |
| Maxあさひ | 1994 | 2002 | [JR東日本：2002年の愛称変更](https://www.jreast.co.jp/niigata/joetsu40th/) |
| Maxとき | 1994 | 2021 | [JR東日本：2021年の定期運行終了](https://www.jreast.co.jp/press/2021/niigata/20210618_ni01.pdf) |
| Maxたにがわ | 1997 | 2021 | [JR東日本：2021年の定期運行終了](https://www.jreast.co.jp/press/2021/niigata/20210618_ni01.pdf) |
