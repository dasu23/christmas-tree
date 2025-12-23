
import React, { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeContext, TreeContextType } from '../types';

// 糖果棒组件
const CandyCane: React.FC<{ position: THREE.Vector3; scale: number; rotation: number }> = ({ position, scale, rotation }) => {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, Math.PI / 6]}>
      {/* 主杆 */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* 红色条纹 */}
      {[0, 0.15, 0.3, 0.45].map((y, i) => (
        <mesh key={i} position={[0, y + 0.05, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.08, 8]} />
          <meshStandardMaterial color="#cc0000" roughness={0.3} emissive="#cc0000" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {/* 弯钩 */}
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
      // 轻微摇摆动画
      bellRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + position.x * 10) * 0.1;
    }
  });
  
  return (
    <group ref={bellRef} position={position} scale={scale}>
      {/* 铃铛主体 */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2} 
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* 铃铛底部 */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.05, 16]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </mesh>
      {/* 铃舌 */}
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.9} />
      </mesh>
      {/* 顶部环 */}
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.03, 0.015, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
};

// 礼物盒组件
const GiftBox: React.FC<{ position: THREE.Vector3; scale: number; color: string; ribbonColor: string }> = ({ position, scale, color, ribbonColor }) => {
  return (
    <group position={position} scale={scale}>
      {/* 盒子主体 */}
      <mesh>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* 水平丝带 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.52, 0.08, 0.52]} />
        <meshStandardMaterial color={ribbonColor} roughness={0.3} metalness={0.3} emissive={ribbonColor} emissiveIntensity={0.2} />
      </mesh>
      {/* 垂直丝带 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.42, 0.52]} />
        <meshStandardMaterial color={ribbonColor} roughness={0.3} metalness={0.3} emissive={ribbonColor} emissiveIntensity={0.2} />
      </mesh>
      {/* 蝴蝶结 */}
      <group position={[0, 0.25, 0]}>
        <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color={ribbonColor} roughness={0.3} />
        </mesh>
        <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color={ribbonColor} roughness={0.3} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={ribbonColor} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

