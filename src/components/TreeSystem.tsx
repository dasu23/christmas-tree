
import React, { useRef, useMemo, useContext, useState, useEffect } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial, Text, Line, Trail, MeshDistortMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import { TreeContext, ParticleData, TreeContextType } from '../types';

// --- 增强版树叶材质 ---
const FoliageMaterial = shaderMaterial(
  { 
    uTime: 0, 
    uColorBase: new THREE.Color('#0a1f0d'),
    uColorMid: new THREE.Color('#1b4d2e'),
    uColorTip: new THREE.Color('#4caf50'),
    uColorSnow: new THREE.Color('#e8f4f8'),
    uPixelRatio: 1,
    uHover: 0
  },
  `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uHover;
    attribute float size;
    varying vec3 vPosition;
    varying float vBlink;
    varying float vHeight;
    varying float vSnowChance;
    
    vec3 curl(float x, float y, float z) {
      float n1 = sin(y + cos(z + uTime * 0.3));
      float n2 = cos(x + sin(z + uTime * 0.3));
      vec3 curl = vec3((n1 - n2) * 0.08, (n1 - n2) * 0.05, (n1 - n2) * 0.08);
      return curl;
    }
    
    void main() {
      vPosition = position;
      vHeight = (position.y + 7.5) / 16.0;
      
      float distFromCenter = length(position.xz);
      vSnowChance = smoothstep(0.3, 1.0, vHeight) * 0.35 + 
                    smoothstep(2.0, 8.0, distFromCenter) * 0.25 +
                    fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.25;
      
      vec3 distortedPosition = position + curl(position.x, position.y, position.z);
      
      // 悬停时向外扩散
      distortedPosition *= 1.0 + uHover * 0.1;
      
      vec4 mvPosition = modelViewMatrix * vec4(distortedPosition, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float sizeMultiplier = mix(1.3, 0.5, vHeight);
      gl_PointSize = size * uPixelRatio * sizeMultiplier * (150.0 / -mvPosition.z);
      
      vBlink = sin(uTime * 1.5 + position.y * 3.0 + position.x * 2.0);
    }
  `,
  `
    uniform vec3 uColorBase;
    uniform vec3 uColorMid;
    uniform vec3 uColorTip;
    uniform vec3 uColorSnow;
    uniform float uTime;
    uniform float uHover;
    varying float vBlink;
    varying float vHeight;
    varying float vSnowChance;
    
    void main() {
      vec2 xy = gl_PointCoord.xy - vec2(0.5);
      float ll = length(xy);
      if (ll > 0.5) discard;
      
      float strength = pow(1.0 - ll * 2.0, 2.0);
      
      vec3 greenColor = mix(uColorBase, uColorMid, smoothstep(0.0, 0.4, vHeight));
      greenColor = mix(greenColor, uColorTip, smoothstep(0.4, 0.9, vHeight));
      
      float blink = smoothstep(-0.5, 0.5, vBlink) * 0.3 + 0.7;
      greenColor *= blink;
      
      // 悬停时更亮
      greenColor *= 1.0 + uHover * 0.5;
      
      float snowThreshold = 0.7;
      vec3 finalColor = vSnowChance > snowThreshold ? uColorSnow : greenColor;
      float snowBrightness = vSnowChance > snowThreshold ? 1.3 : 1.0;
      
      gl_FragColor = vec4(finalColor * snowBrightness, strength * 0.95);
    }
  `
);
extend({ FoliageMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    foliageMaterial: any
    shimmerMaterial: any
    ribbonMaterial: any
  }
}

// --- 彩带材质 ---
const RibbonMaterial = shaderMaterial(
  { uTime: 0, uColor1: new THREE.Color('#ff0000'), uColor2: new THREE.Color('#ffd700') },
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float uTime;
    void main() {
      vUv = uv;
      vNormal = normal;
      vec3 pos = position;
      // 波动效果
      pos.x += sin(pos.y * 3.0 + uTime * 2.0) * 0.1;
      pos.z += cos(pos.y * 2.0 + uTime * 1.5) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      float stripe = step(0.5, fract(vUv.y * 20.0 + uTime * 0.5));
      vec3 color = mix(uColor1, uColor2, stripe);
      float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
      gl_FragColor = vec4(color * light, 0.9);
    }
  `
);
extend({ RibbonMaterial });

// --- Shimmer Material ---
const ShimmerMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#ffffff') },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
   void main() {
     float pos = mod(uTime * 0.8, 2.5) - 0.5;
     float bar = smoothstep(0.0, 0.2, 0.2 - abs(vUv.x + vUv.y * 0.5 - pos));
     gl_FragColor = vec4(uColor, bar * 0.08);
   }`
);
extend({ ShimmerMaterial });

