import React, { useEffect, useRef, useContext, useState, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { TreeContext, TreeContextType, GestureState, defaultGestureState } from '../types';

// 手势检测配置
const GESTURE_CONFIG = {
  // 手指伸展检测阈值
  fingerExtensionThreshold: 1.3,
  // 捏合距离阈值
  pinchThreshold: 0.05,
  // 移动检测阈值
  movementThreshold: 0.005,
  // 手势稳定帧数阈值
  gestureStabilityFrames: 10,
  // 悬停点击时间（秒）
  dwellClickTime: 1.2,
  // 点击冷却时间（秒）
  clickCooldown: 2.0,
  // 手掌张开程度计算权重
  openessWeights: {
    thumb: 0.15,
    index: 0.25,
    middle: 0.25,
    ring: 0.2,
    pinky: 0.15
  }
};

// 低通滤波器用于平滑数据
class LowPassFilter {
  private value: number = 0;
  private alpha: number;
  
  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }
  
  filter(newValue: number): number {
    this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    return this.value;
  }
  
  reset(value: number = 0) {
    this.value = value;
  }
}

// 手势状态机
class GestureStateMachine {
  private currentGesture: string | null = null;
  private gestureCount: number = 0;
  private stabilityThreshold: number;
  
  constructor(stabilityThreshold: number = 10) {
    this.stabilityThreshold = stabilityThreshold;
  }
  
  update(gesture: string | null): { stable: boolean; gesture: string | null } {
    if (gesture === this.currentGesture) {
      this.gestureCount = Math.min(this.gestureCount + 1, this.stabilityThreshold * 2);
    } else {
      this.currentGesture = gesture;
      this.gestureCount = 1;
    }
    
    return {
      stable: this.gestureCount >= this.stabilityThreshold,
      gesture: this.currentGesture
    };
  }
  
  reset() {
    this.currentGesture = null;
    this.gestureCount = 0;
  }
}

