"use client";

import { useState, useEffect } from "react";

const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ExpenseFormAdmin({
  onSuccess = () => {},
}) {
  const [mode, setMode] = useState("company");

  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");

  const [incurredByName, setIncurredByName] =
    useState("");
  const [incurredFor, setIncurredFor] =
    useState("self");

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] =
    useState("");
  const [description, setDescription] =
    useState("");

  /* ================================
     🔹 PAID BY
  ================================= */

  const [paidBy, setPaidBy] =
    useState("company");

  const [paidByEmployeeId, setPaidByEmployeeId] =
    useState("");

  const [receiptUrl, setReceiptUrl] =
    useState("");
  const [receiptFileName, setReceiptFileName] =
    useState("");

  const [uploading, setUploading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);

  /* ================================
     🔹 LOAD EMPLOYEES
  ================================= */

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch(
          "/api/employees",
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Failed to load employees"
          );
        }

        setEmployees(
          data.items ||
            data.employees ||
            []
        );
      } catch (error) {
        console.error(
          "Failed to load employees:",
          error
        );

        setEmployees([]);
      }
    }

    loadEmployees();
  }, []);

  /* ================================
     🔹 FILE UPLOAD
  ================================= */

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(
        "File size must be less than 5MB"
      );
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        file.type
      )
    ) {
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
          data.error ||
            "Upload failed"
        );
        return;
      }

      setReceiptUrl(data.url);

      setReceiptFileName(
        data.name || file.name
      );
    } catch (error) {
      console.error(
        "Receipt upload error:",
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

    /* --------------------------------
       EMPLOYEE MODE VALIDATION
    -------------------------------- */

    if (
      mode === "employee" &&
      !employeeId
    ) {
      alert(
        "Please select an employee"
      );
      return;
    }

    /* --------------------------------
       PAID BY EMPLOYEE VALIDATION
    -------------------------------- */

    if (
      paidBy === "employee" &&
      !paidByEmployeeId
    ) {
      alert(
        "Please select the employee who paid this expense"
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
            amount,
            description,
            expenseDate,

            incurredByName:
              incurredByName.trim(),

            incurredFor,

            receiptUrl,
            receiptFileName,

            /* =========================
               EXPENSE OWNER
            ========================= */

            employeeId:
              mode === "employee"
                ? employeeId
                : null,

            /* =========================
               PAID BY
            ========================= */

            paidBy,

            paidByEmployeeId:
              paidBy === "employee"
                ? paidByEmployeeId
                : null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to create expense"
        );
        return;
      }

      alert(
        `Expense added successfully\n\nExpense ID: ${data.expenseId}`
      );

      /* ================================
         🔹 RESET
      ================================= */

      setMode("company");
      setEmployeeId("");

      setIncurredByName("");
      setIncurredFor("self");

      setCategory("");
      setAmount("");
      setExpenseDate("");
      setDescription("");

      setPaidBy("company");
      setPaidByEmployeeId("");

      setReceiptUrl("");
      setReceiptFileName("");

      onSuccess();
    } catch (error) {
      console.error(
        "Submit expense error:",
        error
      );

      alert(
        "Something went wrong while creating the expense"
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
      <h2 className="text-lg font-semibold">
        Admin Expense Entry
      </h2>

      {/* ================================
          EXPENSE TYPE + EMPLOYEE
      ================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EXPENSE TYPE */}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Expense Type
          </label>

          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setEmployeeId("");
              setIncurredByName("");
            }}
            className="border px-3 py-2 rounded w-full"
            disabled={
              saving || uploading
            }
          >
            <option value="company">
              Company Expense
            </option>

            <option value="employee">
              Employee Expense
            </option>
          </select>
        </div>

        {/* EMPLOYEE */}

        {mode === "employee" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Employee
            </label>

            <select
              value={employeeId}
              onChange={(e) => {
                const selectedId =
                  e.target.value;

                setEmployeeId(
                  selectedId
                );

                const employee =
                  employees.find(
                    (emp) =>
                      emp._id ===
                      selectedId
                  );

                if (employee) {
                  setIncurredByName(
                    employee.name ||
                      ""
                  );
                }
              }}
              className="border px-3 py-2 rounded w-full"
              required
              disabled={
                saving || uploading
              }
            >
              <option value="">
                Select Employee
              </option>

              {employees.map(
                (emp) => (
                  <option
                    key={emp._id}
                    value={emp._id}
                  >
                    {emp.name}
                  </option>
                )
              )}
            </select>
          </div>
        )}
      </div>

      {/* ================================
          CATEGORY + AMOUNT
      ================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CATEGORY */}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category
          </label>

          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            className="border px-3 py-2 rounded w-full"
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

            <option value="medical">
              Medical
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
          <label className="block text-sm font-medium text-slate-700 mb-1">
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
            className="border px-3 py-2 rounded w-full"
            required
            disabled={
              saving || uploading
            }
          />
        </div>
      </div>

      {/* ================================
          INCURRED BY
      ================================= */}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Incurred By
        </label>

        <input
          placeholder="Enter person or entity"
          value={incurredByName}
          onChange={(e) =>
            setIncurredByName(
              e.target.value
            )
          }
          className="border px-3 py-2 rounded w-full"
          disabled={
            saving || uploading
          }
        />
      </div>

      {/* ================================
          INCURRED FOR
      ================================= */}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Incurred For
        </label>

        <select
          value={incurredFor}
          onChange={(e) =>
            setIncurredFor(
              e.target.value
            )
          }
          className="border px-3 py-2 rounded w-full"
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
          PAID BY
      ================================= */}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Paid By
        </label>

        <select
          value={paidBy}
          onChange={(e) => {
            setPaidBy(
              e.target.value
            );

            setPaidByEmployeeId("");
          }}
          className="border px-3 py-2 rounded w-full"
          required
          disabled={
            saving || uploading
          }
        >
          <option value="company">
            Company
          </option>

          <option value="employee">
            Employee
          </option>
        </select>
      </div>

      {/* ================================
          PAID BY EMPLOYEE
      ================================= */}

      {paidBy === "employee" && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Paid By Employee
          </label>

          <select
            value={paidByEmployeeId}
            onChange={(e) =>
              setPaidByEmployeeId(
                e.target.value
              )
            }
            className="border px-3 py-2 rounded w-full"
            required
            disabled={
              saving || uploading
            }
          >
            <option value="">
              Select Employee
            </option>

            {employees.map(
              (emp) => (
                <option
                  key={emp._id}
                  value={emp._id}
                >
                  {emp.name}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {/* ================================
          EXPENSE DATE
      ================================= */}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
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
          className="border px-3 py-2 rounded w-full"
          required
          disabled={
            saving || uploading
          }
        />
      </div>

      {/* ================================
          DESCRIPTION
      ================================= */}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
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
          className="border px-3 py-2 rounded w-full"
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
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Receipt
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
          JPG, PNG or PDF — maximum
          5MB
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
          ? "Saving..."
          : uploading
          ? "Uploading..."
          : "Save Expense"}
      </button>
    </form>
  );
}