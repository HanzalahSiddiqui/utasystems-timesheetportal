"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({
  role = "employee",
  isOpen = false,
  onClose = () => {},
}) {
  const pathname = usePathname();

  const employeeLinks = [
    { name: "Dashboard", href: "/dashboard/employee" },
    { name: "Get Timesheet", href: "/dashboard/employee/get-timesheet" },
    { name: "My Timesheets", href: "/dashboard/employee/my-timesheets" },
    { name: "Expenses", href: "/dashboard/employee/expenses" },
  ];

const adminLinks = [
  { name: "Dashboard", href: "/dashboard/admin" },
  { name: "Employees", href: "/dashboard/admin/employees" },
  { name: "Clients", href: "/dashboard/admin/clients" },
  { name: "Timesheets", href: "/dashboard/admin/timesheets" },
  { name: "Payroll", href: "/dashboard/admin/payroll" },
  {name: "Invoices", href: "/dashboard/admin/invoices"},
  { name: "Holidays", href: "/dashboard/admin/holidays" },
  { name: "Expenses", href: "/dashboard/admin/expenses" },
];

  const links = role === "admin" ? adminLinks : employeeLinks;

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[280px] transform bg-slate-950 text-white transition-transform duration-300 lg:sticky lg:z-20 lg:w-64 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-white/10 px-5 py-5 lg:block">
            <div>
              <h2 className="text-xl font-bold leading-tight">
                UTA Systems
                <br />
                Timesheet Portal
              </h2>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-white/80 hover:bg-white/10 lg:hidden"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <nav className="space-y-2">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-white text-slate-950"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}