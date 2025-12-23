
import React, { useRef, useMemo, useContext, useState, useEffect } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial, Text, Line } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import { TreeContext, ParticleData, TreeContextType } from '../types';

// --- 增强版树叶材质 - 带雪花点缀和更自然的渐变 ---
const FoliageMaterial = shaderMaterial(
  { 
    uTime: 0, 
    uColorBase: new THREE.Color('#0a1f0d'),      // 深绿色底色
    uColorMid: new THREE.Color('#1b4d2e'),       // 中绿色
    uColorTip: new THREE.Color('#4caf50'),       // 亮绿色尖端
    uColorSnow: new THREE.Color('#e8f4f8'),      // 雪白色
    uPixelRatio: 1 
  },
  // Vertex Shader - 增强版
  `
    uniform float uTime;
    uniform float uPixelRatio;
    attribute float size;
    varying vec3 vPosition;
    varying float vBlink;
    varying float vHeight;
    varying float vSnowChance;
    
    // 柔和的噪声扰动
    vec3 curl(float x, float y, float z) {
      float eps = 1.0;
      vec3 curl = vec3(0.0);
      float n1 = sin(y + cos(z + uTime * 0.3));
      float n2 = cos(x + sin(z + uTime * 0.3));
      curl.x = (n1 - n2) * 0.08;
      n1 = sin(z + cos(x + uTime * 0.3));
      n2 = cos(y + sin(x + uTime * 0.3));
      curl.y = (n1 - n2) * 0.05;
      curl.z = (n1 - n2) * 0.08;
      return curl;
    }
    
    void main() {
      vPosition = position;
      vHeight = (position.y + 7.5) / 16.0; // 归一化高度 0-1
      
      // 雪花概率 - 顶部和外围更多雪
      float distFromCenter = length(position.xz);
      vSnowChance = smoothstep(0.3, 1.0, vHeight) * 0.4 + 
                    smoothstep(2.0, 8.0, distFromCenter) * 0.3 +
                    fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.3;
      
      vec3 distortedPosition = position + curl(position.x, position.y, position.z);
      vec4 mvPosition = modelViewMatrix * vec4(distortedPosition, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // 粒子大小随高度变化 - 顶部更小更尖
      float sizeMultiplier = mix(1.2, 0.6, vHeight);
      gl_PointSize = size * uPixelRatio * sizeMultiplier * (90.0 / -mvPosition.z);
      
      vBlink = sin(uTime * 1.5 + position.y * 3.0 + position.x * 2.0);
    }
  `,
  // Fragment Shader - 增强版
  `
    uniform vec3 uColorBase;
    uniform vec3 uColorMid;
    uniform vec3 uColorTip;
    uniform vec3 uColorSnow;
    uniform float uTime;
    varying float vBlink;
    varying float vHeight;
    varying float vSnowChance;
    
    void main() {
      vec2 xy = gl_PointCoord.xy - vec2(0.5);
      float ll = length(xy);
      if (ll > 0.5) discard;
      
      // 柔和的圆形渐变
      float strength = pow(1.0 - ll * 2.0, 2.5);
      
      // 基于高度的颜色渐变
      vec3 greenColor = mix(uColorBase, uColorMid, smoothstep(0.0, 0.4, vHeight));
      greenColor = mix(greenColor, uColorTip, smoothstep(0.4, 0.9, vHeight));
      
      // 呼吸闪烁效果
      float blink = smoothstep(-0.5, 0.5, vBlink) * 0.3 + 0.7;
      greenColor *= blink;
      
      // 雪花效果 - 部分粒子显示为白色
      float snowThreshold = 0.75;
      vec3 finalColor = vSnowChance > snowThreshold ? uColorSnow : greenColor;
      float snowBrightness = vSnowChance > snowThreshold ? 1.2 : 1.0;
      
      gl_FragColor = vec4(finalColor * snowBrightness, strength * 0.9);
    }
  `
);
extend({ FoliageMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    foliageMaterial: any
    shimmerMaterial: any
    fairyLightMaterial: any
  }
}

