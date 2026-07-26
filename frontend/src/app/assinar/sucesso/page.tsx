"use client";

/**
 * app/assinar/sucesso/page.tsx — OrbeSystems Premium Success Page
 * ════════════════════════════════════════════════════════
 * Página de sucesso após checkout do Stripe.
 * Verifica o session_id e mostra confirmação do upgrade.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://orbe-systems-api.onrender.com";
const API_URL = rawUrl.trim().replace(/\/$/, "");

export default function AssinarSucessoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyUpgrade = async () => {
      try {
        const token = document.cookie
          .split("; ")
          .find((c) => c.startsWith("orbe_auth_token="))
          ?.split("=")[1];

        if (!token) {
          router.push("/login?redirect=/assinar/sucesso");
          return;
        }

        // Verificar se o usuário foi atualizado para premium
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const userData = await res.json();
          if (userData.role === "premium") {
            setLoading(false);
          } else {
            // Se ainda não foi atualizado, aguardar e verificar novamente
            setTimeout(verifyUpgrade, 2000);
          }
        } else {
          setError("Erro ao verificar status da assinatura.");
          setLoading(false);
        }
      } catch {
        setError("Erro de conexão. Tente novamente.");
        setLoading(false);
      }
    };

    verifyUpgrade();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-neon-green animate-spin mx-auto mb-4" />
          <p className="text-neon-green text-sm">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-sm underline"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <CheckCircle className="w-20 h-20 text-neon-green mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">
            Upgrade Concluído!
          </h1>
          <p className="text-neon-green/80 text-sm">
            Você agora é um usuário Premium
          </p>
        </div>

        <div className="border border-neon-green/30 bg-neon-green/5 p-6 rounded-lg mb-8">
          <p className="text-white/80 text-sm mb-4">
            Seu acesso premium já está ativo. Você pode aproveitar todas as
            ferramentas exclusivas.
          </p>
          <ul className="text-left text-white/60 text-sm space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-neon-green">✓</span> Ferramentas premium
            </li>
            <li className="flex items-center gap-2">
              <span className="text-neon-green">✓</span> API rate limit aumentado
            </li>
            <li className="flex items-center gap-2">
              <span className="text-neon-green">✓</span> Prioridade de suporte
            </li>
          </ul>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full border border-neon-green text-neon-green py-3 text-sm uppercase tracking-widest hover:bg-neon-green hover:text-black transition-colors"
        >
          Ir para Dashboard
        </button>
      </div>
    </div>
  );
}