const GestureInput: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    setState,
    setRotationBoost,
    setPointer,
    state: appState,
    setHoverProgress,
    setClickTrigger,
    selectedPhotoUrl,
    setPanOffset,
    setZoomOffset,
    setGestureState,
    setSpreadFactor,
    setAttractorPoint,
    particleConfig
  } = useContext(TreeContext) as TreeContextType;

  const stateRef = useRef(appState);
  const photoRef = useRef(selectedPhotoUrl);

  useEffect(() => {
    stateRef.current = appState;
    photoRef.current = selectedPhotoUrl;
  }, [appState, selectedPhotoUrl]);

  const [loading, setLoading] = useState(true);

  // Refs for gesture processing
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTime = useRef<number>(-1);
  
  // 滤波器
  const palmXFilter = useRef(new LowPassFilter(0.4));
  const palmYFilter = useRef(new LowPassFilter(0.4));
  const opennessFilter = useRef(new LowPassFilter(0.3));
  const spreadFilter = useRef(new LowPassFilter(0.2));
  
  // 状态机
  const gestureStateMachine = useRef(new GestureStateMachine(GESTURE_CONFIG.gestureStabilityFrames));
  
  // 状态追踪
  const dwellTimerRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const clickCooldownRef = useRef<number>(0);
  const lastPalmPos = useRef<{ x: number, y: number } | null>(null);
  const lastHandDistance = useRef<number | null>(null);
  const lastHandScale = useRef<number | null>(null);
  const velocityRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  // 检测手指是否伸展
  const isFingerExtended = useCallback((
    landmarks: NormalizedLandmark[],
    tipIdx: number,
    mcpIdx: number,
    wrist: NormalizedLandmark
  ): boolean => {
    const tipDist = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
    const mcpDist = Math.hypot(landmarks[mcpIdx].x - wrist.x, landmarks[mcpIdx].y - wrist.y);
    return tipDist > mcpDist * GESTURE_CONFIG.fingerExtensionThreshold;
  }, []);

  // 计算手掌张开程度 (0-1)
  const calculateOpenness = useCallback((landmarks: NormalizedLandmark[]): number => {
    const wrist = landmarks[0];
    const weights = GESTURE_CONFIG.openessWeights;
    
    // 计算每个手指的伸展程度
    const thumbExtension = isFingerExtended(landmarks, 4, 2, wrist) ? 1 : 0;
    const indexExtension = isFingerExtended(landmarks, 8, 5, wrist) ? 1 : 0;
    const middleExtension = isFingerExtended(landmarks, 12, 9, wrist) ? 1 : 0;
    const ringExtension = isFingerExtended(landmarks, 16, 13, wrist) ? 1 : 0;
    const pinkyExtension = isFingerExtended(landmarks, 20, 17, wrist) ? 1 : 0;
    
    // 加权平均
    const openness = 
      thumbExtension * weights.thumb +
      indexExtension * weights.index +
      middleExtension * weights.middle +
      ringExtension * weights.ring +
      pinkyExtension * weights.pinky;
    
    return openness;
  }, [isFingerExtended]);

  // 检测捏合手势
  const isPinching = useCallback((landmarks: NormalizedLandmark[]): boolean => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    return distance < GESTURE_CONFIG.pinchThreshold;
  }, []);

  // 计算手掌中心位置
  const getPalmCenter = useCallback((landmarks: NormalizedLandmark[]): { x: number, y: number } => {
    const palmX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
    const palmY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;
    return { x: palmX, y: palmY };
  }, []);

  // 计算手掌大小（用于缩放控制）
  const getHandScale = useCallback((landmarks: NormalizedLandmark[]): number => {
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    return Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const setupMediaPipe = async () => {
      try {
        // 并行启动摄像头和MediaPipe
        const streamPromise = navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: { ideal: 30 } }
        });

        const recognizerPromise = (async () => {
          const vision = await FilesetResolver.forVisionTasks("./wasm");
          return GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "./models/gesture_recognizer.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
          });
        })();

        const [stream, recognizer] = await Promise.all([streamPromise, recognizerPromise]);

        if (!mounted) return;

        recognizerRef.current = recognizer;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            setLoading(false);
            lastFrameTimeRef.current = Date.now();
            predictWebcam();
          };
        }
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setLoading(false);
      }
    };
    
    setupMediaPipe();
    
    return () => {
      mounted = false;
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const predictWebcam = () => {
    const now = Date.now();
    const delta = (now - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = now;

    const currentState = stateRef.current;
    const isPhotoOpen = !!photoRef.current;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const recognizer = recognizerRef.current;

    if (video && recognizer && canvas) {
      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        const results = recognizer.recognizeForVideo(video, Date.now());
        const ctx = canvas.getContext("2d");

        // 初始化手势状态
        let gestureState: GestureState = { ...defaultGestureState };
        let currentPointer = null;

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const wrist = landmarks[0];

          // 计算手指伸展状态
          const indexExtended = isFingerExtended(landmarks, 8, 5, wrist);
          const middleExtended = isFingerExtended(landmarks, 12, 9, wrist);
          const ringExtended = isFingerExtended(landmarks, 16, 13, wrist);
          const pinkyExtended = isFingerExtended(landmarks, 20, 17, wrist);
          const thumbExtended = isFingerExtended(landmarks, 4, 2, wrist);

          // 手势检测
          const isPointing = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
          const isFiveFingers = indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended;
          const isTwoFingers = indexExtended && middleExtended && !ringExtended && !pinkyExtended;
          const pinch = isPinching(landmarks);
          
          // 计算手掌张开程度
          const rawOpenness = calculateOpenness(landmarks);
          const smoothedOpenness = opennessFilter.current.filter(rawOpenness);
          
          // 计算手掌位置
          const palmPos = getPalmCenter(landmarks);
          const smoothedPalmX = palmXFilter.current.filter(1.0 - palmPos.x); // 镜像
          const smoothedPalmY = palmYFilter.current.filter(palmPos.y);
          
          // 计算速度
          let dx = 0, dy = 0;
          if (lastPalmPos.current) {
            dx = smoothedPalmX - (1.0 - lastPalmPos.current.x);
            dy = smoothedPalmY - lastPalmPos.current.y;
            velocityRef.current = { x: dx, y: dy };
          }
          lastPalmPos.current = { x: palmPos.x, y: palmPos.y };
          
          const isMoving = Math.abs(dx) > GESTURE_CONFIG.movementThreshold || 
                          Math.abs(dy) > GESTURE_CONFIG.movementThreshold;

          // 更新手势状态
          gestureState = {
            isOpen: isFiveFingers,
            isClosed: !indexExtended && !middleExtended && !ringExtended && !pinkyExtended,
            isPointing,
            isPinching: pinch,
            isTwoFingers,
            openness: smoothedOpenness,
            confidence: results.gestures?.[0]?.[0]?.score || 0,
            palmPosition: { x: smoothedPalmX, y: smoothedPalmY },
            palmVelocity: velocityRef.current
          };
          
          setGestureState(gestureState);

          // === 手势控制逻辑 ===
          
          // 1. 手掌张开程度控制粒子扩散
          if (isFiveFingers) {
            const spreadValue = spreadFilter.current.filter(smoothedOpenness);
            setSpreadFactor(spreadValue);
          }

          // 2. 单手缩放控制（五指张开时）
          if (results.landmarks.length === 1 && isFiveFingers && currentState === 'CHAOS') {
            const currentScale = getHandScale(landmarks);
            if (lastHandScale.current !== null) {
              const deltaScale = currentScale - lastHandScale.current;
              const speed = Math.abs(deltaScale);
              const amplifiedDelta = Math.sign(deltaScale) * speed * (1 + speed * 50);
              
              setZoomOffset(prev => {
                const next = prev - amplifiedDelta * 200.0;
                return Math.max(-20, Math.min(next, 40));
              });
            }
            lastHandScale.current = currentScale;
          } else {
            lastHandScale.current = null;
          }

          // 3. 两指平移控制
          if (!isPhotoOpen && isTwoFingers) {
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const centerX = (indexTip.x + middleTip.x) / 2;
            const centerY = (indexTip.y + middleTip.y) / 2;
            
            const worldX = (0.5 - centerX) * 20;
            const worldY = (0.5 - centerY) * 12;
            
            setPanOffset({ x: worldX, y: worldY });
            dwellTimerRef.current = 0;
            setHoverProgress(0);
          }

          // 4. 单指指向和点击
          if (!isTwoFingers && !isFiveFingers && currentState === 'CHAOS' && (isPointing || pinch)) {
            const indexTip = landmarks[8];
            currentPointer = { x: 1.0 - indexTip.x, y: indexTip.y };
            
            // 设置吸引点
            setAttractorPoint(currentPointer);
            
            // 捏合点击
            if (pinch) {
              if (dwellTimerRef.current === 0) {
                setClickTrigger(Date.now());
                dwellTimerRef.current = -0.5;
              } else if (dwellTimerRef.current < 0) {
                dwellTimerRef.current += delta;
                if (dwellTimerRef.current > 0) dwellTimerRef.current = 0;
              }
            }
            // 悬停点击
            else if (!isMoving) {
              dwellTimerRef.current += delta;
              const progress = Math.min(dwellTimerRef.current / GESTURE_CONFIG.dwellClickTime, 1.0);
              setHoverProgress(progress);
              
              if (dwellTimerRef.current >= GESTURE_CONFIG.dwellClickTime) {
                setClickTrigger(Date.now());
                clickCooldownRef.current = GESTURE_CONFIG.clickCooldown;
                dwellTimerRef.current = 0;
                setHoverProgress(0);
              }
            } else {
              dwellTimerRef.current = Math.max(0, dwellTimerRef.current - delta * 2);
              setHoverProgress(Math.min(dwellTimerRef.current / GESTURE_CONFIG.dwellClickTime, 1.0));
            }
          } else {
            setAttractorPoint(null);
            dwellTimerRef.current = 0;
            setHoverProgress(0);
          }

          // 5. 状态切换和旋转控制
          if (!isPointing && !isTwoFingers && !isPhotoOpen && results.gestures.length > 0) {
            const gesture = results.gestures[0][0];
            const name = gesture.categoryName;
            const score = gesture.score;

            if (score > 0.6) {
              const stateResult = gestureStateMachine.current.update(name);
              
              if (stateResult.stable) {
                if (name === 'Open_Palm' && currentState === 'FORMED' && !isMoving) {
                  setState('CHAOS');
                  gestureStateMachine.current.reset();
                } else if (name === 'Closed_Fist') {
                  setState('FORMED');
                  gestureStateMachine.current.reset();
                }
              }
            }

            // 旋转控制 (FORMED 模式下五指移动)
            if (currentState === 'FORMED' && isFiveFingers && Math.abs(dx) > 0.001) {
              setRotationBoost(prev => {
                const newBoost = prev - dx * 8.0;
                return Math.max(Math.min(newBoost, 3.0), -3.0);
              });
            } else if (currentState === 'FORMED') {
              setRotationBoost(prev => {
                const decayed = prev * 0.95;
                return Math.abs(decayed) < 0.001 ? 0 : decayed;
              });
            }
          }

          // 6. 双手缩放
          if (results.landmarks.length === 2) {
            const hand1 = results.landmarks[0][0];
            const hand2 = results.landmarks[1][0];
            const dist = Math.hypot(hand1.x - hand2.x, hand1.y - hand2.y);

            if (lastHandDistance.current !== null) {
              const distDelta = dist - lastHandDistance.current;
              const speed = Math.abs(distDelta);
              const amplifiedDelta = Math.sign(distDelta) * speed * (1 + speed * 30);

              setZoomOffset(prev => {
                const next = prev - amplifiedDelta * 100.0;
                return Math.max(-20, Math.min(next, 40));
              });
            }
            lastHandDistance.current = dist;
          } else {
            lastHandDistance.current = null;
          }

        } else {
          // 没有检测到手
          dwellTimerRef.current = 0;
          setHoverProgress(0);
          setGestureState(defaultGestureState);
          setAttractorPoint(null);
          gestureStateMachine.current.reset();
          
          if (clickCooldownRef.current > 0) {
            clickCooldownRef.current -= delta;
          } else {
            setPointer(null);
            lastPalmPos.current = null;
          }
        }

        setPointer(currentPointer);

        // 清除画布（可选：绘制调试信息）
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="fixed inset-0 w-full h-full z-0">
      {/* 摄像头视频背景 */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        playsInline
        muted
        autoPlay
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/70 z-[1]" />

      {/* 手势骨架画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-[2]"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* 加载提示 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl text-emerald-500 animate-pulse bg-black/90 z-20 cinzel">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            <span>GESTURE SYSTEM INITIALIZING...</span>
          </div>
        </div>
      )}
      
      {/* 手势状态指示器 */}
      {!loading && (
        <div className="absolute bottom-4 left-4 z-20 text-xs font-mono text-white/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>GESTURE TRACKING ACTIVE</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestureInput;