// --- 树枝层组件 ---
const TreeBranch: React.FC<{ y: number; radius: number; index: number }> = ({ y, radius, index }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // 轻微摇摆
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.02;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, y, 0]} castShadow receiveShadow>
      <coneGeometry args={[radius, radius * 0.8, 32]} />
      <meshStandardMaterial 
        color="#0d3d1a"
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  );
};

// --- 彩带螺旋组件 ---
const Ribbon: React.FC<{ color1: string; color2: string }> = ({ color1, color2 }) => {
  const ribbonRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 50 }, (_, i) => {
        const t = i / 49;
        const y = t * 15 - 7;
        const r = (8 - t * 7) * 0.7;
        const angle = t * Math.PI * 8;
        return new THREE.Vector3(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r
        );
      })
    );
    return new THREE.TubeGeometry(curve, 200, 0.08, 8, false);
  }, []);
  
  useFrame((state) => {
    if (ribbonRef.current && ribbonRef.current.material) {
      // @ts-ignore
      ribbonRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh ref={ribbonRef} geometry={geometry}>
      <ribbonMaterial 
        transparent 
        side={THREE.DoubleSide}
        uColor1={new THREE.Color(color1)}
        uColor2={new THREE.Color(color2)}
      />
    </mesh>
  );
};

// --- 魔法粒子爆发组件 ---
const MagicBurst: React.FC<{ trigger: number; position: THREE.Vector3 }> = ({ trigger, position }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const [active, setActive] = useState(false);
  const startTime = useRef(0);
  
  const { positions, velocities, colors } = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const colorOptions = [
      new THREE.Color('#ff4444'),
      new THREE.Color('#ffcc00'),
      new THREE.Color('#44ff44'),
      new THREE.Color('#ffffff'),
    ];
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = Math.random() * 0.3 + 0.1;
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i3 + 1] = Math.cos(phi) * speed + 0.1;
      velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    
    return { positions, velocities, colors };
  }, []);
  
  useEffect(() => {
    if (trigger > 0) {
      setActive(true);
      startTime.current = Date.now();
      // 重置位置
      for (let i = 0; i < positions.length; i++) {
        positions[i] = 0;
      }
    }
  }, [trigger]);
  
  useFrame(() => {
    if (!active || !particlesRef.current) return;
    
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed > 2) {
      setActive(false);
      return;
    }
    
    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < posArray.length / 3; i++) {
      const i3 = i * 3;
      posArray[i3] += velocities[i3];
      posArray[i3 + 1] += velocities[i3 + 1] - elapsed * 0.05; // 重力
      posArray[i3 + 2] += velocities[i3 + 2];
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  if (!active) return null;
  
  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// --- 鼠标跟随光点 ---
const MouseLight: React.FC = () => {
  const { pointer } = useContext(TreeContext) as TreeContextType;
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (!pointer || !lightRef.current || !meshRef.current) return;
    
    // 将屏幕坐标转换为 3D 空间
    const vec = new THREE.Vector3(
      (pointer.x * 2 - 1),
      -(pointer.y * 2 - 1),
      0.5
    );
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const distance = 15;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    lightRef.current.position.lerp(pos, 0.1);
    meshRef.current.position.copy(lightRef.current.position);
  });
  
  if (!pointer) return null;
  
  return (
    <>
      <pointLight ref={lightRef} intensity={3} color="#ffd700" distance={8} decay={2} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.8} />
      </mesh>
    </>
  );
};

