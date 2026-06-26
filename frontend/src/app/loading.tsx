import { Shield } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0a08] font-serif text-[#dfd2b8] overflow-hidden sketch-grid">
      <div className="relative z-10 flex flex-col items-center gap-6 p-8 border-2 border-[#c5a059] bg-[#181310] shadow-gilt rounded-lg max-w-sm w-full mx-4">
        <div className="relative">
          <Shield size={44} className="text-renaissance-gold opacity-90 animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full bg-[#d4af37]/10 rounded-full blur-xl -z-10" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-lg font-cinzel tracking-widest uppercase text-white/95">Orbe Systems</h2>
          <span className="text-xs text-renaissance-gold font-cinzel italic tracking-widest mt-1">Abrindo a galeria...</span>
          
          <div className="flex space-x-1.5 mt-3">
            <span className="w-1.5 h-1.5 bg-[#52141a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-[#52141a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        <div className="mt-4 text-[10px] text-renaissance-muted w-full font-serif italic border-t border-[#dfd2b8]/10 pt-4 space-y-2">
          <div className="flex justify-between pb-1 border-b border-[#dfd2b8]/5">
            <span>[TELA]</span>
            <span>Preparando ambiente...</span>
          </div>
          <div className="flex justify-between pb-1 border-b border-[#dfd2b8]/5">
            <span>[LÓGICA]</span>
            <span>Configurando sistema...</span>
          </div>
          <div className="flex justify-between">
            <span>[SISTEMA]</span>
            <span className="animate-pulse">Iniciando código_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
