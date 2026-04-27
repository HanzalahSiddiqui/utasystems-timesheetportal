"use client";

import { useState, useEffect } from "react";

export default function ExpenseFormAdmin({ onSuccess = () => {} }) {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");

  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  /* ================================
     🔹 LOAD EMPLOYEES
  ================================= */
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        setEmployees(data.items || []);
      } catch (err) {
        console.error("Failed to load employees", err);
      }
    }

    loadEmployees();
  }, []);

  /* ================================
     🔹 FILE UPLOAD (NEW)
  ================================= */
  const handleFileUpload = async (file) => {
    if (!file) return;

    // ✅ File size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    // ✅ Allowed types
    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, PDF allowed");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.url) {
        setReceiptUrl(data.url);
        setReceiptFileName(file.name);
      } else {
        alert("Upload failed");
      }
    } catch (error) {
      console.error(error);
      alert("Upload error");
    }

    setUploading(false);
  };

  /* ================================
     🔹 SUBMIT
  ================================= */
  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          amount,
          description,
          expenseDate,
          employeeId,
          paidBy: "company",
          receiptUrl,        // ✅ URL (NOT base64)
          receiptFileName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create expense");
        return;
      }

      alert("Expense added successfully");

      // reset
      setCategory("");
      setAmount("");
      setExpenseDate("");
      setDescription("");
      setEmployeeId("");
      setReceiptUrl("");
      setReceiptFileName("");

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  }

  /* ================================
     🔹 UI
  ================================= */
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4"
    >
      <h2 className="text-lg font-semibold">Admin Expense Entry</h2>

      <div className="grid grid-cols-2 gap-4">

        {/* EMPLOYEE */}
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        >
          <option value="">Company Expense</option>

          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.name}
            </option>
          ))}
        </select>

        {/* CATEGORY */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        >
          <option value="">Select Category</option>
          <option value="travel">Travel</option>
          <option value="fuel">Fuel</option>
          <option value="meal">Meal</option>
          <option value="hotel">Hotel</option>
          <option value="office">Office</option>
          <option value="internet">Internet</option>
          <option value="insurance">Insurance</option>
          <option value="utilities">Utilities</option>
          <option value="rent">Rent</option>
          <option value="software">Software</option>
          <option value="marketing">Marketing</option>
          <option value="other">Other</option>
        </select>

        {/* AMOUNT */}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        />

        {/* DATE */}
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        />
      </div>

      {/* DESCRIPTION */}
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />

      {/* RECEIPT */}
      <div>
        <label className="text-sm block mb-1">Upload Receipt</label>

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => handleFileUpload(e.target.files[0])}
          className="border px-3 py-2 rounded w-full"
        />

        {uploading && <p className="text-sm">Uploading...</p>}

        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            className="text-blue-600 text-sm mt-2 inline-block"
          >
            View Uploaded Receipt
          </a>
        )}
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg w-full"
      >
        {uploading ? "Uploading..." : "Save Expense"}
      </button>
    </form>
  );
}