import { createContext, Dispatch, SetStateAction } from 'react';

export type AppState = 'CHAOS' | 'FORMED';

// 粒子形状类型
export type ParticleShapeType = 'snowflake' | 'star' | 'giftbox' | 'sphere' | 'heart';

// 动画效果类型
export type AnimationEffect = 'none' | 'spiral' | 'wave' | 'pulse' | 'vortex';

// 指针坐标接口 (归一化 0-1)
export interface PointerCoords {
  x: number;
  y: number;
}

// 粒子颜色配置
export interface ParticleColors {
  primary: string;
  glow: string;
  secondary?: string;
}

// 粒子系统配置
export interface ParticleConfig {
  // 基本配置
  shape: ParticleShapeType;
  count: number;
  size: number;
  scale: number;
  
  // 颜色配置
  colors: ParticleColors;
  colorMix: number;
  
  // 动画配置
  animationSpeed: number;
  spreadIntensity: number;
  rotationEnabled: boolean;
  
  // 效果配置
  effect: AnimationEffect;
  glowIntensity: number;
  trailEnabled: boolean;
}

// 手势状态
export interface GestureState {
  isOpen: boolean;           // 手掌是否张开
  isClosed: boolean;         // 是否握拳
  isPointing: boolean;       // 是否指向
  isPinching: boolean;       // 是否捏合
  isTwoFingers: boolean;     // 是否两指
  openness: number;          // 手掌张开程度 0-1
  confidence: number;        // 识别置信度
  palmPosition: PointerCoords | null;  // 手掌位置
  palmVelocity: PointerCoords | null;  // 手掌移动速度
}

// 默认粒子配置 - 圣诞树模式
export const defaultParticleConfig: ParticleConfig = {
  shape: 'sphere',
  count: 3000, // 减少粒子数量，降低性能消耗
  size: 1.0,
  scale: 1.0,
  colors: {
    primary: '#228b22', // 圣诞绿
    glow: '#ffffff'
  },
  colorMix: 0.2, // 降低颜色混合强度
  animationSpeed: 1.0,
  spreadIntensity: 1.0,
  rotationEnabled: true,
  effect: 'vortex',
  glowIntensity: 0.8, // 降低发光强度
  trailEnabled: false
};

export interface TreeContextType {
  state: AppState;
  setState: (state: AppState) => void;
  rotationSpeed: number;
  setRotationSpeed: (speed: number) => void;
  webcamEnabled: boolean;
  setWebcamEnabled: (enabled: boolean) => void;

  // --- 交互状态 ---
  pointer: PointerCoords | null;   // 指针位置
  setPointer: (coords: PointerCoords | null) => void;

  hoverProgress: number;           // 悬停进度 0.0 ~ 1.0 (用于 UI 圈圈动画)
  setHoverProgress: (progress: number) => void;

  clickTrigger: number;            // 点击信号 (每次点击更新为当前时间戳)
  setClickTrigger: (time: number) => void;

  selectedPhotoUrl: string | null; // 当前选中的照片
  setSelectedPhotoUrl: (url: string | null) => void;

  // 五指平移偏移量
  panOffset: { x: number, y: number };
  setPanOffset: Dispatch<SetStateAction<{ x: number, y: number }>>;

  // 旋转加速度（FORMED状态下的额外速度）
  rotationBoost: number;
  setRotationBoost: Dispatch<SetStateAction<number>>;

  // 缩放偏移量 (双手手势控制)
  zoomOffset: number;
  setZoomOffset: Dispatch<SetStateAction<number>>;
  
  // === 新增：粒子系统配置 ===
  particleConfig: ParticleConfig;
  setParticleConfig: Dispatch<SetStateAction<ParticleConfig>>;
  
  // === 新增：手势状态 ===
  gestureState: GestureState;
  setGestureState: Dispatch<SetStateAction<GestureState>>;
  
  // === 新增：扩散控制 ===
  spreadFactor: number;
  setSpreadFactor: Dispatch<SetStateAction<number>>;
  
  // === 新增：粒子吸引点 ===
  attractorPoint: PointerCoords | null;
  setAttractorPoint: (point: PointerCoords | null) => void;
}

// 默认手势状态
export const defaultGestureState: GestureState = {
  isOpen: false,
  isClosed: false,
  isPointing: false,
  isPinching: false,
  isTwoFingers: false,
  openness: 0,
  confidence: 0,
  palmPosition: null,
  palmVelocity: null
};

export interface ParticleData {
  id: string;
  chaosPos: [number, number, number];
  treePos: [number, number, number];
  chaosRot: [number, number, number];
  treeRot: [number, number, number];
  scale: number;
  color: string;
  image?: string;
  year?: number;
  month?: string;
  type: 'LEAF' | 'ORNAMENT' | 'PHOTO';
}

// 创建上下文
export const TreeContext = createContext<TreeContextType>({} as TreeContextType);

// 辅助函数：颜色预设
export const colorPresets = {
  christmas: {
    red: { primary: '#cc0000', glow: '#ff6666' },
    green: { primary: '#228b22', glow: '#66ff66' },
    gold: { primary: '#ffd700', glow: '#ffee88' },
    white: { primary: '#ffffff', glow: '#aaddff' }
  },
  winter: {
    ice: { primary: '#87ceeb', glow: '#ffffff' },
    snow: { primary: '#f0f8ff', glow: '#e6f3ff' },
    frost: { primary: '#b0e0e6', glow: '#dff6ff' }
  },
  festive: {
    pink: { primary: '#ff69b4', glow: '#ffb6c1' },
    purple: { primary: '#9370db', glow: '#dda0dd' },
    blue: { primary: '#4169e1', glow: '#87cefa' }
  }
};

// 形状配置预设
export const shapePresets: Record<ParticleShapeType, Partial<ParticleConfig>> = {
  snowflake: {
    colors: { primary: '#ffffff', glow: '#aaddff' },
    size: 1.2,
    animationSpeed: 0.8,
    effect: 'wave'
  },
  star: {
    colors: { primary: '#ffd700', glow: '#ffaa00' },
    size: 1.0,
    animationSpeed: 1.0,
    effect: 'pulse'
  },
  giftbox: {
    colors: { primary: '#cc0000', glow: '#ffd700' },
    size: 1.5,
    animationSpeed: 0.6,
    effect: 'none'
  },
  sphere: {
    colors: { primary: '#ff4444', glow: '#ffffff' },
    size: 1.0,
    animationSpeed: 1.0,
    effect: 'vortex'
  },
  heart: {
    colors: { primary: '#ff1493', glow: '#ff69b4' },
    size: 1.3,
    animationSpeed: 1.2,
    effect: 'pulse'
  }
};
