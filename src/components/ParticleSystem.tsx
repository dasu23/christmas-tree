import React, { useRef, useMemo, useContext, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeContext, TreeContextType, ParticleConfig } from '../types';
import { getParticleTexture, ParticleShape } from '../utils/textureGenerator';
import * as random from 'maath/random/dist/maath-random.esm';

// 粒子系统着色器 - 降低亮度，更自然的效果
const particleVertexShader = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uSpread;
  uniform float uHover;
  
  attribute float size;
  attribute vec3 targetPosition;
  attribute float randomOffset;
  
  varying vec3 vPosition;
  varying float vAlpha;
  varying float vSize;
  varying float vDepth;
  
  // 简化的噪声函数
  float noise(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
  }
  
  // 旋涡位移 - 更温和
  vec3 vortexDisplacement(vec3 pos, float time) {
    float angle = time * 0.3 + pos.y * 0.2;
    float radius = length(pos.xz);
    float twist = sin(pos.y * 0.3 + time) * 0.2;
    
    vec3 displaced = pos;
    displaced.x += sin(angle + twist) * radius * 0.05;
    displaced.z += cos(angle + twist) * radius * 0.05;
    displaced.y += sin(time * 0.2 + randomOffset * 6.28) * 0.15;
    
    return displaced;
  }
  
  void main() {
    vPosition = position;
    
    // 插值当前位置到目标位置
    vec3 currentPos = mix(position, targetPosition, uSpread);
    
    // 添加旋涡动画
    currentPos = vortexDisplacement(currentPos, uTime);
    
    // 悬停扩散效果
    currentPos *= 1.0 + uHover * 0.1;
    
    // 整体缩放
    currentPos *= uScale;
    
    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // 大小计算 - 降低整体大小
    float sizeMultiplier = mix(1.2, 0.6, (position.y + 8.0) / 16.0);
    float baseSize = size * uPixelRatio * sizeMultiplier * 0.7;
    
    // 距离衰减
    gl_PointSize = baseSize * (120.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.5, 60.0);
    
    vSize = gl_PointSize;
    vDepth = -mvPosition.z;
    
    // Alpha 计算 - 降低透明度
    float heightFade = smoothstep(-8.0, 8.0, position.y);
    float distanceFade = 1.0 - smoothstep(40.0, 80.0, -mvPosition.z);
    vAlpha = heightFade * distanceFade * 0.65;
  }
`;

const particleFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uColorMix;
  
  varying vec3 vPosition;
  varying float vAlpha;
  varying float vSize;
  varying float vDepth;
  
  void main() {
    vec4 texColor = texture2D(uTexture, gl_PointCoord);
    
    // 圣诞主题色混合 - 降低饱和度
    vec3 baseColor = texColor.rgb;
    vec3 tintedColor = mix(baseColor, uColor, uColorMix * 0.6);
    
    // 闪烁效果 - 更柔和
    float sparkle = sin(uTime * 1.5 + vPosition.x * 5.0 + vPosition.y * 4.0) * 0.08 + 0.92;
    tintedColor *= sparkle;
    
    // 深度衰减 - 远处粒子更暗
    float depthFade = 1.0 - smoothstep(20.0, 60.0, vDepth) * 0.3;
    tintedColor *= depthFade;
    
    // 边缘柔化
    float alpha = texColor.a * vAlpha;
    
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(tintedColor, alpha);
  }
`;

// 生成圣诞树形状的粒子位置 - 减少数量
function generateTreePositions(count: number): { chaos: Float32Array; tree: Float32Array; sizes: Float32Array } {
  const chaosPositions = new Float32Array(count * 3);
  const treePositions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  
  // 混沌分布（球形）
  const sphere = random.inSphere(new Float32Array(count * 3), { radius: 25 });
  for (let i = 0; i < count * 3; i++) {
    chaosPositions[i] = sphere[i];
  }
  
  // 圣诞树形状分布 - 更稀疏，更自然
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // 高度分布
    const h = Math.pow(Math.random(), 0.7) * 16;
    
    // 锥形半径
    const maxRadius = (16 - h) * 0.52;
    const r = Math.pow(Math.random(), 0.6) * maxRadius;
    
    // 角度（带螺旋）
    const angle = Math.random() * Math.PI * 2;
    const spiralOffset = Math.sin(h * 0.5 + angle * 2) * 0.3;
    
    treePositions[i3] = Math.cos(angle) * (r + spiralOffset);
    treePositions[i3 + 1] = h - 7.5;
    treePositions[i3 + 2] = Math.sin(angle) * (r + spiralOffset);
    
    // 随机大小 - 稍大一点
    sizes[i] = Math.random() * 3.0 + 1.2;
  }
  
  return { chaos: chaosPositions, tree: treePositions, sizes };
}

