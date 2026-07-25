"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const result = await authClient.signIn.email({
      callbackURL: "/wardrobe",
      email,
      password,
    });

    if (result.error) {
      setMessage("Sign-in failed. Check your details or contact the Sartoria administrator.");
      setPending(false);
      return;
    }

    router.replace("/wardrobe");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="sign-in-email">Email address</label>
        <input
          autoComplete="email"
          id="sign-in-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="field">
        <label htmlFor="sign-in-password">Password</label>
        <input
          autoComplete="current-password"
          id="sign-in-password"
          minLength={12}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {message ? (
        <p aria-live="polite" className="form-message form-message-error" role="alert">
          {message}
        </p>
      ) : null}

      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
