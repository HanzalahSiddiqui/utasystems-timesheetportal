"use client";

import { useSession, signOut } from "next-auth/react";

export default function Navbar({ onMenuClick = () => {} }) {
  const { data: session } = useSession();

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">

        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
          >
            ☰
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-xl">
              Universal Technology Systems and Associates LLC
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Internal Employee Portal
            </p>
          </div>
        </div>

        {/* 🔥 SESSION BASED USER */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <span className="hidden text-sm text-slate-600 md:inline">
            {session?.user?.name || "User"}
            {" "}
            ({session?.user?.role})
          </span>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:px-4"
          >
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}