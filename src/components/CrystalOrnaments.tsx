import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeContext, TreeContextType } from '../types';

// 优化的圣诞配色方案
const CHRISTMAS_PALETTE = {
  crimson: '#dc143c',
  holly: '#2e8b57',
  gold: '#ffd700',
  ivory: '#fffaf0',
  ruby: '#e31c54',
  emerald: '#50c878',
  champagne: '#f7e7ce',
  copper: '#b87333',
  sapphire: '#0f52ba',
  amethyst: '#9966cc',
  brightGold: '#ffdf00',
  roseGold: '#b76e79',
  silver: '#c0c0c0',
  bronze: '#cd7f32'
};

// 糖果棒组件
const CandyCane: React.FC<{ position: THREE.Vector3; scale: number; rotation: number }> = ({ position, scale, rotation }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.PI / 6 + Math.sin(state.clock.elapsedTime * 2 + rotation) * 0.05;
    }
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale} rotation={[0, rotation, Math.PI / 6]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
        <meshStandardMaterial color={CHRISTMAS_PALETTE.ivory} roughness={0.3} metalness={0.1} />
      </mesh>
      {[0, 0.15, 0.3, 0.45].map((y, i) => (
        <mesh key={i} position={[0, y + 0.05, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.08, 8]} />
          <meshStandardMaterial color={CHRISTMAS_PALETTE.crimson} roughness={0.3} emissive={CHRISTMAS_PALETTE.crimson} emissiveIntensity={0.4} />
        </mesh>
      ))}
      <mesh position={[0.08, 0.58, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.05, 8, 12, Math.PI]} />
        <meshStandardMaterial color={CHRISTMAS_PALETTE.ivory} roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
};

// 铃铛组件
const Bell: React.FC<{ position: THREE.Vector3; scale: number; color: string }> = ({ position, scale, color }) => {
  const bellRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (bellRef.current) {
      bellRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3 + position.x * 10) * 0.15;
    }
  });
  
  return (
    <group ref={bellRef} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.9} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.05, 16]} />
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.9} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.95} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.03, 0.015, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.9} />
      </mesh>
    </group>
  );
};

// 礼物盒组件
const GiftBox: React.FC<{ 
  position: THREE.Vector3; 
  scale: number; 
  color: string; 
  ribbonColor: string;
}> = ({ position, scale, color, ribbonColor }) => {
  const boxRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame(() => {
    if (boxRef.current) {
      const targetY = hovered ? position.y + 0.3 : position.y;
      boxRef.current.position.y = THREE.MathUtils.lerp(boxRef.current.position.y, targetY, 0.1);
      
      if (hovered) {
        boxRef.current.rotation.y += 0.02;
      }
    }
  });
  
  return (
    <group 
      ref={boxRef} 
      position={position} 
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.52, 0.08, 0.52]} />
        <meshStandardMaterial color={ribbonColor} roughness={0.3} metalness={0.4} emissive={ribbonColor} emissiveIntensity={hovered ? 0.6 : 0.25} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.08, 0.42, 0.52]} />
        <meshStandardMaterial color={ribbonColor} roughness={0.3} metalness={0.4} emissive={ribbonColor} emissiveIntensity={hovered ? 0.6 : 0.25} />
      </mesh>
      <group position={[0, 0.25, 0]}>
        <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={ribbonColor} roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={ribbonColor} roughness={0.3} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={ribbonColor} roughness={0.3} />
        </mesh>
      </group>
      
      {hovered && (
        <pointLight intensity={2} color={ribbonColor} distance={3} decay={2} />
      )}
    </group>
  );
};

