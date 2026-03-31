"use client";

import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [callbackUrl, setCallbackUrl] = useState("/dashboard");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") || "/dashboard");
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
      return;
    }

    router.replace(callbackUrl || "/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="grid w-full max-w-7xl items-center gap-10 lg:grid-cols-2">
            <div className="hidden lg:block">
              <div className="max-w-2xl">
                <div className="animate-fadeInUp mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-sm tracking-wide text-white/90">
                    Secure workforce time management platform
                  </span>
                </div>

                <h1 className="animate-fadeInUp text-5xl font-bold leading-tight text-white xl:text-6xl">
                  Universal Technology Systems and Associates LLC
                </h1>

                <h2
                  className="animate-fadeInUp mt-5 text-2xl font-semibold text-cyan-300 xl:text-3xl"
                  style={{ animationDelay: "0.15s" }}
                >
                  UTA Systems Timesheet Portal
                </h2>

                <p
                  className="animate-fadeInUp mt-6 max-w-xl text-lg leading-8 text-white/75"
                  style={{ animationDelay: "0.3s" }}
                >
                  A portal for employee timesheets, approvals, monthly records,
                  and workforce tracking designed for a smooth, secure, and
                  professional experience.
                </p>
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="absolute -top-10 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl animate-pulse"></div>

              <div className="animate-float-slow relative w-full max-w-md rounded-[32px] border border-white/15 bg-white/10 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <div className="mb-8 flex flex-col items-center text-center">
                  <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10 shadow-lg">
                    <Image
                      src="/logo.jpeg"
                      alt="UTA Systems Logo"
                      width={100}
                      height={100}
                      className="object-contain"
                      priority
                    />
                  </div>

                  <h3 className="text-2xl font-bold text-white">Welcome Back</h3>
                  <p className="mt-2 text-sm text-white/70">
                    Sign in to access the UTA Systems Timesheet Portal
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/85">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@utasystems.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none transition duration-300 placeholder:text-white/35 focus:border-cyan-400/70 focus:bg-white/15 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/85">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none transition duration-300 placeholder:text-white/35 focus:border-cyan-400/70 focus:bg-white/15 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-lg transition duration-300 hover:scale-[1.02] hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-1000 group-hover:translate-x-full"></span>
                    <span className="relative">
                      {loading ? "Signing In..." : "Login to Portal"}
                    </span>
                  </button>
                </form>

                <div className="mt-6 text-center text-xs text-white/50">
                  Protected access for authorized Universal Technology Systems
                  and Associates LLC personnel only
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="relative z-10 border-t border-white/10 bg-black/20 px-6 py-4 text-center text-sm text-white/65 backdrop-blur-md">
          © 2026 Universal Technology Systems and Associates LLC — All Rights
          Reserved
        </footer>
      </div>
    </div>
  );
}

function AnimatedBackground() {
  return (
    <>
      <div className="blob-one absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-500/18 blur-3xl"></div>
      <div className="blob-two absolute right-[-60px] top-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
      <div className="blob-one absolute bottom-[-60px] left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/12 blur-3xl"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%),linear-gradient(to_bottom,#020617,#0f172a,#111827)]"></div>

      <div className="pointer-events-none absolute inset-0">
        <span className="particle absolute left-[8%] top-[18%] h-2 w-2 rounded-full bg-cyan-300/70" />
        <span
          className="particle absolute left-[15%] top-[72%] h-3 w-3 rounded-full bg-sky-300/50"
          style={{ animationDelay: "0.8s" }}
        />
        <span
          className="particle absolute left-[32%] top-[22%] h-2.5 w-2.5 rounded-full bg-white/55"
          style={{ animationDelay: "1.2s" }}
        />
        <span
          className="particle absolute left-[48%] top-[78%] h-2 w-2 rounded-full bg-cyan-200/60"
          style={{ animationDelay: "1.6s" }}
        />
        <span
          className="particle absolute right-[18%] top-[25%] h-3 w-3 rounded-full bg-indigo-300/60"
          style={{ animationDelay: "0.4s" }}
        />
        <span
          className="particle absolute right-[10%] top-[68%] h-2 w-2 rounded-full bg-white/60"
          style={{ animationDelay: "1s" }}
        />
        <span
          className="particle absolute right-[35%] top-[14%] h-2.5 w-2.5 rounded-full bg-sky-300/55"
          style={{ animationDelay: "1.8s" }}
        />
      </div>
    </>
  );
}