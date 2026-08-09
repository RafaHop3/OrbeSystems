export default function VerticalMarquee() {
    const text = Array(20).fill('OrbeSystemsº').join('');

    return (
        <div className="fixed top-0 right-4 h-[100vh] w-4 mt-[10vh] overflow-hidden pointer-events-none z-[100] opacity-60 mix-blend-screen hidden lg:flex">
            <div className="absolute top-0 right-0 h-[200vh] flex flex-col pt-10">
                <div
                    className="text-[10px] tracking-[0.3em] font-mono whitespace-nowrap text-neon-cyan/80 drop-shadow-[0_0_10px_rgba(126,184,224,0.8)]"
                    style={{ writingMode: 'vertical-rl', animation: 'scroll-down 25s linear infinite' }}
                >
                    {text} {text}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scroll-down {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0%); }
        }
      `}} />
        </div>
    );
}
