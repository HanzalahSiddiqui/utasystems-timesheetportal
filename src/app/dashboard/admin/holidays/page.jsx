"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import HolidayManager from "@/components/HolidayManager";

export default function AdminHolidaysPage() {

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-100">

      <Sidebar
        role="admin"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">

        <Navbar
          user="Admin User"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            Holiday Management
          </h2>

          <HolidayManager />
        </div>

      </div>

    </div>
  );
}