export default function HorizontalScanline() {
    const text = Array(30).fill('OrbeSystemsº').join('');

    return (
        <div
            className="fixed left-0 w-full pointer-events-none z-[100] opacity-60 mix-blend-screen flex whitespace-nowrap overflow-hidden shadow-[0_0_10px_rgba(0,255,245,0.4)]"
            style={{ animation: 'scanline-down 6s linear infinite' }}
        >
            <div
                className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.2em] text-[#00f2fe]/90 drop-shadow-[0_0_8px_rgba(0,242,254,1)] animate-[marquee-right_30s_linear_infinite]"
            >
                {text} {text}
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scanline-down {
          0% { top: -20px; }
          100% { top: 110vh; }
        }
        @keyframes marquee-right {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
        </div>
    );
}
