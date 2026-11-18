import { useState } from "react";
import { authClient } from "./auth-client";

type Props = {
  onAuthenticated: () => void;
};

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result = mode === "login"
        ? await authClient.signIn.email({ email: email.trim(), password })
        : await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });

      if (result.error) {
        throw new Error(result.error.message || "No se pudo autenticar.");
      }

      onAuthenticated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error de autenticación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app light auth-screen">
      <section className="panel glass-panel auth-card">
        <div className="page-heading">
          <div>
            <div className="eyebrow">JW TRACKER</div>
            <h1>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
            <p>{mode === "login" ? "Accede a tu espacio personal." : "Registra tu espacio personal seguro."}</p>
          </div>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <label className="field">
              Nombre
              <input
                type="text"
                placeholder="Tu nombre"
                autoComplete="name"
                value={name}
                onChange={event => setName(event.target.value)}
                required
              />
            </label>
          )}

          <label className="field">
            Correo electrónico
            <input
              type="email"
              placeholder="nombre@correo.com"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            Contraseña
            <input
              type="password"
              placeholder="Mínimo 10 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={10}
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="backup-error" role="alert">{error}</p>}

          <div className="form-footer">
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? "Procesando…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setError("");
                setMode(current => current === "login" ? "register" : "login");
              }}
            >
              {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
