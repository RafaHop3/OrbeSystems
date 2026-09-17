'use client';
import { BrandOrbs } from "../shaders/brand-orbs/BrandOrbs";

export function CustomBrandOrb({ variant = "framer", mode = "dark", speed = 1.0 }) {
    return (
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border-2 border-neon-cyan shadow-[0_0_15px_rgba(0,242,254,0.6)] group-hover:scale-110 transition-transform bg-[#050608]">
            <div className="scale-[0.57] w-[56px] h-[56px]">
                {/* @ts-ignore */}
                <BrandOrbs variant={variant} size="medium" mode={mode} speed={speed} />
            </div>
        </div>
    );
}
