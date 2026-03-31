"use client";

import { useState } from "react";
import ReceiptUploadField from "@/components/ReceiptUploadField";

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

export default function ExpenseForm({ onSaved = () => {} }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    expenseType: "travel",
    amount: "",
    description: "",
    receiptUrl: "",
    receiptFileName: "",
    incurredByName: "",
    incurredFor: "self",
    paidBy: "employee",
  });

  async function saveExpense(submit = true) {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount || 0),
          submit,
        }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to save expense");
        return;
      }

      setMessage(data.message || "Expense saved successfully");

      setForm({
        expenseType: "travel",
        amount: "",
        description: "",
        receiptUrl: "",
        receiptFileName: "",
        incurredByName: "",
        incurredFor: "self",
        paidBy: "employee",
      });

      onSaved();
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Add Expense</h2>
        <p className="mt-1 text-sm text-slate-500">
          Receipt required for expense submission.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Expense Type">
          <Select
            value={form.expenseType}
            onChange={(e) => setForm({ ...form, expenseType: e.target.value })}
          >
            <option value="travel">travel</option>
            <option value="meal">meal</option>
            <option value="fuel">fuel</option>
            <option value="hotel">hotel</option>
            <option value="medical">medical</option>
            <option value="office">office</option>
            <option value="internet">internet</option>
            <option value="transport">transport</option>
            <option value="other">other</option>
          </Select>
        </Field>

        <Field label="Amount">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>

        <Field label="Incurred By / Whose Expense">
          <Input
            type="text"
            value={form.incurredByName}
            onChange={(e) =>
              setForm({ ...form, incurredByName: e.target.value })
            }
            placeholder="Employee name / person name"
            required
          />
        </Field>

        <Field label="Incurred For">
          <Select
            value={form.incurredFor}
            onChange={(e) => setForm({ ...form, incurredFor: e.target.value })}
          >
            <option value="self">self</option>
            <option value="company">company</option>
            <option value="client">client</option>
            <option value="other">other</option>
          </Select>
        </Field>

        <Field label="Paid By">
          <Select
            value={form.paidBy}
            onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
          >
            <option value="employee">employee</option>
            <option value="company">company</option>
          </Select>
        </Field>

        <div className="md:col-span-2">
          <Field label="Description">
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              placeholder="Add expense details..."
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <ReceiptUploadField
            value={form.receiptUrl}
            onChange={({ receiptUrl, receiptFileName }) =>
              setForm({ ...form, receiptUrl, receiptFileName })
            }
          />
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => saveExpense(false)}
          disabled={loading}
          className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Draft"}
        </button>

        <button
          type="button"
          onClick={() => saveExpense(true)}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Submitting..." : "Submit Expense"}
        </button>
      </div>
    </div>
  );
}