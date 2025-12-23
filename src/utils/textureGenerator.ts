import * as THREE from 'three';

export type ParticleShape = 'snowflake' | 'star' | 'giftbox' | 'sphere' | 'heart';

interface TextureGeneratorOptions {
  size?: number;
  color?: string;
  glowColor?: string;
  complexity?: number;
}

// 纹理缓存
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * 生成雪花纹理
 */
function generateSnowflakeTexture(options: TextureGeneratorOptions = {}): HTMLCanvasElement {
  const { size = 128, color = '#ffffff', glowColor = '#aaddff', complexity = 6 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;
  
  // 清除背景
  ctx.clearRect(0, 0, size, size);
  
  // 添加发光效果
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.2);
  gradient.addColorStop(0, glowColor);
  gradient.addColorStop(0.5, `${glowColor}88`);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制雪花主体
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (let i = 0; i < complexity; i++) {
    const angle = (i * Math.PI * 2) / complexity;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    
    // 主分支
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -radius);
    ctx.stroke();
    
    // 分支上的小枝
    const branches = 3;
    for (let j = 1; j <= branches; j++) {
      const branchY = -radius * (j / (branches + 1));
      const branchLength = radius * 0.3 * (1 - j / (branches + 2));
      
      ctx.lineWidth = size * 0.015;
      ctx.beginPath();
      ctx.moveTo(0, branchY);
      ctx.lineTo(-branchLength, branchY - branchLength * 0.5);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, branchY);
      ctx.lineTo(branchLength, branchY - branchLength * 0.5);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  // 中心装饰点
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
}

/**
 * 生成星星纹理
 */
function generateStarTexture(options: TextureGeneratorOptions = {}): HTMLCanvasElement {
  const { size = 128, color = '#ffd700', glowColor = '#ffaa00', complexity = 5 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.4;
  const innerRadius = outerRadius * 0.4;
  const spikes = complexity;
  
  ctx.clearRect(0, 0, size, size);
  
  // 外发光
  const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius * 1.5);
  glowGradient.addColorStop(0, glowColor);
  glowGradient.addColorStop(0.4, `${glowColor}66`);
  glowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius * 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制星形
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  
  // 渐变填充
  const starGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius);
  starGradient.addColorStop(0, '#ffffff');
  starGradient.addColorStop(0.3, color);
  starGradient.addColorStop(1, glowColor);
  ctx.fillStyle = starGradient;
  ctx.fill();
  
  // 光芒射线
  ctx.strokeStyle = `${color}44`;
  ctx.lineWidth = 2;
  for (let i = 0; i < spikes; i++) {
    const angle = (i * Math.PI * 2) / spikes - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * outerRadius * 1.3,
      centerY + Math.sin(angle) * outerRadius * 1.3
    );
    ctx.stroke();
  }
  
  return canvas;
}

/**
 * 生成礼物盒纹理
 */
