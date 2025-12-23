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

// --- 极光材质 ---
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
      for (int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec2 uv = vUv;
      
      float n1 = fbm(vec2(uv.x * 3.0 + uTime * 0.1, uv.y * 2.0));
      float n2 = fbm(vec2(uv.x * 2.0 - uTime * 0.15, uv.y * 3.0 + uTime * 0.05));
      
      vec3 color1 = vec3(0.1, 0.8, 0.4);
      vec3 color2 = vec3(0.2, 0.4, 0.9);
      vec3 color3 = vec3(0.8, 0.2, 0.6);
      
      vec3 color = mix(color1, color2, n1);
      color = mix(color, color3, n2 * 0.5);
      
      float alpha = smoothstep(0.0, 0.5, uv.y) * 0.3;
      alpha *= (n1 + n2) * 0.5;
      alpha *= smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
      
      gl_FragColor = vec4(color, alpha * 0.4);
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
    <mesh ref={meshRef} position={[0, 30, -50]} rotation={[-0.2, 0, 0]}>
      <planeGeometry args={[120, 40, 32, 32]} />
      <auroraMaterial transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

// --- 飘落雪花组件 ---
const FallingSnow: React.FC = () => {
  const snowRef = useRef<THREE.Points>(null);
  const particleCount = 3000;
  
  const { positions, velocities, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = Math.random() * 50 - 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 80;
      
      velocities[i3] = (Math.random() - 0.5) * 0.015;
      velocities[i3 + 1] = -(Math.random() * 0.04 + 0.02);
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.015;
      
      sizes[i] = Math.random() * 4 + 1;
    }
    
    return { positions, velocities, sizes };
  }, []);
  
  useFrame((state) => {
    if (!snowRef.current) return;
    
    const posArray = snowRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      posArray[i3] += velocities[i3] + Math.sin(time * 0.3 + i * 0.1) * 0.008;
      posArray[i3 + 1] += velocities[i3 + 1];
      posArray[i3 + 2] += velocities[i3 + 2] + Math.cos(time * 0.2 + i * 0.1) * 0.008;
      
      if (posArray[i3 + 1] < -20) {
        posArray[i3] = (Math.random() - 0.5) * 80;
        posArray[i3 + 1] = 30 + Math.random() * 15;
        posArray[i3 + 2] = (Math.random() - 0.5) * 80;
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
        size={0.18}
        color="#ffffff"
        transparent
        opacity={0.85}
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
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10.5, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial 
          color="#d4e5ed" 
          roughness={0.95} 
          metalness={0.0}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 8 + Math.random() * 4;
        return (
          <mesh 
            key={i}
            position={[Math.cos(angle) * dist, -10, Math.sin(angle) * dist]}
            rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
          >
            <sphereGeometry args={[1 + Math.random(), 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e8f4f8" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};

// --- 浮动装饰物 ---
const FloatingDecor: React.FC = () => {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0.5} floatIntensity={2}>
          <mesh position={[
            (Math.random() - 0.5) * 30,
            Math.random() * 15 + 5,
            (Math.random() - 0.5) * 30
          ]}>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#aaddff"
              emissiveIntensity={0.3}
              transparent 
              opacity={0.7}
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
    const baseZ = state === 'CHAOS' ? 30 : 26;
    const targetZ = Math.max(12, Math.min(baseZ + zoomOffset, 65));
    const targetY = state === 'CHAOS' ? 4 : 2;

    state3d.camera.position.z = THREE.MathUtils.lerp(state3d.camera.position.z, targetZ + Math.sin(t * 0.12) * 2, 0.02);
    state3d.camera.position.y = THREE.MathUtils.lerp(state3d.camera.position.y, targetY + Math.cos(t * 0.12) * 1, 0.02);
    state3d.camera.position.x = THREE.MathUtils.lerp(state3d.camera.position.x, Math.sin(t * 0.08) * 3, 0.01);
    state3d.camera.lookAt(0, 1, 0);
  });
  
  // 监听重置相机事件
  useEffect(() => {
    const handleReset = () => {
      // 相机重置会在下一帧自动处理
    };
    window.addEventListener('resetCamera', handleReset);
    return () => window.removeEventListener('resetCamera', handleReset);
  }, []);
  
  return null;
};

// --- 主Experience组件 ---
const Experience: React.FC = () => {
  const { particleConfig, gestureState } = useContext(TreeContext) as TreeContextType;
  
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2, 28], fov: 50, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        stencil: false,
        depth: true
      }}
    >
      {/* 深蓝色夜空背景 */}
      <color attach="background" args={['#030812']} />
      <fog attach="fog" args={['#030812', 40, 100]} />
      
      {/* 环境光 */}
      <ambientLight intensity={0.25} color="#1a1a3a" />
      
      {/* 主聚光灯 */}
      <spotLight
        position={[5, 30, 15]}
        angle={0.35}
        penumbra={1}
        intensity={20}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      
      {/* 辅助光源 */}
      <pointLight position={[-12, 5, -12]} intensity={3} color="#1a5c1a" distance={25} />
      <pointLight position={[0, 15, 0]} intensity={6} color="#ffcc00" distance={20} decay={2} />
      <pointLight position={[0, -8, 8]} intensity={2} color="#ff6633" distance={15} />
      <pointLight position={[18, 8, -12]} intensity={1.5} color="#3366ff" distance={30} />
      <pointLight position={[-15, 3, 10]} intensity={1.5} color="#ff3366" distance={25} />
      
      {/* 聚光灯照射树顶 */}
      <spotLight
        position={[0, 25, 0]}
        angle={0.3}
        penumbra={0.5}
        intensity={8}
        color="#ffd700"
        target-position={[0, 8, 0]}
      />

      {/* 夜空星星 */}
      <Stars radius={100} depth={80} count={6000} factor={6} saturation={0.2} fade speed={0.6} />
      
      {/* 极光背景 */}
      <Aurora />

      {/* 多层闪烁光点 */}
      <Sparkles count={500} scale={40} size={6} speed={0.15} opacity={0.8} color="#ffd700" />
      <Sparkles count={400} scale={45} size={5} speed={0.1} opacity={0.6} color="#ffffff" />
      <Sparkles count={300} scale={35} size={4} speed={0.2} opacity={0.5} color="#ff8888" />
      <Sparkles count={300} scale={35} size={4} speed={0.18} opacity={0.5} color="#88ff88" />
      <Sparkles count={200} scale={30} size={3} speed={0.25} opacity={0.4} color="#8888ff" />
      
      {/* 飘落的雪花 */}
      <FallingSnow />
      
      {/* 浮动装饰 */}
      <FloatingDecor />
      
      {/* 半球环境光 */}
      <hemisphereLight args={['#1a2a4a', '#0a150a', 0.5]} />

      {/* 动画控制器 */}
      <AnimationController>
        {/* 主场景内容 */}
        <group position={[0, -2, 0]}>
          {/* 新的粒子系统 */}
          <ParticleSystem config={particleConfig} />
          
          {/* 装饰物 */}
          <CrystalOrnaments />
          
          {/* 雪地 */}
          <SnowGround />
        </group>
      </AnimationController>

      {/* 轨道控制 */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={12}
        maxDistance={55}
        maxPolarAngle={Math.PI / 1.4}
        minPolarAngle={Math.PI / 8}
        target={[0, 3, 0]}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
      
      <CameraRig />

      {/* 后处理效果 */}
      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.6}
          mipmapBlur
          intensity={1.0}
          radius={0.7}
          levels={9}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0008, 0.0008)}
        />
        <Vignette eskil={false} offset={0.2} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
};

export default Experience;
