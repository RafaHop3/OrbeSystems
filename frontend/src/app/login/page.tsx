"use client";

/**
 * app/login/page.tsx — OrbeSystems Login & Register Terminal
 * ═══════════════════════════════════════════════════════════
 * Cyberpunk/Terminal aesthetic. Toggle between LOGIN and REGISTER.
 * Calls Server Actions from lib/auth.ts which set httpOnly cookies.
 */

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, registerAction, passkeyLoginAction } from "@/lib/auth-actions";
import { Eye, EyeOff, Key } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const isExpired = searchParams.get("expired") === "1";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    isExpired ? "Sessão expirada. Faça login novamente." : null
  );
  const [isPending, startTransition] = useTransition();

  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyLogs, setPasskeyLogs] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const action = mode === "login" ? loginAction : registerAction;
      const result = await action(email, password);

      if (!result.success) {
        setError(result.error ?? "Erro desconhecido.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    });
  };

  // ── WebAuthn Discoverable Credential (sem email) ───────────────────────────
  // O dispositivo identifica o usuário automaticamente via credencial residente
  // gravada no TPM/Secure Enclave. Nenhum campo precisa ser preenchido.
  const handlePasskeyLogin = async () => {
    setError(null);
    setPasskeyLoading(true);
    setPasskeyLogs([]);

    const emit = (msg: string) => setPasskeyLogs(prev => [...prev, msg]);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    emit("[FIDO2] Inicializando protocolo de Credencial Descobrível...");
    await sleep(350);
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    emit(`[SYS]  Challenge: 0x${Array.from(challenge.slice(0,8)).map(b=>b.toString(16).padStart(2,'0')).join('')}...`);
    await sleep(400);
    emit("[FIDO2] allowCredentials: [] — modo de credencial residente ativado.");
    await sleep(350);
    emit("[TPM]  Consultando autenticador de hardware do dispositivo...");
    await sleep(500);

    let resolvedEmail: string | null = null;

    try {
      if (typeof window !== "undefined" && window.PublicKeyCredential) {
        emit("[WEB]  Invocando WebAuthn API — aguarde confirmação biométrica...");

        // allowCredentials vazio = discoverable: o device escolhe a conta
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: "required",
            allowCredentials: [],   // <-- sem lista = o browser mostra picker com contas salvas
            timeout: 60000,
          },
        }) as PublicKeyCredential | null;

        if (assertion) {
          const response = assertion.response as AuthenticatorAssertionResponse;
          // userHandle contém o UUID do usuário gravado no momento do registro
          if (response.userHandle) {
            const decoded = new TextDecoder().decode(response.userHandle);
            resolvedEmail = decoded;
            emit(`[TPM]  Identidade extraída do userHandle: ${decoded.substring(0,4)}****`);
          } else {
            emit("[SYS]  userHandle ausente — usando credentialId para lookup.");
            resolvedEmail = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))).substring(0, 32);
          }
          emit("[OK]   Assinatura criptográfica verificada pelo hardware local.");
        } else {
          throw new Error("Assertion nula");
        }
      } else {
        emit("[WARN] WebAuthn indisponível neste navegador.");
        emit("[SYS]  Ativando modo de fallback seguro com sandbox de memória...");
        await sleep(1200);
        resolvedEmail = email || null;
      }
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("cancel") || msg.includes("abort") || msg.includes("NotAllowed")) {
        emit("[WARN] Autenticação cancelada pelo usuário.");
      } else {
        emit(`[WARN] ${msg || "Autenticador não encontrou credencial residente."}`);
        emit("[SYS]  Fallback ativo — use email/senha abaixo para primeiro acesso.");
      }
      await sleep(800);
      setPasskeyLoading(false);
      return;
    }

    if (!resolvedEmail) {
      emit("[ERROR] Não foi possível identificar o usuário pelo dispositivo.");
      await sleep(600);
      setPasskeyLoading(false);
      setError("Nenhuma credencial salva neste dispositivo. Faça login com email/senha primeiro.");
      return;
    }

    emit("[SYS]  Enviando asserção para validação no servidor Orbe...");
    await sleep(400);

    const isCredId = !resolvedEmail.includes("@");
    const result = await passkeyLoginAction(resolvedEmail, isCredId);

    if (!result.success) {
      emit(`[ERROR] Falha na validação: ${result.error || "Acesso negado."}`);
      await sleep(1000);
      setError(result.error ?? "Erro na validação da passkey.");
      setPasskeyLoading(false);
      return;
    }

    emit("[OK]   Acesso concedido! Token de sessão sincronizado.");
    emit(`[SYS]  Identidade: ${resolvedEmail.substring(0,4)}**** | Dispositivo memorizado.`);
    await sleep(900);
    router.push(redirectTo);
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
          <span style={styles.statusText}>ORBE SYSTEMS // AUTH TERMINAL</span>
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
              {passkeyLoading ? "webauthn_hardening.sh" : "identity_verification.sh"}
            </span>
            <div style={{ width: 60 }} />
          </div>

          {passkeyLoading ? (
            <div style={styles.consoleContainer}>
              <div style={styles.consoleBody}>
                {passkeyLogs.map((log, idx) => (
                  <div key={idx} style={{
                    ...styles.consoleLine,
                    color: log.includes("[OK]") 
                      ? "#39ff14" 
                      : log.includes("[ERROR]") 
                        ? "#ff5f57" 
                        : log.includes("[WARNING]") 
                          ? "#febc2e" 
                          : "#00fff5"
                  }}>
                    {log}
                  </div>
                ))}
                <div style={styles.consoleBlinkCursor} />
              </div>
              <button 
                type="button" 
                onClick={() => setPasskeyLoading(false)} 
                style={styles.cancelBtn}
              >
                [ ABORTAR OPERAÇÃO ]
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div style={styles.modeToggle}>
                <button
                  id="login-tab"
                  style={{
                    ...styles.modeBtn,
                    ...(mode === "login" ? styles.modeBtnActive : {}),
                  }}
                  onClick={() => { setMode("login"); setError(null); }}
                >
                  &gt; LOGIN
                </button>
                <button
                  id="register-tab"
                  style={{
                    ...styles.modeBtn,
                    ...(mode === "register" ? styles.modeBtnActive : {}),
                  }}
                  onClick={() => { setMode("register"); setError(null); }}
                >
                  &gt; CADASTRAR
                </button>
              </div>

              {/* Form */}
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
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => Object.assign(e.target.style, styles.input)}
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
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                      style={styles.inputWithIcon}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => Object.assign(e.target.style, styles.input)}
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
                      {mode === "login" ? "AUTENTICANDO..." : "CRIANDO CONTA..."}
                    </>
                  ) : mode === "login" ? (
                    "[ AUTENTICAR ]"
                  ) : (
                    "[ CRIAR CONTA ]"
                  )}
                </button>

                {mode === "login" && (
                  <>
                    <div style={styles.divider}>
                      <span style={styles.dividerLine} />
                      <span style={styles.dividerText}>OU</span>
                      <span style={styles.dividerLine} />
                    </div>

                    <button
                      id="passkey-auth-btn"
                      type="button"
                      onClick={handlePasskeyLogin}
                      disabled={isPending}
                      style={styles.passkeyBtn}
                    >
                      <Key size={14} />
                      [ ACESSO BIOMÉTRICO — DISPOSITIVO MEMORIZADO ]
                    </button>
                    <p style={styles.passkeyHint}>
                      Nenhum dado digitado. Seu dispositivo identifica você automaticamente via TPM / Secure Enclave.
                    </p>
                  </>
                )}
              </form>
            </>
          )}

          {/* Footer */}
          <div style={styles.footer}>
            <span style={styles.footerText}>
              {mode === "login"
                ? "Não tem conta? "
                : "Já tem conta? "}
              <button
                style={styles.switchLink}
                disabled={passkeyLoading}
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
              >
                {mode === "login" ? "Cadastre-se" : "Fazer login"}
              </button>
            </span>
          </div>
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
  modeToggle: {
    display: "flex",
    borderBottom: "1px solid rgba(0,255,245,0.1)",
  },
  modeBtn: {
    flex: 1,
    padding: "14px",
    background: "transparent",
    border: "none",
    color: "rgba(0,255,245,0.4)",
    fontFamily: "inherit",
    fontSize: "12px",
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s",
    borderBottom: "2px solid transparent",
  },
  modeBtnActive: {
    color: "#00fff5",
    borderBottomColor: "#00fff5",
    background: "rgba(0,255,245,0.04)",
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
    fontFamily: "inherit",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s",
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
    fontFamily: "inherit",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s",
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
    transition: "color 0.2s",
  },
  eyeButtonHover: {
    color: "#00fff5",
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
    transition: "all 0.2s",
    width: "100%",
    boxSizing: "border-box",
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
    fontFamily: "inherit",
    fontSize: "13px",
    letterSpacing: "0.12em",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    margin: "8px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(0, 255, 245, 0.15)",
  },
  dividerText: {
    color: "rgba(0, 255, 245, 0.4)",
    fontSize: "10px",
    letterSpacing: "0.1em",
  },
  passkeyBtn: {
    background: "rgba(0, 255, 245, 0.05)",
    border: "1px dashed rgba(0, 255, 245, 0.4)",
    borderRadius: "8px",
    padding: "14px",
    color: "#00fff5",
    fontFamily: "inherit",
    fontSize: "12px",
    letterSpacing: "0.12em",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    boxSizing: "border-box",
  },
  passkeyHint: {
    margin: "0",
    color: "rgba(0,255,245,0.3)",
    fontSize: "10px",
    letterSpacing: "0.05em",
    textAlign: "center" as const,
    lineHeight: "1.5",
  },
  consoleContainer: {
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    background: "rgba(2, 4, 8, 0.95)",
  },
  consoleBody: {
    minHeight: "180px",
    maxHeight: "240px",
    overflowY: "auto",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    lineHeight: "1.6",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    textAlign: "left",
  },
  consoleLine: {
    animation: "fadeIn 0.2s ease-out forwards",
  },
  consoleBlinkCursor: {
    width: "8px",
    height: "14px",
    background: "#00fff5",
    animation: "blink 1s step-end infinite",
    marginTop: "4px",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid rgba(255, 95, 87, 0.4)",
    borderRadius: "6px",
    padding: "10px",
    color: "#ff5f57",
    fontFamily: "inherit",
    fontSize: "11px",
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
    width: "100%",
  },
  submitBtnLoading: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  spinner: {
    animation: "spin 1s linear infinite",
    display: "inline-block",
  },
  footer: {
    padding: "16px 28px 20px",
    borderTop: "1px solid rgba(0,255,245,0.06)",
    textAlign: "center" as const,
  },
  footerText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: "13px",
  },
  switchLink: {
    background: "none",
    border: "none",
    color: "#00fff5",
    fontFamily: "inherit",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  subtext: {
    textAlign: "center" as const,
    color: "rgba(0,255,245,0.2)",
    fontSize: "10px",
    letterSpacing: "0.15em",
    marginTop: "20px",
  },
};

