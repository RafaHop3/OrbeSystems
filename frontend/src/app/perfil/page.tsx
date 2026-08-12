"use client";

/**
 * app/perfil/page.tsx — OrbeSystems Perfil / Change Password
 * ═══════════════════════════════════════════════════════════
 * Protected route (middleware.ts redirects unauthenticated users to /login).
 * Displays the logged-in user's info and provides a password change form.
 * Calls changePasswordAction Server Action → POST /api/users/change-password.
 */

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, LogOut } from "lucide-react";
import { changePasswordAction, getMeAction, logoutAction } from "@/lib/auth-actions";

export default function PerfilPage() {
    const router = useRouter();

    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [currentPwd, setCurrentPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [showCur, setShowCur] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Load current user from cookie-backed /api/auth/me
    useEffect(() => {
        getMeAction().then(({ user }) => {
            if (user) {
                setUserEmail(user.email);
                setUserRole(user.role);
            }
        });
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPwd !== confirmPwd) {
            setError("As novas senhas não coincidem.");
            return;
        }
        if (newPwd.length < 8) {
            setError("A nova senha deve ter pelo menos 8 caracteres.");
            return;
        }
        if (!/\d/.test(newPwd)) {
            setError("A nova senha deve conter pelo menos um número.");
            return;
        }

        startTransition(async () => {
            const result = await changePasswordAction(currentPwd, newPwd);
            if (!result.success) {
                setError(result.error ?? "Erro desconhecido.");
                return;
            }
            setSuccess(true);
            setCurrentPwd("");
            setNewPwd("");
            setConfirmPwd("");
        });
    };

    const handleLogout = async () => {
        await logoutAction();
        router.push("/login");
        router.refresh();
    };

    return (
        <div style={styles.page}>
            {/* Background grid */}
            <div style={styles.grid} />

            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.statusDot} />
                    <span style={styles.statusText}>ORBE SYSTEMS // PERFIL DO USUÁRIO</span>
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
                        <span style={styles.titleText}>user_profile.sh</span>
                        <div style={{ width: 60 }} />
                    </div>

                    {/* User info section */}
                    <div style={styles.infoSection}>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>$ EMAIL_ADDRESS</span>
                            <span style={styles.infoValue}>{userEmail ?? "carregando..."}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>$ ACCESS_LEVEL</span>
                            <span style={{
                                ...styles.infoValue,
                                color: userRole === "premium" ? "#39ff14" : "#00fff5",
                                textShadow: userRole === "premium" ? "0 0 8px #39ff14" : undefined,
                            }}>
                                {userRole?.toUpperCase() ?? "—"}
                                {userRole === "premium" && <ShieldCheck size={14} style={{ marginLeft: 6, display: "inline" }} />}
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={styles.sectionDivider}>
                        <span style={styles.sectionLabel}>► ALTERAR SENHA</span>
                    </div>

                    {/* Change password form */}
                    <form onSubmit={handleSubmit} style={styles.form}>

                        {/* Current password */}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>
                                <span style={styles.prompt}>$</span> SENHA_ATUAL
                            </label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    id="current-password"
                                    type={showCur ? "text" : "password"}
                                    value={currentPwd}
                                    onChange={(e) => setCurrentPwd(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    style={styles.inputWithIcon}
                                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                    onBlur={(e) => Object.assign(e.target.style, styles.inputBase)}
                                />
                                <button type="button" onClick={() => setShowCur(!showCur)} style={styles.eyeButton} aria-label="toggle">
                                    {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* New password */}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>
                                <span style={styles.prompt}>$</span> NOVA_SENHA
                            </label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    id="new-password"
                                    type={showNew ? "text" : "password"}
                                    value={newPwd}
                                    onChange={(e) => setNewPwd(e.target.value)}
                                    required
                                    placeholder="Mínimo 8 caracteres + 1 número"
                                    autoComplete="new-password"
                                    style={styles.inputWithIcon}
                                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                    onBlur={(e) => Object.assign(e.target.style, styles.inputBase)}
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)} style={styles.eyeButton} aria-label="toggle">
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm new password */}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>
                                <span style={styles.prompt}>$</span> CONFIRMAR_NOVA_SENHA
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPwd}
                                onChange={(e) => setConfirmPwd(e.target.value)}
                                required
                                placeholder="Repita a nova senha"
                                autoComplete="new-password"
                                style={styles.inputBase}
                                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                onBlur={(e) => Object.assign(e.target.style, styles.inputBase)}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={styles.errorBox}>
                                <span>⚠</span> {error}
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div style={styles.successBox}>
                                <span>✔</span> Senha alterada com sucesso! Sua sessão foi atualizada.
                            </div>
                        )}

                        <button
                            id="change-password-btn"
                            type="submit"
                            disabled={isPending}
                            style={{ ...styles.submitBtn, ...(isPending ? styles.submitBtnDisabled : {}) }}
                        >
                            {isPending ? (
                                <><span style={styles.spinner}>◌</span> ATUALIZANDO...</>
                            ) : (
                                "[ ALTERAR SENHA ]"
                            )}
                        </button>
                    </form>

                    {/* Footer — logout */}
                    <div style={styles.footer}>
                        <button id="logout-btn" onClick={handleLogout} style={styles.logoutBtn}>
                            <LogOut size={14} />
                            ENCERRAR SESSÃO
                        </button>
                    </div>
                </div>

                <p style={styles.subtext}>ENCRYPTED_CHANNEL • TLS 1.3 • JWT_HS256</p>
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
        fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
        position: "relative",
        overflow: "hidden",
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
    dot: { width: "12px", height: "12px", borderRadius: "50%" },
    titleText: { color: "rgba(0,255,245,0.5)", fontSize: "12px", letterSpacing: "0.08em" },
    infoSection: {
        padding: "20px 28px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        borderBottom: "1px solid rgba(0,255,245,0.08)",
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
    },
    infoLabel: {
        color: "rgba(0,255,245,0.4)",
        fontSize: "11px",
        letterSpacing: "0.1em",
    },
    infoValue: {
        color: "#e0faff",
        fontSize: "13px",
        letterSpacing: "0.04em",
        display: "flex",
        alignItems: "center",
    },
    sectionDivider: {
        padding: "12px 28px",
        background: "rgba(0,255,245,0.03)",
        borderBottom: "1px solid rgba(0,255,245,0.08)",
    },
    sectionLabel: {
        color: "rgba(0,255,245,0.5)",
        fontSize: "11px",
        letterSpacing: "0.15em",
    },
    form: {
        padding: "24px 28px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
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
    prompt: { color: "#00fff5" },
    inputBase: {
        background: "rgba(0,255,245,0.04)",
        border: "1px solid rgba(0,255,245,0.15)",
        borderRadius: "6px",
        padding: "12px 14px",
        color: "#e0faff",
        fontFamily: "inherit",
        fontSize: "14px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box" as const,
        transition: "all 0.2s",
    },
    inputWithIcon: {
        background: "rgba(0,255,245,0.04)",
        border: "1px solid rgba(0,255,245,0.15)",
        borderRadius: "6px",
        padding: "12px 40px 12px 14px",
        color: "#e0faff",
        fontFamily: "inherit",
        fontSize: "14px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box" as const,
        transition: "all 0.2s",
    },
    inputFocus: {
        background: "rgba(0,255,245,0.04)",
        border: "1px solid rgba(0,255,245,0.5)",
        borderRadius: "6px",
        padding: "12px 14px",
        color: "#e0faff",
        fontFamily: "inherit",
        fontSize: "14px",
        outline: "none",
        boxShadow: "0 0 12px rgba(0,255,245,0.1)",
        width: "100%",
        boxSizing: "border-box" as const,
        transition: "all 0.2s",
    },
    passwordWrapper: {
        position: "relative",
        display: "flex",
        alignItems: "center",
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
    },
    errorBox: {
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
    successBox: {
        background: "rgba(57, 255, 20, 0.06)",
        border: "1px solid rgba(57, 255, 20, 0.3)",
        borderRadius: "6px",
        padding: "10px 14px",
        color: "#39ff14",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    submitBtn: {
        background: "linear-gradient(135deg, rgba(0,255,245,0.15), rgba(0,102,255,0.15))",
        border: "1px solid rgba(0,255,245,0.4)",
        borderRadius: "8px",
        padding: "14px",
        color: "#00fff5",
        fontFamily: "inherit",
        fontSize: "13px",
        letterSpacing: "0.12em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: "all 0.2s",
    },
    submitBtnDisabled: { opacity: 0.7, cursor: "not-allowed" },
    spinner: { animation: "spin 1s linear infinite", display: "inline-block" },
    footer: {
        padding: "16px 28px 20px",
        borderTop: "1px solid rgba(0,255,245,0.06)",
        display: "flex",
        justifyContent: "center",
    },
    logoutBtn: {
        background: "transparent",
        border: "1px solid rgba(255, 95, 87, 0.3)",
        borderRadius: "6px",
        padding: "10px 20px",
        color: "rgba(255, 95, 87, 0.7)",
        fontFamily: "inherit",
        fontSize: "11px",
        letterSpacing: "0.1em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s",
    },
    subtext: {
        textAlign: "center" as const,
        color: "rgba(0,255,245,0.2)",
        fontSize: "10px",
        letterSpacing: "0.15em",
        marginTop: "20px",
    },
};
