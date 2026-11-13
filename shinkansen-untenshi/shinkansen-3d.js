/* しんかんせん うんてんし：3D表示（裏モード）。
   ゲームの進行は shinkansen.html がそのまま行い、ここは同じ状態を立体で描くだけ。
   長さの単位：ゲーム内の 10 が 1m。世界は列車の位置を原点にして動かす。 */
import * as THREE from './vendor/three.module.min.js';

const U=0.1,CH=1500,CHM=CH*U,GY=-3,TOPY=-0.28;
const CARS=8,CAR_L=25,GAP=0.4,NOSE=15,HEAD_X0=-1,HEAD_X1=27;
const NEAR_Z=1.8,FAR_TRACK=-4.3;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const fract=x=>x-Math.floor(x);
const h1=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
const h2=(a,b)=>fract(Math.sin(a*127.1+b*269.5+74.7)*43758.5453);
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),w=yf*yf*(3-2*yf);
  return lerp(lerp(h2(xi,yi),h2(xi+1,yi),u),lerp(h2(xi,yi+1),h2(xi+1,yi+1),u),w);}
function rng(seed){let a=(seed|0)+0x6D2B79F5;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const SANS='"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",sans-serif';

/* ---------- テクスチャ（すべて その場で つくる） ---------- */
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function tex(c,repeat,aniso){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=aniso||8;return t;}
function noiseCanvas(size,base,amp,coarse,seed){
  const c=canvas(size,size),g=c.getContext('2d'),im=g.createImageData(size,size),d=im.data,r=rng(seed||1);
  const n=8,grid=[];for(let i=0;i<n*n;i++)grid.push(r());
  const gv=(x,y)=>grid[((y%n+n)%n)*n+((x%n+n)%n)];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const fx=x/size*n,fy=y/size*n,xi=Math.floor(fx),yi=Math.floor(fy),u=fx-xi,v=fy-yi;
    const low=lerp(lerp(gv(xi,yi),gv(xi+1,yi),u),lerp(gv(xi,yi+1),gv(xi+1,yi+1),u),v)-0.5;
    const k=1+(r()-0.5)*amp+low*coarse,i=(y*size+x)*4;
    d[i]=clamp(base[0]*k,0,255);d[i+1]=clamp(base[1]*k,0,255);d[i+2]=clamp(base[2]*k,0,255);d[i+3]=255;}
  g.putImageData(im,0,0);return c;
}
function trackCanvas(){
  const c=noiseCanvas(256,[112,104,96],0.55,0.25,7),g=c.getContext('2d');
  /* よこ 2.4m（まくらぎ4本）×たて 3m */
  for(let i=0;i<4;i++){const x=i*64+20;g.fillStyle='#8f8d86';g.fillRect(x,26,24,204);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+22,26,3,204);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x,26,2,204);}
  g.fillStyle='rgba(60,40,25,.16)';g.fillRect(0,60,256,14);g.fillRect(0,182,256,14);
  return c;
}
function windowCanvas(emissive,seed){
  const N=8,S=512,cw=S/N,c=canvas(S,S),g=c.getContext('2d'),r=rng(seed);
  if(emissive){g.fillStyle='#000';g.fillRect(0,0,S,S);}
  else{g.drawImage(noiseCanvas(128,[206,204,198],0.10,0.12,3),0,0,S,S);}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const px=x*cw+9,py=y*cw+12,w=cw-18,h=cw-30,q=r();
    if(emissive){if(q<0.42){const k=0.55+r()*0.45;g.fillStyle=q<0.3?`rgba(255,${200+r()*30|0},${130+r()*50|0},${k})`:`rgba(215,232,255,${k*0.8})`;g.fillRect(px,py,w,h);}}
    else{const gr=g.createLinearGradient(0,py,0,py+h);gr.addColorStop(0,'#5c7386');gr.addColorStop(1,'#26323f');g.fillStyle=gr;g.fillRect(px,py,w,h);
      g.fillStyle='rgba(20,24,30,.55)';g.fillRect(px+w/2-1,py,2,h);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(px-2,py+h,w+4,3);}
  }
  if(!emissive){g.fillStyle='rgba(0,0,0,.10)';for(let y=0;y<N;y++)g.fillRect(0,y*cw,S,2);}
  return c;
}
function cloudCanvas(seed){
  const c=canvas(512,256),g=c.getContext('2d'),r=rng(seed);
  for(let i=0;i<46;i++){const x=70+r()*372,y=150-r()*r()*95+ (Math.abs(x-256)/256)*26,rad=26+r()*46;
    const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(255,255,255,.62)');gr.addColorStop(0.55,'rgba(255,255,255,.26)');gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
  const sh=g.createLinearGradient(0,120,0,200);sh.addColorStop(0,'rgba(120,130,150,0)');sh.addColorStop(1,'rgba(120,130,150,.5)');
  g.globalCompositeOperation='source-atop';g.fillStyle=sh;g.fillRect(0,0,512,256);
  return c;
}
function glowCanvas(){const c=canvas(128,128),g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.18,'rgba(255,255,255,.6)');gr.addColorStop(0.5,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);return c;}
function waterNormalCanvas(){
  const S=256,c=canvas(S,S),g=c.getContext('2d'),im=g.createImageData(S,S),d=im.data;
  const hgt=(x,y)=>{let v=0;const P=Math.PI*2/S;
    v+=Math.sin(x*P*3+y*P*2)*0.5+Math.sin(x*P*7-y*P*5+1.3)*0.28+Math.sin(x*P*13+y*P*11+2.1)*0.14+Math.sin(-x*P*19+y*P*23+0.7)*0.08;return v;};
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const dx=hgt(x+1,y)-hgt(x-1,y),dy=hgt(x,y+1)-hgt(x,y-1),i=(y*S+x)*4;
    const nx=-dx*2.2,ny=-dy*2.2,nz=1,l=Math.hypot(nx,ny,nz);d[i]=(nx/l*0.5+0.5)*255;d[i+1]=(ny/l*0.5+0.5)*255;d[i+2]=(nz/l*0.5+0.5)*255;d[i+3]=255;}
  g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

/* ---------- 形を まとめて 1つの メッシュに する ---------- */
const T_BOX=new THREE.BoxGeometry(1,1,1).toNonIndexed();
const T_CYL=new THREE.CylinderGeometry(1,1,1,10).toNonIndexed();
const T_CONE=new THREE.ConeGeometry(1,1,9).toNonIndexed();
const T_ICO=(()=>{const g=new THREE.IcosahedronGeometry(1,1);const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++)n.setXYZ(i,p.getX(i),p.getY(i),p.getZ(i));return g;})();
const T_ROOF=(()=>{/* きりづま やね：x はば1、z おく1、たかさ1 */
  const v=[[-.5,0,.5],[.5,0,.5],[0,1,.5],[-.5,0,-.5],[.5,0,-.5],[0,1,-.5]],f=[[0,1,2],[4,3,5],[0,2,5],[0,5,3],[1,4,5],[1,5,2]],p=[];
  f.forEach(t=>t.forEach(i=>p.push(...v[i])));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(p.length/3*2).fill(0),2));g.computeVertexNormals();return g;})();
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new THREE.Vector3(),_s=new THREE.Vector3(),_v=new THREE.Vector3(),_n=new THREE.Vector3(),_nm=new THREE.Matrix3(),_c=new THREE.Color();
class Batch{
  constructor(){this.m=new Map();}
  buf(mat){let b=this.m.get(mat);if(!b){b={p:[],n:[],u:[],c:[]};this.m.set(mat,b);}return b;}
  uv(mat,b,x,y,z,nx,ny,nz,u0,v0){const w=mat.userData.uv;
    if(!w){b.u.push(u0,v0);return;}
    const ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
    if(ay>=ax&&ay>=az)b.u.push(x*w[0],z*w[1]);else if(ax>=az)b.u.push(z*w[0],y*w[1]);else b.u.push(x*w[0],y*w[1]);}
  add(mat,geo,x,y,z,sx,sy,sz,col,ry,rx,rz){
    const b=this.buf(mat),P=geo.attributes.position,N=geo.attributes.normal,Uv=geo.attributes.uv;
    _e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_m.compose(_p.set(x,y,z),_q,_s.set(sx,sy,sz));_nm.getNormalMatrix(_m);
    if(col!=null)_c.set(col);else _c.setRGB(1,1,1);
    for(let i=0;i<P.count;i++){
      _v.fromBufferAttribute(P,i).applyMatrix4(_m);_n.fromBufferAttribute(N,i).applyMatrix3(_nm).normalize();
      b.p.push(_v.x,_v.y,_v.z);b.n.push(_n.x,_n.y,_n.z);b.c.push(_c.r,_c.g,_c.b);
      this.uv(mat,b,_v.x,_v.y,_v.z,_n.x,_n.y,_n.z,Uv?Uv.getX(i):0,Uv?Uv.getY(i):0);}
  }
  box(mat,x0,x1,y0,y1,z0,z1,col){this.add(mat,T_BOX,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,Math.abs(x1-x0),Math.abs(y1-y0),Math.abs(z1-z0),col);}
  /* しかくい めん。a→b→c→d は おもてから みて はんとけいまわり。uvs を わたすと その まま つかう */
  quad(mat,a,b,c,d,col,uvs){
    const B=this.buf(mat);_v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);_n.set(d[0]-a[0],d[1]-a[1],d[2]-a[2]);_v.cross(_n).normalize();
    if(col!=null)_c.set(col);else _c.setRGB(1,1,1);
    const pts=[a,b,c,a,c,d],ui=[0,1,2,0,2,3];
    for(let i=0;i<6;i++){const q=pts[i];B.p.push(q[0],q[1],q[2]);B.n.push(_v.x,_v.y,_v.z);B.c.push(_c.r,_c.g,_c.b);
      if(uvs)B.u.push(uvs[ui[i]][0],uvs[ui[i]][1]);else this.uv(mat,B,q[0],q[1],q[2],_v.x,_v.y,_v.z,0,0);}
  }
  build(group){
    for(const [mat,b] of this.m){if(!b.p.length)continue;const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
      const mesh=new THREE.Mesh(g,mat);mesh.castShadow=!!mat.userData.cast;mesh.receiveShadow=mat.userData.recv!==false;
      if(mat.userData.order)mesh.renderOrder=mat.userData.order;group.add(mesh);}
    return group;
  }
}

