"use client";
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function NavigationControls() {
    const router = useRouter();

    return (
        <div className="flex items-center gap-2 px-6 pb-2 border-b border-[#1a1f26]/50 mb-2">
            <button
                onClick={() => router.back()}
                className="w-8 h-8 flex items-center justify-center bg-[#1a1f26]/50 hover:bg-[#1a1f26] rounded-md transition-colors text-[#8b949e] hover:text-white"
                title="Voltar"
            >
                <ChevronLeft size={16} />
            </button>
            <button
                onClick={() => router.forward()}
                className="w-8 h-8 flex items-center justify-center bg-[#1a1f26]/50 hover:bg-[#1a1f26] rounded-md transition-colors text-[#8b949e] hover:text-white"
                title="Avançar"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}