// --- Photo Component ---
const PolaroidPhoto: React.FC<{ 
  url: string; 
  position: THREE.Vector3; 
  rotation: THREE.Euler; 
  scale: number; 
  id: string; 
  shouldLoad: boolean; 
  year: number;
  isHovered: boolean;
}> = ({ url, position, rotation, scale, id, shouldLoad, year, isHovered }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!shouldLoad) return;
    
    console.log(`尝试加载照片: ${url} (ID: ${id})`);
    const loader = new THREE.TextureLoader();
    
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
        console.log(`照片加载成功: ${url}`);
      },
      (progress) => {
        console.log(`照片加载进度: ${url} - ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
      },
      (error) => {
        console.error(`照片加载失败: ${url}`, error);
        // 对于1.jpg和2.jpg，尝试备用路径
        if (url === './1.jpg' || url === './2.jpg') {
          const backupUrl = url.replace('./', '/');
          console.log(`尝试备用路径: ${backupUrl}`);
          loader.load(
            backupUrl,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              setTexture(tex);
              console.log(`备用路径加载成功: ${backupUrl}`);
            },
            undefined,
            () => {
              console.log('备用路径也失败，使用随机图片');
              const seed = id.split('-')[1] || '55';
              loader.load(`https://picsum.photos/seed/${parseInt(seed) + 100}/400/500`, (fbTex) => {
                fbTex.colorSpace = THREE.SRGBColorSpace;
                setTexture(fbTex);
              });
            }
          );
        } else {
          // 其他照片使用随机图片作为备选
          const seed = id.split('-')[1] || '55';
          loader.load(`https://picsum.photos/seed/${parseInt(seed) + 100}/400/500`, (fbTex) => {
            fbTex.colorSpace = THREE.SRGBColorSpace;
            setTexture(fbTex);
          });
        }
      }
    );
  }, [url, id, shouldLoad]);
  
  useFrame((state) => {
    if (groupRef.current) {
      // 悬停时放大和发光
      const targetScale = isHovered ? 1.3 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    if (glowRef.current) {
      glowRef.current.visible = isHovered;
      if (isHovered) {
        const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.2 + 1.2;
        glowRef.current.scale.setScalar(pulse);
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale * 1.2}>
      {/* 发光背景 */}
      <mesh ref={glowRef} position={[0, 0, -0.05]} visible={false}>
        <planeGeometry args={[1.4, 1.6]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.3} />
      </mesh>
      
      {/* 相框 */}
      <mesh userData={{ photoId: id, photoUrl: url }}>
        <boxGeometry args={[1, 1.25, 0.02]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </mesh>
      
      {/* 照片 */}
      <mesh position={[0, 0.15, 0.015]} userData={{ photoId: id, photoUrl: url }}>
        <planeGeometry args={[0.9, 0.9]} />
        {texture ? (
          <meshStandardMaterial map={texture} roughness={0.5} metalness={0.0} />
        ) : (
          <meshStandardMaterial color="#333" />
        )}
      </mesh>
      
      {/* 扫光 */}
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
  const { camera } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const branchGroupRef = useRef<THREE.Group>(null);

  const progress = useRef(0);
  const treeRotation = useRef(0);
  const currentPan = useRef({ x: 0, y: 0 });
  const [loadedCount, setLoadedCount] = useState(0);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [burstPosition, setBurstPosition] = useState(new THREE.Vector3());
  const prevState = useRef(state);

  const [photoObjects, setPhotoObjects] = useState<{ id: string; url: string; ref: React.MutableRefObject<THREE.Group | null>; data: ParticleData; pos: THREE.Vector3; rot: THREE.Euler; scale: number; }[]>([]);

  // 状态变化时触发粒子爆发
  useEffect(() => {
    if (prevState.current !== state) {
      setBurstTrigger(Date.now());
      setBurstPosition(new THREE.Vector3(0, 2, 0));
      prevState.current = state;
    }
  }, [state]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadedCount(prev => {
        const newCount = prev >= photoObjects.length ? prev : prev + 1;
        if (newCount !== prev) {
          console.log(`照片加载进度: ${newCount}/${photoObjects.length}`);
        }
        return newCount;
      });
    }, 50); // 加快加载速度
    return () => clearInterval(interval);
  }, [photoObjects.length]);

  // --- Data Generation ---
  const { foliageData, photosData, lightsData, branchLayers } = useMemo(() => {
    const particleCount = 10000;
    const foliage = new Float32Array(particleCount * 3);
    const foliageChaos = new Float32Array(particleCount * 3);
    const foliageTree = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const sphere = random.inSphere(new Float32Array(particleCount * 3), { radius: 20 });
    for (let i = 0; i < particleCount * 3; i++) foliageChaos[i] = sphere[i];
    
    for (let i = 0; i < particleCount; i++) { 
      const i3 = i * 3; 
      const h = Math.random() * 16;
      const maxR = (16 - h) * 0.55; 
      const r = Math.pow(Math.random(), 0.4) * maxR; 
      const angle = Math.random() * Math.PI * 2; 
      const spiralOffset = Math.sin(h * 0.8 + angle * 3) * 0.3;
      
      foliageTree[i3] = Math.cos(angle) * (r + spiralOffset); 
      foliageTree[i3 + 1] = h - 7.5;
      foliageTree[i3 + 2] = Math.sin(angle) * (r + spiralOffset); 
      sizes[i] = Math.random() * 3.5 + 1.0; 
    }

    // 树枝层数据
    const branches = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const y = t * 12 - 5;
      const radius = (1 - t * 0.7) * 6;
      branches.push({ y, radius, index: i });
    }

    const lightCount = 500;
    const lightChaos = new Float32Array(lightCount * 3);
    const lightTree = new Float32Array(lightCount * 3);
    const lSphere = random.inSphere(new Float32Array(lightCount * 3), { radius: 22 });
    for (let i = 0; i < lightCount * 3; i++) lightChaos[i] = lSphere[i];
    
    for (let i = 0; i < lightCount; i++) { 
      const i3 = i * 3; 
      const t = i / lightCount; 
      const h = t * 15; 
      const r = (16 - h) * 0.58;
      const angle = t * Math.PI * 35;
      
      lightTree[i3] = Math.cos(angle) * r; 
      lightTree[i3 + 1] = h - 7.5; 
      lightTree[i3 + 2] = Math.sin(angle) * r; 
    }

    // 特殊照片放在前面，其他按时间顺序排列
    const specialPhotos = ["1.jpg", "2.jpg"];
    const otherPhotos = [
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
    ].sort();
    const photoFiles = [...specialPhotos, ...otherPhotos];

    const photos: ParticleData[] = photoFiles.map((fileName, i) => {
      const parts = fileName.split('_');
      let year = 2024;
      let month = '01';
      
      // 处理特殊文件名
      if (fileName === '1.jpg' || fileName === '2.jpg') {
        year = 2024;
        month = '12';
      } else if (parts.length >= 2) {
        year = parseInt(parts[0]);
        month = parts[1];
      }
      
      const t = i / (photoFiles.length - 1);
      const h = t * 15 - 7;
      const radius = (8.5 - h) * 0.6 + 0.8; 
      const angle = t * Math.PI * 10;

      const phi = Math.acos(1 - 2 * (i + 0.5) / photoFiles.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const r = 13 + Math.random() * 4;

      // 根据文件名决定路径
      const imagePath = (fileName === '1.jpg' || fileName === '2.jpg') 
        ? `./${fileName}` 
        : `./photos/${fileName}`;

      return {
        id: `photo-${i}`,
        type: 'PHOTO',
        year,
        month,
        chaosPos: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.6,
          r * Math.cos(phi)
        ],
        treePos: [Math.cos(angle) * radius, h, Math.sin(angle) * radius],
        chaosRot: [(Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.1],
        treeRot: [0, -angle + Math.PI / 2, 0],
        scale: 0.85 + Math.random() * 0.3,
        image: imagePath,
        color: 'white'
      };
    });
    
    return { 
      foliageData: { current: foliage, chaos: foliageChaos, tree: foliageTree, sizes }, 
      photosData: photos, 
      lightsData: { chaos: lightChaos, tree: lightTree, count: lightCount },
      branchLayers: branches
    };
  }, []);

  useEffect(() => {
    console.log('创建照片对象，总数:', photosData.length);
    const newPhotoObjects = photosData.map((p, i) => {
      console.log(`照片 ${i}: ${p.image}, 位置: [${p.treePos.join(', ')}]`);
      return { 
        id: p.id, 
        url: p.image!, 
        ref: React.createRef<THREE.Group>(), 
        data: p, 
        pos: new THREE.Vector3(), 
        rot: new THREE.Euler(), 
        scale: p.scale 
      };
    });
    setPhotoObjects(newPhotoObjects);
  }, [photosData]);

  // 检测悬停 - 在所有状态下都工作
  useEffect(() => {
    if (!pointer) {
      setHoveredPhotoId(null);
      return;
    }
    
    const ndcX = pointer.x * 2 - 1;
    const ndcY = -(pointer.y * 2) + 1;
    
    let closest: string | null = null;
    let minDist = 0.12;
    
    photoObjects.forEach(obj => {
      if (!obj.ref.current) return;
      const worldPos = new THREE.Vector3();
      obj.ref.current.getWorldPosition(worldPos);
      const screenPos = worldPos.clone().project(camera);
      if (screenPos.z < 1) {
        const dist = Math.hypot(screenPos.x - ndcX, screenPos.y - ndcY);
        if (dist < minDist) {
          minDist = dist;
          closest = obj.id;
        }
      }
    });
    
    setHoveredPhotoId(closest);
  }, [pointer, state, photoObjects, camera]);

  const photoOpenTimeRef = useRef<number>(0);

  useEffect(() => {
    if (pointer && clickTrigger) {
      if (selectedPhotoUrl && Date.now() - photoOpenTimeRef.current < 3000) return;

      const ndcX = pointer.x * 2 - 1;
      const ndcY = -(pointer.y * 2) + 1;
      
      let closestPhotoId: string | null = null;
      let minDistance = Infinity;

      photoObjects.forEach(obj => {
        if (!obj.ref.current) return;
        const worldPos = new THREE.Vector3();
        obj.ref.current.getWorldPosition(worldPos);
        const screenPos = worldPos.clone().project(camera);
        if (screenPos.z < 1) {
          const dist = Math.hypot(screenPos.x - ndcX, screenPos.y - ndcY);
          if (dist < 0.05 && dist < minDistance) {
            minDistance = dist;
            closestPhotoId = obj.data.image!;
          }
        }
      });

      if (closestPhotoId) {
        if (selectedPhotoUrl === closestPhotoId && Date.now() - photoOpenTimeRef.current > 3000) {
          setSelectedPhotoUrl(null);
        } else if (selectedPhotoUrl !== closestPhotoId) {
          setSelectedPhotoUrl(closestPhotoId);
          photoOpenTimeRef.current = Date.now();
        }
      } else if (selectedPhotoUrl && Date.now() - photoOpenTimeRef.current > 3000) {
        setSelectedPhotoUrl(null);
      }
    }
  }, [clickTrigger]);

  // --- Animation Loop ---
  useFrame((state3d, delta) => {
    const targetProgress = state === 'FORMED' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 2.5, delta);
    const ease = progress.current * progress.current * (3 - 2 * progress.current);
    treeRotation.current += (state === 'FORMED' ? (rotationSpeed + rotationBoost) : 0.08) * delta;

    currentPan.current.x = THREE.MathUtils.lerp(currentPan.current.x, panOffset.x, 0.15);
    currentPan.current.y = THREE.MathUtils.lerp(currentPan.current.y, panOffset.y, 0.15);

    if (groupRef.current) {
      groupRef.current.position.x = currentPan.current.x;
      groupRef.current.position.y = currentPan.current.y;
    }
    
    // 树枝层动画
    if (branchGroupRef.current) {
      branchGroupRef.current.rotation.y = treeRotation.current;
      branchGroupRef.current.scale.setScalar(ease);
      branchGroupRef.current.visible = ease > 0.1;
    }

    if (pointsRef.current) {
      // @ts-ignore
      pointsRef.current.material.uniforms.uTime.value = state3d.clock.getElapsedTime();
      // @ts-ignore
      pointsRef.current.material.uniforms.uHover.value = hoveredPhotoId ? 0.3 : 0;
      
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        const i3 = i * 3;
        const cx = foliageData.chaos[i3], cy = foliageData.chaos[i3 + 1], cz = foliageData.chaos[i3 + 2];
        const tx = foliageData.tree[i3], ty = foliageData.tree[i3 + 1], tz = foliageData.tree[i3 + 2];
        
        const y = THREE.MathUtils.lerp(cy, ty, ease);
        const tr = Math.sqrt(tx * tx + tz * tz), tAngle = Math.atan2(tz, tx);
        const cr = Math.sqrt(cx * cx + cz * cz), r = THREE.MathUtils.lerp(cr, tr, ease);
        const vortexTwist = (1 - ease) * 18.0;
        const currentAngle = tAngle + vortexTwist + treeRotation.current;
        const cAngle = Math.atan2(cz, cx);
        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.5);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.5);
        
        positions[i3] = THREE.MathUtils.lerp(cRotatedX, r * Math.cos(currentAngle), ease);
        positions[i3 + 1] = y;
        positions[i3 + 2] = THREE.MathUtils.lerp(cRotatedZ, r * Math.sin(currentAngle), ease);
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    if (lightsRef.current) {
      const dummy = new THREE.Object3D();
      const time = state3d.clock.getElapsedTime();
      const lightColors = [
        new THREE.Color('#ff2222'), new THREE.Color('#ffdd00'),
        new THREE.Color('#22ff22'), new THREE.Color('#2266ff'),
        new THREE.Color('#ff22ff'), new THREE.Color('#ffffff'),
        new THREE.Color('#ff8800'), new THREE.Color('#00ffff'),
      ];
      
      for (let i = 0; i < lightsData.count; i++) {
        const i3 = i * 3;
        const cx = lightsData.chaos[i3], cy = lightsData.chaos[i3 + 1], cz = lightsData.chaos[i3 + 2];
        const tx = lightsData.tree[i3], ty = lightsData.tree[i3 + 1], tz = lightsData.tree[i3 + 2];
        
        const y = THREE.MathUtils.lerp(cy, ty, ease);
        const tr = Math.sqrt(tx * tx + tz * tz), tAngle = Math.atan2(tz, tx);
        const cr = Math.sqrt(cx * cx + cz * cz), r = THREE.MathUtils.lerp(cr, tr, ease);
        const vortexTwist = (1 - ease) * 15.0;
        const currentAngle = tAngle + vortexTwist + treeRotation.current;
        const cAngle = Math.atan2(cz, cx);
        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.3);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.3);
        
        const fx = THREE.MathUtils.lerp(cRotatedX, r * Math.cos(currentAngle), ease);
        const fz = THREE.MathUtils.lerp(cRotatedZ, r * Math.sin(currentAngle), ease);
        
        // 更强烈的闪烁 - 不同频率的闪烁效果
        const phase = i * 0.7 + Math.floor(i / 8) * 0.5;
        const fastTwinkle = Math.pow(Math.sin(time * 8.0 + phase) * 0.5 + 0.5, 0.2);
        const slowTwinkle = Math.pow(Math.sin(time * 2.0 + phase * 1.5) * 0.5 + 0.5, 0.5);
        const combinedTwinkle = (fastTwinkle * 0.7 + slowTwinkle * 0.3);
        const scale = 0.4 + combinedTwinkle * 1.2;
        
        dummy.position.set(fx, y, fz);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        lightsRef.current.setMatrixAt(i, dummy.matrix);
        
        const colorIndex = i % lightColors.length;
        const intensity = 0.3 + combinedTwinkle * 1.2;
        lightsRef.current.setColorAt(i, lightColors[colorIndex].clone().multiplyScalar(intensity));
      }
      lightsRef.current.instanceMatrix.needsUpdate = true;
      if (lightsRef.current.instanceColor) lightsRef.current.instanceColor.needsUpdate = true;
    }

    if (trunkRef.current) {
      const trunkScale = THREE.MathUtils.smoothstep(ease, 0.2, 1.0);
      trunkRef.current.scale.set(trunkScale, ease, trunkScale);
      trunkRef.current.position.y = -1.5;
      trunkRef.current.rotation.y = treeRotation.current;
    }
    
    photoObjects.forEach(obj => {
      if (!obj.ref.current) return;
      const { chaosPos, treePos, chaosRot, treeRot } = obj.data;
      const [cx, cy, cz] = chaosPos, [tx, ty, tz] = treePos;
      
      const y = THREE.MathUtils.lerp(cy, ty, ease);
      const cr = Math.sqrt(cx * cx + cz * cz), tr = Math.sqrt(tx * tx + tz * tz);
      const r = THREE.MathUtils.lerp(cr, tr, ease);
      const tAngle = Math.atan2(tz, tx);
      const vortexTwist = (1 - ease) * 12.0;
      const currentAngle = tAngle + vortexTwist + treeRotation.current;
      const cAngle = Math.atan2(cz, cx);
      const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.2);
      const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.2);
      
      obj.ref.current.position.set(
        THREE.MathUtils.lerp(cRotatedX, r * Math.cos(currentAngle), ease),
        y,
        THREE.MathUtils.lerp(cRotatedZ, r * Math.sin(currentAngle), ease)
      );
      
      const lookAtAngle = -currentAngle + Math.PI / 2;
      obj.ref.current.rotation.x = THREE.MathUtils.lerp(chaosRot[0], treeRot[0], ease);
      obj.ref.current.rotation.y = THREE.MathUtils.lerp(chaosRot[1], lookAtAngle, ease);
      obj.ref.current.rotation.z = THREE.MathUtils.lerp(chaosRot[2], treeRot[2], ease);
    });
  });

  return (
    <group ref={groupRef}>
      {/* 魔法粒子爆发 */}
      <MagicBurst trigger={burstTrigger} position={burstPosition} />
      
      {/* 鼠标跟随光点 */}
      <MouseLight />
      
      {/* 树干 */}
      <mesh ref={trunkRef} position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.25, 1.0, 18, 12]} />
        <meshStandardMaterial color="#2d1810" roughness={0.95} metalness={0.0} />
      </mesh>
      
      {/* 树枝层 */}
      <group ref={branchGroupRef}>
        {branchLayers.map((branch, i) => (
          <TreeBranch key={i} {...branch} />
        ))}
      </group>
      
      {/* 彩带 */}
      {state === 'FORMED' && (
        <>
          <Ribbon color1="#ff0000" color2="#ffd700" />
          <group rotation={[0, Math.PI / 3, 0]}>
            <Ribbon color1="#00aa00" color2="#ffffff" />
          </group>
        </>
      )}
      
      {/* 树叶粒子 */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={foliageData.current.length / 3} array={foliageData.current} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={foliageData.sizes.length} array={foliageData.sizes} itemSize={1} />
        </bufferGeometry>
        <foliageMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      
      {/* 彩灯 */}
      <instancedMesh ref={lightsRef} args={[undefined, undefined, lightsData.count]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
      
      {/* 照片 */}
      {photoObjects.map((obj, index) => (
        <group key={obj.id} ref={(el) => { obj.ref.current = el; }}>
          <PolaroidPhoto
            url={obj.url}
            position={obj.pos}
            rotation={obj.rot}
            scale={obj.scale * (index < 2 ? 1.2 : 1.0)} // 1.jpg和2.jpg稍大一些
            id={obj.id}
            shouldLoad={index < loadedCount}
            year={obj.data.year}
            isHovered={hoveredPhotoId === obj.id}
          />
          
          {/* 特殊照片标签 */}
          {index < 2 && (
            <group position={[0, -0.8, 0.1]}>
              <Text 
                fontSize={0.15} 
                color="#ff6b6b" 
                font="./fonts/Cinzel-Bold.ttf" 
                anchorX="center" 
                anchorY="middle" 
                fillOpacity={1}
              >
                {index === 0 ? "特别纪念" : "珍藏回忆"}
              </Text>
            </group>
          )}
          
          {obj.data.year && (index === 0 || photoObjects[index - 1].data.year !== obj.data.year) && index >= 2 && (
            <group position={[0, 0.7, 0.05]}>
              <Text position={[0.01, -0.01, -0.01]} fontSize={0.2} color="#000000" font="./fonts/Cinzel-Bold.ttf" anchorX="center" anchorY="bottom" fillOpacity={0.5}>
                {`${obj.data.year}-${obj.data.month}`}
              </Text>
              <Text fontSize={0.2} color="#ffd700" font="./fonts/Cinzel-Bold.ttf" anchorX="center" anchorY="bottom" fillOpacity={state === 'FORMED' ? 1 : 0.9}>
                {`${obj.data.year}-${obj.data.month}`}
              </Text>
            </group>
          )}
        </group>
      ))}

      {state === 'FORMED' && (
        <Line
          points={photoObjects.map(obj => new THREE.Vector3(...obj.data.treePos))}
          color="#ffd700"
          opacity={0.4}
          transparent
          lineWidth={2}
        />
      )}
    </group>
  );
};

export default TreeSystem;
