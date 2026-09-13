"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function InhoLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsPending(true);

        try {
            const res = await fetch("https://inho-api.orbesystems.com.br/api/v1/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    domain: ""
                }),
            });

            if (!res.ok) {
                throw new Error("Credenciais inválidas ou erro no servidor");
            }

            const data = await res.json();

            if (data.access_token) {
                // Salvar token no localStorage para ser usado pelos layouts e rotas
                localStorage.setItem("token", data.access_token);

                // Se houver algum sistema de cookies depois, eles podem ser lidos.
                // Simulando a persistência para o middleware ler (gambiarra rápida caso o middleware no Root exija algo)
                document.cookie = `access_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

                router.push("/");
                router.refresh();
            } else {
                throw new Error("Token não recebido da API");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao tentar autenticar";
            setError(errorMessage);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div style={styles.page}>
            {/* Background grid */}
            <div style={styles.grid} />

            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.statusDot} />
                    <span style={styles.statusText}>INHO CRM // AUTH TERMINAL</span>
                </div>

                {/* Terminal window */}
                <div style={styles.terminal}>
                    {/* Title bar */}
                    <div style={styles.titleBar}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ ...styles.dot, background: "#ff5f57" }} />
                            <div style={{ ...styles.dot, background: "#febc2e" }} />
                            <div style={{ ...styles.dot, background: "#28c840" }} />
                        </div>
                        <span style={styles.titleText}>
                            inho_identity_verification.sh
                        </span>
                        <div style={{ width: 60 }} />
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>
                                <span style={styles.prompt}>$</span> EMAIL_ADDRESS
                            </label>
                            <input
                                id="email-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="user@domain.com"
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>
                                <span style={styles.prompt}>$</span> PASSWORD_HASH
                            </label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    id="password-input"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    style={styles.inputWithIcon}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div style={styles.error}>
                                <span style={styles.errorIcon}>⚠</span> {error}
                            </div>
                        )}

                        <button
                            id="submit-auth-btn"
                            type="submit"
                            disabled={isPending}
                            style={{
                                ...styles.submitBtn,
                                ...(isPending ? styles.submitBtnLoading : {}),
                            }}
                        >
                            {isPending ? (
                                <>
                                    <span style={styles.spinner}>◌</span>
                                    AUTENTICANDO...
                                </>
                            ) : (
                                "[ AUTENTICAR NA REDE INHO ]"
                            )}
                        </button>
                    </form>
                </div>

                {/* Decorative */}
                <p style={styles.subtext}>
                    ENCRYPTED_CHANNEL • TLS 1.3 • JWT_HS256
                </p>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #020408 0%, #050d1a 50%, #020408 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 9999,
    },
    grid: {
        position: "absolute",
        inset: 0,
        backgroundImage:
            "linear-gradient(rgba(0,255,245,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,245,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none",
    },
    container: {
        width: "100%",
        maxWidth: "480px",
        padding: "0 24px",
        position: "relative",
        zIndex: 1,
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "20px",
    },
    statusDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: "#00fff5",
        boxShadow: "0 0 8px #00fff5",
        animation: "pulse 2s infinite",
    },
    statusText: {
        color: "#00fff5",
        fontSize: "11px",
        letterSpacing: "0.15em",
        opacity: 0.8,
    },
    terminal: {
        background: "rgba(5, 15, 30, 0.9)",
        border: "1px solid rgba(0,255,245,0.2)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 0 40px rgba(0,255,245,0.08), 0 20px 60px rgba(0,0,0,0.5)",
    },
    titleBar: {
        background: "rgba(0,255,245,0.05)",
        borderBottom: "1px solid rgba(0,255,245,0.1)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
    },
    titleText: {
        color: "rgba(0,255,245,0.5)",
        fontSize: "12px",
        letterSpacing: "0.08em",
    },
    form: {
        padding: "28px 28px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        color: "rgba(0,255,245,0.6)",
        fontSize: "11px",
        letterSpacing: "0.12em",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    prompt: {
        color: "#00fff5",
    },
    input: {
        background: "rgba(0,255,245,0.04)",
        border: "1px solid rgba(0,255,245,0.15)",
        borderRadius: "6px",
        padding: "12px 14px",
        color: "#e0faff",
        fontSize: "14px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    },
    passwordWrapper: {
        position: "relative",
        display: "flex",
        alignItems: "center",
    },
    inputWithIcon: {
        background: "rgba(0,255,245,0.04)",
        border: "1px solid rgba(0,255,245,0.15)",
        borderRadius: "6px",
        padding: "12px 40px 12px 14px",
        color: "#e0faff",
        fontSize: "14px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    },
    eyeButton: {
        position: "absolute",
        right: "12px",
        background: "none",
        border: "none",
        color: "rgba(0,255,245,0.4)",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    error: {
        background: "rgba(255, 60, 60, 0.08)",
        border: "1px solid rgba(255, 60, 60, 0.3)",
        borderRadius: "6px",
        padding: "10px 14px",
        color: "#ff6b6b",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    errorIcon: {
        fontSize: "16px",
    },
    submitBtn: {
        background: "linear-gradient(135deg, rgba(0,255,245,0.15), rgba(0,102,255,0.15))",
        border: "1px solid rgba(0,255,245,0.4)",
        borderRadius: "8px",
        padding: "14px",
        color: "#00fff5",
        fontSize: "13px",
        letterSpacing: "0.12em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
    },
    submitBtnLoading: {
        opacity: 0.7,
        cursor: "not-allowed",
    },
    spinner: {
        display: "inline-block",
    },
    subtext: {
        textAlign: "center" as const,
        color: "rgba(0,255,245,0.2)",
        fontSize: "10px",
        letterSpacing: "0.15em",
        marginTop: "20px",
    },
};