export function create(cv,G){
  const SP=G.SP,SPM=SP*U;
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,1,70000);
  scene.fog=new THREE.Fog(0xbfd8ee,60,22000);
  let pixelRatio=Math.min(2,window.devicePixelRatio||1),W=0,H=0;

  /* ---------- そら ---------- */
  const skyU={top:{value:new THREE.Color()},bot:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color(1,1,1)},sunK:{value:1}};
  const skyMat=new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 top,bot,sunDir,sunCol;uniform float sunK;varying vec3 vD;
      void main(){vec3 d=normalize(vD);float h=max(d.y,0.0);
        vec3 c=mix(bot,top,pow(h,0.55));
        c=mix(c,bot*0.82,smoothstep(0.0,-0.12,d.y));
        float sd=max(dot(d,sunDir),0.0);
        c+=sunCol*sunK*(pow(sd,900.0)*2.5+pow(sd,60.0)*0.28+pow(sd,6.0)*0.10);
        c+=sunCol*sunK*smoothstep(0.99955,0.99975,sd)*6.0;
        gl_FragColor=vec4(c,1.0);
        #include <colorspace_fragment>
      }`});
  const skyGeo=new THREE.SphereGeometry(30000,32,16);
  const sky=new THREE.Mesh(skyGeo,skyMat);sky.renderOrder=-20;sky.frustumCulled=false;scene.add(sky);
  const envScene=new THREE.Scene();envScene.add(new THREE.Mesh(skyGeo,skyMat));
  const pmrem=new THREE.PMREMGenerator(renderer);let envRT=null,envKey='',envT=-9;
  /* ほし・つき・くも */
  const stars=(()=>{const p=[],r=rng(5);for(let i=0;i<1400;i++){const a=r()*Math.PI*2,y=r()*0.95+0.03,q=Math.sqrt(1-y*y);p.push(Math.cos(a)*q*28000,y*28000,Math.sin(a)*q*28000);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    const m=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));m.renderOrder=-19;m.frustumCulled=false;return m;})();
  scene.add(stars);
  const glowTex=tex(glowCanvas());
  const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xf4f1e2,transparent:true,opacity:0,depthWrite:false,fog:false}));
  moon.scale.set(2600,2600,1);moon.position.set(-9000,9500,-22000);moon.renderOrder=-18;scene.add(moon);
  const cloudTex=[tex(cloudCanvas(11)),tex(cloudCanvas(23)),tex(cloudCanvas(37))];
  const cloudMat=cloudTex.map(t=>new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false,opacity:0.9}));
  const clouds=[];{const r=rng(9);for(let i=0;i<46;i++){const s=new THREE.Sprite(cloudMat[i%3]);const w=3200+r()*5200;s.scale.set(w,w*(0.3+r()*0.14),1);
    s.userData={x:(r()-0.5)*52000,y:1400+r()*4200,z:-8000-r()*15000,sp:4+r()*6};s.renderOrder=-17;scene.add(s);clouds.push(s);}}

  /* ---------- ひかり ---------- */
  const hemi=new THREE.HemisphereLight(0xffffff,0x6f7a5c,0.35);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffffff,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-130,right:130,top:70,bottom:-70,near:10,far:700});sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.06;
  sun.target.position.set(-45,0,-2);scene.add(sun,sun.target);
  const headLamp=new THREE.SpotLight(0xfff2cf,0,260,0.34,0.6,1.3);headLamp.position.set(HEAD_X1-1.2,1.1,0);headLamp.target.position.set(HEAD_X1+60,-0.5,0);scene.add(headLamp,headLamp.target);
  const stLamp=new THREE.PointLight(0xfff0d8,0,90,1.6),tunLamp=new THREE.PointLight(0xffd9a0,0,70,1.5);scene.add(stLamp,tunLamp);

  /* ---------- そざい ---------- */
  const std=(o,ud)=>{const m=new THREE.MeshStandardMaterial(o);Object.assign(m.userData,ud||{});return m;};
  const nt=(base,amp,coarse,seed,size)=>tex(noiseCanvas(size||128,base,amp,coarse,seed),true,ANISO);
  const M={
    grass:std({map:nt([108,132,76],0.34,0.07,21,256),roughness:1,vertexColors:true},{uv:[1/9,1/9]}),
    field:std({map:nt([200,205,190],0.16,0.3,22),roughness:0.95,vertexColors:true},{uv:[1/5,1/5]}),
    ballast:std({map:nt([118,110,102],0.5,0.25,23),roughness:1,vertexColors:true},{uv:[1/2.5,1/2.5],cast:true}),
    track:std({map:tex(trackCanvas(),true,ANISO),roughness:0.95,vertexColors:true}),
    concrete:std({map:nt([190,188,182],0.09,0.07,24),roughness:0.9,vertexColors:true},{uv:[1/4,1/4],cast:true}),
    asphalt:std({map:nt([96,98,104],0.2,0.08,25),roughness:0.95,vertexColors:true},{uv:[1/3,1/3],cast:true}),
    steel:std({color:0x8d949c,roughness:0.5,metalness:0.7,vertexColors:true},{cast:true}),
    paint:std({map:nt([232,230,224],0.06,0.12,26),roughness:0.85,vertexColors:true},{uv:[1/3,1/3],cast:true}),
    roof:std({map:nt([150,150,150],0.25,0.2,27),roughness:0.7,vertexColors:true},{uv:[1/1.2,1/1.2],cast:true}),
    bldg:std({map:tex(windowCanvas(false,31),true,ANISO),emissiveMap:tex(windowCanvas(true,32),true,ANISO),emissive:0xffffff,emissiveIntensity:0,roughness:0.55,metalness:0.1,vertexColors:true},{uv:[1/24,1/25.6],cast:true}),
    trunk:std({color:0x5a4634,roughness:1,vertexColors:true},{cast:true}),
    leaf:std({map:nt([150,170,120],0.5,0.5,28),roughness:1,vertexColors:true},{uv:[1/2,1/2],cast:true}),
    hill:std({map:nt([120,140,100],0.5,0.6,29,256),roughness:1,vertexColors:true}),
    win:std({color:0x1c2733,emissive:0xffd9a0,emissiveIntensity:0,roughness:0.15,metalness:0.6,vertexColors:true}),
    lamp:new THREE.MeshBasicMaterial({color:0xfff1cf,vertexColors:true}),
    nlamp:std({color:0xdfe3e6,emissive:0xfff4dc,emissiveIntensity:0,roughness:0.4,vertexColors:true}),
    line:std({color:0xffffff,roughness:0.8,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
    water:new THREE.MeshPhysicalMaterial({color:0x1d4a5e,roughness:0.1,metalness:0.0,normalMap:waterNormalCanvas(),normalScale:new THREE.Vector2(0.13,0.13),envMapIntensity:1.6,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
    glassRail:std({color:0x9fb3c0,roughness:0.1,metalness:0.2,transparent:true,opacity:0.28,vertexColors:true},{order:2})
  };
  M.water.userData={uv:[1/57,1/57]};M.lamp.userData={};M.line.userData.uv=null;
  M.water.normalMap.anisotropy=ANISO;

  /* ---------- いつも ある もの（じめん・レール・でんせん） ---------- */
  const groundTex=nt([104,128,74],0.34,0.06,41,256);groundTex.repeat.set(2600,2600);
  const groundMat=new THREE.MeshStandardMaterial({map:groundTex,roughness:1});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(52000,52000).rotateX(-Math.PI/2),groundMat);ground.position.y=GY-0.12;ground.receiveShadow=true;scene.add(ground);
  const farSeaMat=new THREE.MeshPhysicalMaterial({color:0x1d4a5e,roughness:0.12,transparent:true,opacity:0,envMapIntensity:1.4});
  const farSea=new THREE.Mesh(new THREE.PlaneGeometry(60000,30000).rotateX(-Math.PI/2),farSeaMat);farSea.position.set(0,GY+0.1,-1300-15000);farSea.visible=false;scene.add(farSea);
  {const b=new Batch(),rail=std({color:0x7b7f86,roughness:0.28,metalness:0.9,vertexColors:true},{cast:false}),wire=std({color:0x2c2f33,roughness:0.6,metalness:0.6,vertexColors:true});
    [0,FAR_TRACK].forEach(zc=>{[-0.7175,0.7175].forEach(o=>{b.box(rail,-2600,1500,-0.17,0,zc+o-0.035,zc+o+0.035);b.box(rail,-2600,1500,-0.2,-0.17,zc+o-0.07,zc+o+0.07,0x4a4038);});
      b.box(wire,-2600,1500,5.08,5.11,zc-0.012,zc+0.012);b.box(wire,-2600,1500,6.25,6.275,zc-0.012,zc+0.012);});
    scene.add(b.build(new THREE.Group()));}

  /* ---------- とおくの やま ---------- */
  function ridge(o){
    const L=o.L,nx=Math.round(L/o.step),rows=o.rows||[0,0.14,0.3,0.44,0.56,0.7,0.86,1],env=o.env||[0,0.42,0.82,1,0.92,0.7,0.36,0],nr=rows.length;
    const P=Math.PI*2/L,pos=[],col=[],idx=[],c=new THREE.Color(),c2=new THREE.Color();
    const Hf=x=>{let v=0;o.harm.forEach(([k,a,ph,ab])=>{const s=Math.sin(x*P*k+ph);v+=a*(ab?Math.abs(s):s*0.5+0.5);});return o.base+v;};
    for(let i=0;i<=nx;i++){const x=i*o.step,im=i%nx,Hx=Hf(x);
      for(let r=0;r<nr;r++){const j=1+(o.rough||0)*(h2(im*3.1+o.seed,r*7.7)-0.5)*2,y=Hx*env[r]*j,z=lerp(o.z0,o.z1,rows[r])+(h2(im,r+o.seed)-0.5)*o.step*0.6;
        pos.push(x-L/2,y+GY,z);
        const t=y/(o.base+o.amp);c.set(o.c0).lerp(c2.set(o.c1),clamp(t*1.2,0,1));
        if(o.snow!=null&&y>o.snow*(0.85+0.3*h2(im+9,r)))c.set(0xf2f5f8);
        c.multiplyScalar(0.88+0.24*h2(im+o.seed*3,r+5));col.push(c.r,c.g,c.b);}}
    for(let i=0;i<nx;i++)for(let r=0;r<nr-1;r++){const a=i*nr+r,b=a+nr;idx.push(a,b,a+1, b,b+1,a+1);}
    let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);
    if(o.flat){g=g.toNonIndexed();}g.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:!!o.flat,transparent:true}),grp=new THREE.Group();
    for(let k=-o.copies;k<=o.copies;k++){const m=new THREE.Mesh(g,mat);m.position.x=k*L;m.frustumCulled=false;grp.add(m);}
    grp.userData={L,mats:[mat],w:0};return grp;
  }
  function cone(o){
    const pts=[],N=26;for(let i=0;i<=N;i++){const t=i/N,r=lerp(o.R,o.rt,Math.pow(t,o.k));pts.push(new THREE.Vector2(r,o.H*t));}
    pts.push(new THREE.Vector2(0,o.H*0.985));
    const g=new THREE.LatheGeometry(pts,56),p=g.attributes.position,col=[],c=new THREE.Color();
    for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i)),j=h1(Math.round(a*9))*0.5+vnoise(a*6,3)*0.5;
      const rr=1+0.05*(vnoise(a*5,y/400)-0.5);p.setX(i,p.getX(i)*rr);p.setZ(i,p.getZ(i)*rr);
      if(o.snow!=null&&y>o.H*(o.snow+0.16*j))c.set(0xf4f6fa);else c.set(o.c0).lerp(_c.set(o.c1),clamp(y/o.H*1.3,0,1));
      c.multiplyScalar(0.9+0.2*vnoise(a*14,y/160)).lerp(_c.set(0xa9c0dc),0.34);col.push(c.r,c.g,c.b);}
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,transparent:true,fog:false}),m=new THREE.Mesh(g,mat);m.position.y=GY;m.frustumCulled=false;return {m,mat};
  }
  const smokeMat=new THREE.SpriteMaterial({map:cloudTex[0],color:0xb9b6b2,transparent:true,depthWrite:false,fog:false,opacity:0});
  const LAYERS={};
  function layer(key){
    if(LAYERS[key])return LAYERS[key];
    const [type,sn]=key.split('|');let g;
    const lowHills=()=>ridge({L:18000,step:300,z0:-2600,z1:-5200,base:120,amp:330,harm:[[3,150,0.4,1],[7,110,1.9,1],[17,70,0.7,0]],c0:0x5f7f66,c1:0x7f96a0,seed:3,copies:2,rough:0.25});
    if(type==='mid')g=ridge({L:9000,step:90,z0:-720,z1:-1700,base:30,amp:120,harm:[[4,55,0.3,1],[9,40,2.2,0],[23,25,1.1,0]],c0:0x4f7446,c1:0x6c8a5c,seed:1,copies:3,rough:0.3});
    else if(type==='range')g=ridge({L:24000,step:300,z0:-3200,z1:-9000,base:420,amp:1300,harm:[[5,620,0.2,1],[11,430,1.4,1],[29,250,2.6,1]],c0:0x4f6658,c1:0x7b828a,snow:sn==='1'?520:1650,seed:7,copies:2,rough:0.42,flat:true});
    else if(type==='fuji'){g=lowHills();const k=cone({R:8200,rt:520,H:3400,k:0.42,c0:0x4a5e76,c1:0x5d6f8c,snow:0.60});k.m.position.z=-9500;g.add(k.m);g.userData.mats.push(k.mat);g.userData.cone=k.m;}
    else if(type==='volcano'){g=lowHills();const k=cone({R:3800,rt:420,H:1350,k:0.5,c0:0x56644f,c1:0x6e6a62});k.m.position.z=-8200;g.add(k.m);g.userData.mats.push(k.mat);g.userData.cone=k.m;
      g.userData.smoke=[];for(let i=0;i<7;i++){const s=new THREE.Sprite(smokeMat);g.add(s);g.userData.smoke.push(s);}}
    else if(type==='sea'){g=ridge({L:30000,step:300,z0:-7000,z1:-10500,base:0,amp:420,harm:[[2,420,0.9,0],[5,260,2.4,0]],c0:0x56705f,c1:0x7890a0,seed:11,copies:2,rough:0.3,
      env:[0,0.5,0.9,1,0.9,0.6,0.3,0]});g.children.forEach(m=>{m.position.y=-190;});}
    else g=ridge({L:18000,step:260,z0:-2000,z1:-5200,base:150,amp:420,harm:[[3,200,0.4,1],[7,140,1.9,1],[17,80,0.7,0]],c0:0x55785a,c1:0x7f96a0,seed:5,copies:2,rough:0.28});
    g.visible=false;scene.add(g);LAYERS[key]=g;return g;
  }
  const mid=layer('mid|0');let farCur='';

  /* ---------- くかんの けしき（150m ずつ つくる） ---------- */
  let world=null,seed=0;const chunks=new Map(),stations=new Map();
  const isSea=k=>G.sceneFor(k).far==='sea';
  function landDepth(X){const k=Math.floor(X/SP),fr=(X-k*SP)/SP,w=0.024;let s=isSea(k)?1:0;
    if(fr<w)s=lerp(isSea(k-1)?1:0,s,sstep(0,1,0.5+fr/(2*w)));else if(fr>1-w)s=lerp(s,isSea(k+1)?1:0,sstep(0,1,(fr-(1-w))/(2*w)));
    return 760-715*s;}
  function cityAt(X){const k=Math.floor(X/SP);let c=0;[k,k+1].forEach(j=>{if(G.isCity(j))c=Math.max(c,1-Math.abs(X-j*SP)/3400);});return Math.max(0,c);}
  /* えき k の ホームが ある はんい（ゲームの たんい） */
  function platRange(k){const c=k*SP;let r=c-1860;if(k>0){const f=G.feat(k-1);r=Math.max(r,f.t1+450);}return[Math.min(r,c-330),c+340];}
  function hillH(f,X,d){
    const bump=sstep(f.t0-420,f.t0-40,X)*(1-sstep(f.t1+40,f.t1+420,X));if(bump<=0||d<=0)return 0;
    const dm=d,p=66*sstep(0,150,dm)*(1-0.8*sstep(210,470,dm));
    return bump*p*(0.8+0.5*vnoise(X*U/38,dm/34));
  }
  const TREE_G=[0x355e2c,0x3f6d33,0x4a7a3a,0x2f5429,0x567f3f],CONIFER=[0x2a4a2c,0x2f5232,0x254226];
  function tree(b,x,y,z,s,snow,r,conifer){
    b.add(M.trunk,T_CYL,x,y+1.0*s,z,0.14*s,2.0*s,0.14*s);
    const sn=c=>snow?_c.set(c).lerp(new THREE.Color(0xf0f3f6),0.55).getHex():c;
    if(conifer){for(let i=0;i<3;i++)b.add(M.leaf,T_CONE,x,y+(2.2+i*1.5)*s,z,(1.9-i*0.45)*s,2.6*s,(1.9-i*0.45)*s,sn(CONIFER[(r()*3)|0]),r()*3);}
    else{const n=4+((r()*3)|0),base=TREE_G[(r()*5)|0];for(let i=0;i<n;i++){const a=r()*6.28,q=i?(0.9+r()*0.9)*s:0,hh=i?2.4+r()*1.9:3.9+r()*0.6;
      _c.set(base).multiplyScalar(0.75+r()*0.5);
      b.add(M.leaf,T_ICO,x+Math.cos(a)*q,y+hh*s,z+Math.sin(a)*q,(1.2+r()*0.8)*s,(1.0+r()*0.6)*s,(1.2+r()*0.8)*s,sn(_c.getHex()),r()*3,r()*0.6);}}
  }
  const WALLS=[0xe9e4d8,0xd9d2c2,0xf2efe8,0xc9c4b8,0xb9ad9c,0xdcd8d0],ROOFS=[0x4a4f57,0x5b4a42,0x39424d,0x6b3d33,0x3d4a44];
  function house(b,x,z,r,snow){
    const w=7+r()*4,d=6+r()*2.5,h=5.2+r()*1.2,ry=(r()<0.5?0:Math.PI/2)+(r()-0.5)*0.2,wall=WALLS[(r()*6)|0];
    b.add(M.paint,T_BOX,x,GY+h/2,z,w,h,d,wall,ry);
    b.add(M.roof,T_ROOF,x,GY+h,z,w+0.9,2.0+r()*0.8,d+0.9,snow?0xeef1f4:ROOFS[(r()*5)|0],ry);
    const c=Math.cos(ry),s=Math.sin(ry);
    for(let i=-1;i<=1;i+=2)for(let fl=0;fl<2;fl++){const lx=i*w*0.24,lz=d/2+0.03;
      b.add(M.win,T_BOX,x+lx*c+lz*s,GY+1.5+fl*2.6,z-lx*s+lz*c,1.3,1.1,0.06,null,ry);}
  }
  const BTINT=[0xffffff,0xe6e2da,0xd5dbe2,0xcfc9bf,0xb8c0c8,0xf1ead9];
  function building(b,x,z,r,city,row){
    const w=3*(4+((r()*5)|0)),d=3*(4+((r()*4)|0)),fl=4+((r()*r()*(6+26*city)+row*0.4)|0),h=fl*3.2,tint=BTINT[(r()*6)|0];
    b.box(M.bldg,x-w/2,x+w/2,GY,GY+h,z-d/2,z+d/2,tint);
    b.box(M.concrete,x-w/2-0.2,x+w/2+0.2,GY+h,GY+h+0.8,z-d/2-0.2,z+d/2+0.2,0xb9bcc0);
    if(r()<0.7)b.box(M.concrete,x-w/4,x+w/8,GY+h+0.8,GY+h+3.2,z-d/4,z+d/6,0x9aa0a6);
  }
  const PADDY=[0x8fae4a,0x9cb64e,0x7da045,0xa9b85a,0xb8b36a,0x86a84c];
  function buildChunk(i){
    const b=new Batch(),X0=i*CH,X1=X0+CH,k=Math.floor(X0/SP),sc=G.sceneFor(k),f=G.feat(k),r=rng(i*7919+seed),grp=new THREE.Group();
    const lx=X=>(X-X0)*U,snow=sc.snow;
    const slope=snow?0xe9edf0:0xffffff;
    /* ---- もりど（川の ところは はし）と レールの した ---- */
    const cuts=[];{let a=X0;if(f.r1>X0&&f.r0<X1){if(f.r0>a)cuts.push([a,Math.min(f.r0,X1)]);a=Math.max(a,Math.min(f.r1,X1));}if(a<X1)cuts.push([a,X1]);}
    cuts.forEach(([A,B])=>{if(B-A<1)return;const a=lx(A),c=lx(B);
      b.quad(M.ballast,[a,TOPY-0.02,2.6],[c,TOPY-0.02,2.6],[c,TOPY-0.02,-6.9],[a,TOPY-0.02,-6.9]);
      b.quad(M.grass,[a,GY,6.8],[c,GY,6.8],[c,TOPY-0.02,2.6],[a,TOPY-0.02,2.6],slope);
      b.quad(M.grass,[a,TOPY-0.02,-6.9],[c,TOPY-0.02,-6.9],[c,GY,-11.1],[a,GY,-11.1],slope);});
    [0,FAR_TRACK].forEach(zc=>{const u0=X0*U/2.4,u1=X1*U/2.4;b.quad(M.track,[0,TOPY,zc+1.5],[CHM,TOPY,zc+1.5],[CHM,TOPY,zc-1.5],[0,TOPY,zc-1.5],null,[[u0,0],[u1,0],[u1,1],[u0,1]]);});
    if(f.r1>X0&&f.r0<X1){
      const A=Math.max(f.r0,X0),B=Math.min(f.r1,X1),a=lx(A),c=lx(B);
      b.box(M.concrete,a,c,-1.5,TOPY-0.02,-6.9,2.6,0xc6c8c8);
      b.box(M.concrete,a,c,TOPY-0.02,0.42,2.45,2.65,0xd0d2d2);b.box(M.concrete,a,c,TOPY-0.02,0.42,-7.1,-6.9,0xd0d2d2);
      for(let X=f.r0+40;X<f.r1;X+=180)if(X>=X0&&X<X1)b.box(M.concrete,lx(X)-1,lx(X)+1,GY-0.5,-1.5,-6.2,1.9,0xb4b7b8);
      /* 川と ていぼう */
      const wa=lx(Math.max(f.r0+40,X0)),wc=lx(Math.min(f.r1-40,X1));
      if(wc>wa)b.quad(M.water,[wa,GY+0.12,170],[wc,GY+0.12,170],[wc,GY+0.12,-1300],[wa,GY+0.12,-1300]);
      [[f.r0-30,f.r0+40,1],[f.r1-40,f.r1+30,-1]].forEach(([L0,L1])=>{const xs=[L0,L0+25,L1-25,L1].map(X=>clamp(X,X0,X1)).map(lx),ys=[GY,GY+1.25,GY+1.25,GY];
        for(let q=0;q<3;q++){if(xs[q+1]-xs[q]<0.01)continue;
          [[170,2.7],[-7.0,-1300]].forEach(([z0,z1])=>b.quad(M.grass,[xs[q],ys[q],z0],[xs[q+1],ys[q+1],z0],[xs[q+1],ys[q+1],z1],[xs[q],ys[q],z1],q===1?0xd9d4c4:slope));}});
    }
    /* ---- かせんの はしら ---- */
    const pA=platRange(k),pB=platRange(k+1);
    for(let n=Math.ceil((X0-150)/300);n*300+150<X1;n++){const X=n*300+150;if(X<X0)continue;
      if(G.inTunnel(X)||G.nearStation(X,360)||(X>pA[0]-60&&X<pA[1]+40)||(X>pB[0]-60&&X<pB[1]+40))continue;
      const x=lx(X),onBridge=X>f.r0-20&&X<f.r1+20,y0=onBridge?TOPY:GY+1.2;
      b.box(M.steel,x-0.14,x+0.14,y0,7.6,3.25,3.55);b.box(M.steel,x-0.14,x+0.14,y0,7.6,-7.85,-7.55);
      b.box(M.steel,x-0.1,x+0.1,7.2,7.5,-7.85,3.55);b.box(M.steel,x-0.08,x+0.08,6.5,6.62,-7.7,3.4);
      [0,FAR_TRACK].forEach(zc=>{b.box(M.steel,x-0.04,x+0.04,6.27,7.2,zc-0.04,zc+0.04);b.box(M.steel,x-0.03,x+0.03,5.11,5.17,zc-0.03,zc+1.3);b.add(M.steel,T_BOX,x,5.85,zc+1.3,0.05,1.5,0.05,0x6b5b4b);});
    }
    /* ---- トンネル（こちらがわを ひらいた こうぞう）と うしろの やま ---- */
    if(f.t1>X0&&f.t0<X1){
      const A=Math.max(f.t0,X0),B=Math.min(f.t1,X1),a=lx(A),c=lx(B);
      b.box(M.concrete,a,c,7.4,8.7,-9.5,4.9,0xb6b8b6);b.box(M.concrete,a,c,GY,7.4,-9.5,-8.9,0xa9aba9);
      for(let X=Math.ceil(A/120)*120;X<B;X+=120)b.box(M.concrete,lx(X)-0.3,lx(X)+0.3,GY,7.4,4.2,4.8,0xbfc1bf);
      for(let X=Math.ceil(A/90)*90;X<B;X+=90){b.box(M.lamp,lx(X)-0.6,lx(X)+0.6,6.55,6.7,-8.88,-8.8);b.box(M.lamp,lx(X)-0.5,lx(X)+0.5,7.32,7.4,-2.4,-2.1,0xfff0d0);}
      [f.t0,f.t1].forEach(X=>{if(X>=X0&&X<X1)b.box(M.concrete,lx(X)-0.5,lx(X)+0.5,7.0,9.4,-9.6,5.0,0xc2c4c2);});
    }
    const hx0=Math.max(X0,f.t0-430),hx1=Math.min(X1,f.t1+430);
    if(hx1>hx0){
      const ds=[0,5,12,24,40,62,90,125,165,210,260,320,390,470],step=100,nx=Math.ceil((hx1-hx0)/step),pos=[],nor=[],col=[],uv=[],idx=[],c=new THREE.Color();
      for(let ix=0;ix<=nx;ix++){const X=Math.min(hx1,hx0+ix*step);
        for(let j=0;j<ds.length;j++){const d=ds[j],y=hillH(f,X,d),e=2;
          const dx=(hillH(f,X+e*10,d)-hillH(f,X-e*10,d))/(2*e),dz=(hillH(f,X,d+e)-hillH(f,X,Math.max(0.01,d-e)))/(2*e);
          pos.push(lx(X),GY+y-0.05,-9.5-d);_n.set(-dx,1,dz).normalize();nor.push(_n.x,_n.y,_n.z);uv.push(X*U/7,d/7);
          c.set(snow?0xdfe6ea:0x52763f).multiplyScalar(0.85+0.3*vnoise(X*U/20,d/20));col.push(c.r,c.g,c.b);}}
      for(let ix=0;ix<nx;ix++)for(let j=0;j<ds.length-1;j++){const a=ix*ds.length+j,q=a+ds.length;idx.push(a,q,a+1, q,q+1,a+1);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);
      const m=new THREE.Mesh(g,M.hill);m.receiveShadow=true;m.castShadow=true;grp.add(m);
      const nt=Math.round((hx1-hx0)/CH*260);
      for(let n=0;n<nt;n++){const X=hx0+r()*(hx1-hx0),d=8+r()*r()*300,y=hillH(f,X,d);if(y<1.5)continue;tree(b,lx(X),GY+y-0.9,-9.5-d,1.5+r()*1.4,snow,r,snow||r()<0.4);}
    }
    /* ---- うみ（むこうがわ）と かいがん ---- */
    {const n=6;for(let q=0;q<n;q++){const Xa=X0+CH*q/n,Xb=X0+CH*(q+1)/n,da=landDepth(Xa),db=landDepth(Xb);if(da>750&&db>750)continue;
      const a=lx(Xa),c=lx(Xb);
      b.quad(M.water,[a,GY+0.12,-da],[c,GY+0.12,-db],[c,GY+0.12,-1300],[a,GY+0.12,-1300]);
      b.quad(M.concrete,[a,GY+1.3,-da+2.2],[c,GY+1.3,-db+2.2],[c,GY-0.2,-db-1.2],[a,GY-0.2,-da-1.2],0x9da3a6);
      b.quad(M.concrete,[a,GY,-da+4.5],[c,GY,-db+4.5],[c,GY+1.3,-db+2.2],[a,GY+1.3,-da+2.2],0xb3b8ba);}}
    /* ---- まち・たんぼ・かじゅえん ---- */
    const rows=[-25,-44,-64,-88,-118,-156,-204,-268,-350,-450,-570,-700],nearType=sc.near,NS=10;
    for(let sx=0;sx<NS;sx++)for(let ri=0;ri<rows.length-1;ri++){
      const X=X0+(sx+0.5)*CH/NS,z0=rows[ri],z1=rows[ri+1],dep=z0-z1,x=lx(X),q=r(),q2=r(),jx=(r()-0.5)*5,jz=(r()-0.5)*dep*0.3,zc=(z0+z1)/2;
      if(X>f.r0-130&&X<f.r1+130)continue;
      if(X>f.t0-470&&X<f.t1+470)continue;
      if(-z1>landDepth(X)-6)continue;
      const city=cityAt(X);
      if(q<city*0.92){if(dep>16||q2<0.8)building(b,x+jx*0.4,z0-Math.min(dep,26)/2-2,r,city,ri);continue;}
      if(nearType==='orchard'&&q2<0.8){
        const n=Math.max(2,Math.min(5,Math.floor(dep/7)));
        for(let a=0;a<2;a++)for(let c=0;c<n;c++){const tx=x-3.6+a*7.2,tz=z0-3-c*(dep-4)/n,s=0.62+r()*0.12;
          b.add(M.trunk,T_CYL,tx,GY+0.8,tz,0.12,1.6,0.12);b.add(M.leaf,T_ICO,tx,GY+2.5*s+0.6,tz,2.4*s,1.9*s,2.4*s,snow?0xdfe6e6:TREE_G[(r()*5)|0],r()*3);
          if(!snow)for(let e=0;e<4;e++){const an=r()*6.28;b.add(M.paint,T_ICO,tx+Math.cos(an)*2.1*s,GY+2.2*s+0.6+r()*0.9,tz+Math.sin(an)*2.1*s,0.14,0.14,0.14,0xb5202a);}}
        continue;}
      if(nearType==='field'&&city<0.5){
        const col=snow?[0xeef2f5,0xe4eaee,0xf5f7f9][(r()*3)|0]:PADDY[(r()*6)|0],hw=CHM/NS/2-0.5;
        b.quad(M.field,[x-hw,GY+0.03,z0-0.6],[x+hw,GY+0.03,z0-0.6],[x+hw,GY+0.03,z1+0.6],[x-hw,GY+0.03,z1+0.6],col);
        if(q2<0.10)house(b,x+jx,zc+jz,r,snow);else if(q2<0.2)tree(b,x+jx,GY,zc+jz,0.9+r()*0.7,snow,r,snow&&r()<0.6);
        continue;}
      /* まち（いえ と き） */
      if(q2<0.5){house(b,x+jx,z0-5-r()*Math.max(0,dep-12),r,snow);if(dep>26&&r()<0.7)house(b,x-jx,z1+6,r,snow);}
      else if(q2<0.82){tree(b,x+jx,GY,zc+jz,0.9+r()*0.9,snow,r,snow&&r()<0.6);if(dep>20)tree(b,x-jx,GY,zc-jz*2,0.8+r()*0.8,snow,r,false);}
      else if(q2<0.9)building(b,x,z0-dep/2,r,0.05,0);
    }
    /* ---- てまえがわ：そくどう・はたけ・ちゅうしゃじょう（せんろより ひくい ものだけ） ---- */
    {const CARC=[0xe8e8e8,0x2b2f36,0x9aa3ad,0x7c1f24,0x1f3a63,0xcfd3d6,0x4b5560];
      cuts.forEach(([A,B])=>{const a=lx(Math.max(A,X0+ (A>X0?45:0))),c=lx(Math.min(B,X1-(B<X1?45:0)));if(c-a<2)return;
        b.quad(M.asphalt,[a,GY+0.05,15.4],[c,GY+0.05,15.4],[c,GY+0.05,9.6],[a,GY+0.05,9.6],0xb9bcc2);
        for(let x=Math.ceil(a/8)*8;x<c-3;x+=8)b.quad(M.line,[x,GY+0.07,12.56],[x+3,GY+0.07,12.56],[x+3,GY+0.07,12.44],[x,GY+0.07,12.44],0xe6e6e0);});
      const NS2=10;for(let sx=0;sx<NS2;sx++){const X=X0+(sx+0.5)*CH/NS2,x=lx(X),hw=CHM/NS2/2-0.4;if(X>f.r0-90&&X<f.r1+90)continue;
        const city=cityAt(X),q=r();
        [[16.6,34],[35,62],[63,110]].forEach(([z0,z1],ri)=>{
          if(city>0.35||(nearType==='town'&&q<0.5)){
            if(ri>0&&city<0.35)return;
            b.quad(M.asphalt,[x-hw,GY+0.04,z1],[x+hw,GY+0.04,z1],[x+hw,GY+0.04,z0],[x-hw,GY+0.04,z0],0xa9adb4);
            for(let cx=x-hw+1.6;cx<x+hw-1;cx+=2.7){if(r()<0.45)continue;const cc=CARC[(r()*7)|0],cz=z0+3.2+((r()*2)|0)*((z1-z0)>20?9:0);
              b.box(M.paint,cx-0.9,cx+0.9,GY+0.25,GY+0.95,cz-2.1,cz+2.1,cc);b.box(M.win,cx-0.82,cx+0.82,GY+0.95,GY+1.5,cz-1.2,cz+1.0);}
          }else if(nearType==='town'){
            b.quad(M.field,[x-hw,GY+0.03,z1],[x+hw,GY+0.03,z1],[x+hw,GY+0.03,z0],[x-hw,GY+0.03,z0],snow?0xeef2f5:[0x9aa86a,0x8a9a5c,0xa7a078][(r()*3)|0]);
            if(ri===0&&r()<0.5)b.add(M.leaf,T_ICO,x-hw+2+r()*(2*hw-4),GY+0.5,z0+2+r()*(z1-z0-4),0.9+r()*0.5,0.6+r()*0.3,0.9+r()*0.5,snow?0xdfe6e6:TREE_G[(r()*5)|0],r()*3);
          }else b.quad(M.field,[x-hw,GY+0.03,z1-0.5],[x+hw,GY+0.03,z1-0.5],[x+hw,GY+0.03,z0],[x-hw,GY+0.03,z0],snow?[0xeef2f5,0xe4eaee,0xf5f7f9][(r()*3)|0]:PADDY[(r()*6)|0]);
        });}}
    /* てまえがわの せんろぎわ：ひくい フェンス */
    if(!(f.t1>X0&&f.t0<X1))for(let X=X0;X<X1;X+=50){if((X>f.r0-40&&X<f.r1+40)||(X>pA[0]-30&&X<pA[1]+30)||(X>pB[0]-30&&X<pB[1]+30))continue;b.box(M.steel,lx(X)-0.03,lx(X)+0.03,GY,GY+1.5,-11.6,-11.54,0x9aa0a6);}
    b.build(grp);grp.userData.i=i;scene.add(grp);return grp;
  }

  /* ---------- えき ---------- */
  function signCanvas(k){
    const c=canvas(1080,352),g=c.getContext('2d'),n=G.st(k),p=G.st(k-1),q=G.st(k+1),W=1080;
    g.fillStyle='#fbfbf9';g.fillRect(0,0,W,352);g.fillStyle='#1b1f24';g.textAlign='center';g.textBaseline='middle';
    g.font='600 46px '+SANS;g.fillText(n[1],W/2,56,W-120);
    g.font='700 112px '+SANS;g.fillText(n[0],W/2,146,W-120);
    g.font='500 36px '+SANS;g.fillText(n[2],W/2,226,W-120);
    g.fillStyle=G.lineColor();g.fillRect(0,252,W,16);
    g.fillStyle='#1b1f24';g.font='500 40px '+SANS;
    if(G.idx(k-1)===G.idx(k+1)){g.textAlign='right';g.fillText(q[0]+'  '+q[2]+'  ▶',W-40,312,W-80);}
    else{g.textAlign='left';g.fillText('◀  '+p[0],40,312,W/2-60);g.textAlign='right';g.fillText(q[0]+'  ▶',W-40,312,W/2-60);}
    return c;
  }
  const PT=1.15;/* ホームの たかさ */
  function buildStation(k){
    const b=new Batch(),grp=new THREE.Group(),c=k*SP,[R0,R1]=platRange(k),x0=(R0-c)*U,x1=(R1-c)*U;
    /* てまえの ホーム */
    b.box(M.asphalt,x0,x1,PT-0.25,PT,NEAR_Z,9.6);b.box(M.concrete,x0,x1,GY,PT-0.25,NEAR_Z+0.25,9.6,0xb9bbb8);
    b.box(M.concrete,x0,x1,PT-0.25,PT+0.004,NEAR_Z,NEAR_Z+0.28,0xe8e8e4);
    b.quad(M.line,[x0,PT+0.012,NEAR_Z+1.1],[x1,PT+0.012,NEAR_Z+1.1],[x1,PT+0.012,NEAR_Z+0.75],[x0,PT+0.012,NEAR_Z+0.75],0xe2b417);
    G.DOORS.forEach(d=>{[-1,1].forEach(s=>{const dx=d*U+s*0.78;b.quad(M.line,[dx-0.06,PT+0.012,NEAR_Z+0.7],[dx+0.06,PT+0.012,NEAR_Z+0.7],[dx+0.06,PT+0.012,NEAR_Z+0.3],[dx-0.06,PT+0.012,NEAR_Z+0.3],0xf4f4f0);});});
    b.box(M.glassRail,x0,x1,PT+0.15,PT+1.05,9.5,9.54);b.box(M.steel,x0,x1,PT+1.05,PT+1.1,9.47,9.57,0xaab0b6);b.box(M.concrete,x0,x1,PT,PT+0.15,9.4,9.6,0xc9cbc8);
    for(let x=x0+1;x<x1;x+=2.5)b.box(M.steel,x-0.025,x+0.025,PT+0.15,PT+1.05,9.49,9.55,0xaab0b6);
    /* むこうの ホーム・やね */
    const fz0=-6.1,fz1=-14.5;
    b.box(M.asphalt,x0,x1,PT-0.25,PT,fz1,fz0);b.box(M.concrete,x0,x1,GY,PT-0.25,fz1,fz0-0.25,0xb9bbb8);b.box(M.concrete,x0,x1,PT-0.25,PT+0.004,fz0-0.28,fz0,0xe8e8e4);
    b.quad(M.line,[x0,PT+0.012,fz0-0.75],[x1,PT+0.012,fz0-0.75],[x1,PT+0.012,fz0-1.1],[x0,PT+0.012,fz0-1.1],0xe2b417);
    b.box(M.paint,x0,x1,PT,PT+3.9,fz1,fz1+0.3,0xd8dad6);
    for(let x=x0+6;x<x1-2;x+=12){b.box(M.win,x,x+7,PT+1.3,PT+2.9,fz1+0.3,fz1+0.34);}
    b.box(M.steel,x0-0.5,x1+0.5,PT+3.9,PT+4.15,fz1-0.3,-1.9,0xc4c8cc);b.box(M.steel,x0-0.5,x1+0.5,PT+3.7,PT+3.9,-2.2,-1.9,0x8f959c);
    for(let x=x0+3;x<x1-1;x+=10){b.box(M.steel,x-0.15,x+0.15,PT,PT+3.9,-9.4,-9.1,0x9299a1);b.box(M.steel,x-0.1,x+0.1,PT+3.55,PT+3.9,fz1,-2.2,0x9299a1);
      b.box(M.nlamp,x+3.6,x+6.4,PT+3.78,PT+3.86,-5.0,-4.8);b.box(M.nlamp,x+3.6,x+6.4,PT+3.78,PT+3.86,-11.2,-11.0);}
    for(let x=x0+14;x<x1-8;x+=28){b.box(M.steel,x,x+2.4,PT+0.4,PT+0.47,-12.6,-12.1,0x60707c);b.box(M.steel,x+0.1,x+2.3,PT,PT+0.4,-12.4,-12.3,0x60707c);
      if((x|0)%3===0)b.box(M.paint,x+6,x+7.1,PT,PT+1.85,-13.9,-13.2,0xdfe4e8);}
    /* てまえの ホームの あかり */
    for(let x=x0+8;x<x1-2;x+=22){b.box(M.steel,x-0.06,x+0.06,PT,PT+4.4,9.2,9.32,0x8d949c);b.box(M.steel,x-0.05,x+0.05,PT+4.3,PT+4.4,7.4,9.3,0x8d949c);b.box(M.nlamp,x-0.5,x+0.5,PT+4.22,PT+4.3,7.3,7.7);}
    b.build(grp);
    /* えきめいひょう */
    const st=tex(signCanvas(k),false,ANISO),sm=new THREE.MeshStandardMaterial({map:st,roughness:0.6,emissive:0xffffff,emissiveMap:st,emissiveIntensity:0.15});
    grp.userData.signMat=sm;
    for(let x=6;x>x0+8;x-=42){const s=new THREE.Mesh(new THREE.BoxGeometry(4.6,1.5,0.14),[M.steel,M.steel,M.steel,M.steel,sm,M.steel]);s.position.set(x,PT+2.75,-8.2);s.userData.ownTex=false;grp.add(s);
      [-1.9,1.9].forEach(o=>{const h=new THREE.Mesh(T_BOX,M.steel);h.scale.set(0.05,0.6,0.05);h.position.set(x+o,PT+3.6,-8.2);grp.add(h);});}
    grp.userData.sign=st;scene.add(grp);return grp;
  }
  function clearWorld(){
    chunks.forEach(g=>{scene.remove(g);g.traverse(o=>{if(o.geometry&&o.geometry!==T_BOX)o.geometry.dispose();});});chunks.clear();
    stations.forEach(g=>{scene.remove(g);g.traverse(o=>{if(o.geometry&&o.geometry!==T_BOX)o.geometry.dispose();});g.userData.sign.dispose();g.userData.signMat.dispose();});stations.clear();
  }

  /* ---------- れっしゃ ---------- */
  const train=new THREE.Group();scene.add(train);
  const carX=n=>n===0?[HEAD_X0,HEAD_X1]:[HEAD_X0-n*(CAR_L+GAP),HEAD_X0-n*(CAR_L+GAP)+CAR_L];
  function loft(secs,xa,L){
    const Mn=44,pos=[],uv=[],idx=[];
    secs.forEach(s=>{const cy=(s.yb+s.yt)/2,ry=(s.yt-s.yb)/2,e=2/s.n;
      for(let j=0;j<=Mn;j++){const a=-Math.PI/2+Math.PI*2*j/Mn,sn=Math.sin(a),cs=Math.cos(a),y=cy+ry*Math.sign(sn)*Math.pow(Math.abs(sn),e),z=s.hw*Math.sign(cs)*Math.pow(Math.abs(cs),e);
        pos.push(s.x,y,z);uv.push((s.x-xa)/L,y/4);}});
    const R=Mn+1;for(let i=0;i<secs.length-1;i++)for(let j=0;j<Mn;j++){const a=i*R+j,b=a+R;idx.push(a,b,b+1, a,b+1,a+1);}
    const cap=(i,flip)=>{const s=secs[i],ci=pos.length/3;pos.push(s.x,(s.yb+s.yt)/2,0);uv.push(0.001,0.02);for(let j=0;j<Mn;j++){const a=i*R+j;if(flip)idx.push(ci,a+1,a);else idx.push(ci,a,a+1);}};
    cap(0,false);cap(secs.length-1,true);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const bez=(a,b,c,d,t)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;};
  const BODY={hw:1.69,yb:0.42,yt:3.65,n:6};
  function noseSecs(){
    const xb=HEAD_X1-NOSE,out=[{x:HEAD_X0,...BODY},{x:HEAD_X0+0.3,...BODY},{x:xb-1,...BODY}];
    for(let i=0;i<=30;i++){const t=i/30,X=bez(0,0.46,0.80,0.985,t)*NOSE,s=X/NOSE;
      out.push({x:xb+X,hw:1.69*(1-0.72*Math.pow(s,2.3)),yb:0.42+0.3*s*s*s,yt:bez(3.65,3.65,2.05,1.28,t),n:6-3.4*s});}
    out.push({x:HEAD_X1-0.08,hw:0.3,yb:0.78,yt:1.15,n:2.2},{x:HEAD_X1,hw:0.06,yb:0.9,yt:1.02,n:2});return out;
  }
  /* しゃたいの もよう：よこ＝くるまの ながさ、たて＝たかさ 0〜4m */
  const TW=2048,TH=512,ty4=y=>TH*(1-y/4);
  const doorXs=n=>{const [a,b]=carX(n);return n===0?[a+1.75]:[a+1.75,b-1.75];};
  function paintBody(g,n,paint,emissive){
    const [xa,xb]=carX(n),L=xb-xa,px=x=>(x-xa)/L*TW,front=n===0,bodyEnd=front?xb-NOSE:xb;
    if(emissive){g.fillStyle='#000';g.fillRect(0,0,TW,TH);}
    else{g.fillStyle=paint.low;g.fillRect(0,0,TW,TH);g.fillStyle=paint.up;g.fillRect(0,0,TW,ty4(1.84));g.fillStyle=paint.line;g.fillRect(0,ty4(1.84),TW,ty4(1.49)-ty4(1.84));
      g.fillStyle='rgba(40,46,56,.5)';g.fillRect(0,ty4(0.62),TW,TH);}
    const w0=xa+3.2,w1=front?bodyEnd-1.2:xb-3.2,nwin=Math.floor((w1-w0)/1.04),off=(w1-w0-nwin*1.04)/2;
    for(let i=0;i<nwin;i++){const x=w0+off+i*1.04+0.2,X=px(x),Wd=px(x+0.64)-X,Y=ty4(2.92),Hh=ty4(2.3)-Y;
      if(emissive){const gr=g.createLinearGradient(0,Y,0,Y+Hh);gr.addColorStop(0,'#ffe9b8');gr.addColorStop(1,'#d9a45c');g.fillStyle=gr;g.beginPath();g.roundRect(X,Y,Wd,Hh,9);g.fill();}
      else{g.fillStyle='#0c0f13';g.beginPath();g.roundRect(X-3,Y-3,Wd+6,Hh+6,11);g.fill();const gr=g.createLinearGradient(0,Y,0,Y+Hh);gr.addColorStop(0,'#3a4856');gr.addColorStop(1,'#141b23');g.fillStyle=gr;g.beginPath();g.roundRect(X,Y,Wd,Hh,9);g.fill();}}
    if(!emissive){g.strokeStyle='rgba(70,78,90,.75)';g.lineWidth=2;doorXs(n).forEach(d=>{const X=px(d-0.5),Wd=px(d+0.5)-X;g.strokeRect(X,ty4(3.2),Wd,ty4(1.25)-ty4(3.2));
        g.fillStyle='#141b23';g.beginPath();g.roundRect(X+Wd*0.28,ty4(2.9),Wd*0.44,ty4(2.25)-ty4(2.9),6);g.fill();});
      if(front){const X=px(bodyEnd-2.6);g.strokeRect(X,ty4(3.1),px(bodyEnd-1.85)-X,ty4(1.25)-ty4(3.1));}}
  }
  const cars=[],doorLeaves=[],wheels=[];let paintKey='';
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x06090d,roughness:0.04,metalness:0.4,clearcoat:1,envMapIntensity:1.8});
  const darkMat=std({color:0x16181c,roughness:0.7,metalness:0.3},{});
  const underMat=std({color:0x2a2d33,roughness:0.6,metalness:0.5},{});
  const openMat=new THREE.MeshBasicMaterial({color:0x2b2620});
  const lensMat=new THREE.MeshBasicMaterial({color:0xfff6dc});
  const headGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xfff0c8,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  function buildTrain(){
    const midGeo=(()=>{const [a,b]=carX(1);return loft([{x:a,...BODY},{x:a+0.3,...BODY},{x:b-0.3,...BODY},{x:b,...BODY}],a,CAR_L);})();
    for(let n=0;n<CARS;n++){
      const [xa,xb]=carX(n),cm=canvas(TW,TH),ce=canvas(TW,TH),map=tex(cm,false,ANISO),em=tex(ce,false,ANISO);
      const mat=new THREE.MeshPhysicalMaterial({map,emissiveMap:em,emissive:0xffffff,emissiveIntensity:0,roughness:0.3,metalness:0.05,clearcoat:1,clearcoatRoughness:0.06,envMapIntensity:1.25});
      const geo=n===0?loft(noseSecs(),xa,xb-xa):midGeo,body=new THREE.Mesh(geo,mat);
      if(n>0)body.position.x=xa-carX(1)[0];
      body.castShadow=true;body.receiveShadow=true;train.add(body);cars.push({n,cm,ce,map,em,mat});
      /* ドア（てまえがわ） */
      doorXs(n).forEach(d=>{
        const g=new THREE.BoxGeometry(1.08,1.99,0.03),p=g.attributes.position,uv=g.attributes.uv;
        for(let i=0;i<p.count;i++)uv.setXY(i,(d+p.getX(i)-xa)/(xb-xa),(2.225+p.getY(i))/4);
        const leaf=new THREE.Mesh(g,mat);leaf.position.set(d,2.225,1.712);leaf.userData.x=d;leaf.castShadow=false;train.add(leaf);doorLeaves.push(leaf);
        const op=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.95),openMat);op.position.set(d,2.225,1.693);train.add(op);
        const strip=new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.07),lensMat);strip.position.set(d,3.12,1.695);train.add(strip);
        const sill=new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.05),new THREE.MeshBasicMaterial({color:0xcfa63a}));sill.position.set(d,1.28,1.695);train.add(sill);});
      /* だいしゃ・しゃりん・ゆかした */
      const bx=n===0?[xa+3.6,xb-NOSE-2.2]:[xa+3.6,xb-3.6];
      bx.forEach(x=>{const fr=new THREE.Mesh(T_BOX,underMat);fr.scale.set(3.4,0.34,2.3);fr.position.set(x,0.5,0);train.add(fr);
        [-1.25,1.25].forEach(o=>[-0.72,0.72].forEach(z=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(0.43,0.43,0.13,20).rotateX(Math.PI/2),darkMat);w.position.set(x+o,0.43,z);train.add(w);wheels.push(w);
          const hub=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.09,0.02),M.steel);hub.position.z=Math.sign(z)*0.07;w.add(hub);}));});
      const ub=new THREE.Mesh(T_BOX,underMat);ub.scale.set(bx[1]-bx[0]-4.6,0.36,2.9);ub.position.set((bx[0]+bx[1])/2,0.52,0);train.add(ub);
      if(n>0){const gw=new THREE.Mesh(T_BOX,darkMat);gw.scale.set(GAP+0.3,2.95,3.0);gw.position.set(xb+GAP/2,2.05,0);train.add(gw);}
    }
    /* うんてんせきの まど */
    {const secs=noseSecs().filter(s=>s.x>HEAD_X1-NOSE+0.01&&s.x<HEAD_X1-0.2),pos=[],idx=[],rows=[];
      secs.forEach(s=>{const sn=(s.x-(HEAD_X1-NOSE))/NOSE;if(sn<0.15||sn>0.5)return;rows.push({s,w:1.02*Math.pow(Math.sin(Math.PI*(sn-0.15)/0.35),0.45)});});
      const K=12;rows.forEach(({s,w})=>{const cy=(s.yb+s.yt)/2,ry=(s.yt-s.yb)/2+0.018,hw=s.hw+0.018,e=2/s.n;
        for(let j=0;j<=K;j++){const a=Math.PI/2+w*(1-2*j/K),sn=Math.sin(a),cs=Math.cos(a);pos.push(s.x,cy+ry*Math.pow(Math.abs(sn),e),hw*Math.sign(cs)*Math.pow(Math.abs(cs),e));}});
      for(let i=0;i<rows.length-1;i++)for(let j=0;j<K;j++){const a=i*(K+1)+j,b=a+K+1;idx.push(a,b+1,b, a,a+1,b+1);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();train.add(new THREE.Mesh(g,glassMat));}
    /* ライト */
    [-0.5,0.5].forEach(z=>{const l=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),lensMat);l.scale.set(0.3,0.07,0.16);l.position.set(HEAD_X1-1.55,1.33,z);l.rotation.z=-0.28;train.add(l);});
    headGlow.position.set(HEAD_X1-1.2,1.35,0.2);headGlow.scale.set(5,5,1);train.add(headGlow);
    /* パンタグラフ（2ごうしゃ） */
    {const [a,b]=carX(1),x=(a+b)/2,pm=std({color:0x4b5058,roughness:0.5,metalness:0.7},{}),add=(sx,sy,sz,px,py,pz,rz)=>{const m=new THREE.Mesh(T_BOX,pm);m.scale.set(sx,sy,sz);m.position.set(px,py,pz);if(rz)m.rotation.z=rz;m.castShadow=true;train.add(m);};
      add(4.4,0.16,1.9,x,3.7,0);add(0.3,0.3,0.3,x-1.1,3.9,0);add(0.3,0.3,0.3,x+0.9,3.9,0);
      add(2.3,0.07,0.07,x+0.05,4.3,0,0.42);add(2.2,0.06,0.06,x+0.15,4.75,0,-0.36);add(0.1,0.06,1.7,x-0.85,5.05,0);}
  }
  function repaint(paint){
    cars.forEach(c=>{paintBody(c.cm.getContext('2d'),c.n,paint,false);paintBody(c.ce.getContext('2d'),c.n,paint,true);c.map.needsUpdate=true;c.em.needsUpdate=true;});
  }
  buildTrain();

  /* ---------- ひと ---------- */
  const PG={leg:new THREE.BoxGeometry(0.13,0.82,0.15).translate(0,-0.41,0),torso:new THREE.CylinderGeometry(0.17,0.2,0.62,10),head:new THREE.SphereGeometry(0.105,12,10),
    hair:new THREE.SphereGeometry(0.112,12,8,0,Math.PI*2,0,Math.PI*0.55),arm:new THREE.BoxGeometry(0.085,0.58,0.1).translate(0,-0.29,0),bag:new THREE.BoxGeometry(0.34,0.52,0.22),pack:new THREE.BoxGeometry(0.3,0.42,0.16)};
  const persons=new Map();
  function makePerson(p){
    const L=p.look,g=new THREE.Group(),mk=c=>new THREE.MeshStandardMaterial({color:c,roughness:0.85}),ms={skin:mk(L.skin),shirt:mk(L.shirt),pants:mk(L.pants),hair:mk(L.hair),bag:mk(L.bag===1?'#4a546a':'#6b5238')};
    const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
    const legL=add(PG.leg,ms.pants,-0.09,0.82,0),legR=add(PG.leg,ms.pants,0.09,0.82,0);
    add(PG.torso,ms.shirt,0,1.13,0).scale.z=0.62;add(PG.head,ms.skin,0,1.57,0);add(PG.hair,ms.hair,0,1.585,-0.012);
    const armL=add(PG.arm,ms.shirt,-0.235,1.4,0),armR=add(PG.arm,ms.shirt,0.235,1.4,0);
    if(L.bag===1)add(PG.bag,ms.bag,0.36,0.28,0.05);else if(L.bag===2)add(PG.pack,ms.bag,0,1.16,-0.2);
    g.scale.setScalar(L.h*1.02);g.userData={ms:Object.values(ms),legL,legR,armL,armR,rz:fract(L.h*37.7+p.sx*0.001)};scene.add(g);return g;
  }
  function syncPeople(S){
    const seen=new Set();
    for(const p of S.people){
      if(p.a<=0.02||Math.abs(p.X-S.pos)>3200)continue;
      let g=persons.get(p);if(!g){g=makePerson(p);persons.set(p,g);}seen.add(p);
      const ud=g.userData,z0=NEAR_Z+0.95+ud.rz*1.7,zd=NEAR_Z+0.3,dd=Math.abs(p.X-p.door),zf=Math.min(1,dd/16);
      let z=lerp(zd,z0,zf),y=PT,rot=Math.PI,op=1;
      const walking=p.kind==='toDoor'||p.kind==='away',sw=walking?Math.sin(p.ph)*0.55:0;
      if(p.kind==='inside'){g.visible=false;continue;}
      g.visible=true;
      if(p.kind==='exit'){z=zd-(1-p.a)*1.1;y=PT+0.1*(1-p.a);rot=0;}
      else if(p.kind==='enter'){z=zd-(1-p.a)*1.1;y=PT+0.1*(1-p.a);rot=Math.PI;}
      else if(p.kind==='toDoor'){const dx=p.door-p.X;rot=Math.atan2(dx*U,zd-z-0.4);}
      else if(p.kind==='away'){rot=Math.atan2(p.dir,0.12);op=p.a;}
      g.position.set((p.X-S.pos)*U,y,z);g.rotation.set(0,rot,0);
      ud.legL.rotation.x=sw;ud.legR.rotation.x=-sw;ud.armL.rotation.set(-sw*0.7,0,0);ud.armR.rotation.set(sw*0.7,0,0);
      if(p.kind==='stumble'){g.rotation.set(0,p.fallDir>0?Math.PI/2:-Math.PI/2,0);g.rotateX(Math.PI*0.44*G.stumblePose(p.t));}
      if(p.kind==='missed'){g.rotation.y=Math.PI+p.fallDir*0.5;if(p.departed){ud.armR.rotation.set(0,0,2.5+(S.reduced?0:Math.sin(p.leaveT*9)*0.35));}else ud.armR.rotation.set(-1.2,0,0.3);}
      ud.ms.forEach(m=>{const tr=op<0.999;if(m.transparent!==tr){m.transparent=tr;m.needsUpdate=true;}m.opacity=op;});
    }
    for(const [p,g] of persons)if(!seen.has(p)){scene.remove(g);g.userData.ms.forEach(m=>m.dispose());persons.delete(p);}
  }

  /* ---------- まいフレーム ---------- */
  const cTop=new THREE.Color(),cBot=new THREE.Color(),cFog=new THREE.Color(),cTmp=new THREE.Color(),sunDir=new THREE.Vector3(),camP=new THREE.Vector3(-15,3.3,11.8),camL=new THREE.Vector3(9,2,0),tP=new THREE.Vector3(),tL=new THREE.Vector3();
  let tf=0,snowF=0,seaF=0,lastT=0,camInit=false,slowN=0,frameN=0,accT=0,lastPos=null;
  function resize(){
    const r=cv.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    if(w===W&&h===H)return;W=w;H=h;renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.fov=clamp(2*Math.atan(Math.tan(36*Math.PI/180)/camera.aspect)*180/Math.PI,36,74);camera.updateProjectionMatrix();
  }
  function render(S){
    resize();
    const dt=clamp(S.t-lastT,0,0.1);lastT=S.t;
    const pos=S.pos,pm=pos*U,k=Math.floor(pos/SP);
    if(S.world!==world){world=S.world;seed=(S.seed|0);clearWorld();camInit=false;farCur='';}
    if(lastPos!==null&&Math.abs(pos-lastPos)>4000)camInit=false;lastPos=pos;
    const pk=S.paint.up+S.paint.low+S.paint.line;if(pk!==paintKey){paintKey=pk;repaint(S.paint);}
    /* けしきを よういする（1フレームに つくるのは すこしだけ） */
    {const i0=Math.floor((pos-17500)/CH),i1=Math.floor((pos+9500)/CH);let built=0;const order=[];
      for(let i=i0;i<=i1;i++)order.push(i);order.sort((a,b)=>Math.abs((a+0.5)*CH-pos)-Math.abs((b+0.5)*CH-pos));
      for(const i of order){if(!chunks.has(i)){if(built>=(camInit?1:99))break;chunks.set(i,buildChunk(i));built++;}}
      for(const [i,g] of chunks){if(i<i0-1||i>i1+1){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();});chunks.delete(i);}else g.position.x=i*CHM-pm;}
      for(let j=Math.floor((pos-17000)/SP);j<=Math.ceil((pos+9500)/SP);j++){if(j<0)continue;if(!stations.has(j))stations.set(j,buildStation(j));}
      for(const [j,g] of stations){if(Math.abs(j*SP-pos)>30000){scene.remove(g);g.traverse(o=>{if(o.geometry&&o.geometry!==T_BOX)o.geometry.dispose();});g.userData.sign.dispose();g.userData.signMat.dispose();stations.delete(j);}else g.position.x=j*SPM-pm;}}
    /* そら・ひかり */
    const night=S.night,dayM=S.dayM;cTop.set(S.skyTop);cBot.set(S.skyBot);
    const f=clamp((dayM-330)/780,0,1),el=Math.sin(f*Math.PI),up=dayM>330&&dayM<1110;
    sunDir.set(-Math.cos(f*Math.PI)*0.95,el*0.95+0.035,0.62*el-0.34).normalize();
    const warm=clamp(1-el*1.7,0,1);cTmp.setRGB(1,lerp(0.96,0.58,warm),lerp(0.9,0.28,warm));
    skyU.top.value.copy(cTop);skyU.bot.value.copy(cBot);skyU.sunDir.value.copy(sunDir);skyU.sunCol.value.copy(cTmp);skyU.sunK.value=up?clamp(1.15-night,0,1):0;
    const inT=G.inTunnel(pos)?1:0;tf+=(inT-tf)*Math.min(1,dt*2.5);
    const sunI=up?3.4*Math.pow(clamp(1-night,0,1),1.3)*clamp(el*3+0.12,0,1):0,moonI=0.5*night;
    if(sunI>=moonI){sun.color.copy(cTmp);sun.intensity=sunI*(1-0.93*tf);sun.position.copy(sunDir).multiplyScalar(320).add(sun.target.position);}
    else{sun.color.setRGB(0.62,0.72,1);sun.intensity=moonI*(1-0.9*tf);sun.position.set(-150,240,180).add(sun.target.position);}
    hemi.color.copy(cTop).lerp(cBot,0.5);hemi.groundColor.setRGB(0.3,0.33,0.24);hemi.intensity=lerp(0.32,0.14,night)*(1-0.6*tf);
    cFog.copy(cBot).lerp(cTop,0.25);scene.fog.color.copy(cFog);scene.fog.far=lerp(22000,15000,night);
    scene.environmentIntensity=lerp(0.85,0.55,night)*(1-0.7*tf);
    renderer.toneMappingExposure=lerp(0.92,1.05,night);
    const ek=Math.round(dayM/8)+'|'+Math.round(night*12);
    if(ek!==envKey&&S.t-envT>1.2){envKey=ek;envT=S.t;const rt=pmrem.fromScene(envScene,0,1,60000);scene.environment=rt.texture;if(envRT)envRT.dispose();envRT=rt;}
    sky.position.copy(camera.position);stars.position.copy(camera.position);stars.material.opacity=clamp((night-0.3)*1.3,0,1);stars.visible=night>0.3;
    moon.material.opacity=night;moon.visible=night>0.05;
    cTmp.setRGB(1,1,1).lerp(cBot,0.35*warm+0.1).multiplyScalar(lerp(1,0.16,night));cloudMat.forEach(m=>{m.color.copy(cTmp);m.opacity=lerp(0.92,0.55,night);});
    clouds.forEach(c=>{const u=c.userData,x=((u.x-pm*0.5+(S.reduced?0:S.t*u.sp))%52000+78000)%52000-26000;c.position.set(x,u.y,u.z);});
    const lampK=sstep(0.35,0.6,night);
    M.bldg.emissiveIntensity=lampK*1.1;M.win.emissiveIntensity=lampK*0.9;M.nlamp.emissiveIntensity=lampK*2.2+tf*0.5;
    stations.forEach(g=>{g.userData.signMat.emissiveIntensity=0.12+lampK*0.75;});
    const ns=Math.round(pos/SP)*SPM-pm;stLamp.position.set(clamp(ns-6,-60,60),PT+3.6,-3.5);stLamp.intensity=Math.abs(ns)<140?lampK*260:0;
    tunLamp.position.set(8,6.6,-2);tunLamp.intensity=tf*230;
    /* れっしゃ */
    const lit=S.lit;cars.forEach(c=>{c.mat.emissiveIntensity=lit?1.25:0;});
    headLamp.intensity=lit?900:0;headGlow.material.opacity=lit?0.95:0.12;
    const dy=(!S.reduced&&S.v>1)?Math.sin(S.t*31)*0.006*(S.v/S.MAXV):0;train.position.y=dy;
    doorLeaves.forEach(l=>{l.position.x=l.userData.x-S.doorAnim*1.06;l.position.z=1.712+Math.min(1,S.doorAnim*6)*0.035;});
    const ang=-pm/0.43;wheels.forEach(w=>{w.rotation.z=ang;});
    syncPeople(S);
    /* とおくの けしき */
    const sc=G.sceneFor(k),key=sc.far+'|'+(sc.snow?1:0);if(key!==farCur){farCur=key;layer(key);}
    const sea=sc.far==='sea'?1:0,rate=dt/2.6;
    for(const kk in LAYERS){const g=LAYERS[kk],ud=g.userData,tg=kk==='mid|0'?1-sea:(kk===farCur?1:0);
      ud.w=camInit?clamp(ud.w+Math.sign(tg-ud.w)*rate,0,1):tg;g.visible=ud.w>0.004;if(!g.visible)continue;
      ud.mats.forEach(m=>{m.opacity=ud.w;const tr=ud.w<0.999;if(m.transparent!==tr){m.transparent=tr;m.needsUpdate=true;}});
      g.position.x=-(((pm%ud.L)+ud.L)%ud.L)-(kk==='mid|0'?0:3000);
      if(ud.cone){const cyc=5400,ph=((pm%cyc)+cyc)%cyc-cyc/2;ud.cone.position.x=-g.position.x+ud.cone.position.z*1.9-ph*1.6;}
      if(ud.smoke){smokeMat.opacity=0.5*ud.w;const c=ud.cone.position;ud.smoke.forEach((s,i)=>{const ph=(((S.reduced?0:S.t*0.035)+i/7)%1);s.position.set(c.x+ph*900+Math.sin(i*2.1)*90,GY+1380+ph*1500,c.z+5);const q=500+ph*1500;s.scale.set(q,q*0.7,1);});}}
    seaF+=(sea-seaF)*Math.min(1,dt*0.5);if(!camInit)seaF=sea;farSeaMat.opacity=seaF;farSea.visible=seaF>0.01;
    snowF+=((sc.snow?1:0)-snowF)*Math.min(1,dt*0.45);if(!camInit)snowF=sc.snow?1:0;
    groundMat.color.setRGB(1,1,1).lerp(cTmp.set(0xf6f8fb).multiplyScalar(1.9),snowF);
    groundTex.offset.x=fract(pm/20);M.water.normalMap.offset.set(fract(S.t*0.012),fract(S.t*0.02));
    /* カメラ：とまって いる ときは ホームの うしろ ななめから ドアと せんとうを みる。はやく なると まえに まわって ひいて みる */
    const sf=sstep(0,1,S.v/S.MAXV*1.5),nar=clamp((1.5-camera.aspect)/0.9,0,1);
    tP.set(lerp(-15,46,sf)+nar*(sf*4-3),lerp(3.3,6.2,sf),lerp(11.8,29,sf)+nar*8);tL.set(lerp(9,-9,sf)-nar*2*sf,lerp(2.0,2.4,sf),0);
    if(!camInit){camP.copy(tP);camL.copy(tL);camInit=true;}
    else{const q=1-Math.exp(-dt*1.1);camP.lerp(tP,q);camL.lerp(tL,q);}
    camera.position.copy(camP);
    if(!S.reduced&&S.v>1){const a=S.v/S.MAXV*0.022;camera.position.y+=Math.sin(S.t*17.3)*a;camera.position.z+=Math.sin(S.t*11.1)*a*0.6;}
    camera.lookAt(camL);
    renderer.render(scene,camera);
    /* おもい ときは かいぞうどを さげる */
    accT+=dt;frameN++;if(frameN>=90){const avg=accT/frameN;frameN=0;accT=0;
      if(avg>0.031&&pixelRatio>1){slowN++;if(slowN>=2){pixelRatio=Math.max(1,pixelRatio-0.5);W=0;slowN=0;}}else slowN=0;}
  }
  function dispose(){
    clearWorld();for(const [,g] of persons){scene.remove(g);}persons.clear();
    scene.traverse(o=>{if(o.geometry)o.geometry.dispose();const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(m=>{for(const kk in m){const v=m[kk];if(v&&v.isTexture)v.dispose();}m.dispose();});});
    if(envRT)envRT.dispose();pmrem.dispose();renderer.dispose();
  }
  return {render,resize:()=>{W=0;},dispose,renderer,_dbg:{scene,camera,camP,camL,snap(){camInit=false;}}};
}
