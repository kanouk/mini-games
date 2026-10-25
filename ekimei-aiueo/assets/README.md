# 生成イラスト

本番用の挿絵は内蔵の imagegen ツールで生成しました。WebPへの変換は表示用の縮小・圧縮のみです。透明な車両のアルファチャンネルは維持しています。生成時のPNG原本はCodexの生成画像フォルダに残しています。

- `train-cover.webp`：選択画面の新幹線、トップページの運転ゲームカード。
- `station-cover.webp`：選択画面の駅。
- `kana-cover.webp`：選択画面のあいうえお、トップページのなぞりアプリカード。
- `train-character.webp`：タイトル、なぞり中の指先・お手本、完成画面の車両。

アプリ単体で開けるよう、`ekimei.html`にも同じWebPのデータURLを埋め込んでいます。画像を差し替えるときはHTML内の画像も更新してください。UIのボタン名はHTMLの文字として残しています。筆順はKanjiVGの正確なパスを使用します。

## 最終プロンプト

### train-cover

Use case: illustration-story. Final production artwork for a Japanese hiragana-learning game for preschool children. This is a lovingly hand-painted contemporary Japanese picture-book illustration, with delicate gouache and watercolor washes, warm colored-pencil details, fine paper texture, softly modeled light and believable perspective. Inviting, thoughtful, beautifully authored, polished enough for a published children's book. Cheerful and calm. Avoid vector art, flat geometric shapes, clip art, infographics, thick uniform black outlines, UI mockups, logos, watermarks and extra writing. The central subject must be immediately recognizable at a small thumbnail size. Pastel sky blue, warm cream, soft leaf green and small coral/yellow accents. This is one asset in a consistent four-illustration family. Asset: landscape 3:2 full-bleed cover illustration. Subject: a beautiful white Japanese high-speed Shinkansen with a blue stripe and long streamlined nose, seen close and large from a low three-quarter front view, moving gently toward the right. Two cars curve away to the left. Soft sunlight reflects off the body, windows have depth, subtle mechanical and wheel detail. Japanese spring countryside, rounded hills, tiny flowers beside the track, distant mountains and airy clouds. The train fills the central 75% of the composition. No lettering, no numbers, no faces, no logo. Keep the whole nose comfortably inside the crop.

### station-cover

Use case: illustration-story. Final production artwork for a Japanese hiragana-learning game for preschool children. This is a lovingly hand-painted contemporary Japanese picture-book illustration, with delicate gouache and watercolor washes, warm colored-pencil details, fine paper texture, softly modeled light and believable perspective. Inviting, thoughtful, beautifully authored, polished enough for a published children's book. Cheerful and calm. Avoid vector art, flat geometric shapes, clip art, infographics, thick uniform black outlines, UI mockups, logos, watermarks and extra writing. The central subject must be immediately recognizable at a small thumbnail size. Pastel sky blue, warm cream, soft leaf green and small coral/yellow accents. This is one asset in a consistent four-illustration family. Asset: landscape 3:2 full-bleed cover illustration. Subject: an inviting little Japanese railway station, three-quarter view with a warm terracotta roof, softly weathered cream walls, round station clock, wooden canopy, a green-and-cream local train waiting at a tidy platform, lush small plants and flowers. Beautifully observed railway details, soft sunlight, warm wood, depth and charming little tactile details. The station entrance and waiting train are large and fill the center of the image. No signs with writing, no letters, no numbers, no faces or people, no logo. Distinct from a train-only illustration: the station building and platform must be the unmistakable main subject.

### kana-cover

Use case: illustration-story. Final production artwork for a Japanese hiragana-learning game for preschool children. This is a lovingly hand-painted contemporary Japanese picture-book illustration, with delicate gouache and watercolor washes, warm colored-pencil details, fine paper texture, softly modeled light and believable perspective. Inviting, thoughtful, beautifully authored, polished enough for a published children's book. Cheerful and calm. Avoid vector art, flat geometric shapes, clip art, infographics, thick uniform black outlines, UI mockups, logos, watermarks and extra writing. The central subject must be immediately recognizable at a small thumbnail size. Pastel sky blue, warm cream, soft leaf green and small coral/yellow accents. This is one asset in a consistent four-illustration family. Asset: landscape 3:2 full-bleed cover illustration. Subject: a treasured open children's sticker notebook on a warm cream tabletop, with three charming thick paper hiragana letter stickers / little illustrated cards resting on its open pages. Each card has one large, perfectly legible Japanese character: "あ", "い", "う". Respect the exact hiragana glyph shapes as a child is learning them. The あ card is coral pink, the い card soft sky blue, the う card pale leaf green; each has delicate paper fibers, rounded corners and tiny hand-painted floral accents. A small blue pencil and a tiny painted wooden toy train sit beside the notebook. Soft natural shadows, tactile paper, joyful but uncluttered. Large central notebook and letter cards, all important elements inside the central 80%. Only those three hiragana characters; no other writing, no alphabet letters, no numbers.

### train-character

Use case: illustration-story. Final production artwork for a Japanese hiragana-learning game for preschool children. This is a lovingly hand-painted contemporary Japanese picture-book illustration, with delicate gouache and watercolor washes, warm colored-pencil details, fine paper texture, softly modeled light and believable perspective. Inviting, thoughtful, beautifully authored, polished enough for a published children's book. Cheerful and calm. Avoid vector art, flat geometric shapes, clip art, infographics, thick uniform black outlines, UI mockups, logos, watermarks and extra writing. The central subject must be immediately recognizable at a small thumbnail size. Pastel sky blue, warm cream, soft leaf green and small coral/yellow accents. This is one asset in a consistent four-illustration family. Asset: an isolated wide illustration with a genuinely transparent background, roughly 2.6:1 composition. A very appealing full side / slight three-quarter view of one white-and-blue Japanese Shinkansen car with a long rounded aerodynamic nose pointing to the RIGHT. Entire train visible, centered, fills most of the canvas with small breathing room. Hand-painted gouache with subtle watercolor edges, pearl-white dimensional body, deep navy windows with soft reflections, blue stripe, beautifully drawn wheels and small details. Child-friendly rounded proportions, no face, no mascot eyes, no text or lettering. Crisp recognizable silhouette. No scenery, no rails, no ground, no panel, no background color, no drop shadow outside the train. This train will appear on the title screen, follow a child's fingertip, and cross the completion screen.


## むかしの しんかんせん

- 画像：`retired-cover.webp`（960×640）。200系と2階建てMaxを描いた、引退した列車のシールちょう用の扉絵です。
- 生成：内蔵imagegenツール。既存の`train-cover.webp`を画風の参照として使用しました。
- 最終プロンプト：[`retired-cover-prompt.txt`](retired-cover-prompt.txt)。
- 元画像：Codex生成画像フォルダの`exec-2a4a4d86-fc5a-4fba-92ea-d196a7d9add7.png`。既存画像は置き換えていません。
