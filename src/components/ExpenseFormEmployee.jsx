"use client";

import { useEffect, useState } from "react";

export default function ExpenseFormEmployee({
  onSaved = () => {},
}) {
  const [category, setCategory] = useState("");
  const [otherExpenseType, setOtherExpenseType] =
    useState("");

  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");

  const [incurredByName, setIncurredByName] =
    useState("");

  const [incurredFor, setIncurredFor] =
    useState("self");

  const [paidBy, setPaidBy] =
    useState("company");

  const [currentEmployee, setCurrentEmployee] =
    useState(null);

  const [receiptUrl, setReceiptUrl] =
    useState("");

  const [receiptFileName, setReceiptFileName] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  /* ================================
     🔹 LOAD CURRENT EMPLOYEE
  ================================= */

  useEffect(() => {
    async function loadCurrentEmployee() {
      try {
        const res = await fetch(
          "/api/auth/session"
        );

        const data = await res.json();

        if (data?.user) {
          setCurrentEmployee({
            id: data.user.id,
            name: data.user.name,
          });

          setIncurredByName(
            data.user.name || ""
          );
        }
      } catch (error) {
        console.error(
          "Failed to load current employee:",
          error
        );
      }
    }

    loadCurrentEmployee();
  }, []);

  /* ================================
     🔹 FILE UPLOAD
  ================================= */

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "File size must be less than 5MB"
      );
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Only JPG, PNG, and PDF files are allowed"
      );
      return;
    }

    setUploading(true);

    const formData = new FormData();

    formData.append("file", file);

    try {
      const res = await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(
          data.error || "Upload failed"
        );
        return;
      }

      setReceiptUrl(data.url);

      setReceiptFileName(
        file.name
      );
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      alert("Upload error");
    } finally {
      setUploading(false);
    }
  };

  /* ================================
     🔹 SUBMIT
  ================================= */

  async function handleSubmit(e) {
    e.preventDefault();

    if (uploading || saving) return;

    if (!currentEmployee?.id) {
      alert(
        "Employee information is not available"
      );
      return;
    }

    if (
      paidBy === "employee" &&
      !currentEmployee?.id
    ) {
      alert(
        "Employee information is not available"
      );
      return;
    }

    /* =========================
       OTHER EXPENSE VALIDATION
    ========================= */

    if (
      category === "other" &&
      !otherExpenseType.trim()
    ) {
      alert(
        "Please specify the expense type"
      );
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        "/api/expenses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            category,

            /* =========================
               OTHER EXPENSE TYPE
            ========================= */

            otherExpenseType:
              category === "other"
                ? otherExpenseType.trim()
                : "",

            amount,
            description,
            expenseDate,

            /* =========================
               INCURRED BY
            ========================= */

            incurredByName:
              incurredByName.trim() ||
              currentEmployee.name,

            /* =========================
               INCURRED FOR
            ========================= */

            incurredFor,

            /* =========================
               PAID BY
            ========================= */

            paidBy,

            paidByEmployeeId:
              paidBy === "employee"
                ? currentEmployee.id
                : null,

            /* =========================
               RECEIPT
            ========================= */

            receiptUrl,
            receiptFileName,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to submit expense"
        );
        return;
      }

      alert(
        `Expense submitted successfully\n\nExpense ID: ${
          data.expenseId || "-"
        }`
      );

      /* ================================
         🔹 RESET FORM
      ================================= */

      setCategory("");

      setOtherExpenseType("");

      setAmount("");
      setExpenseDate("");
      setDescription("");

      setIncurredByName(
        currentEmployee.name || ""
      );

      setIncurredFor("self");

      setPaidBy("company");

      setReceiptUrl("");
      setReceiptFileName("");

      onSaved();
    } catch (error) {
      console.error(
        "Submit expense error:",
        error
      );

      alert(
        "Something went wrong while submitting the expense"
      );
    } finally {
      setSaving(false);
    }
  }

  /* ================================
     🔹 UI
  ================================= */

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5"
    >
      {/* ================================
          TITLE
      ================================= */}

      <h2 className="text-lg font-semibold text-slate-900">
        Submit Expense Claim
      </h2>

      {/* ================================
          CATEGORY + AMOUNT
      ================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CATEGORY */}

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Category
          </label>

          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            className="border rounded px-3 py-2 w-full"
            required
            disabled={
              saving || uploading
            }
          >
            <option value="">
              Select Category
            </option>

            <option value="travel">
              Travel
            </option>

            <option value="fuel">
              Fuel
            </option>

            <option value="meal">
              Meal
            </option>

            <option value="hotel">
              Hotel
            </option>

            <option value="medical">
              Medical
            </option>

            <option value="office">
              Office
            </option>

            <option value="internet">
              Internet
            </option>

            <option value="insurance">
              Insurance
            </option>

            <option value="utilities">
              Utilities
            </option>

            <option value="rent">
              Rent
            </option>

            <option value="software">
              Software
            </option>

            <option value="marketing">
              Marketing
            </option>

            <option value="transport">
              Transport
            </option>

            <option value="other">
              Other
            </option>
          </select>
        </div>

        {/* AMOUNT */}

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Amount (USD)
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) =>
              setAmount(
                e.target.value
              )
            }
            className="border rounded px-3 py-2 w-full"
            required
            disabled={
              saving || uploading
            }
          />
        </div>
      </div>

      {/* ================================
          OTHER EXPENSE TYPE
      ================================= */}

      {category === "other" && (
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Specify Expense Type
          </label>

          <input
            type="text"
            value={otherExpenseType}
            onChange={(e) =>
              setOtherExpenseType(
                e.target.value
              )
            }
            placeholder="e.g. Professional Certification, Rental, Training"
            className="border rounded px-3 py-2 w-full"
            required
            disabled={
              saving || uploading
            }
          />

          <p className="text-xs text-slate-500 mt-1">
            Please specify the type of expense.
          </p>
        </div>
      )}

      {/* ================================
          DATE + PAID BY
      ================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EXPENSE DATE */}

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Expense Date
          </label>

          <input
            type="date"
            value={expenseDate}
            onChange={(e) =>
              setExpenseDate(
                e.target.value
              )
            }
            className="border rounded px-3 py-2 w-full"
            required
            disabled={
              saving || uploading
            }
          />
        </div>

        {/* PAID BY */}

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Paid By
          </label>

          <select
            value={paidBy}
            onChange={(e) =>
              setPaidBy(
                e.target.value
              )
            }
            className="border rounded px-3 py-2 w-full"
            required
            disabled={
              saving || uploading
            }
          >
            <option value="company">
              Company
            </option>

            {currentEmployee && (
              <option value="employee">
                {currentEmployee.name}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* ================================
          INCURRED BY
      ================================= */}

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">
          Incurred By
        </label>

        <input
          type="text"
          value={
            incurredByName ||
            currentEmployee?.name ||
            ""
          }
          readOnly
          className="border rounded px-3 py-2 w-full bg-slate-50 text-slate-600"
        />
      </div>

      {/* ================================
          INCURRED FOR
      ================================= */}

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">
          Incurred For
        </label>

        <select
          value={incurredFor}
          onChange={(e) =>
            setIncurredFor(
              e.target.value
            )
          }
          className="border rounded px-3 py-2 w-full"
          required
          disabled={
            saving || uploading
          }
        >
          <option value="self">
            Self
          </option>

          <option value="company">
            Company
          </option>

          <option value="client">
            Client
          </option>

          <option value="other">
            Other
          </option>
        </select>
      </div>

      {/* ================================
          DESCRIPTION
      ================================= */}

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">
          Description
        </label>

        <textarea
          placeholder="Enter expense description"
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          className="border rounded px-3 py-2 w-full"
          rows={3}
          disabled={
            saving || uploading
          }
        />
      </div>

      {/* ================================
          RECEIPT
      ================================= */}

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">
          Upload Receipt
        </label>

        <input
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={(e) =>
            handleFileUpload(
              e.target.files?.[0]
            )
          }
          className="border px-3 py-2 rounded w-full"
          disabled={
            saving || uploading
          }
        />

        <p className="text-xs text-slate-500 mt-1">
          JPG, PNG or PDF — maximum 5MB
        </p>

        {uploading && (
          <p className="text-sm text-slate-500 mt-2">
            Uploading receipt...
          </p>
        )}

        {receiptUrl && (
          <div className="mt-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm"
            >
              View / Download Receipt
            </a>
          </div>
        )}
      </div>

      {/* ================================
          SUBMIT
      ================================= */}

      <button
        type="submit"
        disabled={
          uploading || saving
        }
        className="bg-slate-900 text-white px-4 py-2 rounded-lg w-full disabled:opacity-50"
      >
        {saving
          ? "Submitting..."
          : uploading
          ? "Uploading..."
          : "Submit Expense"}
      </button>
    </form>
  );
}