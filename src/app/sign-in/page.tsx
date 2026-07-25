import type { Metadata } from "next";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <div className="page-frame auth-page">
      <section className="auth-panel">
        <div>
          <div className="eyebrow">Private access</div>
          <h1>Welcome back.</h1>
          <p className="hero-copy">
            Sign in to your private Sartoria wardrobe. Public registration is not enabled.
          </p>
        </div>
        <SignInForm />
      </section>
    </div>
  );
}
