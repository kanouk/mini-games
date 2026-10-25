// まちの みち・じけんの きめかた（ゲーム本体の ロジック）を確かめる。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'kuruma.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(js); // ページ全体の構文も確認する。
const source = js.slice(js.indexOf('/* ---------- まち'), js.indexOf('/* ---------- 保存'));
const g = new Function(`${source}
  return {COLS,ROWS,NODES,nid,neighbors,ekey,EDGES,dists,nextStep,connected,pickBlocks,TOWN,corners,BASE_NODE,farCorner,pickDir,CARS,EVENTS,planRound,projectToRoad,pickEscapeCount};`)();
function seeded(seed) { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }

// こうさてんは 5×4、みちは 31 本。
{
  assert.equal(g.NODES, 20);
  assert.equal(g.EDGES.length, 4 * 4 + 5 * 3);
  assert.deepEqual(g.neighbors(g.nid(0, 0)).sort((a, b) => a - b), [1, 5]);
  assert.equal(g.neighbors(g.nid(2, 1)).length, 4);
}

// こうじちゅうの みちを よけて、いちばん ちかい みちを さがす。
{
  const none = new Set();
  assert.equal(g.dists(g.nid(0, 0), none)[g.nid(4, 3)], 7);
  const blocked = new Set([g.ekey(g.nid(0, 0), g.nid(1, 0))]);
  assert.equal(g.nextStep(g.nid(0, 0), g.nid(1, 0), blocked), g.nid(0, 1));
  assert.equal(g.dists(g.nid(0, 0), blocked)[g.nid(1, 0)], 3);
  assert.equal(g.nextStep(g.nid(2, 2), g.nid(2, 2), none), -1);
}

// こうじちゅうの みちを ふやしても、まちは ふたつに わかれず、keep の こうさてんの みちは ふさがない。
for (let seed = 1; seed <= 300; seed++) {
  const keep = [g.nid(1, 1), g.nid(4, 3)];
  const b = g.pickBlocks(4, seeded(seed), keep);
  assert.ok(g.connected(b));
  b.forEach(k => { const [a, m] = k.split('-').map(Number); assert.ok(!keep.includes(a) && !keep.includes(m)); });
}

// おした むきに ある となりの こうさてんへ すすむ。ななめ すぎる ときは うごかない。
{
  const pos = n => ({ x: (n % 5) * 200, y: Math.floor(n / 5) * 160 });
  const from = g.nid(2, 1), none = new Set();
  assert.equal(g.pickDir(from, 1, 0.2, pos, none).n, g.nid(3, 1));
  assert.equal(g.pickDir(from, 0, -5, pos, none).n, g.nid(2, 0));
  assert.equal(g.pickDir(g.nid(0, 0), -1, 0, pos, none), null);
  const blocked = new Set([g.ekey(from, g.nid(1, 1))]);
  assert.deepEqual(g.pickDir(from, -1, 0, pos, blocked), { n: g.nid(1, 1), blocked: true });
}

// ドラッグで道を外れても区間上にとどまり、両端を越えない。
{
  assert.deepEqual(g.projectToRoad({x:75,y:90},{x:0,y:0},{x:200,y:0}),{t:.375,x:75,y:0});
  assert.deepEqual(g.projectToRoad({x:-20,y:90},{x:0,y:0},{x:200,y:0}),{t:0,x:0,y:0});
  assert.deepEqual(g.projectToRoad({x:900,y:90},{x:0,y:0},{x:200,y:0}),{t:1,x:200,y:0});
  assert.deepEqual(g.projectToRoad({x:-400,y:80},{x:100,y:0},{x:100,y:160}),{t:.5,x:100,y:80});
  assert.deepEqual(g.projectToRoad({x:10,y:10},{x:1,y:2},{x:1,y:2}),{t:0,x:1,y:2});
}
// 逃走回数は事件の最初に決まり、普段1回、ときどき2回、まれに3回。
{
  const frequency={1:0,2:0,3:0};for(let i=0;i<1000;i++)frequency[g.pickEscapeCount(()=>(i+.5)/1000)]++;
  assert.deepEqual(frequency,{1:650,2:250,3:100});
}

// じけんと くるまの くみあわせ：どの じけんも くるまが いて、おきる ばしょが ある。
{
  const kinds = new Set(g.TOWN);
  g.EVENTS.forEach(e => {
    assert.ok(g.CARS.some(c => c.id === e.car), e.id);
    assert.ok(e.kinds.every(k => kinds.has(k)), e.id);
    assert.ok(e.need >= 1);
  });
  g.CARS.forEach(c => assert.ok(c.base in g.BASE_NODE, c.id));
  // きち（しょうぼうしょ など）の こうさてんは、その ブロックの かどに ある。
  Object.entries(g.BASE_NODE).forEach(([k, n]) => assert.ok(g.corners(g.TOWN.indexOf(k)).includes(n), k));
}

// 1かいぶんの じけん：さいしょの 3かいは 3だい だけ。おなじ じけんは つづかない。いく ばしょは くるまの きちから とおい かど。
for (let seed = 1; seed <= 200; seed++) {
  const rand = seeded(seed);
  let last = null;
  for (let round = 0; round < 10; round++) {
    const r = g.planRound(round, last, rand);
    assert.notEqual(r.ev.id, last);
    if(r.ev.id==='thief')assert.ok([1,2,3].includes(r.escapeLimit));else assert.equal(r.escapeLimit,0);
    if (round < 3) {
      assert.ok(['fire', 'thief', 'hurt'].includes(r.ev.id));
      assert.deepEqual(r.cars.map(c => c.id), ['fire', 'police', 'amb']);
    } else assert.equal(r.cars.length, 5);
    assert.ok(r.cars.includes(r.car));
    assert.ok(r.ev.kinds.includes(g.TOWN[r.block]));
    assert.ok(g.corners(r.block).includes(r.dest));
    assert.ok(g.dists(r.start, r.blocked)[r.dest] >= 2);
    assert.equal(r.blocked.size, round < 2 ? 0 : round < 4 ? 1 : round < 7 ? 2 : 3);
    assert.ok(g.connected(r.blocked));
    assert.equal(r.stars.size, 3);
    r.stars.forEach(n => { assert.notEqual(n, r.dest); assert.ok(!Object.values(g.BASE_NODE).includes(n)); });
    last = r.ev.id;
  }
}

console.log('town ok');
