/**
 * 性能监控工具
 * 用于监测和优化粒子系统性能
 */

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  particleCount: number;
  memoryUsage: number;
  gpuTime: number;
}

interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxMemory: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  minFPS: 30,
  maxFrameTime: 33.33, // 30fps
  maxMemory: 500 * 1024 * 1024 // 500MB
};

class PerformanceMonitor {
  private frameTimestamps: number[] = [];
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private enabled: boolean = true;
  private thresholds: PerformanceThresholds;
  private callbacks: Map<string, (metrics: PerformanceMetrics) => void> = new Map();
  
  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.lastFrameTime = performance.now();
  }
  
  /**
   * 开始帧计时
   */
  startFrame(): void {
    if (!this.enabled) return;
    this.lastFrameTime = performance.now();
  }
  
  /**
   * 结束帧计时
   */
  endFrame(): void {
    if (!this.enabled) return;
    
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    // 记录帧时间
    this.frameTimes.push(frameTime);
    this.frameTimestamps.push(now);
    
    // 保持最近100帧的数据
    if (this.frameTimes.length > 100) {
      this.frameTimes.shift();
      this.frameTimestamps.shift();
    }
  }
  
  /**
   * 获取当前FPS
   */
  getFPS(): number {
    if (this.frameTimestamps.length < 2) return 60;
    
    const now = performance.now();
    const oneSecondAgo = now - 1000;
    
    // 计算最近1秒内的帧数
    let count = 0;
    for (let i = this.frameTimestamps.length - 1; i >= 0; i--) {
      if (this.frameTimestamps[i] >= oneSecondAgo) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }
  
  /**
   * 获取平均帧时间
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }
  
  /**
   * 获取内存使用量
   */
  getMemoryUsage(): number {
    if ('memory' in performance) {
      // @ts-ignore - 非标准API
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }
  
  /**
   * 获取完整性能指标
   */
  getMetrics(particleCount: number = 0): PerformanceMetrics {
    return {
      fps: this.getFPS(),
      frameTime: this.getAverageFrameTime(),
      particleCount,
      memoryUsage: this.getMemoryUsage(),
      gpuTime: 0 // GPU时间需要特殊API支持
    };
  }
  
  /**
   * 检查是否需要降级
   */
  shouldDegrade(): boolean {
    const fps = this.getFPS();
    const frameTime = this.getAverageFrameTime();
    const memory = this.getMemoryUsage();
    
    return (
      fps < this.thresholds.minFPS ||
      frameTime > this.thresholds.maxFrameTime ||
      (memory > 0 && memory > this.thresholds.maxMemory)
    );
  }
  
  /**
   * 获取推荐的粒子数量
   */
  getRecommendedParticleCount(currentCount: number): number {
    const fps = this.getFPS();
    
    if (fps < 25) {
      return Math.max(1000, Math.floor(currentCount * 0.7));
    } else if (fps < 40) {
      return Math.max(2000, Math.floor(currentCount * 0.85));
    } else if (fps > 55) {
      return Math.min(15000, Math.floor(currentCount * 1.1));
    }
    
    return currentCount;
  }
  
  /**
   * 注册性能回调
   */
  onPerformanceUpdate(id: string, callback: (metrics: PerformanceMetrics) => void): void {
    this.callbacks.set(id, callback);
  }
  
  /**
   * 移除性能回调
   */
  removeCallback(id: string): void {
    this.callbacks.delete(id);
  }
  
  /**
   * 触发所有回调
   */
  notifyCallbacks(particleCount: number): void {
    const metrics = this.getMetrics(particleCount);
    this.callbacks.forEach(callback => callback(metrics));
  }
  
  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.frameTimes = [];
      this.frameTimestamps = [];
    }
  }
  
  /**
   * 重置统计数据
   */
  reset(): void {
    this.frameTimes = [];
    this.frameTimestamps = [];
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能优化建议生成器
 */
export function getOptimizationSuggestions(metrics: PerformanceMetrics): string[] {
  const suggestions: string[] = [];
  
  if (metrics.fps < 30) {
    suggestions.push('FPS过低，建议减少粒子数量');
    
    if (metrics.particleCount > 5000) {
      suggestions.push(`当前粒子数 ${metrics.particleCount}，建议减少到 ${Math.floor(metrics.particleCount * 0.6)}`);
    }
  }
  
  if (metrics.frameTime > 50) {
    suggestions.push('帧时间过长，考虑简化着色器计算');
  }
  
  if (metrics.memoryUsage > 300 * 1024 * 1024) {
    suggestions.push('内存使用较高，建议清理未使用的纹理');
  }
  
  return suggestions;
}

/**
 * GPU能力检测
 */
export function detectGPUCapabilities(): {
  tier: 'low' | 'medium' | 'high';
  maxParticles: number;
  supportsInstancing: boolean;
} {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  if (!gl) {
    return { tier: 'low', maxParticles: 2000, supportsInstancing: false };
  }
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo 
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) 
    : 'Unknown';
  
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
  
  // 基于GPU能力判断层级
  let tier: 'low' | 'medium' | 'high' = 'medium';
  let maxParticles = 8000;
  
  if (maxTextureSize >= 16384 && maxVertexUniformVectors >= 1024) {
    tier = 'high';
    maxParticles = 15000;
  } else if (maxTextureSize < 4096 || maxVertexUniformVectors < 256) {
    tier = 'low';
    maxParticles = 3000;
  }
  
  // 检测特定GPU
  const rendererLower = renderer.toLowerCase();
  if (rendererLower.includes('intel')) {
    tier = tier === 'high' ? 'medium' : tier;
    maxParticles = Math.min(maxParticles, 6000);
  } else if (rendererLower.includes('nvidia') || rendererLower.includes('amd') || rendererLower.includes('radeon')) {
    tier = tier === 'low' ? 'medium' : tier;
  }
  
  const supportsInstancing = 'drawArraysInstanced' in gl;
  
  canvas.remove();
  
  return { tier, maxParticles, supportsInstancing };
}

/**
 * 自适应质量管理器
 */
export class AdaptiveQualityManager {
  private performanceHistory: number[] = [];
  private currentQuality: number = 1.0; // 0-1
  private targetFPS: number = 50;
  
  constructor(targetFPS: number = 50) {
    this.targetFPS = targetFPS;
  }
  
  update(currentFPS: number): number {
    this.performanceHistory.push(currentFPS);
    
    // 保持最近30帧的历史
    if (this.performanceHistory.length > 30) {
      this.performanceHistory.shift();
    }
    
    // 计算平均FPS
    const avgFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    
    // 调整质量
    if (avgFPS < this.targetFPS * 0.6) {
      // 严重低于目标，大幅降低质量
      this.currentQuality = Math.max(0.3, this.currentQuality - 0.1);
    } else if (avgFPS < this.targetFPS * 0.8) {
      // 低于目标，逐渐降低质量
      this.currentQuality = Math.max(0.5, this.currentQuality - 0.02);
    } else if (avgFPS > this.targetFPS * 1.1 && this.currentQuality < 1) {
      // 高于目标，可以提升质量
      this.currentQuality = Math.min(1, this.currentQuality + 0.01);
    }
    
    return this.currentQuality;
  }
  
  getQuality(): number {
    return this.currentQuality;
  }
  
  reset(): void {
    this.performanceHistory = [];
    this.currentQuality = 1.0;
  }
}

export default performanceMonitor;

