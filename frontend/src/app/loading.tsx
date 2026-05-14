import { Terminal } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 font-mono text-neon-green overflow-hidden">
      {/* Scanline Background */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
      
      <div className="relative z-10 flex flex-col items-center gap-6 p-8 border border-neon-green/20 bg-black/60 shadow-[0_0_30px_rgba(57,255,20,0.05)] backdrop-blur-md">
        <div className="relative">
          <Terminal size={48} className="text-neon-green opacity-90" />
          <div className="absolute top-0 left-0 w-full h-full bg-neon-green/20 animate-pulse-neon rounded-full blur-xl -z-10" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold tracking-[0.3em] uppercase">Booting System</h2>
          
          <div className="flex space-x-1 mt-2">
            <span className="w-2 h-2 bg-neon-cyan animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-neon-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-neon-cyan animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        <div className="mt-4 text-[10px] text-neon-green/50 w-full">
          <div className="flex justify-between w-64 border-b border-neon-green/20 pb-1 mb-1">
            <span>[SYS]</span>
            <span>Allocating memory...</span>
          </div>
          <div className="flex justify-between w-64 border-b border-neon-green/20 pb-1 mb-1">
            <span>[NET]</span>
            <span>Establising secure link...</span>
          </div>
          <div className="flex justify-between w-64">
            <span>[UI]</span>
            <span className="animate-blink">Initialising matrix_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