// 五角星组件
const StarTopper: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const starRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (starRef.current) {
      starRef.current.rotation.y += 0.01;
    }
    if (glowRef.current) {
      // 脉冲光芒
      glowRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 3) * 1.5;
    }
  });
  
  // 创建五角星形状
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
        <extrudeGeometry args={[starShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 }]} />
        <meshStandardMaterial 
          color="#ffd700" 
          emissive="#ffaa00" 
          emissiveIntensity={2}
          roughness={0.1}
          metalness={1.0}
          toneMapped={false}
        />
      </mesh>
      
      {/* 发光点 */}
      <pointLight ref={glowRef} intensity={3} color="#ffdd00" distance={15} decay={2} />
      
      {/* 光芒射线 */}
      {[0, 72, 144, 216, 288].map((angle, i) => (
        <mesh key={i} rotation={[0, 0, (angle * Math.PI) / 180]} position={[0, 0, 0.1]}>
          <planeGeometry args={[0.02, 1.2]} />
          <meshBasicMaterial color="#ffff88" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

const CrystalOrnaments: React.FC = () => {
  const { state, rotationSpeed, panOffset } = useContext(TreeContext) as TreeContextType;
  const groupRef = useRef<THREE.Group>(null);
  const ornamentRefs = useRef<THREE.Mesh[]>([]);

  const progress = useRef(0);
  const treeRotation = useRef(0);
  const currentPan = useRef({ x: 0, y: 0 });

  const ornaments = useMemo(() => {
    const count = 40;
    const items = [];

    // Christmas colors
    const ballColors = ['#cc0000', '#00cc00', '#0066cc', '#cc6600', '#cc00cc'];
    const metallicColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const h = t * 13 - 6;
      const r = (8.5 - h) * 0.6 + 0.3;
      const angle = t * Math.PI * 13;

      const radius = 10 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const chaosPos = [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ];

      // 更多种类的装饰
      const typeRand = Math.random();
      let type: 'bauble' | 'bauble-matte' | 'candy-cane' | 'bell' = 'bauble';
      if (typeRand > 0.85) type = 'candy-cane';
      else if (typeRand > 0.7) type = 'bell';
      else if (typeRand > 0.5) type = 'bauble-matte';

      const color = typeRand > 0.6 
        ? metallicColors[Math.floor(Math.random() * metallicColors.length)]
        : ballColors[Math.floor(Math.random() * ballColors.length)];

      items.push({
        id: i,
        chaosPos: new THREE.Vector3(...chaosPos),
        treeCyl: { h, r, angle },
        type,
        color,
        scale: Math.random() * 0.15 + 0.12
      });
    }
    return items;
  }, []);

  // 礼物盒数据
  const gifts = useMemo(() => {
    const giftColors = [
      { box: '#cc0000', ribbon: '#ffd700' },
      { box: '#00cc00', ribbon: '#ffffff' },
      { box: '#0066cc', ribbon: '#ffcc00' },
      { box: '#9933cc', ribbon: '#00ffcc' },
      { box: '#ff6600', ribbon: '#ffffff' },
    ];
    
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 2 + Math.random() * 2;
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * dist,
          -8.5 + Math.random() * 0.3,
          Math.sin(angle) * dist
        ),
        scale: 0.8 + Math.random() * 0.6,
        colors: giftColors[i % giftColors.length],
        rotation: Math.random() * Math.PI * 2
      };
    });
  }, []);

  useFrame((state3d, delta) => {
    const targetProgress = state === 'FORMED' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 2.0, delta);
    const p = progress.current;
    const ease = p * p * (3 - 2 * p);

    const spinFactor = state === 'FORMED' ? rotationSpeed : 0.05;
    treeRotation.current += spinFactor * delta;

    const targetPanX = panOffset.x;
    const targetPanY = panOffset.y;

    currentPan.current.x = THREE.MathUtils.lerp(currentPan.current.x, targetPanX, 0.2);
    currentPan.current.y = THREE.MathUtils.lerp(currentPan.current.y, targetPanY, 0.2);

    if (groupRef.current) {
      groupRef.current.position.x = currentPan.current.x;
      groupRef.current.position.y = currentPan.current.y;

      // 更新普通装饰物
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

        const vortexTwist = (1 - ease) * 12.0;
        const currentAngle = angle + vortexTwist + treeRotation.current;

        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.1);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.1);

        const tX = currentR * Math.cos(currentAngle);
        const tZ = currentR * Math.sin(currentAngle);

        child.position.x = THREE.MathUtils.lerp(cRotatedX, tX, ease);
        child.position.y = y;
        child.position.z = THREE.MathUtils.lerp(cRotatedZ, tZ, ease);

        child.rotation.x += delta * (1 - ease) * 0.5;
        child.rotation.y += delta * (1 - ease) * 0.5;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* 圣诞球装饰 */}
      {ornaments.map((o, i) => {
        if (o.type === 'candy-cane') {
          return (
            <group key={i} ref={(el) => { if (el) ornamentRefs.current[i] = el as unknown as THREE.Mesh; }}>
              <CandyCane position={new THREE.Vector3(0, 0, 0)} scale={o.scale * 2} rotation={o.treeCyl.angle} />
            </group>
          );
        }
        if (o.type === 'bell') {
          return (
            <group key={i} ref={(el) => { if (el) ornamentRefs.current[i] = el as unknown as THREE.Mesh; }}>
              <Bell position={new THREE.Vector3(0, 0, 0)} scale={o.scale * 2.5} color={o.color} />
            </group>
          );
        }
        // 圣诞球
        return (
          <mesh 
            key={i} 
            ref={(el) => { if (el) ornamentRefs.current[i] = el; }}
            scale={o.scale * 0.8} 
            castShadow 
            receiveShadow
          >
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial
              color={o.color}
              roughness={o.type === 'bauble-matte' ? 0.7 : 0.15}
              metalness={o.type === 'bauble-matte' ? 0.1 : 0.9}
              emissive={o.color}
              emissiveIntensity={o.type === 'bauble-matte' ? 0.1 : 0.4}
            />
          </mesh>
        );
      })}

      {/* 顶部五角星 */}
      <StarTopper position={[0, 9.2, 0]} scale={0.8} />

      {/* 礼物盒 - 只在 FORMED 状态显示 */}
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
