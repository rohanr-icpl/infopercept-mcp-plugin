import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="auth">
      {/* Left panel: ship the family's animated isometric illustration (Lottie, section 17).
          Leave empty rather than add a sketchy placeholder. */}
      <div className="auth-art" aria-hidden="true" />
      <main className="auth-panel">
        <div className="auth-lockup">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/mark.svg" alt="" width={30} height={30} />
          <div>
            <small>Invinsense</small>
            <strong>__PRODUCT_NAME__</strong>
          </div>
        </div>
        <LoginForm />
        <div className="auth-foot">
          <span className="mono">v0.1.0</span>
          <span />
        </div>
      </main>
    </div>
  );
}
