import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeContext, TreeContextType } from '../types';

// 优化的圣诞配色方案
const CHRISTMAS_PALETTE = {
  // 主色调 - 更温暖饱和
  crimson: '#dc143c',
  holly: '#2e8b57',
  gold: '#ffd700',
  ivory: '#fffaf0',
  
  // 装饰色 - 更丰富层次
  ruby: '#e31c54',
  emerald: '#50c878',
  champagne: '#f7e7ce',
  copper: '#b87333',
  sapphire: '#0f52ba',
  amethyst: '#9966cc',
  
  // 金属色 - 更闪亮
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
const GiftBox: React.FC<{ position: THREE.Vector3; scale: number; color: string; ribbonColor: string }> = ({ position, scale, color, ribbonColor }) => {
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

// 全新设计的伯利恒之星 - 水晶3D立体星
const BethlehemStar: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerGlowRef = useRef<THREE.PointLight>(null);
  const outerGlowRef = useRef<THREE.PointLight>(null);
  const crystalRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (groupRef.current) {
      // 缓慢旋转
      groupRef.current.rotation.y = t * 0.2;
      // 轻微上下浮动
      groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.15;
    }
    
    if (innerGlowRef.current) {
      // 内核脉动
      innerGlowRef.current.intensity = 8 + Math.sin(t * 3) * 3;
    }
    
    if (outerGlowRef.current) {
      // 外光晕呼吸
      outerGlowRef.current.intensity = 4 + Math.sin(t * 2) * 1.5;
    }
    
    if (crystalRef.current) {
      // 水晶闪烁
      const material = crystalRef.current.material as THREE.MeshPhysicalMaterial;
      material.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.3;
    }
    
    if (haloRef.current) {
      // 光晕缩放
      const s = 1 + Math.sin(t * 2.5) * 0.15;
      haloRef.current.scale.set(s, s, 1);
    }
  });
  
  // 创建八角星几何体
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 8;
    const outerRadius = 0.5;
    const innerRadius = 0.22;
    
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
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3
    });
  }, []);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* 最外层光晕环 */}
      <mesh ref={haloRef} position={[0, 0, -0.3]}>
        <ringGeometry args={[0.8, 1.6, 64]} />
        <meshBasicMaterial 
          color="#fff8dc" 
          transparent 
          opacity={0.15} 
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 动态光芒射线 */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const length = i % 2 === 0 ? 2.5 : 1.8;
        const width = i % 2 === 0 ? 0.06 : 0.04;
        return (
          <mesh 
            key={i} 
            rotation={[0, 0, angle]}
            position={[0, 0, -0.1]}
          >
            <planeGeometry args={[width, length]} />
            <meshBasicMaterial 
              color={i % 2 === 0 ? '#fffacd' : '#fff8dc'}
              transparent 
              opacity={i % 2 === 0 ? 0.6 : 0.35}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
      
      {/* 主星体 - 水晶材质 */}
      <mesh ref={crystalRef} geometry={starGeometry} rotation={[Math.PI / 2, 0, 0]}>
        <meshPhysicalMaterial
          color="#fff8dc"
          emissive="#ffd700"
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.1}
          transmission={0.3}
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          toneMapped={false}
        />
      </mesh>
      
      {/* 第二层星 - 稍小，增加层次 */}
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 8]} scale={0.7} position={[0, 0, 0.08]}>
        <extrudeGeometry args={[(() => {
          const shape = new THREE.Shape();
          const points = 8;
          const outerRadius = 0.5;
          const innerRadius = 0.22;
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
        })(), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 }]} />
        <meshPhysicalMaterial
          color="#ffffff"
          emissive="#ffec8b"
          emissiveIntensity={0.6}
          metalness={0.5}
          roughness={0.05}
          clearcoat={1}
          toneMapped={false}
        />
      </mesh>
      
      {/* 中心宝石核心 */}
      <mesh position={[0, 0, 0.1]}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshPhysicalMaterial
          color="#ffffff"
          emissive="#ffd700"
          emissiveIntensity={2}
          metalness={0.2}
          roughness={0}
          transmission={0.5}
          thickness={1}
          clearcoat={1}
          toneMapped={false}
        />
      </mesh>
      
      {/* 中心发光球 */}
      <mesh position={[0, 0, 0.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      
      {/* 内核点光源 */}
      <pointLight 
        ref={innerGlowRef}
        position={[0, 0, 0.2]}
        intensity={8}
        color="#fff5e1"
        distance={15}
        decay={2}
      />
      
      {/* 外层柔光 */}
      <pointLight
        ref={outerGlowRef}
        position={[0, 0, 0.5]}
        intensity={4}
        color="#ffd700"
        distance={25}
        decay={2}
      />
      
      {/* 背光 */}
      <pointLight
        position={[0, 0, -0.5]}
        intensity={2}
        color="#ffe4b5"
        distance={10}
        decay={2}
      />
      
      {/* 大光晕精灵 */}
      <sprite scale={[4, 4, 1]}>
        <spriteMaterial 
          color="#ffefd5"
          transparent 
          opacity={0.25}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      
      {/* 小光点装饰 */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 6;
        const r = 0.65;
        return (
          <mesh key={`sparkle-${i}`} position={[Math.cos(angle) * r, Math.sin(angle) * r, 0.05]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// 发光圣诞球 - 优化颜色
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
      const targetScale = hovered ? scale * 1.3 : scale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });
  
  return (
    <group position={position}>
      {/* 挂钩 */}
      <mesh position={[0, scale * 1.2, 0]}>
        <torusGeometry args={[scale * 0.15, scale * 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color={CHRISTMAS_PALETTE.silver} metalness={0.95} roughness={0.15} />
      </mesh>
      
      {/* 球体 */}
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
          emissiveIntensity={hovered ? 0.9 : 0.35}
          clearcoat={metallic ? 1 : 0.3}
          clearcoatRoughness={0.1}
        />
      </mesh>
      
      {/* 高光 */}
      <mesh scale={scale * 0.97}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>
      
      {hovered && (
        <pointLight intensity={2} color={color} distance={4} decay={2} />
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

  // 优化的装饰品颜色配置
  const ornaments = useMemo(() => {
    const count = 45;
    const items = [];
    
    // 更丰富的圣诞球颜色
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
      const angle = t * Math.PI * 14;

      const radius = 11 + Math.random() * 13;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const chaosPos = [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ];

      const typeRand = Math.random();
      let type: 'bauble' | 'bauble-metallic' | 'candy-cane' | 'bell' = 'bauble';
      if (typeRand > 0.88) type = 'candy-cane';
      else if (typeRand > 0.75) type = 'bell';
      else if (typeRand > 0.45) type = 'bauble-metallic';

      const color = type === 'bauble-metallic' 
        ? metallicColors[Math.floor(Math.random() * metallicColors.length)]
        : baubleColors[Math.floor(Math.random() * baubleColors.length)];

      items.push({
        id: i,
        chaosPos: new THREE.Vector3(...chaosPos),
        treeCyl: { h, r, angle },
        type,
        color,
        scale: Math.random() * 0.12 + 0.1
      });
    }
    return items;
  }, []);

  // 优化的礼物盒颜色
  const gifts = useMemo(() => {
    const giftColors = [
      { box: CHRISTMAS_PALETTE.crimson, ribbon: CHRISTMAS_PALETTE.brightGold },
      { box: CHRISTMAS_PALETTE.holly, ribbon: CHRISTMAS_PALETTE.ivory },
      { box: CHRISTMAS_PALETTE.sapphire, ribbon: CHRISTMAS_PALETTE.champagne },
      { box: CHRISTMAS_PALETTE.amethyst, ribbon: CHRISTMAS_PALETTE.roseGold },
      { box: CHRISTMAS_PALETTE.emerald, ribbon: CHRISTMAS_PALETTE.brightGold },
      { box: CHRISTMAS_PALETTE.ruby, ribbon: CHRISTMAS_PALETTE.silver },
    ];
    
    return Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 2.5 + Math.random() * 2.5;
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * dist,
          -8.5 + Math.random() * 0.2,
          Math.sin(angle) * dist
        ),
        scale: 0.7 + Math.random() * 0.5,
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

      {/* 全新伯利恒之星 */}
      <BethlehemStar position={[0, 9.5, 0]} scale={1.1} />

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
