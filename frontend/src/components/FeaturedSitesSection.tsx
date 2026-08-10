'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

const sites = [
    {
        name: 'Ghost Engine',
        tagline: 'Sniper Algorítmico · Remoção Automática de Dados (LGPD)',
        url: '/ghost-engine',
        image: '/featured-ghostengine.png',
        accent: '#00f2fe',
        accentBg: 'rgba(0, 242, 254, 0.08)',
        accentBorder: 'rgba(0, 242, 254, 0.25)',
        badge: '👻 Opt-Out',
        isAnimated: true,
    },
    {
        name: 'AstroWatch',
        tagline: 'Universe Explorer · Satélites & Cosmos 3D',
        url: 'https://astro-watch-chi.vercel.app/',
        image: '/featured-astrowatch.png',
        accent: '#00d4ff',
        accentBg: 'rgba(0, 212, 255, 0.08)',
        accentBorder: 'rgba(0, 212, 255, 0.25)',
        badge: '🚀 Space Tech',
    },
    {
        name: 'Nexus Core',
        tagline: 'Discover · Connect · Play',
        url: 'https://nexus-core-discover-connect-play.vercel.app/',
        image: '/featured-nexuscore.png',
        accent: '#39ff14',
        accentBg: 'rgba(57, 255, 20, 0.08)',
        accentBorder: 'rgba(57, 255, 20, 0.4)',
        badge: '🕹 Arcade',
        isAnimated: true,
    },
    {
        name: 'PDF Ever',
        tagline: 'Compressão Inteligente · PDF Toolkit',
        url: 'https://pdf-8-ever.vercel.app/',
        image: '/featured-pdfever.png',
        accent: '#30d158',
        accentBg: 'rgba(48, 209, 88, 0.08)',
        accentBorder: 'rgba(48, 209, 88, 0.25)',
        badge: '📄 DevTool',
    },
    {
        name: 'Jovem Pano News',
        tagline: 'Portal de Notícias · Jornalismo Digital',
        url: 'https://jovempanonews.vercel.app/',
        image: '/featured-jovempanonews.png',
        accent: '#ff453a',
        accentBg: 'rgba(255, 69, 58, 0.08)',
        accentBorder: 'rgba(255, 69, 58, 0.25)',
        badge: '📰 News',
    },
];

export default function FeaturedSitesSection() {
    return (
        <section className="relative z-10 py-20 px-4">
            {/* Section header */}
            <div className="text-center mb-12">
                <p className="text-[10px] uppercase tracking-[0.5em] text-neon-green/40 font-mono mb-3">
                    ◈ Ecossistema Orbe
                </p>
                <h2 className="font-cinzel text-2xl md:text-3xl font-semibold text-white/90 uppercase tracking-wider mb-3">
                    Sites em Destaque
                </h2>
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent mx-auto" />
            </div>

            {/* Cards grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                {sites.map((site) => (
                    <a
                        key={site.url}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative flex flex-col overflow-hidden rounded-lg border transition-all duration-500 ${site.isAnimated ? 'hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(57,255,20,0.5)]' : ''}`}
                        style={{
                            borderColor: site.accentBorder,
                            background: `linear-gradient(165deg, ${site.accentBg}, rgba(0,0,0,0.7))`,
                        }}
                    >
                        {/* Animated glow ring on hover */}
                        <span
                            className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{
                                boxShadow: `0 0 40px ${site.accent}33, inset 0 0 20px ${site.accent}11`,
                            }}
                        />

                        {/* Image with parallax-like zoom */}
                        <div className="relative w-full h-40 overflow-hidden">
                            <Image
                                src={site.image}
                                alt={site.name}
                                fill
                                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                            {/* Gradient overlay keeps text on bottom readable */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: `linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)`,
                                }}
                            />

                            {/* Badge chip */}
                            <span
                                className="absolute top-3 left-3 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full z-30"
                                style={{
                                    background: `${site.accent}22`,
                                    border: `1px solid ${site.accent}55`,
                                    color: site.accent,
                                    textShadow: site.isAnimated ? `0 0 5px ${site.accent}` : 'none',
                                }}
                            >
                                {site.badge}
                            </span>

                            {/* Arcade styles (Scanlines & Glitch) */}
                            {site.isAnimated && (
                                <div className="absolute inset-0 z-20 pointer-events-none opacity-40 mix-blend-screen bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] group-hover:opacity-75 transition-opacity" />
                            )}

                            {/* Animated pulse dot */}
                            <span className="absolute top-3 right-3 flex h-2 w-2">
                                <span
                                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                    style={{ backgroundColor: site.accent }}
                                />
                                <span
                                    className="relative inline-flex rounded-full h-2 w-2"
                                    style={{ backgroundColor: site.accent }}
                                />
                            </span>
                        </div>

                        {/* Card body */}
                        <div className="flex flex-col flex-1 p-4 gap-3">
                            <div>
                                <h3
                                    className="font-cinzel text-base font-semibold tracking-wide mb-1"
                                    style={{ color: site.accent }}
                                >
                                    {site.name}
                                </h3>
                                <p className="text-[10px] text-white/50 font-mono leading-relaxed">
                                    {site.tagline}
                                </p>
                            </div>

                            {/* CTA button */}
                            <div className="mt-auto">
                                <span
                                    className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold px-4 py-2 rounded-sm transition-all duration-300 group-hover:gap-3"
                                    style={{
                                        border: `1px solid ${site.accentBorder}`,
                                        color: site.accent,
                                        background: `${site.accentBg}`,
                                    }}
                                >
                                    Acesse aqui
                                    <ExternalLink size={10} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </span>
                            </div>
                        </div>

                        {/* Animated bottom bar */}
                        <div
                            className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-b-lg"
                            style={{ background: `linear-gradient(to right, transparent, ${site.accent}, transparent)` }}
                        />
                    </a>
                ))}
            </div>
        </section>
    );
}
