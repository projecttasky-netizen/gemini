/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Camera as CameraIcon, Info, Loader2, Sparkles } from 'lucide-react';

// Color Palette
const COLORS = {
  sorcererOrange: '#FF6F00',
  sorcererGold: '#FFB300',
  sorcererGlow: '#FF9100',
  bgDark: '#050505',
};

// --- Magic Shield Component (Three.js Logic) ---
const MagicShieldScene = ({ landmarks, width, height }: { landmarks: any; width: number; height: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const shieldGroupRef = useRef<THREE.Group | null>(null);
  const ringsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Setup Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create Shield Group
    const shieldGroup = new THREE.Group();
    scene.add(shieldGroup);
    shieldGroupRef.current = shieldGroup;

    // Helper to create intricate rings
    const createRing = (radius: number, thickness: number, segments: number, speed: number, pattern: 'solid' | 'dashed' | 'runes') => {
      let geometry;
      if (pattern === 'dashed') {
        geometry = new THREE.RingGeometry(radius, radius + thickness, segments, 1, 0, Math.PI * 1.5);
      } else {
        geometry = new THREE.RingGeometry(radius, radius + thickness, segments);
      }
      
      let material;
      if (pattern === 'runes') {
        // Create a canvas texture for runes
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = COLORS.sorcererOrange;
          ctx.font = 'bold 40px serif';
          ctx.textAlign = 'center';
          const runes = '᚛ ᚜ ᚑ ᚒ ᚓ ᚔ ᚕ ᚖ ᚗ ᚘ ᚙ ᚚ';
          for (let i = 0; i < 10; i++) {
            ctx.fillText(runes[Math.floor(Math.random() * runes.length)], (i * 50) + 25, 45);
          }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.set(8, 1);
        material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
      } else {
        material = new THREE.MeshBasicMaterial({
          color: COLORS.sorcererOrange,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      (mesh as any).rotationSpeed = speed;
      return mesh;
    };

    // Add multiple rings
    const ringConfig = [
      { r: 1.0, t: 0.05, s: 64, spd: 0.02, p: 'solid' },
      { r: 1.1, t: 0.02, s: 32, spd: -0.05, p: 'dashed' },
      { r: 1.2, t: 0.15, s: 64, spd: 0.01, p: 'runes' }, // NEW RUNE RING
      { r: 0.8, t: 0.01, s: 4, spd: 0.1, p: 'solid' }, // Inner square
      { r: 1.4, t: 0.03, s: 6, spd: -0.01, p: 'solid' }, // Outer hexagon
      { r: 1.6, t: 0.01, s: 128, spd: 0.005, p: 'solid' }, // Far outer thin ring
    ];

    ringConfig.forEach(conf => {
      const ring = createRing(conf.r, conf.t, conf.s, conf.spd, conf.p as any);
      shieldGroup.add(ring);
      ringsRef.current.push(ring);
    });

    // Add some "sparks" or particles
    const particlesCount = 50;
    const particlesGeometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 5;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: COLORS.sorcererGold,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    shieldGroup.add(particles);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      ringsRef.current.forEach(ring => {
        ring.rotation.z += (ring as any).rotationSpeed;
      });
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      ringsRef.current = [];
    };
  }, [width, height]);

  // Update Shield Position and Scale based on Landmarks
  useEffect(() => {
    if (!landmarks || !shieldGroupRef.current || !cameraRef.current || !rendererRef.current) {
        if (shieldGroupRef.current) shieldGroupRef.current.visible = false;
        return;
    }

    shieldGroupRef.current.visible = true;

    // Use wrist (0) or middle finger mcp (9) as palm center
    // Let's use landmark 9 as it's more stable for "holding" the shield
    const palm = landmarks[9];
    const wrist = landmarks[0];
    
    // Convert 0-1 coords to Three.js world coords
    // This is a simplified projection
    const x = (palm.x - 0.5) * 10 * (width / height);
    const y = -(palm.y - 0.5) * 10;
    const z = -palm.z * 5; // Use depth to scale (closer = larger)

    shieldGroupRef.current.position.set(x, y, 0);

    // Dynamic Scale based on hand size
    // Distance between wrist and middle finger base
    const dx = palm.x - wrist.x;
    const dy = palm.y - wrist.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const scale = dist * 8; // Adjust multiplier for visual size
    shieldGroupRef.current.scale.set(scale, scale, scale);

    // Tilt shield based on hand orientation
    // Index base (5) vs Pinky base (17) for rotation
    const indexMCP = landmarks[5];
    const pinkyMCP = landmarks[17];
    const angleX = Math.atan2(palm.y - wrist.y, palm.x - wrist.x) + Math.PI/2;
    const angleY = Math.atan2(pinkyMCP.z - indexMCP.z, pinkyMCP.x - indexMCP.x);
    
    // Apply rotations
    shieldGroupRef.current.rotation.x = -palm.z * 5; // Simplified tilt
    // shieldGroupRef.current.rotation.z = angleX; // Optional: align with hand up/down
    
  }, [landmarks, width, height]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;
};

// --- Main App Component ---
export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarks, setLandmarks] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: Results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setLandmarks(results.multiHandLandmarks[0]);
      } else {
        setLandmarks(null);
      }
      if (isLoading) setIsLoading(false);
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
             await hands.send({ image: videoRef.current });
        }
      },
      width: 1280,
      height: 720,
    });

    camera.start().then(() => {
        setIsCameraReady(true);
    });

    return () => {
        camera.stop();
        hands.close();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white select-none">
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0 bg-neutral-900 opacity-20 pointer-events-none" />

      {/* Video Feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover grayscale opacity-60 scale-x-[-1]"
        playsInline
      />

      {/* AR Scene */}
      {isCameraReady && (
        <MagicShieldScene 
            landmarks={landmarks} 
            width={dimensions.width} 
            height={dimensions.height} 
        />
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 flex justify-between items-start pointer-events-auto"
        >
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-2">
              <Shield className="w-8 h-8 text-[#FF6F00] fill-[#FF6F00]/20" />
              Sorcerer <span className="text-[#FF6F00]">Shield</span>
            </h1>
            <p className="text-xs font-mono uppercase tracking-[0.2em] opacity-40 mt-1">
              Augmented Reality Interface // MediaPipe Vision
            </p>
          </div>
          
          <div className="flex gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono text-[#FF6F00] opacity-80 mb-1">STABILITY</span>
                <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-[#FF6F00]"
                        animate={{ width: landmarks ? '90%' : '10%' }}
                    />
                </div>
             </div>
          </div>
        </motion.div>

        {/* Center Prompt */}
        <AnimatePresence>
            {!landmarks && !isLoading && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex-1 flex items-center justify-center p-12"
                >
                    <div className="text-center bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl max-w-sm">
                        <div className="w-16 h-16 bg-[#FF6F00]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-8 h-8 text-[#FF6F00] animate-pulse" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Cast Your Shield</h2>
                        <p className="text-sm text-white/50 mb-6 italic">Show your palm to the camera to manifest the mystic arts.</p>
                        <div className="flex justify-center gap-1">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-1 h-1 bg-[#FF6F00] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-auto p-8 flex justify-between items-end">
            <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg border border-white/5 pointer-events-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
                        System {isCameraReady ? 'Online' : 'Initializing'}
                    </span>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-mono text-white/40">FPS: 60 // SYNC: ACTIVE</p>
                    <p className="text-[10px] font-mono text-white/40">LANDMARKS: {landmarks ? 'LOCKED' : 'SCANNING'}</p>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <CameraIcon className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <Info className="w-4 h-4 text-white/40" />
                    </div>
                </div>
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">
                    Built by Sanctum Sanctorum Labs © 2026
                </p>
            </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <Loader2 className="w-12 h-12 text-[#FF6F00] animate-spin" />
                <Shield className="absolute inset-0 m-auto w-5 h-5 text-[#FF6F00]" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-mono tracking-[0.3em] uppercase">Initializing Arts</h3>
                <p className="text-xs text-white/30 italic mt-2">Loading MediaPipe Models...</p>
            </div>
        </div>
      )}
    </div>
  );
}
