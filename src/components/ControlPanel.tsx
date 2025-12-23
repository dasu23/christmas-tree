import React, { useEffect, useRef, useContext, useCallback } from 'react';
import * as dat from 'dat.gui';
import { TreeContext, TreeContextType, ParticleConfig } from '../types';
import { getAvailableShapes, christmasColors, ParticleShape } from '../utils/textureGenerator';

// dat.GUI 样式定制
const injectGUIStyles = () => {
  const existingStyle = document.getElementById('dat-gui-custom-style');
  if (existingStyle) return;
  
  const style = document.createElement('style');
  style.id = 'dat-gui-custom-style';
  style.textContent = `
    .dg.ac {
      z-index: 1000 !important;
    }
    
    .dg.main {
      font-family: 'Inter', 'Segoe UI', sans-serif !important;
      background: linear-gradient(135deg, rgba(20, 30, 20, 0.95), rgba(10, 20, 15, 0.98)) !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(34, 139, 34, 0.15) !important;
      border: 1px solid rgba(34, 139, 34, 0.3) !important;
      overflow: hidden !important;
    }
    
    .dg.main .close-button {
      background: linear-gradient(135deg, #cc0000, #990000) !important;
      color: white !important;
      text-transform: uppercase !important;
      letter-spacing: 2px !important;
      font-size: 10px !important;
      padding: 8px !important;
      border-radius: 0 0 8px 8px !important;
    }
    
    .dg.main .close-button:hover {
      background: linear-gradient(135deg, #ff0000, #cc0000) !important;
    }
    
    .dg li {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      transition: background 0.2s ease !important;
    }
    
    .dg li:hover {
      background: rgba(34, 139, 34, 0.1) !important;
    }
    
    .dg li.folder {
      border-bottom: none !important;
    }
    
    .dg .title {
      background: linear-gradient(90deg, rgba(204, 0, 0, 0.8), rgba(34, 139, 34, 0.8)) !important;
      color: #ffd700 !important;
      font-weight: 600 !important;
      letter-spacing: 1px !important;
      text-transform: uppercase !important;
      font-size: 11px !important;
      padding: 8px 12px !important;
      border-radius: 8px 8px 0 0 !important;
    }
    
    .dg .cr.function .property-name {
      width: 100% !important;
      text-align: center !important;
    }
    
    .dg .c input[type=text],
    .dg .c input[type=number] {
      background: rgba(0, 0, 0, 0.3) !important;
      border: 1px solid rgba(255, 215, 0, 0.3) !important;
      border-radius: 4px !important;
      color: #ffd700 !important;
      padding: 4px 8px !important;
    }
    
    .dg .c input[type=text]:focus,
    .dg .c input[type=number]:focus {
      border-color: #ffd700 !important;
      outline: none !important;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.3) !important;
    }
    
    .dg .c select {
      background: rgba(0, 0, 0, 0.5) !important;
      border: 1px solid rgba(255, 215, 0, 0.3) !important;
      border-radius: 4px !important;
      color: #ffd700 !important;
      padding: 4px !important;
    }
    
    .dg .c .slider {
      background: rgba(0, 0, 0, 0.4) !important;
      border-radius: 4px !important;
      height: 8px !important;
    }
    
    .dg .c .slider-fg {
      background: linear-gradient(90deg, #cc0000, #ffd700, #228b22) !important;
      border-radius: 4px !important;
    }
    
    .dg .property-name {
      color: rgba(255, 255, 255, 0.85) !important;
      font-size: 11px !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
    }
    
    .dg .c button {
      background: linear-gradient(135deg, #228b22, #1a6b1a) !important;
      border: none !important;
      border-radius: 6px !important;
      color: white !important;
      padding: 8px 16px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      font-size: 10px !important;
    }
    
    .dg .c button:hover {
      background: linear-gradient(135deg, #2da52d, #228b22) !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(34, 139, 34, 0.4) !important;
    }
    
    .dg .cr.color .property-name {
      padding-right: 8px !important;
    }
    
    .dg .cr.color .c {
      border-radius: 4px !important;
      overflow: hidden !important;
    }
  `;
  document.head.appendChild(style);
};