function generateGiftboxTexture(options: TextureGeneratorOptions = {}): HTMLCanvasElement {
  const { size = 128, color = '#cc0000', glowColor = '#ffd700' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const centerX = size / 2;
  const centerY = size / 2;
  const boxSize = size * 0.5;
  
  ctx.clearRect(0, 0, size, size);
  
  // 外发光
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = size * 0.15;
  
  // 盒子主体
  const boxGradient = ctx.createLinearGradient(
    centerX - boxSize / 2, centerY,
    centerX + boxSize / 2, centerY
  );
  boxGradient.addColorStop(0, color);
  boxGradient.addColorStop(0.5, lightenColor(color, 30));
  boxGradient.addColorStop(1, color);
  
  ctx.fillStyle = boxGradient;
  ctx.fillRect(centerX - boxSize / 2, centerY - boxSize / 2, boxSize, boxSize);
  
  // 丝带横条
  ctx.shadowBlur = 0;
  ctx.fillStyle = glowColor;
  ctx.fillRect(centerX - boxSize * 0.1, centerY - boxSize / 2, boxSize * 0.2, boxSize);
  ctx.fillRect(centerX - boxSize / 2, centerY - boxSize * 0.1, boxSize, boxSize * 0.2);
  
  // 蝴蝶结
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  // 左边蝴蝶结
  ctx.ellipse(centerX - boxSize * 0.2, centerY - boxSize * 0.35, boxSize * 0.15, boxSize * 0.1, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  // 右边蝴蝶结
  ctx.beginPath();
  ctx.ellipse(centerX + boxSize * 0.2, centerY - boxSize * 0.35, boxSize * 0.15, boxSize * 0.1, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  // 中心结
  ctx.beginPath();
  ctx.arc(centerX, centerY - boxSize * 0.35, boxSize * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
}

/**
 * 生成球体纹理
 */
function generateSphereTexture(options: TextureGeneratorOptions = {}): HTMLCanvasElement {
  const { size = 128, color = '#ff4444', glowColor = '#ffffff' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;
  
  ctx.clearRect(0, 0, size, size);
  
  // 外发光
  const outerGlow = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.3);
  outerGlow.addColorStop(0, `${color}88`);
  outerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
  ctx.fill();
  
  // 主球体渐变
  const sphereGradient = ctx.createRadialGradient(
    centerX - radius * 0.3, centerY - radius * 0.3, 0,
    centerX, centerY, radius
  );
  sphereGradient.addColorStop(0, glowColor);
  sphereGradient.addColorStop(0.2, lightenColor(color, 40));
  sphereGradient.addColorStop(0.7, color);
  sphereGradient.addColorStop(1, darkenColor(color, 30));
  
  ctx.fillStyle = sphereGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 高光
  const highlightGradient = ctx.createRadialGradient(
    centerX - radius * 0.4, centerY - radius * 0.4, 0,
    centerX - radius * 0.4, centerY - radius * 0.4, radius * 0.4
  );
  highlightGradient.addColorStop(0, `${glowColor}cc`);
  highlightGradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.4, centerY - radius * 0.4, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
}

/**
 * 生成心形纹理
 */
function generateHeartTexture(options: TextureGeneratorOptions = {}): HTMLCanvasElement {
  const { size = 128, color = '#ff1493', glowColor = '#ff69b4' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const centerX = size / 2;
  const centerY = size / 2;
  const scale = size * 0.015;
  
  ctx.clearRect(0, 0, size, size);
  
  // 外发光
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = size * 0.2;
  
  // 绘制心形路径
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 2; t += 0.01) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    
    if (t === 0) {
      ctx.moveTo(centerX + x * scale, centerY + y * scale);
    } else {
      ctx.lineTo(centerX + x * scale, centerY + y * scale);
    }
  }
  ctx.closePath();
  
  // 渐变填充
  const heartGradient = ctx.createRadialGradient(
    centerX - size * 0.1, centerY - size * 0.1, 0,
    centerX, centerY, size * 0.4
  );
  heartGradient.addColorStop(0, lightenColor(color, 50));
  heartGradient.addColorStop(0.5, color);
  heartGradient.addColorStop(1, darkenColor(color, 20));
  
  ctx.fillStyle = heartGradient;
  ctx.fill();
  
  // 高光
  ctx.shadowBlur = 0;
  const highlightGradient = ctx.createRadialGradient(
    centerX - size * 0.15, centerY - size * 0.15, 0,
    centerX - size * 0.15, centerY - size * 0.15, size * 0.15
  );
  highlightGradient.addColorStop(0, `${glowColor}aa`);
  highlightGradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(centerX - size * 0.15, centerY - size * 0.15, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
}

/**
 * 辅助函数：使颜色变亮
 */
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * 辅助函数：使颜色变暗
 */
function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * 获取粒子纹理
 */
export function getParticleTexture(
  shape: ParticleShape,
  options: TextureGeneratorOptions = {}
): THREE.CanvasTexture {
  const cacheKey = `${shape}-${JSON.stringify(options)}`;
  
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }
  
  let canvas: HTMLCanvasElement;
  
  switch (shape) {
    case 'snowflake':
      canvas = generateSnowflakeTexture(options);
      break;
    case 'star':
      canvas = generateStarTexture(options);
      break;
    case 'giftbox':
      canvas = generateGiftboxTexture(options);
      break;
    case 'sphere':
      canvas = generateSphereTexture(options);
      break;
    case 'heart':
      canvas = generateHeartTexture(options);
      break;
    default:
      canvas = generateSphereTexture(options);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  
  return texture;
}

/**
 * 清除纹理缓存
 */
export function clearTextureCache(): void {
  textureCache.forEach((texture) => {
    texture.dispose();
  });
  textureCache.clear();
}

/**
 * 获取所有可用的粒子形状
 */
export function getAvailableShapes(): ParticleShape[] {
  return ['snowflake', 'star', 'giftbox', 'sphere', 'heart'];
}

/**
 * 获取形状的默认颜色配置
 */
export function getShapeDefaultColors(shape: ParticleShape): { color: string; glowColor: string } {
  const colorMap: Record<ParticleShape, { color: string; glowColor: string }> = {
    snowflake: { color: '#ffffff', glowColor: '#aaddff' },
    star: { color: '#ffd700', glowColor: '#ffaa00' },
    giftbox: { color: '#cc0000', glowColor: '#ffd700' },
    sphere: { color: '#ff4444', glowColor: '#ffffff' },
    heart: { color: '#ff1493', glowColor: '#ff69b4' }
  };
  
  return colorMap[shape];
}

/**
 * 圣诞主题色配置
 */
export const christmasColors = {
  red: '#cc0000',
  green: '#228b22',
  gold: '#ffd700',
  white: '#ffffff',
  silver: '#c0c0c0',
  blue: '#1e90ff',
  pink: '#ff69b4'
};

export default {
  getParticleTexture,
  clearTextureCache,
  getAvailableShapes,
  getShapeDefaultColors,
  christmasColors
};

