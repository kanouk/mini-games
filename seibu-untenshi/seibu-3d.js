/* せいぶせん うんてんし：3D表示（裏モード）。
   ゲームの進行は seibu.html がそのまま行い、ここは同じ状態を立体で描くだけ。
   長さの単位：ゲーム内の 10 が 1m。世界は列車の位置を原点にして動かす。
   空・光・素材・人・木や家の形は「しんかんせん うんてんし」の shinkansen-3d.js と同じ作り。
   西武線だけの部分：駅間の長さが区間ごとに違う、高架と地下で線路の高さが変わる、踏切、ホームドア、13種類の車両。 */
import * as THREE from '../vendor/three/three.module.min.js';

const U=0.1,CH=1500,CHM=CH*U,GY=-0.7,TOPY=-0.28,RISE=7.5,DEPTH=12;
const HEAD_X1=29,GAP=0.4,NEAR_Z=1.62,FAR_TRACK=-4.0,PT=1.1;
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

  /* ---------- いつも ある もの（じめん・とおくの みずうみ） ---------- */
  const groundTex=nt([104,128,74],0.34,0.06,41,256);groundTex.repeat.set(2600,2600);
  const groundMat=new THREE.MeshStandardMaterial({map:groundTex,roughness:1});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(52000,52000).rotateX(-Math.PI/2),groundMat);ground.position.y=GY-0.12;ground.receiveShadow=true;scene.add(ground);
  const farSeaMat=new THREE.MeshPhysicalMaterial({color:0x1d4a5e,roughness:0.12,transparent:true,opacity:0,envMapIntensity:1.4});
  const farSea=new THREE.Mesh(new THREE.PlaneGeometry(60000,30000).rotateX(-Math.PI/2),farSeaMat);farSea.position.set(0,GY+0.1,-1300-15000);farSea.visible=false;scene.add(farSea);
  M.rail=std({color:0x7b7f86,roughness:0.28,metalness:0.9,vertexColors:true},{});
  M.wire=std({color:0x2c2f33,roughness:0.6,metalness:0.6,vertexColors:true,side:THREE.DoubleSide},{});
  M.ug=std({map:nt([150,152,156],0.09,0.07,51),roughness:0.9,vertexColors:true,side:THREE.DoubleSide},{uv:[1/4,1/4]});
  M.pd=std({color:0xeef2f4,roughness:0.5,metalness:0.1,vertexColors:true},{cast:true});
  M.pdGlass=std({color:0x8fb4c6,roughness:0.15,metalness:0.2,transparent:true,opacity:0.55,vertexColors:true},{order:2});
  M.bldgFar=M.bldg.clone();M.bldgFar.userData={uv:[1/60,1/64]};
  M.tea=std({map:M.leaf.map,roughness:1,vertexColors:true},{uv:[1/2,1/2]});
  const redOn=new THREE.MeshBasicMaterial({color:0xff2a2a}),redOff=new THREE.MeshBasicMaterial({color:0x4a1616});
  const ry=X=>RISE*G.elev(X)-DEPTH*G.ug(X);

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
      if(o.terrace&&Math.sin(a)>0.2&&y>o.H*0.3&&y<o.H*0.92&&Math.floor(y/(o.H*0.06))%2===0)c.set(0xc9c7c0);
      c.multiplyScalar(0.9+0.2*vnoise(a*14,y/160)).lerp(_c.set(0xa9c0dc),0.34);col.push(c.r,c.g,c.b);}
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,transparent:true,fog:false}),m=new THREE.Mesh(g,mat);m.position.y=GY;m.frustumCulled=false;return {m,mat};
  }
  const smokeMat=null;
  const LAYERS={};
  function prop(g,m,mat,z){m.position.z=z;g.add(m);if(mat)g.userData.mats.push(mat);g.userData.cone=m;}
  function layer(key){
    if(LAYERS[key])return LAYERS[key];
    let g;const type=key;
    const lowHills=(c0)=>ridge({L:18000,step:300,z0:-2400,z1:-5200,base:110,amp:300,harm:[[3,140,0.4,1],[7,100,1.9,1],[17,60,0.7,0]],c0:c0||0x5f7f66,c1:0x7f96a0,seed:3,copies:2,rough:0.25});
    if(type==='mid')g=ridge({L:9000,step:90,z0:-760,z1:-1700,base:22,amp:90,harm:[[4,40,0.3,1],[9,30,2.2,0],[23,20,1.1,0]],c0:0x4f7446,c1:0x6c8a5c,seed:1,copies:3,rough:0.3});
    else if(type==='range'||type==='buko'){g=ridge({L:24000,step:300,z0:-3000,z1:-8000,base:300,amp:900,harm:[[5,420,0.2,1],[11,300,1.4,1],[29,180,2.6,1]],c0:0x4a6a50,c1:0x74808a,seed:7,copies:2,rough:0.4,flat:true});
      if(type==='buko'){const k=cone({R:3000,rt:520,H:1250,k:0.62,c0:0x4f6a58,c1:0x6a7480,terrace:true});prop(g,k.m,k.mat,-5200);}}
    else if(type==='skyline'){g=lowHills(0x7f93a8);const b=new Batch(),r=rng(77),L=g.userData.L;
      for(let i=0;i<300;i++){const x=(r()-0.5)*L,z=-1300-r()*1500,w=30+r()*40,d=30+r()*30,h=50+r()*r()*190+(r()<0.07?120:0);b.box(M.bldgFar,x-w/2,x+w/2,GY,GY+h,z-d/2,z+d/2,BTINT[(r()*6)|0]);}
      const one=b.build(new THREE.Group());for(let c=-1;c<=1;c++){one.children.forEach(m=>{const q=new THREE.Mesh(m.geometry,m.material);q.position.x=c*L;q.frustumCulled=false;g.add(q);});}}
    else if(type==='dome'){g=lowHills(0x5f8a66);const grp=new THREE.Group(),wm=new THREE.MeshStandardMaterial({color:0xf0f2f5,roughness:0.35,metalness:0.2,transparent:true}),gm=new THREE.MeshStandardMaterial({color:0x3f7f4c,roughness:1,transparent:true});
      const roof=new THREE.Mesh(new THREE.SphereGeometry(1,40,14,0,Math.PI*2,0,Math.PI/2),wm);roof.scale.set(120,46,120);roof.position.y=GY+16;grp.add(roof);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(132,140,18,40),gm);base.position.y=GY+9;grp.add(base);
      const band=new THREE.Mesh(new THREE.CylinderGeometry(121,121,4,40,1,true),M.nlamp);band.position.y=GY+18;grp.add(band);
      g.userData.mats.push(wm,gm);prop(g,grp,null,-900);}
    else if(type==='lake'){g=lowHills(0x5f8a76);const grp=new THREE.Group(),tm=new THREE.MeshStandardMaterial({color:0xe9e3d3,roughness:0.8,transparent:true}),rm=new THREE.MeshStandardMaterial({color:0x3f7f6a,roughness:0.5,metalness:0.3,transparent:true});
      [-90,90].forEach(x=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(7,7,22,20),tm);t.position.set(x,GY+11,0);grp.add(t);const d=new THREE.Mesh(new THREE.SphereGeometry(8.4,20,10,0,Math.PI*2,0,Math.PI/2),rm);d.position.set(x,GY+22,0);grp.add(d);});
      g.userData.mats.push(tm,rm);prop(g,grp,null,-420);}
    else g=ridge({L:18000,step:260,z0:-2000,z1:-5200,base:120,amp:340,harm:[[3,160,0.4,1],[7,110,1.9,1],[17,70,0.7,0]],c0:0x55785a,c1:0x7f96a0,seed:5,copies:2,rough:0.28});
    g.visible=false;scene.add(g);LAYERS[key]=g;return g;
  }
  const mid=layer('mid');let farCur='';

  /* ---------- くかんの けしき（150m ずつ つくる） ---------- */
  let world=null,seed=0;const chunks=new Map(),stations=new Map();
  const isLake=k=>G.sceneFor(k).far==='lake';
  function landDepth(X){const k=G.kAt(X),a=G.X(k),fr=(X-a)/(G.X(k+1)-a),w=0.03;let s=isLake(k)?1:0;
    if(fr<w)s=lerp(isLake(k-1)?1:0,s,sstep(0,1,0.5+fr/(2*w)));else if(fr>1-w)s=lerp(s,isLake(k+1)?1:0,sstep(0,1,(fr-(1-w))/(2*w)));
    return 760-500*s;}
  function cityAt(X){const k=G.kAt(X);let c=0;[k,k+1].forEach(j=>{const n=G.city(j);if(n)c=Math.max(c,n*(1-Math.abs(X-G.X(j))/3600));});return Math.max(0,c);}
  /* れっしゃの ながさ と、ぜんぶの ドアの いち（えきの まんなかからの m） */
  const NOSE_U={flat:5,slant:12,egg:24,nra:38,laview:64,agt:10},DOORF={4:[.11,.37,.63,.89],3:[.15,.5,.85],2:[.2,.8],1:[.07]};
  const carL=S=>(S.len||200)*U,carC=(S,n)=>HEAD_X1-(n-1)*(carL(S)+GAP)-carL(S)/2;
  function doorLocal(S,cab){const L=carL(S),span=cab?L-NOSE_U[S.front]*U-1.6:L;return (DOORF[S.doors]||DOORF[4]).map(f=>-L/2+span*f);}
  function allDoors(S){const out=[];for(let n=1;n<=S.cars;n++){const tail=n===S.cars&&n>1,c=carC(S,n);doorLocal(S,n===1||tail).forEach(d=>out.push(c+(tail?-d:d)));}return out.sort((a,b)=>a-b);}
  const doorW=S=>S.doors<=2?1.0:1.3;
  /* えき k の ホームが ある はんい（ゲームの たんい） */
  function platRange(k){const c=G.X(k),S=G.ser();let r=c+(carC(S,S.cars)-carL(S)/2-6)/U;
    if(!G.isUG(k)){const f=G.feat(k-1);if(!f.ug&&f.t1>f.t0)r=Math.max(r,f.t1+450);}return[Math.min(r,c-330),c+345];}
  function hillH(f,X,d){
    const bump=sstep(f.t0-420,f.t0-40,X)*(1-sstep(f.t1+40,f.t1+420,X));if(bump<=0||d<=0)return 0;
    const p=66*sstep(0,150,d)*(1-0.8*sstep(210,470,d));
    return bump*p*(0.8+0.5*vnoise(X*U/38,d/34));
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
  const CARC=[0xe8e8e8,0x2b2f36,0x9aa3ad,0x7c1f24,0x1f3a63,0xcfd3d6,0x4b5560];
  function buildChunk(i){
    const b=new Batch(),X0=i*CH,X1=X0+CH,r=rng(i*7919+seed),grp=new THREE.Group(),lx=X=>(X-X0)*U;
    const kc=G.kAt(X0+CH/2),sc=G.sceneFor(kc),nearType=sc.near,snow=false,NS=15;
    const up=(m,a,c,ya,yc,zn,zf,col,uv)=>b.quad(m,[a,ya,zn],[c,yc,zn],[c,yc,zf],[a,ya,zf],col,uv);
    const down=(m,a,c,ya,yc,zn,zf,col)=>b.quad(m,[a,ya,zf],[c,yc,zf],[c,yc,zn],[a,ya,zn],col);
    const front=(m,a,c,ya0,yc0,ya1,yc1,z,col)=>b.quad(m,[a,ya0,z],[c,yc0,z],[c,yc1,z],[a,ya1,z],col);
    const back=(m,a,c,ya0,yc0,ya1,yc1,z,col)=>b.quad(m,[c,yc0,z],[a,ya0,z],[a,ya1,z],[c,yc1,z],col);
    /* この はんいに かかる えき・ふみきり・やまの トンネル */
    const ks=[];for(let k=G.kAt(X0)-1;k<=G.kAt(X1)+1;k++)ks.push(k);
    const plats=ks.map(platRange),inPlat=(X,m)=>plats.some(p=>X>p[0]-m&&X<p[1]+m);
    const crossings=[];ks.forEach(k=>G.feat(k).cr.forEach(x=>{if(!crossings.includes(x))crossings.push(x);}));
    const ugAt=X=>{const f=G.feat(G.kAt(X));return f.ug&&X>=f.t0&&X<=f.t1;};
    /* ---- せんろ（たかさが かわる ので 10m ずつ） ---- */
    for(let q=0;q<NS;q++){
      const Xa=X0+q*CH/NS,Xb=Xa+CH/NS,Xm=(Xa+Xb)/2,a=lx(Xa),c=lx(Xb),ya=ry(Xa),yc=ry(Xb),k=G.kAt(Xm),f=G.feat(k);
      const inT=Xm>=f.t0&&Xm<=f.t1,ug=f.ug&&inT,river=Xm>f.r0&&Xm<f.r1,via=G.elev(Xm)>0.15||river;
      [0,FAR_TRACK].forEach(zc=>{const u0=Xa*U/2.4,u1=Xb*U/2.4;
        up(M.track,a,c,ya+TOPY,yc+TOPY,zc+1.5,zc-1.5,null,[[u0,0],[u1,0],[u1,1],[u0,1]]);
        [-0.5335,0.5335].forEach(o=>{up(M.rail,a,c,ya,yc,zc+o+0.035,zc+o-0.035);front(M.rail,a,c,ya-0.17,yc-0.17,ya,yc,zc+o+0.035,0x5a4d42);});
        if(!G.ser().noPanto){front(M.wire,a,c,ya+5.08,yc+5.08,ya+5.11,yc+5.11,zc);front(M.wire,a,c,ya+6.2,yc+6.2,ya+6.225,yc+6.225,zc);}});
      up(M.ballast,a,c,ya+TOPY-0.02,yc+TOPY-0.02,2.4,-6.4);
      if(ug){
        down(M.ug,a,c,ya+7.4,yc+7.4,62,-9.2,0x8a8f96);front(M.ug,a,c,ya+TOPY-0.05,yc+TOPY-0.05,ya+7.4,yc+7.4,-9.2,0x7d838b);
        up(M.ug,a,c,ya+TOPY-0.04,yc+TOPY-0.04,62,2.4,0x6f747b);up(M.concrete,a,c,ya+8.2,yc+8.2,62,-9.2,0xb6b8b6);
        front(M.concrete,a,c,ya+7.4,yc+7.4,ya+8.2,yc+8.2,62,0xb6b8b6);
        for(let X=Math.ceil(Xa/120)*120;X<Xb;X+=120){const y=ry(X);b.box(M.lamp,lx(X)-0.7,lx(X)+0.7,y+6.2,y+6.36,-9.18,-9.1);b.box(M.lamp,lx(X)-0.6,lx(X)+0.6,y+7.31,y+7.39,-2.2,-1.9,0xfff0d0);
          b.box(M.ug,lx(X)-0.2,lx(X)+0.2,y+TOPY,y+7.4,-2.2,-1.8,0x70767e);}
        [f.t0,f.t1].forEach(X=>{if(X>=Xa&&X<Xb&&X>G.X(k)+50&&X<G.X(k+1)-50){const y=ry(X);b.box(M.concrete,lx(X)-0.6,lx(X)+0.6,y+7.0,y+9.2,-9.6,62.3,0xc2c4c2);b.box(M.concrete,lx(X)-0.6,lx(X)+0.6,GY,y+7.0,-9.9,-9.2,0xc2c4c2);}});
      }else if(via){
        front(M.concrete,a,c,ya-1.5,yc-1.5,ya+0.5,yc+0.5,2.55,0xd0d3d3);back(M.concrete,a,c,ya+TOPY,yc+TOPY,ya+0.5,yc+0.5,2.4,0xc4c7c7);up(M.concrete,a,c,ya+0.5,yc+0.5,2.55,2.4,0xd8dada);
        front(M.concrete,a,c,ya+TOPY,yc+TOPY,ya+0.5,yc+0.5,-6.4,0xc4c7c7);back(M.concrete,a,c,ya-1.5,yc-1.5,ya+0.5,yc+0.5,-6.55,0xc4c7c7);up(M.concrete,a,c,ya+0.5,yc+0.5,-6.4,-6.55,0xd8dada);
        down(M.concrete,a,c,ya-1.5,yc-1.5,2.55,-6.55,0xa9acac);
        for(let X=Math.ceil(Xa/150)*150;X<Xb;X+=150){const y=ry(X);if(y-1.5-GY<1.2&&!river)continue;b.box(M.concrete,lx(X)-0.8,lx(X)+0.8,GY-0.6,y-1.5,-5.2,1.2,0xb9bcbc);b.box(M.concrete,lx(X)-1.1,lx(X)+1.1,y-2.1,y-1.5,-6.3,2.3,0xc6c9c9);}
        if(!river&&ya-GY>5)up(M.asphalt,a,c,GY+0.05,GY+0.05,0.6,-4.6,0xa9adb4);
      }else{
        const ha=Math.max(0.05,ya+TOPY-GY),hc=Math.max(0.05,yc+TOPY-GY);
        b.quad(M.ballast,[a,GY,2.4+ha*1.6],[c,GY,2.4+hc*1.6],[c,yc+TOPY-0.02,2.4],[a,ya+TOPY-0.02,2.4],ha>1?0x9fb07a:null);
        b.quad(M.ballast,[a,ya+TOPY-0.02,-6.4],[c,yc+TOPY-0.02,-6.4],[c,GY,-6.4-hc*1.6],[a,GY,-6.4-ha*1.6],ha>1?0x9fb07a:null);
      }
      if(inT&&!f.ug){
        b.box(M.concrete,a,c,7.4,8.7,-9.5,4.9,0xb6b8b6);b.box(M.concrete,a,c,GY,7.4,-9.5,-8.9,0xa9aba9);
        for(let X=Math.ceil(Xa/120)*120;X<Xb;X+=120)b.box(M.concrete,lx(X)-0.3,lx(X)+0.3,GY,7.4,4.2,4.8,0xbfc1bf);
        for(let X=Math.ceil(Xa/90)*90;X<Xb;X+=90){b.box(M.lamp,lx(X)-0.6,lx(X)+0.6,6.55,6.7,-8.88,-8.8);b.box(M.lamp,lx(X)-0.5,lx(X)+0.5,7.32,7.4,-2.4,-2.1,0xfff0d0);}
        [f.t0,f.t1].forEach(X=>{if(X>=Xa&&X<Xb)b.box(M.concrete,lx(X)-0.5,lx(X)+0.5,7.0,9.4,-9.6,5.0,0xc2c4c2);});
      }
      if(river){const wa=lx(Math.max(f.r0+40,Xa)),wc=lx(Math.min(f.r1-40,Xb));if(wc>wa)b.quad(M.water,[wa,GY+0.1,170],[wc,GY+0.1,170],[wc,GY+0.1,-1300],[wa,GY+0.1,-1300]);}
    }
    /* かわの ていぼう */
    ks.forEach(k=>{const f=G.feat(k);if(!(f.r1>X0-40&&f.r0<X1+40))return;
      [[f.r0-30,f.r0+40],[f.r1-40,f.r1+30]].forEach(([L0,L1])=>{const xs=[L0,L0+25,L1-25,L1].map(X=>clamp(X,X0,X1)).map(lx),ys=[GY,GY+0.5,GY+0.5,GY];
        for(let q=0;q<3;q++){if(xs[q+1]-xs[q]<0.01)continue;[[170,2.8],[-6.8,-1300]].forEach(([z0,z1])=>b.quad(M.grass,[xs[q],ys[q],z0],[xs[q+1],ys[q+1],z0],[xs[q+1],ys[q+1],z1],[xs[q],ys[q],z1],q===1?0xd9d4c4:null));}});});
    /* ---- かせんの はしら ---- */
    if(!G.ser().noPanto)for(let n=Math.ceil((X0-150)/300);n*300+150<X1;n++){const X=n*300+150;if(X<X0)continue;
      if(G.inTunnel(X)||G.nearStation(X,360)||inPlat(X,60)||crossings.some(x=>Math.abs(x-X)<60))continue;
      const x=lx(X),y=ry(X),y0=G.elev(X)>0.15?y+TOPY:GY;
      b.box(M.steel,x-0.12,x+0.12,y0,y+7.3,2.75,3.0);b.box(M.steel,x-0.12,x+0.12,y0,y+7.3,-7.0,-6.75);
      b.box(M.steel,x-0.09,x+0.09,y+7.0,y+7.25,-7.0,3.0);b.box(M.steel,x-0.07,x+0.07,y+6.4,y+6.5,-6.9,2.9);
      [0,FAR_TRACK].forEach(zc=>{b.box(M.steel,x-0.04,x+0.04,y+6.22,y+7.0,zc-0.04,zc+0.04);b.box(M.steel,x-0.03,x+0.03,y+5.11,y+5.17,zc-0.03,zc+1.2);b.add(M.steel,T_BOX,x,y+5.8,zc+1.2,0.05,1.4,0.05,0x6b5b4b);});
    }
    /* ---- ふみきり：みち・けいほうき・しゃだんき ---- */
    const cross=[];
    crossings.forEach(X=>{if(X<X0||X>=X1)return;const x=lx(X),it={X,arms:[],la:[],lb:[]};cross.push(it);
      b.box(M.asphalt,x-3,x+3,GY,-0.02,-6.6,2.6,0x8f949b);
      b.quad(M.asphalt,[x-3,GY+0.06,5.2],[x+3,GY+0.06,5.2],[x+3,-0.02,2.6],[x-3,-0.02,2.6],0x8f949b);b.quad(M.asphalt,[x-3,-0.02,-6.6],[x+3,-0.02,-6.6],[x+3,GY+0.06,-9.2],[x-3,GY+0.06,-9.2],0x8f949b);
      b.quad(M.asphalt,[x-3,GY+0.06,9.6],[x+3,GY+0.06,9.6],[x+3,GY+0.06,5.2],[x-3,GY+0.06,5.2],0x9a9fa6);b.quad(M.asphalt,[x-3,GY+0.06,-9.2],[x+3,GY+0.06,-9.2],[x+3,GY+0.06,-240],[x-3,GY+0.06,-240],0x9a9fa6);
      b.quad(M.line,[x-0.06,GY+0.08,-9.4],[x+0.06,GY+0.08,-9.4],[x+0.06,GY+0.08,-240],[x-0.06,GY+0.08,-240],0xe6e6e0);
      [[x+3.5,3.4,-1],[x-3.5,-7.4,1]].forEach(([px,pz,dir])=>{
        b.box(M.steel,px-0.07,px+0.07,GY,3.3,pz-0.07,pz+0.07,0x3a3f47);
        [0.78,-0.78].forEach(rz=>b.add(M.paint,T_BOX,px,3.0,pz+0.09,1.5,0.16,0.04,0xf2c400,0,0,rz));
        b.box(M.steel,px-0.5,px+0.5,2.05,2.45,pz-0.06,pz+0.1,0x22262c);
        [-0.28,0.28].forEach((o,j)=>{const l=new THREE.Mesh(new THREE.CircleGeometry(0.15,14),redOff);l.position.set(px+o,2.25,pz+0.11);grp.add(l);(j?it.lb:it.la).push(l);});
        const piv=new THREE.Group();piv.position.set(px,1.0,pz+0.2*dir);const arm=new THREE.Mesh(T_BOX,M.paint);arm.scale.set(6.2,0.09,0.09);arm.position.x=dir*3.1;arm.userData.keepGeo=true;piv.add(arm);piv.userData.dir=dir;grp.add(piv);it.arms.push(piv);});});
    grp.userData.cross=cross;
    /* ---- やまの トンネルの うえの やま ---- */
    ks.forEach(k=>{const f=G.feat(k);if(f.ug||f.t1<=f.t0)return;const hx0=Math.max(X0,f.t0-430,G.X(k)),hx1=Math.min(X1,f.t1+430,G.X(k+1));if(hx1<=hx0)return;
      const ds=[0,5,12,24,40,62,90,125,165,210,260,320,390,470],step=100,nx=Math.ceil((hx1-hx0)/step),pos=[],nor=[],col=[],uv=[],idx=[],c=new THREE.Color();
      for(let ix=0;ix<=nx;ix++){const X=Math.min(hx1,hx0+ix*step);
        for(let j=0;j<ds.length;j++){const d=ds[j],y=hillH(f,X,d),e=2;
          const dx=(hillH(f,X+e*10,d)-hillH(f,X-e*10,d))/(2*e),dz=(hillH(f,X,d+e)-hillH(f,X,Math.max(0.01,d-e)))/(2*e);
          pos.push(lx(X),GY+y-0.05,-9.5-d);_n.set(-dx,1,dz).normalize();nor.push(_n.x,_n.y,_n.z);uv.push(X*U/7,d/7);
          c.set(0x52763f).multiplyScalar(0.85+0.3*vnoise(X*U/20,d/20));col.push(c.r,c.g,c.b);}}
      for(let ix=0;ix<nx;ix++)for(let j=0;j<ds.length-1;j++){const a=ix*ds.length+j,q=a+ds.length;idx.push(a,q,a+1, q,q+1,a+1);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);
      const m=new THREE.Mesh(g,M.hill);m.receiveShadow=true;m.castShadow=true;grp.add(m);
      const nt=Math.round((hx1-hx0)/CH*260);
      for(let n=0;n<nt;n++){const X=hx0+r()*(hx1-hx0),d=8+r()*r()*300,y=hillH(f,X,d);if(y<1.5)continue;tree(b,lx(X),GY+y-0.9,-9.5-d,1.5+r()*1.4,false,r,r()<0.5);}});
    /* ---- みずうみ（むこうがわ） ---- */
    {const n=6;for(let q=0;q<n;q++){const Xa=X0+CH*q/n,Xb=X0+CH*(q+1)/n,da=landDepth(Xa),db=landDepth(Xb);if(da>750&&db>750)continue;
      const a=lx(Xa),c=lx(Xb);b.quad(M.water,[a,GY+0.1,-da],[c,GY+0.1,-db],[c,GY+0.1,-1300],[a,GY+0.1,-1300]);
      b.quad(M.grass,[a,GY,-da+6],[c,GY,-db+6],[c,GY-0.4,-db-2],[a,GY-0.4,-da-2],0xc9c4b0);}}
    /* ---- まち・はたけ・ちゃばたけ・もり ---- */
    const skip=X=>{const f=G.feat(G.kAt(X));return (X>f.r0-130&&X<f.r1+130)||(!f.ug&&f.t1>f.t0&&X>f.t0-470&&X<f.t1+470)||crossings.some(x=>Math.abs(x-X)<75);};
    const rows=[-22,-40,-60,-84,-114,-152,-200,-264,-346,-446,-566,-700],NSL=10;
    for(let sx=0;sx<NSL;sx++)for(let ri=0;ri<rows.length-1;ri++){
      const X=X0+(sx+0.5)*CH/NSL,z0=rows[ri],z1=rows[ri+1],dep=z0-z1,x=lx(X),q=r(),q2=r(),jx=(r()-0.5)*5,jz=(r()-0.5)*dep*0.3,zc=(z0+z1)/2,hw=CHM/NSL/2-0.5;
      if(skip(X)||-z1>landDepth(X)-6)continue;
      const city=cityAt(X);
      if(q<city*0.92){if(dep>16||q2<0.8)building(b,x+jx*0.4,z0-Math.min(dep,26)/2-2,r,city,ri);continue;}
      if(nearType==='forest'){const n=ri<6?3:2;for(let e=0;e<n;e++)tree(b,x-hw+r()*2*hw,GY,z0-r()*dep,1.2+r()*1.3,false,r,r()<0.6);continue;}
      if(nearType==='tea'&&city<0.5&&q2<0.78){
        b.quad(M.field,[x-hw,GY+0.03,z0-0.4],[x+hw,GY+0.03,z0-0.4],[x+hw,GY+0.03,z1+0.4],[x-hw,GY+0.03,z1+0.4],0x8a8f5a);
        if(ri<6){const n=Math.min(9,Math.floor((dep-1)/2.3));for(let e=0;e<n;e++){const tz=z0-1.4-e*(dep-1.6)/n;b.add(M.tea,T_CYL,x,GY+0.45,tz,0.95,2*hw,0.62,[0x3f7436,0x4a8440,0x3a6d33][e%3],0,0,Math.PI/2);}}
        else b.quad(M.field,[x-hw,GY+0.05,z0-1],[x+hw,GY+0.05,z0-1],[x+hw,GY+0.05,z1+1],[x-hw,GY+0.05,z1+1],0x5d8a48);
        continue;}
      if(nearType==='field'&&city<0.5){
        b.quad(M.field,[x-hw,GY+0.03,z0-0.6],[x+hw,GY+0.03,z0-0.6],[x+hw,GY+0.03,z1+0.6],[x-hw,GY+0.03,z1+0.6],PADDY[(r()*6)|0]);
        if(q2<0.10)house(b,x+jx,zc+jz,r,false);else if(q2<0.2)tree(b,x+jx,GY,zc+jz,0.9+r()*0.7,false,r,false);
        continue;}
      if(q2<0.6){house(b,x+jx,z0-5-r()*Math.max(0,dep-12),r,false);if(dep>26&&r()<0.8)house(b,x-jx,z1+6,r,false);}
      else if(q2<0.78){tree(b,x+jx,GY,zc+jz,0.9+r()*0.9,false,r,false);if(dep>20)tree(b,x-jx,GY,zc-jz*2,0.8+r()*0.8,false,r,false);}
      else if(q2<0.93)building(b,x,z0-dep/2,r,0.05,0);
    }
    /* ---- てまえがわ：そくどう・はたけ・ちゅうしゃじょう ---- */
    for(let sx=0;sx<NSL;sx++){const X=X0+(sx+0.5)*CH/NSL,x=lx(X),hw=CHM/NSL/2,f=G.feat(G.kAt(X));
      if((X>f.r0-90&&X<f.r1+90)||ugAt(X)||inPlat(X,0))continue;
      b.quad(M.asphalt,[x-hw,GY+0.05,15.4],[x+hw,GY+0.05,15.4],[x+hw,GY+0.05,9.6],[x-hw,GY+0.05,9.6],0xb9bcc2);
      for(let e=-1;e<=1;e+=2)b.quad(M.line,[x+e*3.6-1.5,GY+0.07,12.56],[x+e*3.6+1.5,GY+0.07,12.56],[x+e*3.6+1.5,GY+0.07,12.44],[x+e*3.6-1.5,GY+0.07,12.44],0xe6e6e0);
      const city=cityAt(X),q=r(),w=hw-0.4;if(crossings.some(c=>Math.abs(c-X)<75))continue;
      [[16.6,34],[35,62],[63,110]].forEach(([z0,z1],ri)=>{
        if(city>0.3||(nearType==='town'&&q<0.5)){if(ri>0&&city<0.3)return;
          b.quad(M.asphalt,[x-w,GY+0.04,z1],[x+w,GY+0.04,z1],[x+w,GY+0.04,z0],[x-w,GY+0.04,z0],0xa9adb4);
          if(ri>0)for(let cx=x-w+1.6;cx<x+w-1;cx+=2.7){if(r()<0.45)continue;const cc=CARC[(r()*7)|0],cz=z0+3.2+((r()*2)|0)*((z1-z0)>20?9:0);
            b.box(M.paint,cx-0.9,cx+0.9,GY+0.25,GY+0.95,cz-2.1,cz+2.1,cc);b.box(M.win,cx-0.82,cx+0.82,GY+0.95,GY+1.5,cz-1.2,cz+1.0);}}
        else if(nearType==='tea'){b.quad(M.field,[x-w,GY+0.03,z1],[x+w,GY+0.03,z1],[x+w,GY+0.03,z0],[x-w,GY+0.03,z0],0x8a8f5a);
          if(ri===0)for(let e=0;e<6;e++)b.add(M.tea,T_CYL,x,GY+0.45,z0+1.4+e*2.7,0.95,2*w,0.62,[0x3f7436,0x4a8440,0x3a6d33][e%3],0,0,Math.PI/2);}
        else if(nearType==='field')b.quad(M.field,[x-w,GY+0.03,z1-0.5],[x+w,GY+0.03,z1-0.5],[x+w,GY+0.03,z0],[x-w,GY+0.03,z0],PADDY[(r()*6)|0]);
        else{b.quad(M.field,[x-w,GY+0.03,z1],[x+w,GY+0.03,z1],[x+w,GY+0.03,z0],[x-w,GY+0.03,z0],nearType==='forest'?0x6f8a55:[0x9aa86a,0x8a9a5c,0xa7a078][(r()*3)|0]);
          if(ri===0&&r()<0.5)b.add(M.leaf,T_ICO,x-w+2+r()*(2*w-4),GY+0.5,z0+2+r()*(z1-z0-4),0.9+r()*0.5,0.6+r()*0.3,0.9+r()*0.5,TREE_G[(r()*5)|0],r()*3);}
      });}
    b.build(grp);grp.userData.i=i;scene.add(grp);return grp;
  }

  /* ---------- えき ---------- */
  function signCanvas(k){
    const c=canvas(1080,352),g=c.getContext('2d'),n=G.st(k),p=G.st(k-1),q=G.st(k+1),W=1080,nc=G.numColor(n[3]),tosh=n[0]==='豊島園',magic=G.magic(k),themed=tosh||magic;
    const ink=themed?'#fff1d7':'#1b1f24',trim=magic?'#ddcba5':'#d4ad68',cx=n[3]?W/2+60:W/2,tw=n[3]?W-360:W-120;
    g.fillStyle=magic?'#182339':tosh?'#722733':'#fbfbf9';g.fillRect(0,0,W,352);
    if(themed){g.strokeStyle=trim;g.lineWidth=5;g.strokeRect(18,18,W-36,316);}
    if(n[3]){const bx=52,by=52;g.fillStyle=nc;g.beginPath();g.roundRect(bx-6,by-6,148,148,30);g.fill();g.fillStyle='#fff';g.beginPath();g.roundRect(bx+6,by+54,124,76,[0,0,18,18]);g.fill();
      g.textAlign='center';g.textBaseline='middle';g.font='700 38px '+SANS;g.fillText(n[3].replace(/\d+/,''),bx+68,by+28);
      g.fillStyle='#1b1f24';g.font='700 60px '+SANS;g.fillText(n[3].replace(/^[A-Z]+/,''),bx+68,by+94);}
    g.fillStyle=ink;g.textAlign='center';g.textBaseline='middle';
    g.font='600 46px '+SANS;g.fillText(n[1],cx,56,tw);
    g.font='700 112px '+SANS;g.fillText(n[0],cx,146,tw);
    g.font=themed?'bold 38px Georgia,serif':'500 36px '+SANS;g.fillText(themed?n[2].toUpperCase():n[2],cx,226,tw);
    g.fillStyle=themed?trim:nc;g.fillRect(themed?28:0,252,W-(themed?56:0),themed?8:16);
    g.fillStyle=ink;g.font='500 40px '+SANS;
    if(G.idx(k-1)===G.idx(k+1)){g.textAlign='right';g.fillText(q[0]+'  '+q[2]+'  ▶',W-40,312,W-80);}
    else{g.textAlign='left';g.fillText('◀  '+p[0],40,312,W/2-60);g.textAlign='right';g.fillText(q[0]+'  ▶',W-40,312,W/2-60);}
    return c;
  }
  /* いけぶくろ 1ばんホームの レンガと アーチ（よこ 12m × たて 4m ぶん） */
  function brickCanvas(){
    const c=canvas(1536,960),g=c.getContext('2d'),cols=['#9c7659','#ad8a67','#b79471','#c0a17a','#a48160'],bw=48,bh=20;
    g.fillStyle='#c4a38e';g.fillRect(0,0,1536,960);
    for(let row=0;row<48;row++)for(let col=-1;col<33;col++){g.fillStyle=cols[(row*7+col*3+Math.floor((col+40)/4))%5];g.fillRect(col*bw+(row%2)*bw/2+2,row*bh+2,bw-4,bh-4);}
    const x=768,y=470,r=250;g.beginPath();g.moveTo(x-r,960);g.lineTo(x-r,y);g.arc(x,y,r,Math.PI,0);g.lineTo(x+r,960);g.closePath();g.fillStyle='#3a2a24';g.fill();
    g.strokeStyle='#ac8765';g.lineWidth=46;g.beginPath();g.moveTo(x-r,960);g.lineTo(x-r,y);g.arc(x,y,r,Math.PI,0);g.lineTo(x+r,960);g.stroke();
    g.strokeStyle='#dcc29c';g.lineWidth=4;for(let i=0;i<=14;i++){const a=Math.PI+i*Math.PI/14,ux=Math.cos(a),uy=Math.sin(a);g.beginPath();g.moveTo(x+ux*(r-23),y+uy*(r-23));g.lineTo(x+ux*(r+23),y+uy*(r+23));g.stroke();}
    return c;
  }
  function clockCanvas(){const c=canvas(256,256),g=c.getContext('2d');g.fillStyle='#55432f';g.beginPath();g.arc(128,128,126,0,7);g.fill();g.fillStyle='#f7e6c4';g.beginPath();g.arc(128,128,106,0,7);g.fill();
    g.strokeStyle='#c7a470';g.lineWidth=8;g.stroke();g.fillStyle='#55432f';g.textAlign='center';g.textBaseline='middle';g.font='bold 34px Georgia,serif';
    ['XII','III','VI','IX'].forEach((l,i)=>{const a=i*Math.PI/2;g.fillText(l,128+78*Math.sin(a),128-78*Math.cos(a));});return c;}
  function boothCanvas(){const c=canvas(128,320),g=c.getContext('2d');g.fillStyle='#a43f48';g.fillRect(0,0,128,320);g.fillStyle='#5a222b';g.fillRect(0,0,128,46);g.strokeStyle='#5a222b';g.lineWidth=10;g.strokeRect(5,5,118,310);
    g.fillStyle='#f6dfb3';g.font='bold 17px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.fillText('TELEPHONE',64,25,112);
    g.fillStyle='#ecd4a3';for(let r=0;r<5;r++)for(let q=0;q<3;q++)g.fillRect(20+q*32,62+r*36,24,28);return c;}
  function buildStation(k){
    const b=new Batch(),grp=new THREE.Group(),c=G.X(k),[R0,R1]=platRange(k),x0=(R0-c)*U,x1=(R1-c)*U,S=G.ser();
    const name=G.st(k)[0],ug=G.isUG(k),magic=G.magic(k),tosh=name==='豊島園',status=G.platDoor(k),yB=ug?TOPY-0.06:GY-ry(c),own=[];
    const fz0=FAR_TRACK-NEAR_Z,fz1=fz0-8,backZ=ug?62:9.6,RH=magic||tosh?7.4:5.2;
    const steelC=magic?0x545960:tosh?0x7b2939:0x9299a1,roofC=magic?0x454c55:tosh?0xe4d5b8:0xc4c8cc;
    /* てまえの ホーム */
    b.box(M.asphalt,x0,x1,PT-0.25,PT,NEAR_Z,backZ);b.box(M.concrete,x0,x1,yB,PT-0.25,NEAR_Z+0.25,backZ,0xb9bbb8);
    b.box(M.concrete,x0,x1,PT-0.25,PT+0.004,NEAR_Z,NEAR_Z+0.28,0xe8e8e4);
    b.quad(M.line,[x0,PT+0.012,NEAR_Z+1.1],[x1,PT+0.012,NEAR_Z+1.1],[x1,PT+0.012,NEAR_Z+0.75],[x0,PT+0.012,NEAR_Z+0.75],0xe2b417);
    const doors=allDoors(S).filter(d=>d>x0+1.5&&d<x1-1.5),gh=doorW(S)/2+0.45;
    doors.forEach(d=>{[-1,1].forEach(s=>{const dx=d+s*(gh+0.1);b.quad(M.line,[dx-0.06,PT+0.012,NEAR_Z+0.7],[dx+0.06,PT+0.012,NEAR_Z+0.7],[dx+0.06,PT+0.012,NEAR_Z+0.3],[dx-0.06,PT+0.012,NEAR_Z+0.3],0xf4f4f0);});});
    if(!ug){b.box(M.glassRail,x0,x1,PT+0.15,PT+1.05,9.5,9.54);b.box(M.steel,x0,x1,PT+1.05,PT+1.1,9.47,9.57,0xaab0b6);b.box(M.concrete,x0,x1,PT,PT+0.15,9.4,9.6,0xc9cbc8);
      for(let x=x0+1;x<x1;x+=2.5)b.box(M.steel,x-0.025,x+0.025,PT+0.15,PT+1.05,9.49,9.55,0xaab0b6);
      for(let x=x0+8;x<x1-2;x+=22){b.box(M.steel,x-0.06,x+0.06,PT,PT+4.4,9.2,9.32,0x8d949c);b.box(M.steel,x-0.05,x+0.05,PT+4.3,PT+4.4,7.4,9.3,0x8d949c);b.box(M.nlamp,x-0.5,x+0.5,PT+4.22,PT+4.3,7.3,7.7);}}
    /* むこうの ホーム・やね */
    b.box(M.asphalt,x0,x1,PT-0.25,PT,fz1,fz0);b.box(M.concrete,x0,x1,yB,PT-0.25,fz1,fz0-0.25,0xb9bbb8);b.box(M.concrete,x0,x1,PT-0.25,PT+0.004,fz0-0.28,fz0,0xe8e8e4);
    b.quad(M.line,[x0,PT+0.012,fz0-0.75],[x1,PT+0.012,fz0-0.75],[x1,PT+0.012,fz0-1.1],[x0,PT+0.012,fz0-1.1],0xe2b417);
    if(!ug){
      if(magic){const t=tex(brickCanvas(),true,ANISO),m=new THREE.MeshStandardMaterial({map:t,roughness:0.9});own.push(t,m);
        const g=new THREE.PlaneGeometry(x1-x0,RH),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,(uv.getX(i)*(x1-x0)+x0)/12+0.5);
        const w=new THREE.Mesh(g,m);w.position.set((x0+x1)/2,PT+RH/2,fz1+0.32);w.receiveShadow=true;grp.add(w);b.box(M.concrete,x0,x1,PT,PT+RH,fz1,fz1+0.3,0x8a6b55);}
      else{b.box(M.paint,x0,x1,PT,PT+RH,fz1,fz1+0.3,tosh?0xe9dcc2:0xd8dad6);for(let x=x0+6;x<x1-2;x+=12)b.box(M.win,x,x+7,PT+1.3,PT+2.9,fz1+0.3,fz1+0.34);}
      b.box(M.steel,x0-0.5,x1+0.5,PT+RH,PT+RH+0.25,fz1-0.3,fz0+3.9,roofC);b.box(M.steel,x0-0.5,x1+0.5,PT+RH-0.28,PT+RH,fz0+3.6,fz0+3.9,tosh?0x7b2939:magic?0x454c55:0x8f959c);
      if(tosh)b.box(M.steel,x0-0.5,x1+0.5,PT+RH+0.25,PT+RH+0.4,fz1-0.3,fz0+3.9,0x7b2939);
      for(let x=x0+3;x<x1-1;x+=10){b.box(M.steel,x-0.15,x+0.15,PT,PT+RH,fz0-3.3,fz0-3.0,steelC);b.box(M.steel,x-0.1,x+0.1,PT+RH-0.35,PT+RH,fz1,fz0+3.6,steelC);
        if(tosh)[0.7,-0.7].forEach(rz=>b.add(M.steel,T_BOX,x+Math.sign(rz)*1.0,PT+RH-0.7,fz0-3.15,2.6,0.12,0.12,0x8e3645,0,0,-rz*0.9));
        if(magic){b.box(M.steel,x+0.15,x+0.9,PT+RH-1.3,PT+RH-1.24,fz0-3.2,fz0-3.1,0x523d31);b.box(M.steel,x+0.62,x+1.06,PT+RH-1.95,PT+RH-1.35,fz0-3.37,fz0-2.93,0x705442);b.box(M.lamp,x+0.7,x+0.98,PT+RH-1.87,PT+RH-1.43,fz0-3.4,fz0-2.9,0xffe4a7);}
        else{b.box(tosh?M.lamp:M.nlamp,x+3.6,x+6.4,PT+RH-0.12,PT+RH-0.04,fz0+1.1,fz0+1.3,tosh?0xfff0c6:null);b.box(M.nlamp,x+3.6,x+6.4,PT+RH-0.12,PT+RH-0.04,fz0-5.1,fz0-4.9);}}
      for(let x=x0+14;x<x1-8;x+=28){b.box(M.steel,x,x+2.4,PT+0.4,PT+0.47,fz1+1.9,fz1+2.4,tosh?0x963d47:0x60707c);b.box(M.steel,x+0.1,x+2.3,PT,PT+0.4,fz1+2.1,fz1+2.2,tosh?0x432c31:0x60707c);}
    }else{for(let x=x0+6;x<x1;x+=12){b.box(M.lamp,x-1.2,x+1.2,7.3,7.38,fz0-1.6,fz0-1.4,0xfff0d0);b.box(M.lamp,x-1.2,x+1.2,7.3,7.38,NEAR_Z+1.4,NEAR_Z+1.6,0xfff0d0);}
      b.box(M.ug,x0,x1,PT+2.4,PT+2.6,-9.19,-9.1,0x8794a0);}
    /* ホームドア：あいて いる ところは ドアの いち。とびらは うごかす */
    const pd={status,leaves:[]};
    if(status!=='none'){const z0=NEAR_Z+0.2,z1=NEAR_Z+0.34;let edge=x0;
      const housing=(a,c)=>{if(c-a<0.05)return;b.box(M.pd,a,c,PT,PT+1.3,z0,z1);b.box(M.pd,a,c,PT+0.82,PT+0.9,z1,z1+0.004,0x8dafc2);};
      doors.forEach(d=>{housing(edge,d-gh);edge=d+gh;
        [-1,1].forEach(s=>{const m=new THREE.Mesh(T_BOX,M.pdGlass);m.scale.set(gh,1.2,0.05);m.userData={base:d+s*gh/2,dir:s,w:gh,keepGeo:true};m.position.set(d+s*gh/2,PT+0.62,(z0+z1)/2);m.renderOrder=2;grp.add(m);pd.leaves.push(m);});});
      housing(edge,x1);b.box(M.pd,x0,x1,PT,PT+1.3,fz0-0.34,fz0-0.2);b.box(M.pdGlass,x0,x1,PT+0.3,PT+1.2,fz0-0.2,fz0-0.19);}
    grp.userData.pd=pd;
    /* としまえん：でんわボックス・ベンチ・きかんしゃの もけい */
    if(tosh&&!ug){const t=tex(boothCanvas(),false,ANISO),m=new THREE.MeshStandardMaterial({map:t,roughness:0.6});own.push(t,m);
      const booth=new THREE.Mesh(new THREE.BoxGeometry(1.0,2.5,1.0),m);booth.position.set(19.3,PT+1.25,8.3);booth.castShadow=true;grp.add(booth);
      b.box(M.paint,14.0,16.6,PT+0.42,PT+0.5,7.9,8.5,0xb75a58);b.box(M.paint,14.0,16.6,PT+0.7,PT+1.05,8.5,8.58,0x963d47);b.box(M.steel,14.1,14.25,PT,PT+1.05,7.95,8.55,0x432c31);b.box(M.steel,16.35,16.5,PT,PT+1.05,7.95,8.55,0x432c31);
      b.box(M.concrete,22.4,27.4,PT,PT+0.35,7.6,8.9,0x6a6468);b.add(M.paint,T_CYL,24.4,PT+1.15,8.25,0.55,3.0,0.55,0x752e37,0,0,Math.PI/2);b.box(M.paint,25.7,27.0,PT+0.6,PT+2.2,7.65,8.85,0x752e37);
      b.box(M.steel,25.55,27.15,PT+2.2,PT+2.32,7.55,8.95,0x36252b);b.add(M.steel,T_CYL,23.4,PT+2.0,8.25,0.2,0.75,0.2,0x36252b);b.box(M.lamp,26.05,26.65,PT+1.45,PT+1.95,8.85,8.87,0xf5cf8c);
      [23.2,24.3,25.6,26.6].forEach(x=>{b.add(M.steel,T_CYL,x,PT+0.72,8.92,0.36,0.1,0.36,0x2c262b,0,Math.PI/2,0,);b.add(M.steel,T_CYL,x,PT+0.72,8.99,0.14,0.06,0.14,0xd2a369,0,Math.PI/2);});}
    b.build(grp);
    /* いけぶくろ 1ばん：ぎゃくまわりの とけい と フクロウ */
    if(magic&&!ug){const t=tex(clockCanvas(),false,ANISO),m=new THREE.MeshBasicMaterial({map:t});own.push(t,m);
      const clock=new THREE.Group();clock.position.set(9,PT+RH-2.0,-3.4);const face=new THREE.Mesh(new THREE.CircleGeometry(0.62,40),m);clock.add(face);
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.64,0.64,0.14,40).rotateX(Math.PI/2),M.trunk);rim.position.z=-0.08;clock.add(rim);
      const rod=new THREE.Mesh(T_BOX,M.steel);rod.scale.set(0.06,1.4,0.06);rod.position.set(0,1.32,-0.08);rod.userData.keepGeo=true;clock.add(rod);
      const hm=new THREE.MeshBasicMaterial({color:0x55432f});own.push(hm);
      grp.userData.hands=[[0.24,0.045],[0.36,0.035],[0.47,0.02]].map(([len,w])=>{const p=new THREE.Group(),h=new THREE.Mesh(T_BOX,hm);h.scale.set(w,len,0.01);h.position.y=len/2;h.userData.keepGeo=true;p.add(h);p.position.z=0.012;clock.add(p);return p;});
      grp.add(clock);
      const owl=new THREE.Group(),bm=new THREE.MeshStandardMaterial({color:0x604b3d,roughness:0.9}),cm=new THREE.MeshStandardMaterial({color:0xe9dbbe,roughness:0.9}),em=new THREE.MeshBasicMaterial({color:0x2c2018}),km=new THREE.MeshStandardMaterial({color:0xc28a49,roughness:0.6});own.push(bm,cm,em,km);
      const sph=new THREE.SphereGeometry(1,18,14),add=(mat,sx,sy,sz,x,y,z)=>{const o=new THREE.Mesh(sph,mat);o.scale.set(sx,sy,sz);o.position.set(x,y,z);owl.add(o);return o;};own.push(sph);
      add(bm,0.3,0.4,0.27,0,0,0);add(cm,0.21,0.28,0.1,0,-0.04,0.2);add(bm,0.26,0.22,0.24,0,0.36,0.02);
      [-0.11,0.11].forEach(x=>{add(cm,0.1,0.1,0.04,x,0.38,0.22);add(em,0.035,0.035,0.02,x,0.38,0.255);});
      const beak=new THREE.Mesh(T_CONE,km);beak.scale.set(0.04,0.1,0.04);beak.rotation.x=Math.PI/2+0.5;beak.position.set(0,0.3,0.27);beak.userData.keepGeo=true;owl.add(beak);
      const perch=new THREE.Mesh(T_BOX,M.trunk);perch.scale.set(1.0,0.07,0.1);perch.position.set(0,-0.43,0.05);perch.userData.keepGeo=true;owl.add(perch);
      owl.position.set(19,PT+RH-2.0,-3.4);const orod=new THREE.Mesh(T_BOX,M.steel);orod.scale.set(0.05,1.9,0.05);orod.position.set(0,0.55,-0.12);orod.userData.keepGeo=true;owl.add(orod);owl.traverse(o=>{o.castShadow=true;});grp.add(owl);}
    /* えきめいひょう */
    const stx=tex(signCanvas(k),false,ANISO),sm=new THREE.MeshStandardMaterial({map:stx,roughness:0.6,emissive:0xffffff,emissiveMap:stx,emissiveIntensity:0.15});own.push(stx,sm);
    grp.userData.signMat=sm;
    for(let x=6;x>x0+8;x-=42){const s=new THREE.Mesh(new THREE.BoxGeometry(4.6,1.5,0.14),[M.steel,M.steel,M.steel,M.steel,sm,M.steel]);
      if(ug)s.position.set(x,PT+4.2,-9.05);else{s.position.set(x,PT+RH-1.05,fz0-2.1);[-1.9,1.9].forEach(o=>{const h=new THREE.Mesh(T_BOX,M.steel);h.scale.set(0.05,0.6,0.05);h.position.set(x+o,PT+RH-0.2,fz0-2.1);h.userData.keepGeo=true;grp.add(h);});}
      grp.add(s);}
    grp.userData.own=own;grp.userData.k=k;scene.add(grp);return grp;
  }
  function freeGroup(g){scene.remove(g);g.traverse(o=>{if(o.geometry&&!o.userData.keepGeo&&o.geometry!==T_BOX&&o.geometry!==T_CONE)o.geometry.dispose();});(g.userData.own||[]).forEach(o=>o.dispose());}
  function clearWorld(){chunks.forEach(freeGroup);chunks.clear();stations.forEach(freeGroup);stations.clear();}
  function loft(secs,xa,L){
    const Mn=44,pos=[],uv=[],idx=[];
    secs.forEach(s=>{const cy=(s.yb+s.yt)/2,ry=(s.yt-s.yb)/2,e=2/s.n;
      for(let j=0;j<=Mn;j++){const a=-Math.PI/2+Math.PI*2*j/Mn,sn=Math.sin(a),cs=Math.cos(a),y=cy+ry*Math.sign(sn)*Math.pow(Math.abs(sn),e),z=s.hw*Math.sign(cs)*Math.pow(Math.abs(cs),e);
        pos.push(s.x,y,z);uv.push((s.x-xa)/L,y/4);}});
    const R=Mn+1;for(let i=0;i<secs.length-1;i++)for(let j=0;j<Mn;j++){const a=i*R+j,b=a+R;idx.push(a,b,b+1, a,b+1,a+1);}
    const cap=(i,flip)=>{const s=secs[i],ci=pos.length/3;pos.push(s.x,(s.yb+s.yt)/2,0);uv.push(0.997,0.994);for(let j=0;j<Mn;j++){const a=i*R+j;if(flip)idx.push(ci,a+1,a);else idx.push(ci,a,a+1);}};
    cap(0,false);cap(secs.length-1,true);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const bez=(a,b,c,d,t)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;};

  /* ---------- れっしゃ（しゃりょうの かたち・いろは ゲームの SERIES から） ---------- */
  const NOSE_SPEC={flat:{L:0.35,drop:0.03,pow:1,narrow:0.03,n:9},slant:{L:1.2,drop:0.46,pow:1.25,narrow:0.08,n:7},egg:{L:2.4,drop:0.58,pow:2,narrow:0.3,n:3.2},
    nra:{L:3.8,drop:0.62,pow:1.7,narrow:0.42,n:3},laview:{L:4.6,drop:0.7,pow:2.1,narrow:0.5,n:2.3},agt:{L:1.0,drop:0.22,pow:2,narrow:0.08,n:7}};
  const BODY={hw:1.42,yb:0.95,yt:3.68,n:10},BH=BODY.yt-BODY.yb,TW=2048,TH=512,ty4=y=>TH*(1-y/4),yy=a=>BODY.yt-a/50*BH;
  const train=new THREE.Group();scene.add(train);
  let trainKey='',ledKey='',TR=null;
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x06090d,roughness:0.04,metalness:0.4,clearcoat:1,envMapIntensity:1.8,side:THREE.DoubleSide});
  const darkMat=std({color:0x16181c,roughness:0.7,metalness:0.3},{}),underMat=std({color:0x2a2d33,roughness:0.6,metalness:0.5},{}),roofMat=std({color:0x8e949b,roughness:0.7,metalness:0.3},{});
  const openMat=new THREE.MeshBasicMaterial({color:0x2b2620,side:THREE.DoubleSide}),lensMat=new THREE.MeshBasicMaterial({color:0xfff6dc}),tailMat=new THREE.MeshBasicMaterial({color:0xff3030}),pantoMat=std({color:0x4b5058,roughness:0.5,metalness:0.7},{});
  const headGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xfff0c8,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  function cabSecs(S,L){const sp=NOSE_SPEC[S.front]||NOSE_SPEC.flat,xb=L/2-sp.L,out=[{x:-L/2,...BODY},{x:-L/2+0.25,...BODY},{x:xb-0.3,...BODY}];
    for(let i=0;i<=18;i++){const s=i/18;out.push({x:xb+s*sp.L,hw:BODY.hw*(1-sp.narrow*s*s),yb:BODY.yb,yt:BODY.yt-BH*sp.drop*Math.pow(s,sp.pow),n:lerp(BODY.n,sp.n,Math.min(1,s*1.6))});}return out;}
  const lum=c=>{const n=parseInt(c.slice(1),16);return((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000;};
  function paintCar(g,S,L,kind,led,emissive){
    const cab=kind!=='mid',mir=kind==='tail',px=x=>(x+L/2)/L*TW,rect=(xa,xb,ya,yb2,r)=>{const X=px(xa),Y=ty4(ya);g.beginPath();g.roundRect(X,Y,px(xb)-X,ty4(yb2)-Y,r||0);g.fill();};
    g.setTransform(1,0,0,1,0,0);
    if(emissive){g.fillStyle='#000';g.fillRect(0,0,TW,TH);}
    else{g.fillStyle=S.body;g.fillRect(0,0,TW,TH);
      (S.stripes||[]).forEach(([a,b2,c,pat])=>{if(typeof c==='object'){const gr=g.createLinearGradient(0,0,TW,0);c.forEach((cc,i)=>gr.addColorStop(i/(c.length-1),cc));g.fillStyle=gr;}else g.fillStyle=c;
        if(pat==='checker'){const h=(b2-a)/2,w=h*U*1.6;let j=0;for(let x=-L/2;x<L/2;x+=w,j++)for(let r2=0;r2<2;r2++){if((j+r2)%2)continue;const f=(x+L/2)/L;if(h1(j*3+r2)>0.25+f*0.7)continue;rect(x,x+w,yy(a+r2*h),yy(a+r2*h+h));}}
        else rect(-L/2,L/2,yy(a),yy(b2));});
      if(cab&&S.face){g.fillStyle=S.face;rect(L/2-(S.faceW||10)*U,L/2,4,0);}
      g.fillStyle='#8e949b';g.fillRect(0,0,TW,ty4(3.63));g.fillStyle='rgba(30,34,42,.45)';g.fillRect(0,ty4(1.02),TW,TH);
      g.fillStyle=S.face||S.body;g.fillRect(TW-12,0,12,12);}
    const ds=doorLocal(S,cab),dw=doorW(S),wc=emissive?'#ffe9b8':(S.win||'#1b2530');
    ds.forEach(d=>{if(!emissive){g.fillStyle=S.door||S.body;rect(d-dw/2,d+dw/2,3.12,1.08);g.strokeStyle='rgba(50,58,70,.7)';g.lineWidth=2.5;g.strokeRect(px(d-dw/2),ty4(3.12),px(d+dw/2)-px(d-dw/2),ty4(1.08)-ty4(3.12));
        if(dw>1.1){g.beginPath();g.moveTo(px(d),ty4(3.12));g.lineTo(px(d),ty4(1.08));g.stroke();}}
      g.fillStyle=wc;if(dw>1.1){rect(d-0.52,d-0.13,3.0,2.2,5);rect(d+0.13,d+0.52,3.0,2.2,5);}else rect(d-0.27,d+0.27,3.0,2.2,5);});
    const sp=NOSE_SPEC[S.front]||NOSE_SPEC.flat,edges=[-L/2+0.4];ds.forEach(d=>edges.push(d-dw/2-0.4,d+dw/2+0.4));edges.push(cab?L/2-sp.L-(S.front==='laview'?0.2:2.3):L/2-0.4);
    let ledDone=false;
    for(let i=0;i<edges.length;i+=2){const a=edges[i],b2=edges[i+1];if(b2-a<0.8)continue;
      if(!ledDone&&b2-a>2.6){ledDone=true;const m=(a+b2)/2,lw=Math.min(2.9,b2-a-0.2);g.fillStyle=emissive?'#000':'#0c0d0f';rect(m-lw/2,m+lw/2,yy(3),yy(10.5),3);
        g.save();g.translate(px(m),ty4((yy(3)+yy(10.5))/2)+1);if(mir)g.scale(-1,1);g.textBaseline='middle';g.font='700 '+Math.round((ty4(yy(10.5))-ty4(yy(3)))*0.74)+'px '+SANS;
        const W=px(lw)-px(0),tc=lum(led[1])<150?'#9fd0ff':led[1];g.textAlign='left';g.fillStyle=tc;g.fillText(led[0],-W/2+6,0,W*0.42);const tw=Math.min(W*0.42,g.measureText(led[0]).width);
        g.fillStyle='#ffb21e';g.fillText(led[2],-W/2+tw+16,0,W-tw-24);g.restore();}
      if(S.wins==='big'){const n=Math.max(1,Math.round((b2-a)/2.6)),w=(b2-a)/n;for(let j=0;j<n;j++){g.fillStyle=emissive?'#fff1c4':(S.win||'#27313d');rect(a+j*w+0.1,a+j*w+w-0.1,yy(9),yy(36),12);
          if(S.seat&&!emissive){g.fillStyle=S.seat;rect(a+j*w+w*0.25,a+j*w+w*0.75,yy(27),yy(35),8);}}}
      else if(S.wins==='express'){const n=Math.max(1,Math.round((b2-a)/1.5)),w=(b2-a)/n;g.fillStyle=wc;for(let j=0;j<n;j++)rect(a+j*w+0.15,a+j*w+w-0.15,yy(12),yy(24),6);}
      else{const n=b2-a>4.4?2:1,w=(b2-a)/n;g.fillStyle=wc;for(let j=0;j<n;j++)rect(a+j*w+0.1,a+j*w+w-0.1,yy(12),yy(25),6);}}
    if(cab&&!emissive&&S.front!=='laview'){g.fillStyle='#10161d';rect(L/2-sp.L-1.9,L/2-sp.L-0.5,yy(11),yy(26),6);}
  }
  function disposeTrain(){train.traverse(o=>{if(o.geometry&&!o.userData.keepGeo&&o.geometry!==T_BOX)o.geometry.dispose();});if(TR)TR.sets.forEach(s=>{s.map.dispose();s.em.dispose();s.mat.dispose();});while(train.children.length)train.remove(train.children[0]);TR=null;}
  function buildTrain(S,led){
    disposeTrain();const L=carL(S),sp=NOSE_SPEC[S.front]||NOSE_SPEC.flat,dw=doorW(S);
    const mkSet=kind=>{const cm=canvas(TW,TH),ce=canvas(TW,TH),map=tex(cm,false,ANISO),em=tex(ce,false,ANISO);
      return{kind,cm,ce,map,em,mat:new THREE.MeshPhysicalMaterial({map,emissiveMap:em,emissive:0xffffff,emissiveIntensity:0,roughness:0.34,metalness:lum(S.body)>150&&lum(S.body)<230?0.35:0.05,clearcoat:0.7,clearcoatRoughness:0.12,envMapIntensity:1.15})};};
    const sets=[mkSet('head'),mkSet('mid'),mkSet('tail')],secs=cabSecs(S,L),cabGeo=loft(secs,-L/2,L),midGeo=loft([{x:-L/2,...BODY},{x:-L/2+0.25,...BODY},{x:L/2-0.25,...BODY},{x:L/2,...BODY}],-L/2,L);
    const wheelGeo=new THREE.CylinderGeometry(0.43,0.43,0.13,18).rotateX(Math.PI/2),curvy=['egg','nra','laview','slant'].includes(S.front);
    let glassGeo=null;
    if(curvy){const rng2={egg:[0.12,0.92,1.0],nra:[0.18,0.86,0.95],laview:[0.04,0.95,1.25],slant:[0.1,0.97,0.82]}[S.front],pos=[],idx=[],rows=[],K=12;
      secs.forEach(s=>{const sn=(s.x-(L/2-sp.L))/sp.L;if(sn<rng2[0]||sn>rng2[1])return;rows.push({s,w:rng2[2]*Math.pow(Math.sin(Math.PI*(sn-rng2[0])/(rng2[1]-rng2[0])*0.86+0.22),0.4)});});
      rows.forEach(({s,w})=>{const cy=(s.yb+s.yt)/2,r=(s.yt-s.yb)/2+0.02,hw=s.hw+0.02,e=2/s.n;for(let j=0;j<=K;j++){const a=Math.PI/2+w*(1-2*j/K),sn=Math.sin(a),cs=Math.cos(a);pos.push(s.x+0.012,cy+r*Math.pow(Math.abs(sn),e),hw*Math.sign(cs)*Math.pow(Math.abs(cs),e));}});
      for(let i=0;i<rows.length-1;i++)for(let j=0;j<K;j++){const a=i*(K+1)+j,q=a+K+1;idx.push(a,q+1,q, a,a+1,q+1);}
      glassGeo=new THREE.BufferGeometry();glassGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));glassGeo.setIndex(idx);glassGeo.computeVertexNormals();}
    const cars=[],leaves=[],wheels=[];
    for(let n=1;n<=S.cars;n++){
      const tail=n===S.cars&&n>1,cab=n===1||tail,set=sets[n===1?0:tail?2:1],car=new THREE.Group(),add=(geo,mat,sx,sy,sz,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);if(geo===T_BOX)m.userData.keepGeo=true;car.add(m);return m;};
      const body=new THREE.Mesh(cab?cabGeo:midGeo,set.mat);body.castShadow=true;body.receiveShadow=true;car.add(body);
      doorLocal(S,cab).forEach(d=>{[-1,1].forEach(s=>{const g=new THREE.BoxGeometry(dw/2-0.012,2.0,0.03),p=g.attributes.position,uv=g.attributes.uv,bx=d+s*dw/4;
          for(let i=0;i<p.count;i++)uv.setXY(i,(bx+p.getX(i)+L/2)/L,(2.1+p.getY(i))/4);
          const leaf=new THREE.Mesh(g,set.mat);leaf.position.set(bx,2.1,BODY.hw+0.035);leaf.userData={x:bx,dir:s,w:dw/2};car.add(leaf);leaves.push(leaf);});
        const op=new THREE.Mesh(new THREE.PlaneGeometry(dw-0.06,1.96),openMat);op.position.set(d,2.1,BODY.hw+0.012);car.add(op);
        const strip=new THREE.Mesh(new THREE.PlaneGeometry(dw-0.06,0.07),lensMat);strip.material.side=THREE.DoubleSide;strip.position.set(d,3.0,BODY.hw+0.014);car.add(strip);});
      const bxs=[-L/2+2.6,cab?L/2-sp.L-2.6:L/2-2.6];
      bxs.forEach(x=>{add(T_BOX,underMat,3.0,0.34,2.0,x,0.5,0);[-1.05,1.05].forEach(o=>[-0.56,0.56].forEach(z=>{const w=new THREE.Mesh(wheelGeo,darkMat);w.position.set(x+o,0.43,z);w.userData.keepGeo=true;car.add(w);wheels.push(w);}));});
      if(bxs[1]-bxs[0]>6)add(T_BOX,underMat,bxs[1]-bxs[0]-4.2,0.55,2.5,(bxs[0]+bxs[1])/2,0.68,0);
      [-0.24,0.2].forEach(f=>add(T_BOX,roofMat,L*0.17,0.26,1.7,L*f,BODY.yt+0.11,0).castShadow=true);
      if(n>1)add(T_BOX,darkMat,GAP+0.3,2.3,2.3,(tail?-1:1)*(L/2+GAP/2),2.25,0);
      if(!S.noPanto&&(S.panto||[2]).includes(n)){const x=n===1?-2:0,pa=(sx,sy,sz,px,py,pz,rz)=>{const m=add(T_BOX,pantoMat,sx,sy,sz,px,py,pz);if(rz)m.rotation.z=rz;m.castShadow=true;};
        pa(3.6,0.14,1.5,x,BODY.yt+0.3,0);pa(2.1,0.07,0.07,x+0.05,BODY.yt+0.72,0,0.42);pa(2.0,0.06,0.06,x+0.15,BODY.yt+1.12,0,-0.36);pa(0.1,0.06,1.5,x-0.75,5.05,0);}
      if(cab){const nw=1-sp.narrow,lx=curvy?L/2-0.02:L/2+0.012,ly=S.front==='laview'?1.25:1.45;
        if(glassGeo)car.add(new THREE.Mesh(glassGeo,glassMat));else{const w=add(T_BOX,glassMat,0.04,S.front==='agt'?1.2:1.0,2.3*nw,L/2+0.012,S.front==='agt'?2.5:2.62,0);w.userData.keepGeo=true;}
        [-0.82,0.82].forEach(z=>{const l=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),tail?tailMat:lensMat);l.scale.set(0.06,0.11,0.2);l.position.set(lx,ly,z*nw);car.add(l);});
        add(T_BOX,S.skirt?std({color:S.skirt,roughness:0.6},{}):underMat,1.3,0.6,2.5*nw,L/2-0.75,0.66,0);
        if(n===1){headGlow.position.set(L/2+0.1,ly,0.3);headGlow.scale.set(4,4,1);car.add(headGlow);}}
      if(tail)car.scale.x=-1;
      car.userData={n,c:carC(S,n)};train.add(car);cars.push(car);
    }
    TR={S,L,sets,cars,leaves,wheels,dw};repaintTrain(led);
  }
  function repaintTrain(led){if(!TR)return;TR.sets.forEach(s=>{paintCar(s.cm.getContext('2d'),TR.S,TR.L,s.kind,led,false);paintCar(s.ce.getContext('2d'),TR.S,TR.L,s.kind,led,true);s.map.needsUpdate=true;s.em.needsUpdate=true;});}

  /* ---------- ひと ---------- */
  const PG={leg:new THREE.BoxGeometry(0.13,0.82,0.15).translate(0,-0.41,0),torso:new THREE.CylinderGeometry(0.17,0.2,0.62,10),head:new THREE.SphereGeometry(0.105,12,10),
    hair:new THREE.SphereGeometry(0.112,12,8,0,Math.PI*2,0,Math.PI*0.55),arm:new THREE.BoxGeometry(0.085,0.58,0.1).translate(0,-0.29,0),bag:new THREE.BoxGeometry(0.34,0.52,0.22),pack:new THREE.BoxGeometry(0.3,0.42,0.16),cap:new THREE.CylinderGeometry(0.115,0.12,0.09,14),brim:new THREE.BoxGeometry(0.2,0.02,0.1),hand:new THREE.SphereGeometry(0.055,8,6)};
  const persons=new Map();
  function makePerson(p){
    const L=p.look,g=new THREE.Group(),mk=c=>new THREE.MeshStandardMaterial({color:c,roughness:0.85}),ms={skin:mk(L.skin),shirt:mk(L.shirt),pants:mk(L.pants),hair:mk(L.hair),bag:mk(L.bag===1?'#4a546a':'#6b5238')};
    const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
    const legL=add(PG.leg,ms.pants,-0.09,0.82,0),legR=add(PG.leg,ms.pants,0.09,0.82,0);
    add(PG.torso,ms.shirt,0,1.13,0).scale.z=0.62;add(PG.head,ms.skin,0,1.57,0);add(PG.hair,ms.hair,0,1.585,-0.012);
    const armL=add(PG.arm,ms.shirt,-0.235,1.4,0),armR=add(PG.arm,ms.shirt,0.235,1.4,0);
    if(p.driver||p.crew){ms.cap=mk('#172a49');ms.glove=mk('#f4f4f0');add(PG.cap,ms.cap,0,1.685,0);add(PG.brim,ms.cap,0,1.655,0.1);[armL,armR].forEach(a=>{const h=new THREE.Mesh(PG.hand,ms.glove);h.position.y=-0.6;a.add(h);});}
    if(L.bag===1)add(PG.bag,ms.bag,0.36,0.28,0.05);else if(L.bag===2)add(PG.pack,ms.bag,0,1.16,-0.2);
    g.scale.setScalar(L.h*1.02);g.userData={ms:Object.values(ms),legL,legR,armL,armR,rz:fract(L.h*37.7+p.sx*0.001)};scene.add(g);return g;
  }
  function syncPeople(S,list,pos){
    const seen=new Set();
    for(const p of list){
      if(p.a<=0.02||Math.abs(p.X-pos)>3600)continue;
      let g=persons.get(p);if(!g){g=makePerson(p);persons.set(p,g);}seen.add(p);
      const ud=g.userData,z0=NEAR_Z+0.95+ud.rz*1.7,zd=NEAR_Z+0.3,door=p.door==null?p.X:p.door,dd=Math.abs(p.X-door),zf=Math.min(1,dd/16),base=ry(p.sx)+PT;
      let z=lerp(zd,z0,zf),y=base,rot=Math.PI,op=1;
      const walking=p.kind==='toDoor'||p.kind==='away',sw=walking?Math.sin(p.ph)*0.55:0;
      if(p.kind==='inside'){g.visible=false;continue;}
      g.visible=true;
      if(p.kind==='exit'){z=zd-(1-p.a)*1.1;y=base+0.05*(1-p.a);rot=0;}
      else if(p.kind==='enter'){z=zd-(1-p.a)*1.1;y=base+0.05*(1-p.a);}
      else if(p.kind==='toDoor'){const dx=door-p.X;rot=Math.atan2(dx*U,zd-z-0.4);if(p.driver)op=p.a;}
      else if(p.kind==='away'){rot=Math.atan2(p.dir,0.12);op=p.a;}
      else if(p.kind==='platformCrew'){z=NEAR_Z+1.5;rot=-Math.PI/2;}
      else if(p.kind==='driverWait'){z=NEAR_Z+1.0;op=p.a;}
      g.position.set((p.X-pos)*U,y,z);g.rotation.set(0,rot,0);
      ud.legL.rotation.x=sw;ud.legR.rotation.x=-sw;ud.armL.rotation.set(-sw*0.7,0,0);ud.armR.rotation.set(sw*0.7,0,0);
      if(p.crew&&p.signaling)ud.armR.rotation.set(0,0,2.75);
      if(p.kind==='stumble'){g.rotation.set(0,p.fallDir>0?Math.PI/2:-Math.PI/2,0);g.rotateX(Math.PI*0.44*G.stumblePose(p.t));}
      if(p.kind==='missed'){g.rotation.y=Math.PI+p.fallDir*0.5;if(p.departed){ud.armR.rotation.set(0,0,2.5+(S.reduced?0:Math.sin(p.leaveT*9)*0.35));}else ud.armR.rotation.set(-1.2,0,0.3);}
      ud.ms.forEach(m=>{const tr=op<0.999;if(m.transparent!==tr){m.transparent=tr;m.needsUpdate=true;}m.opacity=op;});
    }
    for(const [p,g] of persons)if(!seen.has(p)){scene.remove(g);g.userData.ms.forEach(m=>m.dispose());persons.delete(p);}
  }

  /* ---------- まいフレーム ---------- */
  const cTop=new THREE.Color(),cBot=new THREE.Color(),cFog=new THREE.Color(),cTmp=new THREE.Color(),cDark=new THREE.Color(0x07090c),sunDir=new THREE.Vector3(),camP=new THREE.Vector3(-15,3.3,11.8),camL=new THREE.Vector3(9,2,0),tP=new THREE.Vector3(),tL=new THREE.Vector3();
  let tf=0,ugF=0,seaF=0,lastT=0,camInit=false,slowN=0,frameN=0,accT=0,lastPos=null,loading=false,loadTotal=1,wasTitle=false,titleT=0;
  const TITLE_V=420,TITLE_RUN=2600,NOBODY=[];
  function resize(){
    const r=cv.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    if(w===W&&h===H)return;W=w;H=h;renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.fov=clamp(2*Math.atan(Math.tan(36*Math.PI/180)/camera.aspect)*180/Math.PI,36,74);camera.updateProjectionMatrix();
  }
  function render(S){
    resize();
    const dt=clamp(S.t-lastT,0,0.1);lastT=S.t;
    /* タイトルの あいだは、いまの えきの さきを はしる ようすを 3つの カメラで くりかえし うつす */
    const title=!!S.title;if(title!==wasTitle){wasTitle=title;camInit=false;titleT=0;}
    if(title)titleT+=dt;
    const run=titleT*TITLE_V,cut=Math.floor(run/TITLE_RUN)%3,cutU=(run%TITLE_RUN)/TITLE_RUN;
    const pos=title?S.pos+600+run%TITLE_RUN:S.pos,pm=pos*U,k=G.kAt(pos),v=title?TITLE_V:S.v;
    if(S.world!==world||S.seed!==seed){world=S.world;seed=S.seed;clearWorld();camInit=false;farCur='';}
    if(!title&&lastPos!==null&&Math.abs(pos-lastPos)>4000)camInit=false;lastPos=pos;
    const S0=G.ser(),led=G.led(),lk=led.join('|');
    if(S0.id!==trainKey){trainKey=S0.id;ledKey=lk;buildTrain(S0,led);}else if(lk!==ledKey){ledKey=lk;repaintTrain(led);}
    /* けしきを よういする。たくさん たりない ときは つくり おわるまで えを とめて、すすみぐあいを かえす */
    {const anchor=S.pos,span=title?TITLE_RUN+600:0,i0=Math.floor((anchor-17500)/CH),i1=Math.floor((anchor+9500+span)/CH),want=[],sj=[];
      for(let i=i0;i<=i1;i++)if(!chunks.has(i))want.push(i);want.sort((a,b)=>Math.abs((a+0.5)*CH-pos)-Math.abs((b+0.5)*CH-pos));
      for(let j=G.kAt(anchor-17000);j<=G.kAt(anchor+9500+span)+1;j++)if(!stations.has(j))sj.push(j);
      const core=want.filter(i=>(i+1)*CH>pos-9000&&i*CH<pos+7000).length+sj.length;
      if(!loading&&core>0&&(!camInit||core>=3)){loading=true;loadTotal=want.length+sj.length;}
      if(loading){
        const t0=performance.now();
        do{if(sj.length){const j=sj.shift();stations.set(j,buildStation(j));}else if(want.length){const i=want.shift();chunks.set(i,buildChunk(i));}}while((sj.length||want.length)&&performance.now()-t0<14);
        const rem=sj.length+want.length;if(rem>0)return 1-rem/Math.max(loadTotal,rem);
        loading=false;
      }else if(sj.length)stations.set(sj[0],buildStation(sj[0]));
      else if(want.length)chunks.set(want[0],buildChunk(want[0]));
      const blink=S.reduced?-1:Math.floor(S.t*2.4)%2;
      for(const [i,g] of chunks){if(i<i0-1||i>i1+1){freeGroup(g);chunks.delete(i);continue;}g.position.x=i*CHM-pm;
        for(const it of g.userData.cross){const near=Math.abs(it.X-pos)<1600||Math.abs(it.X-pos-290)<1600;
          it.la.forEach(l=>{l.material=near&&(blink<0||blink===0)?redOn:redOff;});it.lb.forEach(l=>{l.material=near&&(blink<0||blink===1)?redOn:redOff;});
          it.arms.forEach(p=>{const tg=near?0:1.45,cur=Math.abs(p.rotation.z),nx=camInit?cur+clamp(tg-cur,-dt*1.6,dt*1.6):tg;p.rotation.z=p.userData.dir*nx;});}}
      const clock=600-(S.reduced?0:S.t)/60;
      for(const [j,g] of stations){const Xj=G.X(j);if(Math.abs(Xj-anchor)>32000){freeGroup(g);stations.delete(j);continue;}g.position.set(Xj*U-pm,ry(Xj),0);
        const pd=g.userData.pd;if(pd.leaves.length){const o=G.platOpen(j,pd.status);pd.leaves.forEach(m=>{m.position.x=m.userData.base+m.userData.dir*o*m.userData.w*0.96;});}
        if(g.userData.hands)[clock/720,clock/60,clock].forEach((a,n)=>{g.userData.hands[n].rotation.z=-a*Math.PI*2;});}}
    /* そら・ひかり */
    const night=S.night,dayM=S.dayM,yT=ry(pos);cTop.set(S.skyTop);cBot.set(S.skyBot);
    const f=clamp((dayM-330)/780,0,1),el=Math.sin(f*Math.PI),up=dayM>330&&dayM<1110;
    sunDir.set(-Math.cos(f*Math.PI)*0.95,el*0.95+0.035,0.62*el-0.34).normalize();
    const warm=clamp(1-el*1.7,0,1);cTmp.setRGB(1,lerp(0.96,0.58,warm),lerp(0.9,0.28,warm));
    skyU.top.value.copy(cTop);skyU.bot.value.copy(cBot);skyU.sunDir.value.copy(sunDir);skyU.sunCol.value.copy(cTmp);skyU.sunK.value=up?clamp(1.15-night,0,1):0;
    const ft=G.feat(k),inT=pos>=ft.t0&&pos<=ft.t1?1:0,ugNow=inT&&ft.ug?1:0;
    tf+=(inT-tf)*Math.min(1,dt*2.5);ugF=camInit?ugF+clamp(ugNow-ugF,-dt*2.5,dt*2.5):ugNow;
    const sunI=up?3.4*Math.pow(clamp(1-night,0,1),1.3)*clamp(el*3+0.12,0,1):0,moonI=0.5*night;
    sun.target.position.set(-45,yT,-2);
    if(sunI>=moonI){sun.color.copy(cTmp);sun.intensity=sunI*(1-0.93*tf);sun.position.copy(sunDir).multiplyScalar(320).add(sun.target.position);}
    else{sun.color.setRGB(0.62,0.72,1);sun.intensity=moonI*(1-0.9*tf);sun.position.set(-150,240,180).add(sun.target.position);}
    hemi.color.copy(cTop).lerp(cBot,0.5);hemi.groundColor.setRGB(0.3,0.33,0.24);hemi.intensity=lerp(0.32,0.14,night)*(1-0.6*tf);
    cFog.copy(cBot).lerp(cTop,0.25).lerp(cDark,ugF);scene.fog.color.copy(cFog);scene.fog.near=lerp(60,8,ugF);scene.fog.far=lerp(lerp(22000,15000,night),260,ugF);
    scene.environmentIntensity=lerp(0.85,0.55,night)*(1-0.7*tf);
    renderer.toneMappingExposure=lerp(0.92,1.05,night);
    const ek=Math.round(dayM/8)+'|'+Math.round(night*12);
    if(ek!==envKey&&S.t-envT>1.2){envKey=ek;envT=S.t;const rt=pmrem.fromScene(envScene,0,1,60000);scene.environment=rt.texture;if(envRT)envRT.dispose();envRT=rt;}
    const open=ugF<0.5;sky.visible=open;
    sky.position.copy(camera.position);stars.position.copy(camera.position);stars.material.opacity=clamp((night-0.3)*1.3,0,1);stars.visible=open&&night>0.3;
    moon.material.opacity=night;moon.visible=open&&night>0.05;
    cTmp.setRGB(1,1,1).lerp(cBot,0.35*warm+0.1).multiplyScalar(lerp(1,0.16,night));cloudMat.forEach(m=>{m.color.copy(cTmp);m.opacity=lerp(0.92,0.55,night);});
    clouds.forEach(c=>{const u=c.userData,x=((u.x-pm*0.5+(S.reduced?0:S.t*u.sp))%52000+78000)%52000-26000;c.position.set(x,u.y,u.z);c.visible=open;});
    ground.position.y=GY-0.12-ugF*(DEPTH+4);
    const lampK=sstep(0.35,0.6,night);
    M.bldg.emissiveIntensity=M.bldgFar.emissiveIntensity=lampK*1.1;M.win.emissiveIntensity=lampK*0.9;M.nlamp.emissiveIntensity=lampK*2.2+tf*0.5;
    stations.forEach(g=>{g.userData.signMat.emissiveIntensity=0.12+Math.max(lampK,ugF)*0.75;});
    const kn=G.kNear(pos),ns=G.X(kn)*U-pm;stLamp.position.set(clamp(ns-6,-60,60),yT+PT+3.4,-2.5);stLamp.intensity=Math.abs(ns)<140?Math.max(lampK,G.isUG(kn)?1:0)*260:0;
    tunLamp.position.set(8,yT+6.6,-1.5);tunLamp.intensity=tf*230;
    /* れっしゃ：1りょうずつ せんろの たかさと かたむきに あわせる */
    const door=title?0:S.doorAnim,lit=title?(inT>0||night>0.45):S.lit,TRn=TR;
    TRn.sets.forEach(s=>{s.mat.emissiveIntensity=lit?1.25:0;});
    const dy=(!S.reduced&&v>1)?Math.sin(S.t*31)*0.006*(v/S.MAXV):0,span=0.4*TRn.L/U;
    TRn.cars.forEach(c=>{const X=pos+c.userData.c/U;c.position.set(c.userData.c,ry(X)+dy,0);c.rotation.z=Math.atan2(ry(X+span)-ry(X-span),0.8*TRn.L);});
    const yH=TRn.cars[0].position.y;headLamp.position.set(HEAD_X1-0.5,yH+1.4,0);headLamp.target.position.set(HEAD_X1+60,yH-0.4,0);
    headLamp.intensity=lit?900:0;headGlow.material.opacity=lit?0.95:0.1;
    TRn.leaves.forEach(l=>{l.position.x=l.userData.x+l.userData.dir*door*l.userData.w*0.97;l.position.z=BODY.hw+0.035+Math.min(1,door*6)*0.03;});
    const ang=-pm/0.43;TRn.wheels.forEach(w=>{w.rotation.z=ang;});
    syncPeople(S,title?NOBODY:S.people,pos);
    /* とおくの けしき */
    const sc=G.sceneFor(k),key=sc.far||'rolling';if(key!==farCur){farCur=key;layer(key);}
    const lake=key==='lake'?1:0,rate=dt/2.6;
    for(const kk in LAYERS){const g=LAYERS[kk],ud=g.userData,tg=kk==='mid'?1-lake:(kk===farCur?1:0);
      ud.w=camInit?clamp(ud.w+Math.sign(tg-ud.w)*rate,0,1):tg;g.visible=open&&ud.w>0.004;if(!g.visible)continue;
      ud.mats.forEach(m=>{m.opacity=ud.w;const tr=ud.w<0.999;if(m.transparent!==tr){m.transparent=tr;m.needsUpdate=true;}});
      g.position.x=-(((pm%ud.L)+ud.L)%ud.L)-(kk==='mid'?0:3000);
      if(ud.cone){const cyc=5400,ph=((pm%cyc)+cyc)%cyc-cyc/2;ud.cone.position.x=-g.position.x+ud.cone.position.z*1.9-ph*(ud.cone.position.z<-2000?1.6:0.5);}}
    seaF+=(lake-seaF)*Math.min(1,dt*0.5);if(!camInit)seaF=lake;farSeaMat.opacity=seaF;farSea.visible=open&&seaF>0.01;
    groundTex.offset.x=fract(pm/20);M.water.normalMap.offset.set(fract(S.t*0.012),fract(S.t*0.02));
    /* カメラ：とまって いる ときは ホームの うしろ ななめから ドアと せんとうを みる。はやく なると まえに まわって ひいて みる */
    const sf=sstep(0,1,v/S.MAXV*1.5),nar=clamp((1.5-camera.aspect)/0.9,0,1);
    tP.set(lerp(-13,46,sf)+nar*(sf*4-3),lerp(3.2,6.2,sf),lerp(11.8,29,sf)+nar*8);tL.set(lerp(11,-9,sf)-nar*2*sf,lerp(2.0,2.4,sf),0);
    if(title){const u=cutU;
      if(cut===0){tP.set(47-u*7,1.5+u*0.7,8.6);tL.set(14,2.3,0);}
      else if(cut===1){tP.set(-26+u*22,6+u*0.5,44+nar*14);tL.set(-16+u*10,2,0);}
      else{tP.set(-72+u*16,4.4+u*0.5,8.6-u*1.4);tL.set(14,2.5,0);}
      camP.copy(tP);camL.copy(tL);camInit=true;}
    else if(!camInit){camP.copy(tP);camL.copy(tL);camInit=true;}
    else{const q=1-Math.exp(-dt*1.1);camP.lerp(tP,q);camL.lerp(tL,q);}
    camera.position.copy(camP);camera.position.y+=yT;
    if(!S.reduced&&v>1){const a=v/S.MAXV*0.018;camera.position.y+=Math.sin(S.t*17.3)*a;camera.position.z+=Math.sin(S.t*11.1)*a*0.6;}
    tL.copy(camL);tL.y+=yT;camera.lookAt(tL);
    renderer.render(scene,camera);
    /* おもい ときは かいぞうどを さげる */
    accT+=dt;frameN++;if(frameN>=90){const avg=accT/frameN;frameN=0;accT=0;
      if(avg>0.031&&pixelRatio>1){slowN++;if(slowN>=2){pixelRatio=Math.max(1,pixelRatio-0.5);W=0;slowN=0;}}else slowN=0;}
    return 1;
  }
  function dispose(){
    clearWorld();disposeTrain();for(const [,g] of persons){scene.remove(g);}persons.clear();
    scene.traverse(o=>{if(o.geometry)o.geometry.dispose();const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(m=>{for(const kk in m){const v=m[kk];if(v&&v.isTexture)v.dispose();}m.dispose();});});
    if(envRT)envRT.dispose();pmrem.dispose();renderer.dispose();
  }
  return {render,resize:()=>{W=0;},dispose,renderer,_dbg:{scene,camera,camP,camL,snap(){camInit=false;}}};
}
