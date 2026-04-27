"use client";

import { useState, useEffect } from "react";

export default function ExpenseFormAdmin({ onSuccess = () => {} }) {
  const [mode, setMode] = useState("company");
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [incurredByName, setIncurredByName] = useState("");
  const [incurredFor, setIncurredFor] = useState("self");

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");

  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        setEmployees(data.items || data.employees || []);
      } catch (err) {
        console.error("Failed to load employees", err);
      }
    }
    loadEmployees();
  }, []);

  // ✅ NEW: Upload to Cloudinary
  const handleFileUpload = async (file) => {
    if (!file) return;

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
        setReceiptFileName(data.name || file.name);
      } else {
        alert("Upload failed");
      }
    } catch (error) {
      console.error(error);
      alert("Upload error");
    }

    setUploading(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
console.log("Submitting receiptUrl:", receiptUrl);
console.log("Submitting receiptFileName:", receiptFileName);
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
          incurredByName,
          incurredFor,
          receiptUrl,        // ✅ URL instead of base64
          receiptFileName,
          employeeId: mode === "employee" ? employeeId : null,
          paidBy: "company",
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
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
      setMode("company");

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4"
    >
      <h2 className="text-lg font-semibold">Admin Expense Entry</h2>

      {/* MODE */}
      <div className="grid grid-cols-2 gap-4">
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setEmployeeId("");
          }}
          className="border px-3 py-2 rounded w-full"
        >
          <option value="company">Company Expense</option>
          <option value="employee">Employee Expense</option>
        </select>

        {mode === "employee" && (
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="border px-3 py-2 rounded w-full"
            required
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* CATEGORY + AMOUNT */}
      <div className="grid grid-cols-2 gap-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border px-3 py-2 rounded w-full"
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

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border px-3 py-2 rounded w-full"
          required
        />
      </div>

      <input
        placeholder="Incurred By"
        value={incurredByName}
        onChange={(e) => setIncurredByName(e.target.value)}
        className="border px-3 py-2 rounded w-full"
      />

      <select
        value={incurredFor}
        onChange={(e) => setIncurredFor(e.target.value)}
        className="border px-3 py-2 rounded w-full"
      >
        <option value="self">Self</option>
        <option value="company">Company</option>
        <option value="client">Client</option>
      </select>

      <input
        type="date"
        value={expenseDate}
        onChange={(e) => setExpenseDate(e.target.value)}
        className="border px-3 py-2 rounded w-full"
        required
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border px-3 py-2 rounded w-full"
      />

      {/* ✅ UPDATED FILE INPUT */}
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => handleFileUpload(e.target.files[0])}
        className="border px-3 py-2 rounded w-full"
      />

      {uploading && <p>Uploading...</p>}

  {receiptUrl && (
  <div className="flex gap-3 mt-2">
   

    <a
      href={receiptUrl}
      target="_blank"
      download={receiptFileName || "receipt.pdf"}
      className="bg-gray-300 px-3 py-1 rounded"
    >
      View / Download
    </a>
  </div>
)}
      <button
        type="submit"
        className="bg-slate-900 text-white px-4 py-2 rounded-lg w-full"
      >
        Save Expense
      </button>
    </form>
  );
}