// --- 彩灯材质 - 多彩闪烁效果 ---
const FairyLightMaterial = shaderMaterial(
  {
    uTime: 0,
    uColors: [
      new THREE.Color('#ff4444'), // 红
      new THREE.Color('#ffaa00'), // 金
      new THREE.Color('#44ff44'), // 绿
      new THREE.Color('#4444ff'), // 蓝
      new THREE.Color('#ff44ff'), // 粉
      new THREE.Color('#ffffff'), // 白
    ]
  },
  // Vertex
  `
    varying float vIndex;
    attribute float lightIndex;
    void main() {
      vIndex = lightIndex;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    uniform float uTime;
    uniform vec3 uColors[6];
    varying float vIndex;
    
    void main() {
      int colorIdx = int(mod(vIndex, 6.0));
      vec3 color = uColors[colorIdx];
      
      // 闪烁效果 - 每个灯不同相位
      float twinkle = sin(uTime * 3.0 + vIndex * 1.7) * 0.5 + 0.5;
      twinkle = pow(twinkle, 0.5); // 更亮的闪烁
      
      float intensity = 0.6 + twinkle * 0.4;
      
      gl_FragColor = vec4(color * intensity, 1.0);
    }
  `
);
extend({ FairyLightMaterial });

// --- Shimmer Material ---
const ShimmerMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#ffffff') },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      // 扫光条纹位置，周期性移动
      float pos = mod(uTime * 0.8, 2.5) - 0.5;
      // 计算条纹强度 (倾斜)
      float bar = smoothstep(0.0, 0.2, 0.2 - abs(vUv.x + vUv.y * 0.5 - pos));

      // 基础透明度 0，扫光处透明度降低以减少对照片的影响
      float alpha = bar * 0.05;

      gl_FragColor = vec4(uColor, alpha);
    }
  `
);
extend({ ShimmerMaterial });

// --- Photo Component ---
const PolaroidPhoto: React.FC<{ url: string; position: THREE.Vector3; rotation: THREE.Euler; scale: number; id: string; shouldLoad: boolean; year: number }> = ({ url, position, rotation, scale, id, shouldLoad, year }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadStatus, setLoadStatus] = useState<'pending' | 'loading' | 'local' | 'fallback'>('pending');


  useEffect(() => {
    if (!shouldLoad || loadStatus !== 'pending') return;

    setLoadStatus('loading');
    const loader = new THREE.TextureLoader();

    // 先尝试加载本地照片
    loader.load(
      url,
      (tex) => {
        // 本地照片加载成功
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        setTexture(tex);
        setLoadStatus('local');
        console.log(`✅ Successfully loaded local image: ${url}`, {
          width: tex.image?.width,
          height: tex.image?.height,
          format: tex.format,
          type: tex.type
        });
      },
      undefined, // onProgress
      (error) => {
        // 本地照片加载失败，使用 Picsum 随机照片
        console.warn(`⚠️ Local image not found: ${url}, loading random photo...`);
        const seed = id.split('-')[1] || '55';
        const fallbackUrl = `https://picsum.photos/seed/${parseInt(seed) + 100}/400/500`;

        loader.load(
          fallbackUrl,
          (fbTex) => {
            fbTex.colorSpace = THREE.SRGBColorSpace;
            fbTex.wrapS = THREE.ClampToEdgeWrapping;
            fbTex.wrapT = THREE.ClampToEdgeWrapping;
            fbTex.needsUpdate = true;
            setTexture(fbTex);
            setLoadStatus('fallback');
            console.log(`✅ Loaded fallback image for ${url}`);
          },
          undefined,
          (fallbackError) => {
            console.error(`❌ Failed to load both local and fallback images for ${url}`, fallbackError);
          }
        );
      }
    );
  }, [url, id, shouldLoad, loadStatus]);

  return (
    <group position={position} rotation={rotation} scale={scale * 1.2}>
      {/* 相框边框 - 白色边框 */}
      <mesh position={[0, 0, 0]} userData={{ photoId: id, photoUrl: url }}>
        <boxGeometry args={[1, 1.25, 0.02]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      {/* 照片内容 - 方案1: meshStandardMaterial */}
      <mesh position={[0, 0.15, 0.015]} userData={{ photoId: id, photoUrl: url }}>
        <planeGeometry args={[0.9, 0.9]} />
        {texture ? (
          <meshStandardMaterial
            key={texture.uuid}
            map={texture}
            roughness={0.5}
            metalness={0.0}
          />
        ) : (
          <meshStandardMaterial color="#333" />
        )}
      </mesh>
      {/* 扫光效果覆盖层 */}
      <mesh position={[0, 0.15, 0.02]} scale={[0.9, 0.9, 1]}>
        <planeGeometry args={[1, 1]} />
        <shimmerMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// --- Main Tree System ---
const TreeSystem: React.FC = () => {
  const { state, rotationSpeed, rotationBoost, pointer, clickTrigger, setSelectedPhotoUrl, selectedPhotoUrl, panOffset } = useContext(TreeContext) as TreeContextType;
  const { camera, raycaster } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const progress = useRef(0);
  const treeRotation = useRef(0);

  // 用于平滑过渡 Pan
  const currentPan = useRef({ x: 0, y: 0 });

  // Staggered Loading State
  const [loadedCount, setLoadedCount] = useState(0);

  const [photoObjects, setPhotoObjects] = useState<{ id: string; url: string; ref: React.MutableRefObject<THREE.Group | null>; data: ParticleData; pos: THREE.Vector3; rot: THREE.Euler; scale: number; }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadedCount(prev => {
        if (prev >= photoObjects.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1; // Load 1 photo per tick (smoother)
      });
    }, 100); // 100ms interval
    return () => clearInterval(interval);
  }, [photoObjects.length]);

  // --- Data Generation ---
  const { foliageData, photosData, lightsData } = useMemo(() => {
    const particleCount = 7000;
    const foliage = new Float32Array(particleCount * 3); const foliageChaos = new Float32Array(particleCount * 3); const foliageTree = new Float32Array(particleCount * 3); const sizes = new Float32Array(particleCount);
    const sphere = random.inSphere(new Float32Array(particleCount * 3), { radius: 18 }); for (let i = 0; i < particleCount * 3; i++) foliageChaos[i] = sphere[i];
    
    for (let i = 0; i < particleCount; i++) { 
      const i3 = i * 3; 
      // Height from 0 to 16
      const h = Math.random() * 16;
      // Wider base
      const maxR = (16 - h) * 0.6; 
      // Fill volume but bias towards outside
      const r = Math.pow(Math.random(), 0.3) * maxR; 
      const angle = Math.random() * Math.PI * 2; 
      
      // Add subtle spiral branch clustering
      const spiralOffset = Math.sin(h * 0.5 + angle * 4) * 0.2;
      
      foliageTree[i3] = Math.cos(angle) * (r + spiralOffset); 
      foliageTree[i3 + 1] = h - 7.5; // Center vertically
      foliageTree[i3 + 2] = Math.sin(angle) * (r + spiralOffset); 
      sizes[i] = Math.random() * 1.5 + 0.5; 
    }

    const lightCount = 400;
    const lightChaos = new Float32Array(lightCount * 3); const lightTree = new Float32Array(lightCount * 3); const lSphere = random.inSphere(new Float32Array(lightCount * 3), { radius: 20 });
    for (let i = 0; i < lightCount * 3; i++) lightChaos[i] = lSphere[i];
    
    for (let i = 0; i < lightCount; i++) { 
      const i3 = i * 3; 
      const t = i / lightCount; 
      // Spiral placement for lights
      const h = t * 15; 
      const r = (16 - h) * 0.65; // Place on surface
      const angle = t * Math.PI * 30; // More windings
      
      lightTree[i3] = Math.cos(angle) * r; 
      lightTree[i3 + 1] = h - 7.5; 
      lightTree[i3 + 2] = Math.sin(angle) * r; 
    }

    // 实际存在的照片文件列表
    const photoFiles = [
      "2024_06_1.jpg", "2024_07_1.jpg", "2024_07_2.jpg",
      "2024_09_1.jpg", "2024_09_2.jpg", "2024_09_3.jpg",
      "2024_09_4.jpg", "2024_09_5.jpg", "2024_09_6.jpg",
      "2024_10_1.jpg", "2024_11_1.jpg", "2024_12_1.jpg",
      "2024_12_2.jpg", "2024_12_3.jpg", "2025_01_1.jpg",
      "2025_01_2.jpg", "2025_01_3.jpg", "2025_01_4.jpg",
      "2025_01_5.jpg", "2025_01_6.jpg", "2025_01_7.jpg",
      "2025_02_1.jpg", "2025_05_1.jpg", "2025_06_1.jpg",
      "2025_06_2.jpg", "2025_06_3.jpg", "2025_09_1.jpg",
      "2025_10_1.jpg", "2025_10_2.jpg", "2025_11_1.jpg",
      "2025_11_2.jpg"
    ];

    // 按时间排序
    photoFiles.sort();

    const photoCount = photoFiles.length;
    const photos: ParticleData[] = [];

    for (let i = 0; i < photoCount; i++) {
      const fileName = photoFiles[i];
      // 解析文件名: YYYY_MM_ID.jpg
      const parts = fileName.split('_');
      const year = parseInt(parts[0]);
      const month = parts[1]; // Keep as string "02"

      // --- FORMED: Time Spiral Layout ---
      // 螺旋上升: i 越大 (越新)，h 越高
      const t = i / (photoCount - 1);
      const h = t * 15 - 7; // Height range -7 to 8
      // Adjust radius to match new tree shape (wider base)
      // Tree surface: R = (8.5 - y) * 0.6
      // Photo radius: slightly larger to float on top
      const radius = (8.5 - h) * 0.65 + 0.5; 
      const angle = t * Math.PI * 10; // 5 loops

      const treeX = Math.cos(angle) * radius;
      const treeY = h;
      const treeZ = Math.sin(angle) * radius;

      // --- CHAOS: Fibonacci Sphere Layout (Even Distribution) ---
      // 使用斐波那契球体分布，确保照片均匀分布，减少重叠

      // 黄金角度
      const phi = Math.acos(1 - 2 * (i + 0.5) / photoCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      // 基础半径 (稍微随机化一点，避免完全在一个球面上)
      const r = 12 + Math.random() * 4;

      const chaosX = r * Math.sin(phi) * Math.cos(theta);
      const chaosY = r * Math.sin(phi) * Math.sin(theta) * 0.6; // Y轴压扁一点，形成椭球
      const chaosZ = r * Math.cos(phi);

      const imageUrl = `./photos/${fileName}`;

      photos.push({
        id: `photo-${i}`,
        type: 'PHOTO',
        year: year,
        month: month,
        chaosPos: [chaosX, chaosY, chaosZ],
        treePos: [treeX, treeY, treeZ],
        chaosRot: [
          (Math.random() - 0.5) * 0.2, // X: 微小随机倾斜
          0 + (Math.random() - 0.5) * 0.2, // Y: 正面朝向 (0) + 微扰
          (Math.random() - 0.5) * 0.1 // Z: 微小倾斜
        ],
        treeRot: [0, -angle + Math.PI / 2, 0], // 面向外
        scale: 0.9 + Math.random() * 0.3,
        image: imageUrl,
        color: 'white'
      });
    }
    return { foliageData: { current: foliage, chaos: foliageChaos, tree: foliageTree, sizes }, photosData: photos, lightsData: { chaos: lightChaos, tree: lightTree, count: lightCount } };
  }, []);

  useEffect(() => {
    setPhotoObjects(photosData.map(p => ({ id: p.id, url: p.image!, ref: React.createRef(), data: p, pos: new THREE.Vector3(), rot: new THREE.Euler(), scale: p.scale })));
  }, [photosData]);

  // --- 处理点击事件 ---
  // --- 处理点击事件 (Screen-Space Distance Selection) ---
  const photoOpenTimeRef = useRef<number>(0);

  useEffect(() => {
    if (state === 'CHAOS' && pointer) {
      // 如果已经有选中的照片，检查是否需要关闭
      if (selectedPhotoUrl) {
        // 检查锁定时间 (增加到 3 秒)
        if (Date.now() - photoOpenTimeRef.current < 3000) {
          return; // 锁定期间禁止关闭
        }

        // 点击任意位置关闭 (除了照片本身，但这里简化为再次点击关闭)
        // 实际上 App.tsx 里的 PhotoModal 遮罩层点击也会触发 setSelectedPhotoUrl(null)
        // 这里主要处理点击"空地"的情况

        // 重新计算是否点到了照片 (为了避免误触关闭)
        // 但根据需求"单指照片可以精准选中并关闭了"，说明用户希望点击照片也能关闭?
        // 现在的逻辑是: 如果有点到照片 -> 切换; 如果没点到 -> 关闭

        // 让我们简化逻辑: 只要过了2秒，点击任何地方都尝试关闭或切换
        // 但为了防止误触，我们还是检测一下

        // ... (保持原有检测逻辑，但增加关闭逻辑)
      }

      // 1. 转换 Pointer 到 NDC (-1 to 1)
      const ndcX = pointer.x * 2 - 1;
      const ndcY = -(pointer.y * 2) + 1;

      // 2. 遍历所有照片，计算屏幕空间距离
      let closestPhotoId: string | null = null;
      let minDistance = Infinity;
      const SELECTION_THRESHOLD = 0.05; // Reduced from 0.15 to 0.05 for higher precision

      photoObjects.forEach(obj => {
        if (!obj.ref.current) return;

        // 获取照片世界坐标
        const worldPos = new THREE.Vector3();
        obj.ref.current.getWorldPosition(worldPos);

        // 投影到屏幕空间
        const screenPos = worldPos.clone().project(camera);

        // 检查是否在相机前方 (z < 1)
        if (screenPos.z < 1) {
          // 计算 NDC 距离
          const dist = Math.hypot(screenPos.x - ndcX, screenPos.y - ndcY);

          if (dist < SELECTION_THRESHOLD && dist < minDistance) {
            minDistance = dist;
            closestPhotoId = obj.data.image!;
          }
        }
      });

      if (closestPhotoId) {
        // 如果点击的是当前照片，且过了锁定时间 -> 关闭
        if (selectedPhotoUrl === closestPhotoId) {
          if (Date.now() - photoOpenTimeRef.current > 3000) {
            setSelectedPhotoUrl(null);
          }
        } else {
          // 选中新照片
          setSelectedPhotoUrl(closestPhotoId);
          photoOpenTimeRef.current = Date.now(); // 记录打开时间
        }
      } else if (selectedPhotoUrl) {
        // Clicked on empty space -> Close photo (if not locked)
        if (Date.now() - photoOpenTimeRef.current > 3000) {
          setSelectedPhotoUrl(null);
        }
      }
    }
  }, [clickTrigger]); // Remove selectedPhotoUrl dependency to avoid double-firing loop

  // --- Animation Loop ---
  useFrame((state3d, delta) => {
    const targetProgress = state === 'FORMED' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 2.0, delta);
    const ease = progress.current * progress.current * (3 - 2 * progress.current);
    treeRotation.current += (state === 'FORMED' ? (rotationSpeed + rotationBoost) : 0.05) * delta;

    // 应用平移 (带阻尼)
    // 允许在任何状态下平移，使用较快的跟随速度
    const targetPanX = panOffset.x;
    const targetPanY = panOffset.y;

    currentPan.current.x = THREE.MathUtils.lerp(currentPan.current.x, targetPanX, 0.2);
    currentPan.current.y = THREE.MathUtils.lerp(currentPan.current.y, targetPanY, 0.2);

    if (groupRef.current) {
      groupRef.current.position.x = currentPan.current.x;
      groupRef.current.position.y = currentPan.current.y;
    }

    if (pointsRef.current) {
      // @ts-ignore
      pointsRef.current.material.uniforms.uTime.value = state3d.clock.getElapsedTime();
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        const i3 = i * 3; const cx = foliageData.chaos[i3]; const cy = foliageData.chaos[i3 + 1]; const cz = foliageData.chaos[i3 + 2]; const tx = foliageData.tree[i3]; const ty = foliageData.tree[i3 + 1]; const tz = foliageData.tree[i3 + 2];
        const y = THREE.MathUtils.lerp(cy, ty, ease); const tr = Math.sqrt(tx * tx + tz * tz); const tAngle = Math.atan2(tz, tx); const cr = Math.sqrt(cx * cx + cz * cz); const r = THREE.MathUtils.lerp(cr, tr, ease);
        const vortexTwist = (1 - ease) * 15.0; const currentAngle = tAngle + vortexTwist + treeRotation.current; const formedX = r * Math.cos(currentAngle); const formedZ = r * Math.sin(currentAngle);
        const cAngle = Math.atan2(cz, cx); const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.5); const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.5);
        positions[i3] = THREE.MathUtils.lerp(cRotatedX, formedX, ease); positions[i3 + 1] = y; positions[i3 + 2] = THREE.MathUtils.lerp(cRotatedZ, formedZ, ease);
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    if (lightsRef.current) {
      const dummy = new THREE.Object3D();
      const time = state3d.clock.getElapsedTime();
      
      // 圣诞彩灯颜色
      const lightColors = [
        new THREE.Color('#ff3333'), // 红
        new THREE.Color('#ffcc00'), // 金
        new THREE.Color('#33ff33'), // 绿
        new THREE.Color('#3366ff'), // 蓝
        new THREE.Color('#ff66ff'), // 粉
        new THREE.Color('#ffffff'), // 白
      ];
      
      for (let i = 0; i < lightsData.count; i++) {
        const i3 = i * 3; 
        const cx = lightsData.chaos[i3]; const cy = lightsData.chaos[i3 + 1]; const cz = lightsData.chaos[i3 + 2]; 
        const tx = lightsData.tree[i3]; const ty = lightsData.tree[i3 + 1]; const tz = lightsData.tree[i3 + 2];
        const y = THREE.MathUtils.lerp(cy, ty, ease); 
        const tr = Math.sqrt(tx * tx + tz * tz); const tAngle = Math.atan2(tz, tx); 
        const cr = Math.sqrt(cx * cx + cz * cz); const r = THREE.MathUtils.lerp(cr, tr, ease);
        const vortexTwist = (1 - ease) * 12.0; const currentAngle = tAngle + vortexTwist + treeRotation.current;
        const cAngle = Math.atan2(cz, cx); 
        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.3); 
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.3);
        const fx = THREE.MathUtils.lerp(cRotatedX, r * Math.cos(currentAngle), ease); 
        const fz = THREE.MathUtils.lerp(cRotatedZ, r * Math.sin(currentAngle), ease);
        
        // 闪烁缩放效果
        const twinkle = Math.sin(time * 4.0 + i * 1.3) * 0.5 + 0.5;
        const scale = 0.8 + twinkle * 0.5;
        
        dummy.position.set(fx, y, fz); 
        dummy.scale.setScalar(scale); 
        dummy.updateMatrix(); 
        lightsRef.current.setMatrixAt(i, dummy.matrix);
        
        // 设置颜色
        const colorIndex = i % lightColors.length;
        const intensity = 0.7 + twinkle * 0.5;
        const color = lightColors[colorIndex].clone().multiplyScalar(intensity);
        lightsRef.current.setColorAt(i, color);
      }
      lightsRef.current.instanceMatrix.needsUpdate = true;
      if (lightsRef.current.instanceColor) lightsRef.current.instanceColor.needsUpdate = true;
    }
    // 更新所有照片的扫光时间
    photoObjects.forEach(obj => {
      if (obj.ref.current) {
        // 查找 shimmerMaterial 并更新 uTime
        obj.ref.current.traverse((child) => {
          // @ts-ignore
          if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
            // @ts-ignore
            child.material.uniforms.uTime.value = state3d.clock.getElapsedTime() + parseInt(obj.id.split('-')[1] || '0');
          }
        });
      }
    });
    if (trunkRef.current) {
      const trunkScale = THREE.MathUtils.smoothstep(ease, 0.3, 1.0); trunkRef.current.scale.set(trunkScale, ease, trunkScale); trunkRef.current.position.y = -1.5; trunkRef.current.rotation.y = treeRotation.current;
    }
    photoObjects.forEach((obj) => {
      if (!obj.ref.current) return;
      const { chaosPos, treePos, chaosRot, treeRot } = obj.data;
      const [cx, cy, cz] = chaosPos; const [tx, ty, tz] = treePos;
      const y = THREE.MathUtils.lerp(cy, ty, ease); const cr = Math.sqrt(cx * cx + cz * cz); const tr = Math.sqrt(tx * tx + tz * tz); const r = THREE.MathUtils.lerp(cr, tr, ease);
      const tAngle = Math.atan2(tz, tx); const vortexTwist = (1 - ease) * 10.0; const currentAngle = tAngle + vortexTwist + treeRotation.current;
      const cAngle = Math.atan2(cz, cx); const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.2); const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.2);
      const targetX = r * Math.cos(currentAngle); const targetZ = r * Math.sin(currentAngle);
      obj.ref.current.position.set(THREE.MathUtils.lerp(cRotatedX, targetX, ease), y, THREE.MathUtils.lerp(cRotatedZ, targetZ, ease));
      const lookAtAngle = -currentAngle + Math.PI / 2;
      obj.ref.current.rotation.x = THREE.MathUtils.lerp(chaosRot[0], treeRot[0], ease); obj.ref.current.rotation.y = THREE.MathUtils.lerp(chaosRot[1], lookAtAngle, ease); obj.ref.current.rotation.z = THREE.MathUtils.lerp(chaosRot[2], treeRot[2], ease);
    });
  });

  return (
    <group ref={groupRef}>
      <mesh ref={trunkRef} position={[0, -1.5, 0]}><cylinderGeometry args={[0.2, 0.9, 16, 8]} /><meshStandardMaterial color="#3E2723" roughness={0.9} metalness={0.1} /></mesh>
      <points ref={pointsRef}> <bufferGeometry> <bufferAttribute attach="attributes-position" count={foliageData.current.length / 3} array={foliageData.current} itemSize={3} /> <bufferAttribute attach="attributes-size" count={foliageData.sizes.length} array={foliageData.sizes} itemSize={1} /> </bufferGeometry> <foliageMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} /> </points>
      {/* 彩色圣诞彩灯 */}
      <instancedMesh ref={lightsRef} args={[undefined, undefined, lightsData.count]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={2} 
          toneMapped={false} 
        />
      </instancedMesh>
      {photoObjects.map((obj, index) => (
        <group key={obj.id} ref={(el) => { obj.ref.current = el; }}>
          <PolaroidPhoto
            url={obj.url}
            position={obj.pos}
            rotation={obj.rot}
            scale={obj.scale}
            id={obj.id}
            shouldLoad={index < loadedCount}
            year={obj.data.year}
          />

          {/* Year Label - Only show for the first photo of each year */}
          {obj.data.year && (index === 0 || photoObjects[index - 1].data.year !== obj.data.year) && (
            <group position={[0, 0.65, 0.05]}>
              {/* Shadow Layer */}
              <Text
                position={[0.01, -0.01, -0.01]} // Slight offset for drop shadow
                fontSize={0.18}
                maxWidth={1.2} // Allow full width
                color="#000000"
                font="./fonts/Cinzel-Bold.ttf"
                characters="0123456789-"
                anchorX="center"
                anchorY="bottom"
                fillOpacity={0.5}
              >
                {`${obj.data.year}-${obj.data.month}`}
              </Text>
              {/* Main Text Layer */}
              <Text
                fontSize={0.18} // Very small
                maxWidth={1.2}
                color="#ffd700" // Gold
                font="./fonts/Cinzel-Bold.ttf"
                characters="0123456789-"
                anchorX="center"
                anchorY="bottom"
                fillOpacity={state === 'FORMED' ? 1 : 0.9}
                outlineWidth={0} // No outline
              >
                {`${obj.data.year}-${obj.data.month}`}
              </Text>
            </group>
          )
          }
        </group>
      ))}

      {/* Time Line Connection (Only visible in FORMED state) */}
      {state === 'FORMED' && (
        <Line
          points={photoObjects.map(obj => new THREE.Vector3(...obj.data.treePos))}
          color="#ffd700"
          opacity={0.3}
          transparent
          lineWidth={1}
        />
      )}
    </group>
  );
};

export default TreeSystem;
