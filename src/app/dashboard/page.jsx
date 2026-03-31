"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "admin") {
        router.replace("/dashboard/admin");
      } else {
        router.replace("/dashboard/employee");
      }
    }
  }, [status, session, router]);

  return <div className="p-6">Loading dashboard...</div>;
}