interface ParticleSystemProps {
  config?: ParticleConfig;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ config }) => {
  const {
    state,
    rotationSpeed,
    rotationBoost,
    pointer,
    panOffset,
    particleConfig
  } = useContext(TreeContext) as TreeContextType;
  
  const finalConfig = config || particleConfig;
  const { gl } = useThree();
  
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const progress = useRef(0);
  const treeRotation = useRef(0);
  const currentPan = useRef({ x: 0, y: 0 });
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  
  // 减少粒子数量 - 从8000减少到3000
  const particleCount = Math.min(finalConfig?.count || 3000, 4000);
  
  // 生成粒子数据
  const particleData = useMemo(() => {
    return generateTreePositions(particleCount);
  }, [particleCount]);
  
  // 随机偏移属性
  const randomOffsets = useMemo(() => {
    const offsets = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      offsets[i] = Math.random();
    }
    return offsets;
  }, [particleCount]);
  
  // 更新纹理
  useEffect(() => {
    const shape = finalConfig?.shape || 'sphere';
    const colors = finalConfig?.colors || { primary: '#228b22', glow: '#ffffff' };
    
    const newTexture = getParticleTexture(shape as ParticleShape, {
      size: 128,
      color: colors.primary,
      glowColor: colors.glow
    });
    
    setTexture(newTexture);
    
    return () => {
      // 不在这里dispose，因为纹理会被缓存
    };
  }, [finalConfig?.shape, finalConfig?.colors?.primary, finalConfig?.colors?.glow]);
  
  // Uniforms - 调整默认颜色为圣诞绿
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    uTexture: { value: texture },
    uColor: { value: new THREE.Color(finalConfig?.colors?.primary || '#228b22') },
    uScale: { value: 1.0 },
    uSpread: { value: 0 },
    uHover: { value: 0 },
    uColorMix: { value: finalConfig?.colorMix || 0.2 }
  }), [texture, finalConfig?.colors?.primary, finalConfig?.colorMix]);
  
  // 更新uniforms
  useEffect(() => {
    if (materialRef.current && texture) {
      materialRef.current.uniforms.uTexture.value = texture;
    }
  }, [texture]);
  
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value = new THREE.Color(
        finalConfig?.colors?.primary || '#228b22'
      );
      materialRef.current.uniforms.uColorMix.value = finalConfig?.colorMix || 0.2;
    }
  }, [finalConfig?.colors?.primary, finalConfig?.colorMix]);
  
  // 动画循环
  useFrame((state3d, delta) => {
    // 状态过渡
    const targetProgress = state === 'FORMED' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 2.5, delta);
    
    // 旋转
    const spinSpeed = state === 'FORMED' ? (rotationSpeed + rotationBoost) : 0.08;
    treeRotation.current += spinSpeed * delta;
    
    // 平移
    currentPan.current.x = THREE.MathUtils.lerp(currentPan.current.x, panOffset.x, 0.15);
    currentPan.current.y = THREE.MathUtils.lerp(currentPan.current.y, panOffset.y, 0.15);
    
    if (groupRef.current) {
      groupRef.current.position.x = currentPan.current.x;
      groupRef.current.position.y = currentPan.current.y;
      groupRef.current.rotation.y = treeRotation.current;
    }
    
    // 更新shader uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state3d.clock.getElapsedTime();
      materialRef.current.uniforms.uSpread.value = progress.current;
      materialRef.current.uniforms.uScale.value = finalConfig?.scale || 1.0;
      materialRef.current.uniforms.uHover.value = pointer ? 0.2 : 0;
    }
    
    // 更新粒子位置（混沌<->树形过渡）
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const ease = progress.current * progress.current * (3 - 2 * progress.current);
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        const cx = particleData.chaos[i3];
        const cy = particleData.chaos[i3 + 1];
        const cz = particleData.chaos[i3 + 2];
        
        const tx = particleData.tree[i3];
        const ty = particleData.tree[i3 + 1];
        const tz = particleData.tree[i3 + 2];
        
        // 混沌位置旋转
        const cr = Math.sqrt(cx * cx + cz * cz);
        const cAngle = Math.atan2(cz, cx);
        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.3);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.3);
        
        // 树形位置旋转和旋涡效果
        const tr = Math.sqrt(tx * tx + tz * tz);
        const tAngle = Math.atan2(tz, tx);
        const vortexTwist = (1 - ease) * 10.0;
        const currentAngle = tAngle + vortexTwist;
        
        // 插值
        positions[i3] = THREE.MathUtils.lerp(cRotatedX, tr * Math.cos(currentAngle), ease);
        positions[i3 + 1] = THREE.MathUtils.lerp(cy, ty, ease);
        positions[i3 + 2] = THREE.MathUtils.lerp(cRotatedZ, tr * Math.sin(currentAngle), ease);
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  if (!texture) return null;
  
  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particleData.chaos.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-targetPosition"
            count={particleCount}
            array={particleData.tree}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={particleData.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-randomOffset"
            count={particleCount}
            array={randomOffsets}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={particleVertexShader}
          fragmentShader={particleFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export default ParticleSystem;
