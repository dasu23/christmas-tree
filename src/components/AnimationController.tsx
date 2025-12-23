import React, { useContext, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeContext, TreeContextType, AnimationEffect } from '../types';

// 动画效果函数类型
type AnimationFunction = (
  position: THREE.Vector3,
  time: number,
  intensity: number,
  index: number
) => THREE.Vector3;

// 螺旋动画效果
const spiralAnimation: AnimationFunction = (position, time, intensity, index) => {
  const angle = time * 0.5 + index * 0.01;
  const radius = position.length();
  const heightFactor = (position.y + 8) / 16;
  
  return new THREE.Vector3(
    position.x + Math.sin(angle) * radius * 0.1 * intensity,
    position.y + Math.sin(time * 0.3 + index * 0.1) * 0.2 * intensity,
    position.z + Math.cos(angle) * radius * 0.1 * intensity
  );
};

// 波浪动画效果
const waveAnimation: AnimationFunction = (position, time, intensity, index) => {
  const wave = Math.sin(position.x * 0.5 + time) * Math.cos(position.z * 0.5 + time);
  
  return new THREE.Vector3(
    position.x + Math.sin(time + position.z * 0.3) * 0.1 * intensity,
    position.y + wave * 0.5 * intensity,
    position.z + Math.cos(time + position.x * 0.3) * 0.1 * intensity
  );
};

// 脉冲动画效果
const pulseAnimation: AnimationFunction = (position, time, intensity, index) => {
  const pulse = (Math.sin(time * 2) + 1) * 0.5;
  const scale = 1 + pulse * 0.15 * intensity;
  
  return new THREE.Vector3(
    position.x * scale,
    position.y * scale,
    position.z * scale
  );
};

// 漩涡动画效果
const vortexAnimation: AnimationFunction = (position, time, intensity, index) => {
  const radius = Math.sqrt(position.x * position.x + position.z * position.z);
  const angle = Math.atan2(position.z, position.x);
  const twist = time * 0.3 * intensity;
  const heightTwist = position.y * 0.1 * intensity;
  
  const newAngle = angle + twist + heightTwist;
  
  return new THREE.Vector3(
    radius * Math.cos(newAngle),
    position.y + Math.sin(time + radius * 0.5) * 0.1 * intensity,
    radius * Math.sin(newAngle)
  );
};

// 动画效果映射
const animationEffects: Record<AnimationEffect, AnimationFunction | null> = {
  none: null,
  spiral: spiralAnimation,
  wave: waveAnimation,
  pulse: pulseAnimation,
  vortex: vortexAnimation
};

// 缓动函数
const easings = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
  elastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export type EasingType = keyof typeof easings;

interface AnimationControllerProps {
  children?: React.ReactNode;
}