interface ControlSettings {
  // 粒子设置
  shape: string;
  particleCount: number;
  particleSize: number;
  primaryColor: string;
  glowColor: string;
  colorMix: number;
  
  // 动画设置
  animationSpeed: number;
  spreadIntensity: number;
  rotationSpeed: number;
  
  // 显示设置
  fullscreen: () => void;
  resetCamera: () => void;
  toggleWebcam: () => void;
  
  // 状态
  currentState: string;
}

const ControlPanel: React.FC = () => {
  const guiRef = useRef<dat.GUI | null>(null);
  const settingsRef = useRef<ControlSettings | null>(null);
  
  const {
    state,
    setState,
    webcamEnabled,
    setWebcamEnabled,
    rotationSpeed,
    setRotationSpeed,
    particleConfig,
    setParticleConfig
  } = useContext(TreeContext) as TreeContextType;
  
  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);
  
  // 重置相机
  const resetCamera = useCallback(() => {
    // 通过事件通知 Experience 组件
    window.dispatchEvent(new CustomEvent('resetCamera'));
  }, []);
  
  // 切换摄像头
  const toggleWebcam = useCallback(() => {
    setWebcamEnabled(!webcamEnabled);
  }, [webcamEnabled, setWebcamEnabled]);
  
  // 更新粒子配置
  const updateParticleConfig = useCallback((updates: Partial<ParticleConfig>) => {
    setParticleConfig((prev: ParticleConfig) => ({
      ...prev,
      ...updates
    }));
  }, [setParticleConfig]);
  
  useEffect(() => {
    injectGUIStyles();
    
    // 创建 GUI
    const gui = new dat.GUI({ autoPlace: true, width: 280 });
    guiRef.current = gui;
    
    // 初始设置
    const settings: ControlSettings = {
      shape: particleConfig.shape,
      particleCount: particleConfig.count,
      particleSize: particleConfig.size,
      primaryColor: particleConfig.colors.primary,
      glowColor: particleConfig.colors.glow,
      colorMix: particleConfig.colorMix,
      animationSpeed: particleConfig.animationSpeed,
      spreadIntensity: particleConfig.spreadIntensity,
      rotationSpeed: rotationSpeed,
      fullscreen: toggleFullscreen,
      resetCamera: resetCamera,
      toggleWebcam: toggleWebcam,
      currentState: state
    };
    settingsRef.current = settings;
    
    // === 粒子形状文件夹 ===
    const shapeFolder = gui.addFolder('🎄 粒子形状');
    
    const shapes = getAvailableShapes();
    const shapeLabels: Record<string, string> = {
      snowflake: '❄️ 雪花',
      star: '⭐ 星星',
      giftbox: '🎁 礼物盒',
      sphere: '🔴 球体',
      heart: '❤️ 心形'
    };
    
    shapeFolder.add(settings, 'shape', shapes.reduce((acc, s) => {
      acc[shapeLabels[s] || s] = s;
      return acc;
    }, {} as Record<string, string>))
      .name('形状')
      .onChange((value: string) => {
        updateParticleConfig({ shape: value as ParticleShape });
      });
    
    shapeFolder.add(settings, 'particleCount', 1000, 15000, 500)
      .name('粒子数量')
      .onChange((value: number) => {
        updateParticleConfig({ count: value });
      });
    
    shapeFolder.add(settings, 'particleSize', 0.5, 3, 0.1)
      .name('粒子大小')
      .onChange((value: number) => {
        updateParticleConfig({ size: value });
      });
    
    shapeFolder.open();
    
    // === 颜色文件夹 ===
    const colorFolder = gui.addFolder('🎨 颜色设置');
    
    colorFolder.addColor(settings, 'primaryColor')
      .name('主色调')
      .onChange((value: string) => {
        updateParticleConfig({
          colors: { ...particleConfig.colors, primary: value }
        });
      });
    
    colorFolder.addColor(settings, 'glowColor')
      .name('发光色')
      .onChange((value: string) => {
        updateParticleConfig({
          colors: { ...particleConfig.colors, glow: value }
        });
      });
    
    colorFolder.add(settings, 'colorMix', 0, 1, 0.05)
      .name('颜色混合')
      .onChange((value: number) => {
        updateParticleConfig({ colorMix: value });
      });
    
    // 预设颜色按钮
    const presetColors = {
      '🔴 圣诞红': () => {
        settings.primaryColor = christmasColors.red;
        settings.glowColor = '#ff6666';
        updateParticleConfig({
          colors: { primary: christmasColors.red, glow: '#ff6666' }
        });
        gui.updateDisplay();
      },
      '🌲 圣诞绿': () => {
        settings.primaryColor = christmasColors.green;
        settings.glowColor = '#66ff66';
        updateParticleConfig({
          colors: { primary: christmasColors.green, glow: '#66ff66' }
        });
        gui.updateDisplay();
      },
      '✨ 金色': () => {
        settings.primaryColor = christmasColors.gold;
        settings.glowColor = '#ffee88';
        updateParticleConfig({
          colors: { primary: christmasColors.gold, glow: '#ffee88' }
        });
        gui.updateDisplay();
      },
      '❄️ 白色': () => {
        settings.primaryColor = christmasColors.white;
        settings.glowColor = '#aaddff';
        updateParticleConfig({
          colors: { primary: christmasColors.white, glow: '#aaddff' }
        });
        gui.updateDisplay();
      }
    };
    
    Object.entries(presetColors).forEach(([name, fn]) => {
      colorFolder.add({ [name]: fn }, name);
    });
    
    colorFolder.open();
    
    // === 动画文件夹 ===
    const animFolder = gui.addFolder('🎬 动画效果');
    
    animFolder.add(settings, 'animationSpeed', 0.1, 3, 0.1)
      .name('动画速度')
      .onChange((value: number) => {
        updateParticleConfig({ animationSpeed: value });
      });
    
    animFolder.add(settings, 'spreadIntensity', 0, 2, 0.1)
      .name('扩散强度')
      .onChange((value: number) => {
        updateParticleConfig({ spreadIntensity: value });
      });
    
    animFolder.add(settings, 'rotationSpeed', 0, 1, 0.05)
      .name('旋转速度')
      .onChange((value: number) => {
        setRotationSpeed(value);
      });
    
    animFolder.open();
    
    // === 控制按钮文件夹 ===
    const controlFolder = gui.addFolder('🎮 控制');
    
    controlFolder.add(settings, 'fullscreen').name('🖥️ 全屏切换');
    controlFolder.add(settings, 'resetCamera').name('📷 重置视角');
    controlFolder.add(settings, 'toggleWebcam').name('📹 手势控制');
    
    // 状态切换
    const stateController = controlFolder.add(settings, 'currentState', {
      '🌀 混沌模式': 'CHAOS',
      '🎄 圣诞树': 'FORMED'
    }).name('状态');
    
    stateController.onChange((value: string) => {
      setState(value as 'CHAOS' | 'FORMED');
    });
    
    controlFolder.open();
    
    // 清理
    return () => {
      if (guiRef.current) {
        guiRef.current.destroy();
        guiRef.current = null;
      }
    };
  }, []);
  
  // 同步外部状态变化到 GUI
  useEffect(() => {
    if (settingsRef.current && guiRef.current) {
      settingsRef.current.currentState = state;
      settingsRef.current.rotationSpeed = rotationSpeed;
      guiRef.current.updateDisplay();
    }
  }, [state, rotationSpeed]);
  
  return null; // GUI 是通过 DOM 渲染的
};

export default ControlPanel;

