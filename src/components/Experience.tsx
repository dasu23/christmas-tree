
import React, { useContext, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import TreeSystem from './TreeSystem';
import CrystalOrnaments from './CrystalOrnaments';
import { TreeContext, TreeContextType } from '../types';

// --- 飘落雪花组件 ---
const FallingSnow: React.FC = () => {
  const snowRef = useRef<THREE.Points>(null);
  const particleCount = 2000;
  
  const { positions, velocities, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // 随机初始位置 - 大范围分布
      positions[i3] = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = Math.random() * 40 - 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;
      
      // 下落速度 + 水平漂移
      velocities[i3] = (Math.random() - 0.5) * 0.02;     // X 漂移
      velocities[i3 + 1] = -(Math.random() * 0.03 + 0.02); // Y 下落
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;   // Z 漂移
      
      // 随机大小
      sizes[i] = Math.random() * 3 + 1;
    }
    
    return { positions, velocities, sizes };
  }, []);
  
  useFrame((state) => {
    if (!snowRef.current) return;
    
    const posArray = snowRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // 更新位置
      posArray[i3] += velocities[i3] + Math.sin(time * 0.5 + i) * 0.01;
      posArray[i3 + 1] += velocities[i3 + 1];
      posArray[i3 + 2] += velocities[i3 + 2] + Math.cos(time * 0.3 + i) * 0.01;
      
      // 重置超出边界的雪花
      if (posArray[i3 + 1] < -15) {
        posArray[i3] = (Math.random() - 0.5) * 60;
        posArray[i3 + 1] = 25 + Math.random() * 10;
        posArray[i3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    
    snowRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={snowRef}>
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
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// --- 地面雪地效果 ---
const SnowGround: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10.5, 0]} receiveShadow>
      <circleGeometry args={[25, 64]} />
      <meshStandardMaterial 
        color="#e8f4f8" 
        roughness={0.9} 
        metalness={0.0}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
};

const Rig = () => {
  const { state, zoomOffset } = useContext(TreeContext) as TreeContextType;
  useFrame((state3d) => {
    const t = state3d.clock.getElapsedTime();
    const baseZ = state === 'CHAOS' ? 28 : 24;
    const targetZ = Math.max(10, Math.min(baseZ + zoomOffset, 60));
    const targetY = state === 'CHAOS' ? 3 : 1;

    state3d.camera.position.z = THREE.MathUtils.lerp(state3d.camera.position.z, targetZ + Math.sin(t * 0.15) * 1.5, 0.02);
    state3d.camera.position.y = THREE.MathUtils.lerp(state3d.camera.position.y, targetY + Math.cos(t * 0.15) * 0.8, 0.02);
    state3d.camera.position.x = THREE.MathUtils.lerp(state3d.camera.position.x, Math.sin(t * 0.1) * 2, 0.01);
    state3d.camera.lookAt(0, 0, 0);
  });
  return null;
};

const Experience: React.FC = () => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 24], fov: 45, near: 0.1, far: 150 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        stencil: false,
        depth: true
      }}
    >
      {/* 温暖的圣诞氛围光照 */}
      <ambientLight intensity={0.3} color="#1a0a2e" />
      
      {/* 主光源 - 温暖的聚光灯 */}
      <spotLight
        position={[8, 25, 12]}
        angle={0.4}
        penumbra={1}
        intensity={15}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* 补光 - 绿色反射光 */}
      <pointLight position={[-8, 0, -8]} intensity={2} color="#1a5c1a" distance={20} />
      
      {/* 顶部金色光芒 */}
      <pointLight position={[0, 12, 0]} intensity={4} color="#ffcc00" distance={15} decay={2} />
      
      {/* 底部暖光 */}
      <pointLight position={[0, -8, 5]} intensity={1.5} color="#ff6600" distance={12} />
      
      {/* 侧面冷光对比 */}
      <pointLight position={[15, 5, -10]} intensity={1} color="#4488ff" distance={25} />

      {/* 夜空星星 */}
      <Stars radius={80} depth={60} count={4000} factor={5} saturation={0.1} fade speed={0.8} />

      {/* 多层闪烁光点 - 营造魔幻氛围 */}
      <Sparkles count={400} scale={30} size={5} speed={0.2} opacity={0.7} color="#ffd700" />
      <Sparkles count={300} scale={35} size={4} speed={0.15} opacity={0.5} color="#ffffff" />
      <Sparkles count={200} scale={25} size={3} speed={0.3} opacity={0.4} color="#ff9999" />
      <Sparkles count={200} scale={25} size={3} speed={0.25} opacity={0.4} color="#99ff99" />
      
      {/* 飘落的雪花 */}
      <FallingSnow />
      
      {/* 补充环境光 */}
      <hemisphereLight args={['#1a1a3a', '#0a1a0a', 0.4]} />

      {/* 主场景内容 */}
      <group position={[0, -2, 0]}>
        <TreeSystem />
        <CrystalOrnaments />
        <SnowGround />
      </group>

      {/* 轨道控制 */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={10}
        maxDistance={50}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 6}
        target={[0, 2, 0]}
        enableDamping
        dampingFactor={0.05}
      />
      <Rig />

      {/* 后处理效果 */}
      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.8}
          mipmapBlur
          intensity={0.8}
          radius={0.6}
          levels={9}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0005, 0.0005)}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
};

export default Experience;
