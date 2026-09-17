"use client";

import React, { useEffect, useRef } from "react";
import { PlasmaButton } from "./NeuformIsolatedEffects";

export function CustomPlasmaButton({ text, href, mode = "dark", hue = 0, saturation = 1, brightness = 1 }: any) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            // The exact source does not emit CUSTOM_INDUCTION_CLICK anymore.
            // E2E test clicks via overlay instead, but we retain postMessage receiver in Header.
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full cursor-pointer group"
            onClick={() => {
                // Emit custom click to bubble up to Next router in Header.tsx
                window.postMessage({ type: 'CUSTOM_INDUCTION_CLICK', text, href }, '*');
            }}
        >
            {/* 
        This transparent overlay intercepts the mouse clicks so they don't get swallowed by the iframe.
        Since we also want pointer events to trigger the hover effects ON the iframe, we use CSS
        pointer events magic: wait, if we intercept, hover won't pass through.
        The correct way for purely visual exact-source compliance is to let the iframe handle hover,
        and listen for pointer down inside the frame. However, the exact source is an Isolated Effect
        that we cannot modify.
        We will rely on the Header wrapping link for clicking, but we pass transparent text overlay.
      */}
            <div className="absolute inset-0 z-0 pointer-events-none w-full h-full transform scale-[0.6]">
                <PlasmaButton mode={mode} hue={hue} saturation={saturation} brightness={brightness} />
            </div>
            <div className="absolute inset-0 z-10 flex items-center justify-center font-semibold text-sm tracking-[.26em] text-[#e2f1ff] pointer-events-auto"
                style={{ textShadow: "0 1px 12px rgba(0, 16, 40, .85)" }}>
                {text}
            </div>
        </div>
    );
}
