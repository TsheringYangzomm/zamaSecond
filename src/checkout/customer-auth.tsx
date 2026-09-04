import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../supabase";
import {
  clearDevSession,
  ensureCustomer,
  fetchCustomerProfile,
  getDevCustomerByEmail,
  getDevSession,
  profileFromCustomer,
  saveDevCustomer,
  saveDevSession,
  type CustomerProfile,
} from "./checkout-api";

export type CustomerAuthStatus = "bootstrapping" | "signed-out" | "signed-in";

export type CustomerProfileUpdate = {
  name: string;
  phone: string;
  area: string;
  dzongkhag: string;
  address: string;
};

export type CustomerAuthValue = {
  mode: "live" | "dev";
  status: CustomerAuthStatus;
  profile: CustomerProfile | null;
  error: string | null;
  signUp: (input: { name: string; email: string; password: string; phone?: string }) => Promise<{ ok: boolean; error: string | null; needsConfirmation?: boolean }>;
  signIn: (input: { email: string; password: string }) => Promise<{ ok: boolean; error: string | null }>;
  updateProfile: (input: CustomerProfileUpdate) => Promise<{ ok: boolean; error: string | null }>;
  signOut: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function baseProfile(email: string, name: string, phone = ""): CustomerProfile {
  return { email, name, phone, area: "", dzongkhag: "", address: "" };
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const mode: "live" | "dev" = getSupabaseClient() ? "live" : "dev";
  const [status, setStatus] = useState<CustomerAuthStatus>("bootstrapping");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;
    const bootstrap = async () => {
      if (!client) {
        const session = getDevSession();
        if (!session) {
          if (active) setStatus("signed-out");
          return;
        }
        const customer = getDevCustomerByEmail(session.email);
        if (active) {
          setProfile(customer ? profileFromCustomer(customer) : baseProfile(session.email, session.name));
          setStatus("signed-in");
        }
        return;
      }
      const sessionResult = await client.auth.getSession();
      if (!active) return;
      const user = sessionResult.data.session?.user ?? null;
      if (!user?.email) {
        setStatus("signed-out");
        return;
      }
      const stored = await fetchCustomerProfile(user.email);
      if (!active) return;
      setProfile(stored ?? baseProfile(user.email, String(user.user_metadata?.full_name ?? "")));
      setStatus("signed-in");
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function signUp(input: { name: string; email: string; password: string; phone?: string }) {
    setError(null);
    const name = input.name.trim();
    const email = input.email.trim();
    if (!name || !email || !input.password) {
      const message = "Please fill in your name, email, and password.";
      setError(message);
      return { ok: false, error: message };
    }
    if (!emailPattern.test(email)) {
      const message = "Please enter a valid email address.";
      setError(message);
      return { ok: false, error: message };
    }

    const client = getSupabaseClient();
    if (!client) {
      if (getDevCustomerByEmail(email)) {
        const message = "An account already exists for this email. Sign in instead.";
        setError(message);
        return { ok: false, error: message };
      }
      saveDevSession(email, name);
      const customer = saveDevCustomer(baseProfile(email, name, (input.phone ?? "").trim()));
      setProfile(profileFromCustomer(customer));
      setStatus("signed-in");
      return { ok: true, error: null };
    }

    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password: input.password,
      options: { data: { full_name: name } },
    });
    if (signUpError) {
      setError(signUpError.message);
      return { ok: false, error: signUpError.message };
    }
    if (!data.session) {
      setStatus("signed-out");
      return { ok: true, error: null, needsConfirmation: true };
    }
    const sessionEmail = data.session.user.email ?? email;
    await ensureCustomer(baseProfile(sessionEmail, name, (input.phone ?? "").trim()));
    setProfile(baseProfile(sessionEmail, name, (input.phone ?? "").trim()));
    setStatus("signed-in");
    return { ok: true, error: null };
  }

  async function signIn(input: { email: string; password: string }) {
    setError(null);
    const email = input.email.trim();
    if (!email || !input.password) {
      const message = "Please enter your email and password.";
      setError(message);
      return { ok: false, error: message };
    }

    const client = getSupabaseClient();
    if (!client) {
      const customer = getDevCustomerByEmail(email);
      if (!customer) {
        const message = "No account found for this email. Create one first.";
        setError(message);
        return { ok: false, error: message };
      }
      saveDevSession(customer.email, customer.name);
      setProfile(profileFromCustomer(customer));
      setStatus("signed-in");
      return { ok: true, error: null };
    }

    const { data, error: signInError } = await client.auth.signInWithPassword({ email, password: input.password });
    if (signInError) {
      setError(signInError.message);
      return { ok: false, error: signInError.message };
    }
    const user = data.user;
    const sessionEmail = user.email ?? email;
    const name = String(user.user_metadata?.full_name ?? "");
    await ensureCustomer(baseProfile(sessionEmail, name));
    setProfile(baseProfile(sessionEmail, name));
    setStatus("signed-in");
    return { ok: true, error: null };
  }

  const updateProfile = useCallback(async (input: CustomerProfileUpdate) => {
    setError(null);
    if (!profile) {
      const message = "Sign in to update your account.";
      setError(message);
      return { ok: false, error: message };
    }
    const nextProfile: CustomerProfile = {
      ...profile,
      name: input.name.trim(),
      phone: input.phone.trim(),
      area: input.area.trim(),
      dzongkhag: input.dzongkhag.trim(),
      address: input.address.trim(),
    };
    const result = await ensureCustomer(nextProfile);
    if (!result.ok) {
      const message = result.error ?? "Could not update your account.";
      setError(message);
      return { ok: false, error: message };
    }
    setProfile(nextProfile);
    return { ok: true, error: null };
  }, [profile]);

  async function signOut() {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    clearDevSession();
    setProfile(null);
    setStatus("signed-out");
    setError(null);
  }

  const value = useMemo(
    () => ({ mode, status, profile, error, signUp, signIn, updateProfile, signOut }),
    [mode, status, profile, error, updateProfile],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const value = useContext(CustomerAuthContext);
  if (!value) {
    throw new Error("useCustomerAuth must be used inside <CustomerAuthProvider>.");
  }
  return value;
}

export function useOptionalCustomerAuth() {
  return useContext(CustomerAuthContext);
}
