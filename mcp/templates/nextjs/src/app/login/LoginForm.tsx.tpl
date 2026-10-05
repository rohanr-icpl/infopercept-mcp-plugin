"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "submitting" | "done";

export function LoginForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!data.get("username") || !data.get("password")) {
      setError("Enter your username and password.");
      return;
    }
    setError("");
    setPhase("submitting");
    await new Promise((r) => setTimeout(r, 700)); // replace with your auth call
    setPhase("done");
    router.push("/dashboard");
  }

  return (
    <form className="auth-card" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="username">Username</label>
        <input className="input lg" id="username" name="username" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input className="input lg" id="password" name="password" type="password" autoComplete="current-password" required />
        {error ? <span className="hint" role="alert">{error}</span> : null}
      </div>
      <button className="btn primary lg" type="submit" aria-busy={phase === "submitting"} disabled={phase !== "idle"}>
        {phase === "submitting" ? <span className="spinner" aria-hidden="true" /> : null}
        {phase === "idle" ? "Sign in" : phase === "submitting" ? "Signing in" : "Signed in"}
      </button>
      <a href="#forgot">Forgot password?</a>
      <p className="muted" style={{ fontSize: 12, lineHeight: "16px" }}>Contact your administrator if you cannot sign in.</p>
    </form>
  );
}
