import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../supabase";

type AdminStatus = "bootstrapping" | "unavailable" | "signed-out" | "allowed" | "denied";

type AdminAuthValue = {
  status: AdminStatus;
  email: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error: string | null }>;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

const requestTimeoutMs = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminStatus>("bootstrapping");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setStatus("unavailable");
      return;
    }
    let active = true;
    const bootstrap = async () => {
      const sessionResult = await withTimeout(client.auth.getSession(), requestTimeoutMs);
      if (!active) return;
      const user = sessionResult?.data.session?.user ?? null;
      if (!user) {
        setStatus("signed-out");
        return;
      }
      const adminResult = await withTimeout(client.rpc("is_admin"), requestTimeoutMs);
      if (!active) return;
      if (adminResult?.error) {
        setError("Could not verify admin access.");
        setStatus("denied");
        return;
      }
      setEmail(user.email ?? null);
      setStatus(adminResult?.data ? "allowed" : "denied");
      if (!adminResult?.data) setError("This account is not in the admin allowlist.");
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function signIn(nextEmail: string, password: string) {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, error: "Supabase is not configured." };
    }
    setError(null);
    const result = await withTimeout(
      client.auth.signInWithPassword({ email: nextEmail.trim(), password }),
      requestTimeoutMs,
    );
    if (!result) {
      setStatus("signed-out");
      return { ok: false, error: "The request took too long. Check your connection and try again." };
    }
    if (result.error) return { ok: false, error: result.error.message };
    const user = result.data.user;
    const adminResult = await withTimeout(client.rpc("is_admin"), requestTimeoutMs);
    if (!adminResult) {
      setStatus("signed-out");
      return { ok: false, error: "The request took too long. Check your connection and try again." };
    }
    if (adminResult.error) {
      setStatus("denied");
      return { ok: false, error: "Could not verify admin access." };
    }
    setEmail(user.email ?? null);
    if (adminResult.data) {
      setStatus("allowed");
      return { ok: true, error: null };
    }
    setStatus("denied");
    return { ok: false, error: "This account is not in the admin allowlist." };
  }

  async function signOut() {
    const client = getSupabaseClient();
    if (client) {
      await withTimeout(client.auth.signOut(), requestTimeoutMs);
    }
    setStatus("signed-out");
    setEmail(null);
    setError(null);
  }

  return (
    <AdminAuthContext.Provider value={{ status, email, error, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>.");
  }
  return value;
}
