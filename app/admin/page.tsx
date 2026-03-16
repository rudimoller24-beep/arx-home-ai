"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string | null;
  role: string | null;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const possibleKeys = [
    "token",
    "authToken",
    "jwt",
    "accessToken",
    "arx_token",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAdminAccess() {
      const token = getStoredToken();

      if (!token) {
        if (!isMounted) return;
        setError("You must be logged in to access admin.");
        setIsAllowed(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || data?.details || "Failed to verify admin access."
          );
        }

        if (!data?.isAdmin) {
          throw new Error("Admin access required.");
        }

        if (!isMounted) return;

        setUser(data.user ?? null);
        setIsAllowed(true);
        setError("");
      } catch (err) {
        if (!isMounted) return;

        const message =
          err instanceof Error ? err.message : "Access denied.";
        setError(message);
        setIsAllowed(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAdminAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-orange-500/20" />
            <h1 className="text-xl font-semibold">Checking admin access</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Verifying permissions...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-200">
              Access denied
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Admin only</h1>
            <p className="mt-3 text-sm leading-6 text-red-100/90">
              {error || "You do not have permission to view this page."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300/90">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Admin dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-400 sm:text-base">
            This area is protected by a server-side role check against the
            profiles table.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                User ID
              </p>
              <p className="mt-2 break-all text-sm text-white">
                {user?.id || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                Email
              </p>
              <p className="mt-2 break-all text-sm text-white">
                {user?.email || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                Role
              </p>
              <p className="mt-2 text-sm text-white">
                {user?.role || "-"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-medium text-white">
              Ready for admin-only features
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              You can now safely build admin-only pages and routes for user
              management, subscriptions, platform controls, and analytics.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}