// 优化的伯利恒之星 - 更自然的光芒效果
const BethlehemStar: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerGlowRef = useRef<THREE.PointLight>(null);
  const raysRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.12;
    }
    
    if (innerGlowRef.current) {
      innerGlowRef.current.intensity = 6 + Math.sin(t * 2.5) * 2;
    }
    
    if (raysRef.current) {
      raysRef.current.rotation.z = t * 0.3;
    }
  });
  
  // 创建五角星几何体
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.45;
    const innerRadius = 0.18;
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2
    });
  }, []);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* 柔和的光芒射线 - 使用圆锥形状避免方块感 */}
      <group ref={raysRef}>
        {[...Array(8)].map((_, i) => {
          const angle = (i * Math.PI * 2) / 8;
          const isLong = i % 2 === 0;
          const length = isLong ? 1.8 : 1.2;
          return (
            <mesh 
              key={i} 
              rotation={[Math.PI / 2, 0, angle]}
              position={[0, 0, 0]}
            >
              <coneGeometry args={[0.02, length, 6, 1, true]} />
              <meshBasicMaterial 
                color="#fffacd"
                transparent 
                opacity={isLong ? 0.4 : 0.25}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        })}
      </group>
      
      {/* 主星体 */}
      <mesh geometry={starGeometry} rotation={[Math.PI / 2, 0, 0]}>
        <meshPhysicalMaterial
          color="#fff8dc"
          emissive="#ffd700"
          emissiveIntensity={1.0}
          metalness={0.4}
          roughness={0.15}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
          toneMapped={false}
        />
      </mesh>
      
      {/* 第二层星 - 稍小 */}
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 5]} scale={0.65} position={[0, 0, 0.06]}>
        <extrudeGeometry args={[(() => {
          const shape = new THREE.Shape();
          const points = 5;
          const outerRadius = 0.45;
          const innerRadius = 0.18;
          for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
          }
          shape.closePath();
          return shape;
        })(), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 }]} />
        <meshPhysicalMaterial
          color="#ffffff"
          emissive="#ffec8b"
          emissiveIntensity={0.7}
          metalness={0.5}
          roughness={0.1}
          clearcoat={1}
          toneMapped={false}
        />
      </mesh>
      
      {/* 中心发光核心 */}
      <mesh position={[0, 0, 0.08]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      
      {/* 内核点光源 */}
      <pointLight 
        ref={innerGlowRef}
        position={[0, 0, 0.15]}
        intensity={6}
        color="#fff5e1"
        distance={12}
        decay={2}
      />
      
      {/* 柔和的外层光晕 - 使用sprite避免方块 */}
      <sprite scale={[2.8, 2.8, 1]}>
        <spriteMaterial 
          color="#ffefd5"
          transparent 
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
};

// 大型圣诞彩球 - 新增组件
const LargeChristmasBall: React.FC<{ 
  position: THREE.Vector3; 
  scale: number; 
  color: string;
  emissiveColor?: string;
}> = ({ position, scale, color, emissiveColor }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // 轻微摆动
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + position.x) * 0.05;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.4 + position.z) * 0.05;
    }
  });
  
  return (
    <group position={position}>
      {/* 挂钩 */}
      <mesh position={[0, scale * 1.1, 0]}>
        <torusGeometry args={[scale * 0.12, scale * 0.025, 8, 16, Math.PI]} />
        <meshStandardMaterial color={CHRISTMAS_PALETTE.silver} metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[0, scale * 1.18, 0]}>
        <cylinderGeometry args={[scale * 0.03, scale * 0.03, scale * 0.15, 8]} />
        <meshStandardMaterial color={CHRISTMAS_PALETTE.silver} metalness={0.9} roughness={0.2} />
      </mesh>
      
      {/* 主球体 */}
      <mesh 
        ref={meshRef}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.1}
          metalness={0.9}
          emissive={emissiveColor || color}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          reflectivity={1}
        />
      </mesh>
      
      {/* 装饰条纹 */}
      <mesh scale={scale * 1.01} rotation={[0, 0, Math.PI / 6]}>
        <torusGeometry args={[0.85, 0.05, 8, 32]} />
        <meshStandardMaterial 
          color={CHRISTMAS_PALETTE.brightGold}
          metalness={0.95}
          roughness={0.1}
          emissive={CHRISTMAS_PALETTE.gold}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {hovered && (
        <pointLight intensity={2} color={color} distance={5} decay={2} />
      )}
    </group>
  );
};

