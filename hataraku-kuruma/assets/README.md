# 生成画像

## ゲーム中の画像

車5種、建物7種、キャラクター3種、小物4種の計19枚です。内蔵 imagegen ツールで透明背景のスプライトとして生成しました。小さく表示しても区別できる輪郭、色、共通の光源を優先し、デフォルメしたセル画調に統一しています。

- 最終プロンプト：[prompts.json](prompts.json)
- 採用した原画像と出力の対応：[sprites.json](sprites.json)
- 最初の消防車と家を、残り17枚の画風・向きの参照に使用。
- 車は右向き。左へ走るときはゲーム側で左右反転します。
- 表示用WebPは車384px幅、建物256px幅、人物・小物192px幅。透明度を保持しています。
- PNG原画像はCodexの生成画像フォルダに保存しています。
- `node hataraku-kuruma/scripts/embed-art.js` でWebPをゲーム本体に内蔵し直せます。画像を個別に取得する通信なしで、HTML単体でも遊べます。

走行中の車体の揺れ、ランプの点滅、炎・キャラクターの動き、放水や回収の演出はゲーム側で加えています。

## トップページのイラスト

- 保存画像：[work-vehicles-cover.webp](work-vehicles-cover.webp)
- 用途：ソウスケゲームズの「はたらく くるま しゅつどう」カード。
- 生成：内蔵 imagegen ツール。ほかのゲームと水彩・ガッシュ調の画風を合わせるため、[駅の画像](../../ekimei-aiueo/assets/station-cover.webp)をスタイル参照として使用しました。
- 表示用に960×640のWebPへ縮小・圧縮しています。元のPNGはCodexの生成画像フォルダに残しています。

## 最終プロンプト

Use case: illustration-story. Asset: a landscape 3:2 production cover illustration for the preschool game はたらく くるま しゅつどう. Input image 1 is a STYLE REFERENCE only: match its refined hand-painted Japanese picture-book gouache and watercolor, delicate colored-pencil details, textured paper, warm soft sunlight, clear airy blue sky, natural leafy greens, gentle flowers and believable perspective. Create a NEW scene of working vehicles in a small friendly Japanese town; do not reproduce the railway station or train. Main subject: a beautiful bright red Japanese fire engine, large in the foreground, with a silver ladder, cab windows, hose equipment and carefully painted wheels. A white-and-black Japanese police patrol car and a white ambulance with a red stripe are just behind, both clearly recognizable and unobscured. All three vehicles are facing toward the RIGHT and look ready to drive forward, never backing up. Compose the three vehicles in a relaxed staggered arrangement, with the fire engine the unmistakable main subject. Charming cream houses with warm roofs, roadside flowers, spring trees and distant green hills create a calm, helpful everyday town. No emergency scene, flames, injury, people, mascot faces, writing, words, numbers, brand logos or watermark. Not flat vector art, not assembled geometric shapes, no thick uniform black outlines, no clip art or interface. Make this illustration feel like another page from the same professionally illustrated picture book as the reference. Vehicles fill the central 75% of the frame. Preserve all vehicle noses and wheels comfortably inside the central composition so the image also crops well to 16:9 as a small game-selection thumbnail.
