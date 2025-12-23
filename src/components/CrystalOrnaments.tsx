
import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeContext, TreeContextType } from '../types';

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
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>
      {[0, 0.15, 0.3, 0.45].map((y, i) => (
        <mesh key={i} position={[0, y + 0.05, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.08, 8]} />
          <meshStandardMaterial color="#cc0000" roughness={0.3} emissive="#cc0000" emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[0.08, 0.58, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.05, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
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
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.9} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.05, 16]} />
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.9} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.95} />
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
  
  useFrame((state) => {
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
        <meshStandardMaterial color={ribbonColor} roughness={0.3} metalness={0.4} emissive={ribbonColor} emissiveIntensity={hovered ? 0.5 : 0.2} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.08, 0.42, 0.52]} />
        <meshStandardMaterial color={ribbonColor} roughness={0.3} metalness={0.4} emissive={ribbonColor} emissiveIntensity={hovered ? 0.5 : 0.2} />
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
      
      {/* 发光效果 */}
      {hovered && (
        <pointLight intensity={2} color={ribbonColor} distance={3} decay={2} />
      )}
    </group>
  );
};

// 发光五角星组件
const StarTopper: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const starRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const raysRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (starRef.current) {
      starRef.current.rotation.y += 0.015;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 5 + Math.sin(t * 4) * 2;
    }
    if (raysRef.current) {
      raysRef.current.rotation.z = t * 0.5;
      raysRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
    }
  });
  
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 0.5;
    const innerRadius = 0.2;
    const spikes = 5;
    
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);
  
  return (
    <group ref={starRef} position={position} scale={scale}>
      {/* 主星星 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <extrudeGeometry args={[starShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 }]} />
        <meshStandardMaterial 
          color="#ffd700" 
          emissive="#ffaa00" 
          emissiveIntensity={3}
          roughness={0.05}
          metalness={1.0}
          toneMapped={false}
        />
      </mesh>
      
      {/* 内核发光球 */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* 发光点 */}
      <pointLight ref={glowRef} intensity={5} color="#ffdd00" distance={20} decay={2} />
      
      {/* 光芒射线 */}
      <group ref={raysRef}>
        {[...Array(8)].map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]} position={[0, 0, 0.1]}>
            <planeGeometry args={[0.03, 1.5]} />
            <meshBasicMaterial color="#ffff99" transparent opacity={0.5} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
      
      {/* 光晕 */}
      <sprite scale={[3, 3, 1]}>
        <spriteMaterial color="#ffd700" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
};

// 发光圣诞球
const GlowingBauble: React.FC<{ 
  position: THREE.Vector3; 
  scale: number; 
  color: string; 
  metallic?: boolean;
}> = ({ position, scale, color, metallic = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
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
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
      </mesh>
      
      {/* 球体 */}
      <mesh 
        ref={meshRef}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={metallic ? 0.1 : 0.6}
          metalness={metallic ? 0.95 : 0.1}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </mesh>
      
      {/* 高光装饰 */}
      <mesh scale={scale * 0.95}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
      </mesh>
      
      {/* 悬停时的发光效果 */}
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

  const ornaments = useMemo(() => {
    const count = 45;
    const items = [];
    
    const ballColors = ['#cc0000', '#00aa00', '#0055aa', '#cc6600', '#aa00aa', '#008888'];
    const metallicColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#ff6b6b'];

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
        : ballColors[Math.floor(Math.random() * ballColors.length)];

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

  const gifts = useMemo(() => {
    const giftColors = [
      { box: '#cc0000', ribbon: '#ffd700' },
      { box: '#00aa00', ribbon: '#ffffff' },
      { box: '#0055aa', ribbon: '#ffcc00' },
      { box: '#9933cc', ribbon: '#00ffcc' },
      { box: '#ff6600', ribbon: '#ffffff' },
      { box: '#cc0066', ribbon: '#ffd700' },
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

  useFrame((state3d, delta) => {
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

      {/* 顶部五角星 */}
      <StarTopper position={[0, 9.5, 0]} scale={0.9} />

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
