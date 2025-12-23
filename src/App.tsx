import React, { useState, Suspense, useContext, useEffect, useRef } from 'react';
import { TreeContextType, AppState, TreeContext, PointerCoords } from './types';
import Experience from './components/Experience';
import GestureInput from './components/GestureInput';
import TechEffects from './components/TechEffects';
import { AnimatePresence, motion } from 'framer-motion';


// --- 梦幻光标组件 (圣诞主题) ---
const DreamyCursor: React.FC<{ pointer: PointerCoords | null, progress: number }> = ({ pointer, progress }) => {
    if (!pointer) return null;
    return (
        <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[200]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: 1,
                scale: 1,
                left: `${pointer.x * 100}%`,
                top: `${pointer.y * 100}%`
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            style={{ x: "-50%", y: "-50%" }}
        >
            {/* 核心光点 - 圣诞红绿配色 */}
            <div className={`rounded-full transition-all duration-300 ${
                progress > 0.8 
                    ? 'w-5 h-5 bg-red-500 shadow-[0_0_25px_#ef4444,0_0_50px_#ef4444]' 
                    : 'w-3 h-3 bg-green-400 shadow-[0_0_20px_#4ade80]'
            }`} />

            {/* 雪花装饰环 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20">
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                    <div 
                        key={i}
                        className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full opacity-60"
                        style={{
                            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-28px)`,
                            animation: `twinkle ${1 + i * 0.2}s ease-in-out infinite`
                        }}
                    />
                ))}
            </div>

            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 -rotate-90 overflow-visible">
                <defs>
                    <linearGradient id="christmasGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {/* 倒计时圆环 */}
                <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke="url(#christmasGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="150.8"
                    strokeDashoffset={150.8 * (1 - progress)}
                    filter="url(#glow)"
                    className="transition-[stroke-dashoffset] duration-75 ease-linear"
                />
            </svg>

            {/* 发光光晕 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-radial from-red-500/20 via-green-500/10 to-transparent rounded-full blur-xl animate-pulse"></div>
        </motion.div>
    );
};

// --- 照片弹窗 (圣诞主题) ---
const PhotoModal: React.FC<{ url: string | null, onClose: () => void }> = ({ url, onClose }) => {
    if (!url) return null;
    return (
        <motion.div
            id="photo-modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-8 backdrop-blur-md"
            onClick={onClose}
        >
            {/* 装饰性雪花背景 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white/20 rounded-full"
                        initial={{ 
                            x: Math.random() * window.innerWidth, 
                            y: -20,
                            scale: Math.random() * 0.5 + 0.5
                        }}
                        animate={{ 
                            y: window.innerHeight + 20,
                            x: Math.random() * window.innerWidth
                        }}
                        transition={{ 
                            duration: Math.random() * 5 + 5, 
                            repeat: Infinity,
                            delay: Math.random() * 3
                        }}
                    />
                ))}
            </div>
            
            <motion.div
                initial={{ scale: 0.7, y: 60, rotate: -8 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 100, rotate: 5 }}
                transition={{ type: "spring", stiffness: 250, damping: 20 }}
                className="relative max-w-4xl max-h-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 相框外发光 */}
                <div className="absolute -inset-2 bg-gradient-to-r from-red-500/30 via-amber-500/30 to-green-500/30 rounded-lg blur-xl"></div>
                
                {/* 相框 */}
                <div className="relative bg-white p-3 md:p-4 rounded-lg shadow-[0_0_60px_rgba(255,215,0,0.4)]">
                    <img 
                        src={url} 
                        alt="Memory" 
                        className="max-h-[75vh] object-contain rounded shadow-inner" 
                    />
                    
                    {/* 相框装饰角 */}
                    <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-red-400/50 rounded-tl"></div>
                    <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-green-400/50 rounded-tr"></div>
                    <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-green-400/50 rounded-bl"></div>
                    <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-red-400/50 rounded-br"></div>
                </div>
                
                {/* 提示文字 */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -bottom-10 w-full text-center text-amber-200/60 cinzel text-xs md:text-sm tracking-wider"
                >
                    🎄 Precious Memory 🎄
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

const AppContent: React.FC = () => {
    const { state, setState, webcamEnabled, setWebcamEnabled, pointer, hoverProgress, selectedPhotoUrl, setSelectedPhotoUrl, clickTrigger } = useContext(TreeContext) as TreeContextType;

    useEffect(() => {
        if (selectedPhotoUrl && pointer) {
            const x = pointer.x * window.innerWidth;
            const y = pointer.y * window.innerHeight;
            const element = document.elementFromPoint(x, y);
            if (element) {
                const isImage = element.tagName === 'IMG';
                const isBackdrop = element.id === 'photo-modal-backdrop';
                if (isBackdrop || isImage) setSelectedPhotoUrl(null);
            }
        }
    }, [clickTrigger]);

    return (
        <main className="relative w-full h-screen bg-black text-white overflow-hidden cursor-none">
            {/* 摄像头背景层 (z-0) */}
            {webcamEnabled && <GestureInput />}

            {/* 3D 场景层 (z-10) */}
            <div className="absolute inset-0 z-10">
                <Suspense fallback={<div className="flex items-center justify-center h-full text-red-400 cinzel animate-pulse text-2xl">🎄 Loading Christmas Magic... ❄️</div>}>
                    <Experience />
                </Suspense>
            </div>

            {/* 科技感特效层 (z-20) */}
            {webcamEnabled && <TechEffects />}

            {/* UI 层 (z-30) */}
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 md:p-8">
                <header className="flex justify-between items-start">
                    <div className="relative">
                        {/* 装饰性光晕背景 */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-red-500/10 via-transparent to-green-500/10 blur-2xl rounded-full"></div>
                        
                        <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-bold cinzel text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-200 to-green-400 drop-shadow-[0_0_30px_rgba(255,200,100,0.5)]">
                            🎄 Christmas Memories ❄️
                        </h1>
                        
                        <motion.p 
                            key={state}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative text-amber-200/90 cinzel tracking-[0.2em] text-xs md:text-sm mt-3 flex items-center gap-2"
                        >
                            {state === 'CHAOS' ? (
                                <>
                                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                    SCATTERED MEMORIES · EXPLORE YOUR JOURNEY
                                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    MEMORY TREE · TIMELINE OF LOVE
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                </>
                            )}
                        </motion.p>
                    </div>
                </header>
                
                {/* 底部提示 */}
                <footer className="text-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        className="text-white/40 text-xs cinzel tracking-wider"
                    >
                        {webcamEnabled ? (
                            <span>✋ 握拳聚合 · 张开分散 · 指向选择</span>
                        ) : (
                            <span>🖱️ 拖拽旋转 · 滚轮缩放</span>
                        )}
                    </motion.div>
                </footer>
            </div>

            {/* 光标层 (z-200) */}
            <DreamyCursor pointer={pointer} progress={hoverProgress} />

            {/* 弹窗层 (z-100) */}
            <AnimatePresence>
                {selectedPhotoUrl && <PhotoModal url={selectedPhotoUrl} onClose={() => setSelectedPhotoUrl(null)} />}
            </AnimatePresence>
        </main>
    );
};

const App: React.FC = () => {
    const [state, setState] = useState<AppState>('CHAOS');
    const [rotationSpeed, setRotationSpeed] = useState<number>(0.3); // 固定基础旋转速度
    const [rotationBoost, setRotationBoost] = useState<number>(0); // 额外加速度
    const [webcamEnabled, setWebcamEnabled] = useState<boolean>(true);
    const [pointer, setPointer] = useState<PointerCoords | null>(null);
    const [hoverProgress, setHoverProgress] = useState<number>(0);
    const [clickTrigger, setClickTrigger] = useState<number>(0);
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
    const [panOffset, setPanOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [zoomOffset, setZoomOffset] = useState<number>(0);

    return (
        <TreeContext.Provider value={{
            state, setState,
            rotationSpeed, setRotationSpeed,
            webcamEnabled, setWebcamEnabled,
            pointer, setPointer,
            hoverProgress, setHoverProgress,
            clickTrigger, setClickTrigger,
            selectedPhotoUrl, setSelectedPhotoUrl,
            panOffset, setPanOffset,
            rotationBoost, setRotationBoost,
            zoomOffset, setZoomOffset
        }}>
            <AppContent />
        </TreeContext.Provider>
    );
};

export default App;