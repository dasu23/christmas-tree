import React, { useContext, useMemo } from 'react';
import { TreeContext, TreeContextType } from '../types';

const TechEffects: React.FC = () => {
  const { gestureState, state, particleConfig } = useContext(TreeContext) as TreeContextType;
  
  // 根据手势状态调整效果强度
  const effectIntensity = useMemo(() => {
    if (gestureState.isOpen) return 1.2;
    if (gestureState.isPointing) return 0.8;
    return 1.0;
  }, [gestureState.isOpen, gestureState.isPointing]);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {/* HUD 边框 - 圣诞主题 */}
      <div className="absolute inset-0">
        {/* 左上角 */}
        <div className="absolute top-4 left-4 w-24 h-24">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500/80 to-transparent" />
          <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-red-500/80 to-transparent" />
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500 animate-pulse" />
          {/* 角落装饰 */}
          <div className="absolute top-3 left-3 w-2 h-2 bg-red-500/50 rounded-full animate-twinkle" />
        </div>

        {/* 右上角 */}
        <div className="absolute top-4 right-4 w-24 h-24">
          <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-green-500/80 to-transparent" />
          <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-green-500/80 to-transparent" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500 animate-pulse" />
          <div className="absolute top-3 right-3 w-2 h-2 bg-green-500/50 rounded-full animate-twinkle" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* 左下角 */}
        <div className="absolute bottom-4 left-4 w-24 h-24">
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-green-500/80 to-transparent" />
          <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-green-500/80 to-transparent" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500 animate-pulse" />
          <div className="absolute bottom-3 left-3 w-2 h-2 bg-green-500/50 rounded-full animate-twinkle" style={{ animationDelay: '1s' }} />
        </div>

        {/* 右下角 */}
        <div className="absolute bottom-4 right-4 w-24 h-24">
          <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-amber-500/80 to-transparent" />
          <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-amber-500/80 to-transparent" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500 animate-pulse" />
          <div className="absolute bottom-3 right-3 w-2 h-2 bg-amber-500/50 rounded-full animate-twinkle" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* HUD 状态指示器 */}
        <div className="absolute top-6 left-32 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            gestureState.isOpen ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400/60'
          }`} />
          <span className="text-cyan-400/60 font-mono text-[10px] tracking-wider">
            {gestureState.isOpen ? 'GESTURE: OPEN' : 'SYSTEM ACTIVE'}
          </span>
        </div>
        
        <div className="absolute top-6 right-32 flex items-center gap-2">
          <span className="text-cyan-400/60 font-mono text-[10px] tracking-wider">
            {state === 'FORMED' ? 'TREE MODE' : 'CHAOS MODE'}
          </span>
          <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            state === 'FORMED' ? 'bg-green-400 animate-pulse' : 'bg-amber-400/60'
          }`} />
        </div>
        
        {/* 粒子配置显示 */}
        <div className="absolute bottom-6 left-32 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white/30 font-mono text-[9px]">SHAPE:</span>
            <span className="text-cyan-400/60 font-mono text-[10px] uppercase">{particleConfig.shape}</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-white/30 font-mono text-[9px]">COUNT:</span>
            <span className="text-cyan-400/60 font-mono text-[10px]">{particleConfig.count}</span>
          </div>
        </div>
      </div>

      {/* 网格背景效果 */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: 0.05 * effectIntensity,
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: 'center center',
        }}
      />

      {/* 扫描线效果 */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: 0.03 }}
      >
        <div 
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-vertical"
          style={{ boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}
        />
      </div>

      {/* 浮动粒子装饰 */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: i % 4 === 0
                ? 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)'
                : i % 4 === 1
                ? 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)'
                : i % 4 === 2
                ? 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(147, 197, 253, 0.12) 0%, transparent 70%)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 12}s`,
            }}
          />
        ))}
      </div>

      {/* 手势状态可视化 */}
      {gestureState.palmPosition && (
        <div 
          className="absolute w-4 h-4 rounded-full border-2 border-cyan-400/30 transition-all duration-100"
          style={{
            left: `${gestureState.palmPosition.x * 100}%`,
            top: `${gestureState.palmPosition.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: gestureState.isOpen 
              ? '0 0 20px rgba(0, 255, 255, 0.3)' 
              : 'none'
          }}
        />
      )}

      {/* 边缘渐变晕影 */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 30%, rgba(0, 0, 0, ${0.3 * effectIntensity}) 100%)`,
        }}
      />

      {/* 顶部装饰条 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
    </div>
  );
};

export default TechEffects;