// 动画控制钩子
export function useAnimationController() {
  const {
    state,
    particleConfig,
    gestureState,
    spreadFactor,
    attractorPoint
  } = useContext(TreeContext) as TreeContextType;
  
  const timeRef = useRef(0);
  const transitionRef = useRef(0);
  const targetTransitionRef = useRef(0);
  
  // 更新时间和过渡
  useFrame((_, delta) => {
    timeRef.current += delta * particleConfig.animationSpeed;
    
    // 计算目标过渡值
    targetTransitionRef.current = state === 'FORMED' ? 1 : 0;
    
    // 平滑过渡
    transitionRef.current = THREE.MathUtils.lerp(
      transitionRef.current,
      targetTransitionRef.current,
      delta * 2.5
    );
  });
  
  // 获取当前动画效果函数
  const getAnimationEffect = useMemo(() => {
    return animationEffects[particleConfig.effect] || null;
  }, [particleConfig.effect]);
  
  // 应用动画效果到位置
  const applyAnimation = (
    position: THREE.Vector3,
    index: number
  ): THREE.Vector3 => {
    if (!getAnimationEffect) return position;
    
    return getAnimationEffect(
      position,
      timeRef.current,
      particleConfig.spreadIntensity,
      index
    );
  };
  
  // 计算扩散效果
  const calculateSpread = (
    chaosPosition: THREE.Vector3,
    treePosition: THREE.Vector3,
    index: number
  ): THREE.Vector3 => {
    const ease = transitionRef.current * transitionRef.current * (3 - 2 * transitionRef.current);
    
    // 手势控制的额外扩散
    const gestureSpread = gestureState.isOpen ? spreadFactor * 0.3 : 0;
    const totalSpread = ease + gestureSpread;
    
    // 插值位置
    const result = new THREE.Vector3().lerpVectors(
      chaosPosition,
      treePosition,
      Math.min(totalSpread, 1)
    );
    
    // 吸引点效果
    if (attractorPoint && state === 'CHAOS') {
      const attractorWorld = new THREE.Vector3(
        (attractorPoint.x - 0.5) * 30,
        -(attractorPoint.y - 0.5) * 20,
        0
      );
      
      const distance = result.distanceTo(attractorWorld);
      const attractionStrength = Math.max(0, 1 - distance / 15) * 0.3;
      
      result.lerp(attractorWorld, attractionStrength);
    }
    
    // 应用动画效果
    return applyAnimation(result, index);
  };
  
  // 计算颜色过渡
  const calculateColor = (
    baseColor: THREE.Color,
    index: number
  ): THREE.Color => {
    const time = timeRef.current;
    const color = baseColor.clone();
    
    // 闪烁效果
    const sparkle = Math.sin(time * 3 + index * 0.1) * 0.15 + 0.85;
    color.multiplyScalar(sparkle);
    
    // 手势响应
    if (gestureState.isOpen) {
      const brightness = 1 + gestureState.openness * 0.3;
      color.multiplyScalar(brightness);
    }
    
    return color;
  };
  
  // 计算大小过渡
  const calculateSize = (
    baseSize: number,
    index: number
  ): number => {
    const time = timeRef.current;
    
    // 脉冲效果
    const pulse = (Math.sin(time * 2 + index * 0.05) + 1) * 0.5;
    let size = baseSize * (0.9 + pulse * 0.2);
    
    // 手势响应
    if (gestureState.isOpen) {
      size *= 1 + gestureState.openness * 0.2;
    }
    
    return size * particleConfig.size;
  };
  
  return {
    time: timeRef.current,
    transition: transitionRef.current,
    applyAnimation,
    calculateSpread,
    calculateColor,
    calculateSize,
    easings
  };
}

// 动画控制器组件（提供全局动画状态）
const AnimationController: React.FC<AnimationControllerProps> = ({ children }) => {
  const { particleConfig } = useContext(TreeContext) as TreeContextType;
  
  // 性能监控
  const frameTimeRef = useRef<number[]>([]);
  const lastFrameRef = useRef(performance.now());
  
  useFrame(() => {
    const now = performance.now();
    const frameTime = now - lastFrameRef.current;
    lastFrameRef.current = now;
    
    // 保留最近60帧的数据
    frameTimeRef.current.push(frameTime);
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift();
    }
  });
  
  // 获取平均帧时间
  const getAverageFrameTime = () => {
    if (frameTimeRef.current.length === 0) return 16.67;
    return frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
  };
  
  // 获取FPS
  const getFPS = () => {
    return Math.round(1000 / getAverageFrameTime());
  };
  
  // 自动调整粒子数量以维持性能
  useEffect(() => {
    const checkPerformance = setInterval(() => {
      const fps = getFPS();
      if (fps < 30 && particleConfig.count > 2000) {
        console.warn(`Low FPS detected (${fps}), consider reducing particle count`);
      }
    }, 5000);
    
    return () => clearInterval(checkPerformance);
  }, [particleConfig.count]);
  
  return <>{children}</>;
};

export default AnimationController;

