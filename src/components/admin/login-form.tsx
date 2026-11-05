"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      {state?.message ? <p className="admin-note admin-note-error" role="alert">{state.message}</p> : null}
      <label className="admin-field">
        მომხმარებელი
        <input className="admin-input" name="username" autoComplete="username" required />
      </label>
      <label className="admin-field">
        პაროლი
        <input className="admin-input" type="password" name="password" autoComplete="current-password" required />
      </label>
      <button className="admin-btn" type="submit" disabled={pending}>
        {pending ? "მოწმდება…" : "შესვლა"}
      </button>
    </form>
  );
}
