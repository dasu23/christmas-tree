import React, { useContext, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, shaderMaterial, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import ParticleSystem from './ParticleSystem';
import CrystalOrnaments from './CrystalOrnaments';
import AnimationController from './AnimationController';
import { TreeContext, TreeContextType } from '../types';

// 优化的配色方案
const SCENE_COLORS = {
  // 背景渐变
  skyDark: '#020810',
  skyMid: '#0a1628',
  
  // 光照色温
  warmWhite: '#fff8f0',
  coolWhite: '#f0f8ff',
  golden: '#ffd700',
  amber: '#ffbf00',
  
  // 环境光
  ambientCool: '#1a2a4a',
  ambientWarm: '#2a1a0a',
  
  // 雪地
  snowPure: '#f5f9fc',
  snowShadow: '#d4e5ed',
  snowHighlight: '#ffffff'
};

// --- 优化的极光材质 ---
const AuroraMaterial = shaderMaterial(
  { uTime: 0 },
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * smoothNoise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec2 uv = vUv;
      
      float n1 = fbm(vec2(uv.x * 3.0 + uTime * 0.08, uv.y * 2.0));
      float n2 = fbm(vec2(uv.x * 2.0 - uTime * 0.12, uv.y * 3.0 + uTime * 0.04));
      float n3 = fbm(vec2(uv.x * 4.0 + uTime * 0.05, uv.y * 1.5 - uTime * 0.03));
      
      // 更柔和的极光颜色
      vec3 color1 = vec3(0.15, 0.85, 0.5);  // 翠绿
      vec3 color2 = vec3(0.3, 0.5, 0.95);   // 天蓝
      vec3 color3 = vec3(0.7, 0.3, 0.8);    // 紫罗兰
      vec3 color4 = vec3(0.95, 0.8, 0.4);   // 暖金
      
      vec3 color = mix(color1, color2, n1);
      color = mix(color, color3, n2 * 0.4);
      color = mix(color, color4, n3 * 0.2);
      
      float alpha = smoothstep(0.0, 0.6, uv.y) * 0.35;
      alpha *= (n1 + n2 + n3) * 0.4;
      alpha *= smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
      
      gl_FragColor = vec4(color, alpha * 0.5);
    }
  `
);
extend({ AuroraMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    auroraMaterial: any
  }
}

// --- 极光组件 ---
const Aurora: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      // @ts-ignore
      meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 35, -60]} rotation={[-0.15, 0, 0]}>
      <planeGeometry args={[150, 50, 32, 32]} />
      <auroraMaterial transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

// --- 优化的飘落雪花组件 ---
const FallingSnow: React.FC = () => {
  const snowRef = useRef<THREE.Points>(null);
  const particleCount = 2500;
  
  const { positions, velocities, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = Math.random() * 60 - 15;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;
      
      velocities[i3] = (Math.random() - 0.5) * 0.012;
      velocities[i3 + 1] = -(Math.random() * 0.035 + 0.015);
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.012;
      
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
      
      posArray[i3] += velocities[i3] + Math.sin(time * 0.25 + i * 0.08) * 0.006;
      posArray[i3 + 1] += velocities[i3 + 1];
      posArray[i3 + 2] += velocities[i3 + 2] + Math.cos(time * 0.18 + i * 0.08) * 0.006;
      
      if (posArray[i3 + 1] < -20) {
        posArray[i3] = (Math.random() - 0.5) * 100;
        posArray[i3 + 1] = 35 + Math.random() * 20;
        posArray[i3 + 2] = (Math.random() - 0.5) * 100;
      }
    }
    
    snowRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={snowRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={particleCount} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color={SCENE_COLORS.snowHighlight}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// --- 优化的地面雪地效果 ---
const SnowGround: React.FC = () => {
  return (
    <group>
      {/* 主雪地 - 更柔和的颜色 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10.5, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial 
          color={SCENE_COLORS.snowPure}
          roughness={0.92} 
          metalness={0.02}
          transparent
          opacity={0.75}
        />
      </mesh>
      
      {/* 雪堆 - 更自然的分布 */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 6 + Math.random() * 6;
        const size = 0.8 + Math.random() * 1.2;
        return (
          <mesh 
            key={i}
            position={[Math.cos(angle) * dist, -10.2, Math.sin(angle) * dist]}
            rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
          >
            <sphereGeometry args={[size, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial 
              color={SCENE_COLORS.snowPure}
              roughness={0.88}
              emissive={SCENE_COLORS.snowShadow}
              emissiveIntensity={0.05}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// --- 优化的浮动装饰物 ---
const FloatingDecor: React.FC = () => {
  const decorColors = ['#ffe4c4', '#e6e6fa', '#b0e0e6', '#ffefd5'];
  
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <Float key={i} speed={1.2 + Math.random() * 0.6} rotationIntensity={0.4} floatIntensity={1.8}>
          <mesh position={[
            (Math.random() - 0.5) * 35,
            Math.random() * 18 + 3,
            (Math.random() - 0.5) * 35
          ]}>
            <octahedronGeometry args={[0.25 + Math.random() * 0.15, 0]} />
            <meshStandardMaterial 
              color={decorColors[i % decorColors.length]}
              emissive={decorColors[i % decorColors.length]}
              emissiveIntensity={0.4}
              transparent 
              opacity={0.65}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
};

// --- 相机控制 ---
const CameraRig: React.FC = () => {
  const { state, zoomOffset } = useContext(TreeContext) as TreeContextType;
  
  useFrame((state3d) => {
    const t = state3d.clock.getElapsedTime();
    const baseZ = state === 'CHAOS' ? 32 : 26;
    const targetZ = Math.max(14, Math.min(baseZ + zoomOffset, 60));
    const targetY = state === 'CHAOS' ? 5 : 3;

    state3d.camera.position.z = THREE.MathUtils.lerp(state3d.camera.position.z, targetZ + Math.sin(t * 0.1) * 1.5, 0.018);
    state3d.camera.position.y = THREE.MathUtils.lerp(state3d.camera.position.y, targetY + Math.cos(t * 0.1) * 0.8, 0.018);
    state3d.camera.position.x = THREE.MathUtils.lerp(state3d.camera.position.x, Math.sin(t * 0.07) * 2.5, 0.012);
    state3d.camera.lookAt(0, 1.5, 0);
  });
  
  useEffect(() => {
    const handleReset = () => {};
    window.addEventListener('resetCamera', handleReset);
    return () => window.removeEventListener('resetCamera', handleReset);
  }, []);
  
  return null;
};

// --- 主Experience组件 ---
const Experience: React.FC = () => {
  const { particleConfig } = useContext(TreeContext) as TreeContextType;
  
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 3, 28], fov: 48, near: 0.1, far: 250 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
        stencil: false,
        depth: true
      }}
    >
      {/* 深邃夜空背景 */}
      <color attach="background" args={[SCENE_COLORS.skyDark]} />
      <fog attach="fog" args={[SCENE_COLORS.skyDark, 50, 120]} />
      
      {/* 环境光 - 更温暖柔和 */}
      <ambientLight intensity={0.3} color={SCENE_COLORS.ambientCool} />
      
      {/* 主聚光灯 - 温暖的顶部光 */}
      <spotLight
        position={[8, 35, 18]}
        angle={0.32}
        penumbra={1}
        intensity={25}
        color={SCENE_COLORS.warmWhite}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      
      {/* 优化的辅助光源 - 更协调的配色 */}
      <pointLight position={[-10, 8, -10]} intensity={4} color="#2e8b57" distance={30} decay={2} />
      <pointLight position={[0, 18, 0]} intensity={8} color={SCENE_COLORS.golden} distance={25} decay={2} />
      <pointLight position={[0, -6, 10]} intensity={2.5} color="#dc143c" distance={18} decay={2} />
      <pointLight position={[15, 10, -15]} intensity={2} color="#4169e1" distance={35} decay={2} />
      <pointLight position={[-12, 5, 12]} intensity={2} color="#da70d6" distance={28} decay={2} />
      
      {/* 树顶聚光 - 增强星星效果 */}
      <spotLight
        position={[0, 28, 5]}
        angle={0.25}
        penumbra={0.8}
        intensity={12}
        color={SCENE_COLORS.amber}
        target-position={[0, 10, 0]}
      />
      
      {/* 底部补光 */}
      <pointLight position={[0, -8, 0]} intensity={1.5} color="#ffefd5" distance={12} decay={2} />

      {/* 夜空星星 - 更丰富 */}
      <Stars radius={120} depth={100} count={8000} factor={5} saturation={0.15} fade speed={0.5} />
      
      {/* 极光背景 */}
      <Aurora />

      {/* 多层闪烁光点 - 优化颜色 */}
      <Sparkles count={400} scale={45} size={5} speed={0.12} opacity={0.75} color={SCENE_COLORS.golden} />
      <Sparkles count={350} scale={50} size={4} speed={0.08} opacity={0.55} color="#fffaf0" />
      <Sparkles count={250} scale={40} size={4} speed={0.18} opacity={0.45} color="#dc143c" />
      <Sparkles count={250} scale={40} size={4} speed={0.15} opacity={0.45} color="#2e8b57" />
      <Sparkles count={180} scale={35} size={3} speed={0.22} opacity={0.35} color="#87ceeb" />
      <Sparkles count={150} scale={30} size={3} speed={0.25} opacity={0.3} color="#dda0dd" />
      
      {/* 飘落的雪花 */}
      <FallingSnow />
      
      {/* 浮动装饰 */}
      <FloatingDecor />
      
      {/* 半球环境光 - 更自然 */}
      <hemisphereLight args={['#1e3a5f', '#0a1a0a', 0.6]} />

      {/* 动画控制器 */}
      <AnimationController>
        <group position={[0, -2, 0]}>
          <ParticleSystem config={particleConfig} />
          <CrystalOrnaments />
          <SnowGround />
        </group>
      </AnimationController>

      {/* 轨道控制 */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={14}
        maxDistance={55}
        maxPolarAngle={Math.PI / 1.35}
        minPolarAngle={Math.PI / 8}
        target={[0, 3.5, 0]}
        enableDamping
        dampingFactor={0.04}
        rotateSpeed={0.45}
      />
      
      <CameraRig />

      {/* 后处理效果 - 优化参数 */}
      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.5}
          mipmapBlur
          intensity={1.2}
          radius={0.75}
          levels={9}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0006, 0.0006)}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
};

export default Experience;
