"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : "bg-red-100 text-red-700 ring-red-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles}`}
    >
      {status}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 ${
        props.className || ""
      }`}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 ${
        props.className || ""
      }`}
    />
  );
}

function EditClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    clientName: client.clientName || "",
    clientEmail: client.clientEmail || "",
    clientAddress: client.clientAddress || "",
    status: client.status || "active",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/clients/${client._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to update client");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Edit Client</h3>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Client Name">
            <Input
              value={form.clientName}
              onChange={(e) =>
                setForm({ ...form, clientName: e.target.value })
              }
              required
            />
          </Field>

          <Field label="Client Email">
            <Input
              type="email"
              value={form.clientEmail}
              onChange={(e) =>
                setForm({ ...form, clientEmail: e.target.value })
              }
              required
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Client Address">
              <textarea
                rows={4}
                value={form.clientAddress}
                onChange={(e) =>
                  setForm({ ...form, clientAddress: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </Field>
          </div>

          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </Select>
          </Field>

          {message && (
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);

  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    status: "active",
  });

  async function loadClients() {
    try {
      setPageLoading(true);

      const res = await fetch("/api/clients", { cache: "no-store" });
      const text = await res.text();

      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      setClients(data.clients || []);
    } catch (error) {
      console.error("Load clients error:", error);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function createClient(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to create client");
        return;
      }

      setMessage(data.message || "Client created successfully");

      setForm({
        clientName: "",
        clientEmail: "",
        clientAddress: "",
        status: "active",
      });

      await loadClients();
    } catch {
      setMessage("Something went wrong while creating client");
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient(id) {
    const ok = confirm("Are you sure you want to delete this client?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to delete client");
        return;
      }

      setMessage(data.message || "Client deleted successfully");
      await loadClients();
    } catch {
      setMessage("Something went wrong while deleting client");
    }
  }

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;

    return clients.filter((client) => {
      const name = client.clientName?.toLowerCase() || "";
      const email = client.clientEmail?.toLowerCase() || "";
      const address = client.clientAddress?.toLowerCase() || "";
      const status = client.status?.toLowerCase() || "";

      return (
        name.includes(q) ||
        email.includes(q) ||
        address.includes(q) ||
        status.includes(q)
      );
    });
  }, [clients, search]);

  const activeClients = clients.filter((c) => c.status === "active").length;
  const inactiveClients = clients.filter((c) => c.status === "inactive").length;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
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

          <div className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Client Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Create and manage invoice clients.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200 w-full sm:w-auto sm:min-w-[140px]">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Total Records
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {clients.length}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Total Clients" value={clients.length} />
              <StatCard title="Active Clients" value={activeClients} />
              <StatCard title="Inactive Clients" value={inactiveClients} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="self-start rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200 xl:sticky xl:top-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Add New Client
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Save client details for invoice generation.
                  </p>
                </div>

                <form onSubmit={createClient} className="space-y-4">
                  <Field label="Client Name">
                    <Input
                      value={form.clientName}
                      onChange={(e) =>
                        setForm({ ...form, clientName: e.target.value })
                      }
                      required
                    />
                  </Field>

                  <Field label="Client Email">
                    <Input
                      type="email"
                      value={form.clientEmail}
                      onChange={(e) =>
                        setForm({ ...form, clientEmail: e.target.value })
                      }
                      required
                    />
                  </Field>

                  <Field label="Client Address">
                    <textarea
                      rows={4}
                      value={form.clientAddress}
                      onChange={(e) =>
                        setForm({ ...form, clientAddress: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                  </Field>

                  <Field label="Status">
                    <Select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </Select>
                  </Field>

                  {message && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                  >
                    {loading ? "Creating Client..." : "Create Client"}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Clients Directory
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Search and manage all registered clients.
                    </p>
                  </div>

                  <div className="w-full xl:w-[340px]">
                    <Input
                      type="text"
                      placeholder="Search by name, email, address..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Client Name
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Client Email
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Client Address
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Status
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200 bg-white">
                        {pageLoading ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-4 py-10 text-center text-slate-500"
                            >
                              Loading clients...
                            </td>
                          </tr>
                        ) : filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <tr
                              key={client._id}
                              className="hover:bg-slate-50 transition"
                            >
                              <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                                {client.clientName}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                {client.clientEmail}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700 whitespace-pre-line">
                                {client.clientAddress || "-"}
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge status={client.status} />
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setEditingClient(client)}
                                    className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    onClick={() => deleteClient(client._id)}
                                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-4 py-10 text-center text-slate-500"
                            >
                              No clients found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Scroll horizontally to view all client fields on smaller screens.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={loadClients}
        />
      )}
    </div>
  );
}