// 旋转粒子彩带 - 新增组件
const SpiralingRibbon: React.FC<{ 
  color: string; 
  rotationOffset: number;
  height: number;
  radius: number;
}> = ({ color, rotationOffset, height, radius }) => {
  const ribbonRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = 120;
  
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const angle = t * Math.PI * 6 + rotationOffset;
      const h = t * height - height / 2;
      const r = radius * (1 - t * 0.4);
      
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      
      sizes[i] = (0.15 + Math.random() * 0.1) * (1 - t * 0.5);
    }
    
    return { positions, sizes };
  }, [rotationOffset, height, radius]);
  
  useFrame((state) => {
    if (ribbonRef.current) {
      ribbonRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
    
    if (particlesRef.current) {
      const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        const baseAngle = t * Math.PI * 6 + rotationOffset + time * 0.3;
        const h = t * height - height / 2;
        const r = radius * (1 - t * 0.4);
        
        // 添加波动效果
        const wave = Math.sin(time * 2 + t * 10) * 0.1;
        
        posArray[i * 3] = Math.cos(baseAngle) * (r + wave);
        posArray[i * 3 + 1] = h;
        posArray[i * 3 + 2] = Math.sin(baseAngle) * (r + wave);
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <group ref={ribbonRef}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          color={color}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

// 发光圣诞球 - 标准尺寸
const GlowingBauble: React.FC<{ 
  position: THREE.Vector3; 
  scale: number; 
  color: string; 
  metallic?: boolean;
}> = ({ position, scale, color, metallic = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = hovered ? scale * 1.2 : scale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });
  
  return (
    <group position={position}>
      <mesh position={[0, scale * 1.2, 0]}>
        <torusGeometry args={[scale * 0.15, scale * 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color={CHRISTMAS_PALETTE.silver} metalness={0.95} roughness={0.15} />
      </mesh>
      
      <mesh 
        ref={meshRef}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          roughness={metallic ? 0.08 : 0.4}
          metalness={metallic ? 0.98 : 0.15}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.25}
          clearcoat={metallic ? 1 : 0.3}
          clearcoatRoughness={0.1}
        />
      </mesh>
      
      {hovered && (
        <pointLight intensity={1.5} color={color} distance={4} decay={2} />
      )}
    </group>
  );
};

const CrystalOrnaments: React.FC = () => {
  const { state, rotationSpeed, panOffset } = useContext(TreeContext) as TreeContextType;
  const groupRef = useRef<THREE.Group>(null);
  const ornamentRefs = useRef<(THREE.Group | THREE.Mesh | null)[]>([]);

  const progress = useRef(0);
  const treeRotation = useRef(0);
  const currentPan = useRef({ x: 0, y: 0 });

  // 减少装饰品数量，增加大型彩球
  const ornaments = useMemo(() => {
    const count = 30; // 减少数量
    const items = [];
    
    const baubleColors = [
      CHRISTMAS_PALETTE.crimson,
      CHRISTMAS_PALETTE.ruby,
      CHRISTMAS_PALETTE.holly,
      CHRISTMAS_PALETTE.emerald,
      CHRISTMAS_PALETTE.sapphire,
      CHRISTMAS_PALETTE.amethyst
    ];
    
    const metallicColors = [
      CHRISTMAS_PALETTE.brightGold,
      CHRISTMAS_PALETTE.roseGold,
      CHRISTMAS_PALETTE.silver,
      CHRISTMAS_PALETTE.copper
    ];

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const h = t * 14 - 6.5;
      const r = (9 - h) * 0.55 + 0.4;
      const angle = t * Math.PI * 10;

      const radius = 11 + Math.random() * 13;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const chaosPos = [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ];

      const typeRand = Math.random();
      let type: 'bauble' | 'bauble-metallic' | 'candy-cane' | 'bell' | 'large-ball' = 'bauble';
      if (typeRand > 0.92) type = 'candy-cane';
      else if (typeRand > 0.85) type = 'bell';
      else if (typeRand > 0.6) type = 'large-ball';
      else if (typeRand > 0.35) type = 'bauble-metallic';

      const color = type === 'bauble-metallic' || type === 'large-ball'
        ? metallicColors[Math.floor(Math.random() * metallicColors.length)]
        : baubleColors[Math.floor(Math.random() * baubleColors.length)];

      items.push({
        id: i,
        chaosPos: new THREE.Vector3(...chaosPos),
        treeCyl: { h, r, angle },
        type,
        color,
        scale: type === 'large-ball' ? Math.random() * 0.2 + 0.25 : Math.random() * 0.12 + 0.1
      });
    }
    return items;
  }, []);

  const gifts = useMemo(() => {
    const giftColors = [
      { box: CHRISTMAS_PALETTE.crimson, ribbon: CHRISTMAS_PALETTE.brightGold },
      { box: CHRISTMAS_PALETTE.holly, ribbon: CHRISTMAS_PALETTE.ivory },
      { box: CHRISTMAS_PALETTE.sapphire, ribbon: CHRISTMAS_PALETTE.champagne },
      { box: CHRISTMAS_PALETTE.amethyst, ribbon: CHRISTMAS_PALETTE.roseGold },
      { box: CHRISTMAS_PALETTE.emerald, ribbon: CHRISTMAS_PALETTE.brightGold },
      { box: CHRISTMAS_PALETTE.ruby, ribbon: CHRISTMAS_PALETTE.silver },
    ];
    
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 2.5 + Math.random() * 2;
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * dist,
          -8.5 + Math.random() * 0.2,
          Math.sin(angle) * dist
        ),
        scale: 0.7 + Math.random() * 0.4,
        colors: giftColors[i % giftColors.length],
        rotation: Math.random() * Math.PI * 2
      };
    });
  }, []);

  useFrame((_, delta) => {
    const targetProgress = state === 'FORMED' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 2.5, delta);
    const p = progress.current;
    const ease = p * p * (3 - 2 * p);

    const spinFactor = state === 'FORMED' ? rotationSpeed : 0.08;
    treeRotation.current += spinFactor * delta;

    currentPan.current.x = THREE.MathUtils.lerp(currentPan.current.x, panOffset.x, 0.15);
    currentPan.current.y = THREE.MathUtils.lerp(currentPan.current.y, panOffset.y, 0.15);

    if (groupRef.current) {
      groupRef.current.position.x = currentPan.current.x;
      groupRef.current.position.y = currentPan.current.y;

      ornamentRefs.current.forEach((child, i) => {
        if (!child) return;
        
        const data = ornaments[i];
        if (!data) return;

        const cx = data.chaosPos.x;
        const cy = data.chaosPos.y;
        const cz = data.chaosPos.z;
        const cr = Math.sqrt(cx * cx + cz * cz);
        const cAngle = Math.atan2(cz, cx);

        const { h, r, angle } = data.treeCyl;

        const y = THREE.MathUtils.lerp(cy, h, ease);
        const currentR = THREE.MathUtils.lerp(cr, r, ease);

        const vortexTwist = (1 - ease) * 15.0;
        const currentAngle = angle + vortexTwist + treeRotation.current;

        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.12);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.12);

        const tX = currentR * Math.cos(currentAngle);
        const tZ = currentR * Math.sin(currentAngle);

        child.position.x = THREE.MathUtils.lerp(cRotatedX, tX, ease);
        child.position.y = y;
        child.position.z = THREE.MathUtils.lerp(cRotatedZ, tZ, ease);

        child.rotation.x += delta * (1 - ease) * 0.3;
        child.rotation.y += delta * (1 - ease) * 0.3;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {ornaments.map((o, i) => {
        if (o.type === 'candy-cane') {
          return (
            <group key={i} ref={(el) => { ornamentRefs.current[i] = el; }}>
              <CandyCane position={new THREE.Vector3(0, 0, 0)} scale={o.scale * 2.5} rotation={o.treeCyl.angle} />
            </group>
          );
        }
        if (o.type === 'bell') {
          return (
            <group key={i} ref={(el) => { ornamentRefs.current[i] = el; }}>
              <Bell position={new THREE.Vector3(0, 0, 0)} scale={o.scale * 3} color={o.color} />
            </group>
          );
        }
        if (o.type === 'large-ball') {
          return (
            <group key={i} ref={(el) => { ornamentRefs.current[i] = el; }}>
              <LargeChristmasBall
                position={new THREE.Vector3(0, 0, 0)}
                scale={o.scale}
                color={o.color}
              />
            </group>
          );
        }
        return (
          <group key={i} ref={(el) => { ornamentRefs.current[i] = el; }}>
            <GlowingBauble
              position={new THREE.Vector3(0, 0, 0)}
              scale={o.scale * 0.9}
              color={o.color}
              metallic={o.type === 'bauble-metallic'}
            />
          </group>
        );
      })}

      {/* 优化的伯利恒之星 */}
      <BethlehemStar position={[0, 9.5, 0]} scale={1.0} />

      {/* 旋转粒子彩带 */}
      {state === 'FORMED' && (
        <>
          <SpiralingRibbon color={CHRISTMAS_PALETTE.brightGold} rotationOffset={0} height={14} radius={5.5} />
          <SpiralingRibbon color={CHRISTMAS_PALETTE.crimson} rotationOffset={Math.PI * 0.67} height={14} radius={5.2} />
          <SpiralingRibbon color={CHRISTMAS_PALETTE.ivory} rotationOffset={Math.PI * 1.33} height={14} radius={5.8} />
        </>
      )}

      {/* 礼物盒 */}
      {state === 'FORMED' && gifts.map((gift, i) => (
        <group key={`gift-${i}`} rotation={[0, gift.rotation, 0]}>
          <GiftBox 
            position={gift.position} 
            scale={gift.scale}
            color={gift.colors.box}
            ribbonColor={gift.colors.ribbon}
          />
        </group>
      ))}
    </group>
  );
};

export default CrystalOrnaments;
