'use client';

import { InductionButton } from "@/shaders/neuform-isolated/NeuformIsolatedEffects";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function OrbeStudioPromo() {
    return (
        <section className="relative z-10 w-full min-h-[90vh] pb-40 border-b border-white/5 bg-[#050505] overflow-hidden flex flex-col items-center">

            {/* ThreeUI Induction Button (Iframe Isolated Effect) 
          This renders the exact Valence Core / Kinetic Induction visual source
       */}
            <div className="relative w-full h-[600px] mt-16 max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.1)]">
                <InductionButton
                    mode="dark"
                    hue={0}
                    saturation={1}
                    brightness={1}
                />

                {/* Transparent overlay link to allow clicking through to the actual tool without getting trapped in the iframe's hover state */}
                <Link
                    href="/ferramentas-premium/orbe-visual-studio"
                    className="absolute inset-0 z-50 flex flex-col justify-end items-center pb-12 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-500"
                >
                    <span className="flex items-center gap-2 bg-black/80 text-cyan-400 font-mono text-sm px-6 py-3 rounded-full border border-cyan-500/50 hover:bg-cyan-950/80 hover:-translate-y-1 transition-all backdrop-blur">
                        Acessar Orbe Visual Studio <ArrowRight size={16} />
                    </span>
                </Link>
            </div>

        </section>
    );
}
