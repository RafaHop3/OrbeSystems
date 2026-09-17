'use client';

import { InductionButton } from "@/shaders/neuform-isolated/NeuformIsolatedEffects";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function OrbeStudioPromo() {
    return (
        <section className="relative z-10 w-full min-h-[90vh] pb-40 border-b border-white/5 bg-[#050505] overflow-hidden flex flex-col items-center">

            <div className="text-center mt-24 mb-6 relative z-20">
                <h1 className="text-5xl md:text-6xl font-cinzel text-white tracking-widest font-bold drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">Orbe Studio</h1>
                <p className="mt-4 text-cyan-400 font-mono tracking-widest uppercase text-sm">Laboratório de Arte Generativa · IA Hendryx Ativa</p>
            </div>

            <div className="relative w-[350px] md:w-[600px] h-[600px] overflow-hidden m-auto mix-blend-screen scale-[1.2] md:scale-100">
                <InductionButton mode="dark" hue={200} saturation={1.00} brightness={1.00} />

                <Link
                    href="/studio"
                    className="absolute inset-x-0 bottom-10 z-50 flex flex-col justify-end items-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-500"
                >
                    <span className="flex items-center gap-2 bg-black/80 text-cyan-400 font-mono text-sm px-6 py-3 rounded-full border border-cyan-500/50 hover:bg-cyan-950/80 hover:-translate-y-1 transition-all backdrop-blur">
                        Conectar IA Hendryx <ArrowRight size={16} />
                    </span>
                </Link>
            </div>

        </section>
    );
}
