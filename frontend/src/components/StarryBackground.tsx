'use client';
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles, Stars, Float } from '@react-three/drei';

export default function StarryBackground() {
    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-black overflow-hidden">
            <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 2]}>
                <color attach="background" args={['#050810']} />

                {/* Background Stars Analógicas (Classic) */}
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                {/* Stardust do Orbe Studio (Cyberpunk) */}
                <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                    <Sparkles count={1500} scale={25} size={2} speed={0.5} noise={1} color="#00ffcc" opacity={0.6} />
                    <Sparkles count={500} scale={15} size={3} speed={0.8} noise={2} color="#bb00ff" opacity={0.8} />
                    <Sparkles count={300} scale={10} size={5} speed={1.2} noise={3} color="#ffffff" opacity={0.4} />
                </Float>
            </Canvas>
        </div>
    );
}
