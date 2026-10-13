"use client";

import { send } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy)
      return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await send("/auth/login", {
        email: form.get("email"),
        password: form.get("password")
      });
      router.replace("/admin");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  return { busy, error, submit };
}
