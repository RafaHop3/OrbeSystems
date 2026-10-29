'use client';
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles, Stars, Float } from '@react-three/drei';
import { WebGLErrorBoundary, isWebGLAvailable } from '@/components/WebGLErrorBoundary';

function StarryCanvas() {
    return (
        <Canvas 
            camera={{ position: [0, 0, 10], fov: 60 }} 
            dpr={[1, 1.5]}
            gl={{ 
                antialias: false, 
                powerPreference: 'low-power',
                failIfMajorPerformanceCaveat: false 
            }}
        >
            <color attach="background" args={['#050810']} />

            {/* Background Stars Analógicas (Classic) */}
            <Stars radius={100} depth={50} count={3500} factor={4} saturation={0} fade speed={0.8} />

            {/* Stardust do Orbe Studio (Cyberpunk) */}
            <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
                <Sparkles count={1000} scale={25} size={2} speed={0.4} noise={1} color="#00ffcc" opacity={0.6} />
                <Sparkles count={400} scale={15} size={3} speed={0.6} noise={2} color="#bb00ff" opacity={0.7} />
                <Sparkles count={200} scale={10} size={4} speed={1.0} noise={3} color="#ffffff" opacity={0.4} />
            </Float>
        </Canvas>
    );
}

export default function StarryBackground() {
    const [canRenderWebGL, setCanRenderWebGL] = useState(false);

    useEffect(() => {
        setCanRenderWebGL(isWebGLAvailable());
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#050810] overflow-hidden">
            {canRenderWebGL ? (
                <WebGLErrorBoundary
                    fallback={
                        <div 
                            className="absolute inset-0 bg-[#050810] pointer-events-none opacity-80"
                            style={{
                                backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0, 255, 204, 0.08) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(187, 0, 255, 0.05) 0%, transparent 50%)'
                            }}
                        />
                    }
                >
                    <StarryCanvas />
                </WebGLErrorBoundary>
            ) : (
                <div 
                    className="absolute inset-0 bg-[#050810] pointer-events-none opacity-80"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0, 255, 204, 0.08) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(187, 0, 255, 0.05) 0%, transparent 50%)'
                    }}
                />
            )}
        </div>
    );
}
