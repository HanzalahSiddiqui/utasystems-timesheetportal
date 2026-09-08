"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExpenseStatusBadge from "@/components/ExpenseStatusBadge";

const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function AdminExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ================================
     FORM STATES
  ================================= */

  const [category, setCategory] = useState("");
  const [otherExpenseType, setOtherExpenseType] =
    useState("");

  const [expenseType, setExpenseType] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");

  const [incurredByName, setIncurredByName] = useState("");
  const [incurredFor, setIncurredFor] = useState("self");

  const [paidBy, setPaidBy] = useState("company");
  const [paidByEmployeeId, setPaidByEmployeeId] =
    useState("");

  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] =
    useState("");

  const [status, setStatus] = useState("submitted");
  const [reviewComment, setReviewComment] =
    useState("");

  /* ================================
     LOAD EXPENSE
  ================================= */

  async function loadItem() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/expenses/${params.id}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error || "Failed to load expense"
        );
        setItem(null);
        return;
      }

      const expense = data.item;

      setItem(expense);

      /* -------------------------------
         SET FORM VALUES
      -------------------------------- */

      setCategory(
        expense.category || ""
      );

      setOtherExpenseType(
        expense.otherExpenseType || ""
      );

      setExpenseType(
        expense.expenseType ||
          expense.category ||
          ""
      );

      setAmount(
        expense.amount ?? ""
      );

      setDescription(
        expense.description || ""
      );

      setIncurredByName(
        expense.incurredByName || ""
      );

      setIncurredFor(
        expense.incurredFor || "self"
      );

      setExpenseDate(
        expense.expenseDate
          ? new Date(expense.expenseDate)
              .toISOString()
              .split("T")[0]
          : ""
      );

      setPaidBy(
        expense.paidBy || "company"
      );

      setPaidByEmployeeId(
        expense.paidByEmployeeId?._id ||
          expense.paidByEmployeeId ||
          ""
      );

      setReceiptUrl(
        expense.receiptUrl ||
          expense.evidence?.[0]?.url ||
          ""
      );

      setReceiptFileName(
        expense.receiptFileName ||
          expense.evidence?.[0]?.fileName ||
          ""
      );

      setStatus(
        expense.status || "submitted"
      );

      setReviewComment(
        expense.reviewComment || ""
      );

    } catch (error) {
      console.error(
        "Failed to load expense:",
        error
      );

      alert("Failed to load expense");

    } finally {
      setLoading(false);
    }
  }

  /* ================================
     LOAD EMPLOYEES
  ================================= */

  async function loadEmployees() {
    try {
      const res = await fetch(
        "/api/employees",
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (res.ok) {
        setEmployees(
          data.items ||
            data.employees ||
            []
        );
      }
    } catch (error) {
      console.error(
        "Failed to load employees:",
        error
      );

      setEmployees([]);
    }
  }

  useEffect(() => {
    if (params?.id) {
      loadItem();
      loadEmployees();
    }
  }, [params?.id]);

  /* ================================
     RECEIPT UPLOAD
  ================================= */

  async function handleFileUpload(file) {
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
            "Receipt upload failed"
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

      alert("Receipt upload failed");

    } finally {
      setUploading(false);
    }
  }

  /* ================================
     SAVE CHANGES
  ================================= */

  async function handleSave() {
    if (saving || uploading) return;

    /* --------------------------------
       OTHER EXPENSE VALIDATION
    -------------------------------- */

    if (
      category === "other" &&
      !otherExpenseType.trim()
    ) {
      alert(
        "Please specify the expense type when category is Other"
      );
      return;
    }

    /* --------------------------------
       PAID BY VALIDATION
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

    /* --------------------------------
       STATUS VALIDATION
    -------------------------------- */

    if (
      status === "rejected" &&
      !reviewComment.trim()
    ) {
      alert(
        "Please enter a rejection comment"
      );
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/expenses/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            category,

            otherExpenseType:
              category === "other"
                ? otherExpenseType.trim()
                : "",

            expenseType,
            amount,
            description,
            expenseDate,

            incurredByName:
              incurredByName.trim(),

            incurredFor,

            paidBy,

            paidByEmployeeId:
              paidBy === "employee"
                ? paidByEmployeeId
                : null,

            receiptUrl:
              receiptUrl || undefined,

            receiptFileName,

            status,

            reviewComment:
              reviewComment.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to save changes"
        );
        return;
      }

      alert(
        "Expense updated successfully"
      );

      await loadItem();

    } catch (error) {
      console.error(
        "Save expense error:",
        error
      );

      alert(
        "Something went wrong while saving"
      );

    } finally {
      setSaving(false);
    }
  }

  /* ================================
     QUICK APPROVE
  ================================= */

  async function handleApprove() {
    if (saving) return;

    if (
      !confirm(
        "Are you sure you want to approve this expense?"
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/expenses/${params.id}/approve`,
        {
          method: "PATCH",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to approve expense"
        );
        return;
      }

      alert(
        "Expense approved successfully"
      );

      await loadItem();

    } catch (error) {
      console.error(error);
      alert("Approval failed");

    } finally {
      setSaving(false);
    }
  }

  /* ================================
     QUICK REJECT
  ================================= */

  async function handleReject() {
    const reason = prompt(
      "Enter rejection comment:"
    );

    if (!reason?.trim()) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/expenses/${params.id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            reviewComment:
              reason.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to reject expense"
        );
        return;
      }

      alert(
        "Expense rejected successfully"
      );

      await loadItem();

    } catch (error) {
      console.error(error);
      alert("Rejection failed");

    } finally {
      setSaving(false);
    }
  }

  /* ================================
     MARK AS PAID
  ================================= */

  async function handleMarkAsPaid() {
    if (saving) return;

    if (
      !confirm(
        "Are you sure you want to mark this expense as paid?"
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/expenses/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: "paid",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to mark expense as paid"
        );
        return;
      }

      alert(
        "Expense marked as paid"
      );

      await loadItem();

    } catch (error) {
      console.error(error);
      alert(
        "Failed to mark expense as paid"
      );

    } finally {
      setSaving(false);
    }
  }

  /* ================================
     DELETE
  ================================= */

  async function handleDelete() {
    if (
      !confirm(
        "WARNING: This will permanently delete this expense. Are you sure?"
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/expenses/${params.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to delete expense"
        );
        return;
      }

      alert(
        "Expense deleted successfully"
      );

      router.push(
        "/dashboard/admin/expenses"
      );

    } catch (error) {
      console.error(error);
      alert("Delete failed");

    } finally {
      setSaving(false);
    }
  }

  /* ================================
     LOADING
  ================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          Loading expense...
        </div>
      </div>
    );
  }

  /* ================================
     NOT FOUND
  ================================= */

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          Expense not found.
        </div>
      </div>
    );
  }

  /* ================================
     RECEIPT
  ================================= */

  const isPdf =
    receiptUrl
      ?.toLowerCase()
      .includes(".pdf");

  /* ================================
     UI
  ================================= */

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="flex min-h-screen">

        <Sidebar role="admin" />

        <div className="flex-1 min-w-0">

          <Navbar user="Admin User" />

          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 space-y-6">

            {/* =========================
                HEADER
            ========================== */}

            <div className="flex items-center justify-between gap-3 flex-wrap">

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Expense Detail
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Admin control panel
                </p>
              </div>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard/admin/expenses"
                  )
                }
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Back
              </button>

            </div>

            {/* =========================
                EXPENSE SUMMARY
            ========================== */}

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

              <div className="grid gap-5 md:grid-cols-3">

                <div>
                  <p className="text-sm text-slate-500">
                    Expense ID
                  </p>

                  <p className="mt-1 font-semibold">
                    {item.expenseId || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Employee
                  </p>

                  <p className="mt-1 font-semibold">
                    {item.employeeName ||
                      "Company"}
                  </p>

                  {item.employeeCode && (
                    <p className="text-xs text-slate-500">
                      {item.employeeCode}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Added By
                  </p>

                  <p className="mt-1 font-semibold">
                    {item.createdBy?.name ||
                      (item.createdBy?.role ===
                      "admin"
                        ? "Admin"
                        : "Employee")}
                  </p>
                </div>

              </div>

            </div>

            {/* =========================
                EDIT FORM
            ========================== */}

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

              <h2 className="mb-5 text-lg font-semibold">
                Expense Information
              </h2>

              <div className="grid gap-4 md:grid-cols-2">

                {/* CATEGORY */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
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

                {/* OTHER EXPENSE TYPE */}

                {category === "other" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
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
                      className="w-full rounded-lg border px-3 py-2"
                      disabled={
                        saving ||
                        uploading
                      }
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Required when category is Other.
                    </p>
                  </div>
                )}

                {/* AMOUNT */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Amount (USD)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
                    }
                  />
                </div>

                {/* EXPENSE DATE */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
                    }
                  />
                </div>

                {/* INCURRED BY */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Incurred By
                  </label>

                  <input
                    value={incurredByName}
                    onChange={(e) =>
                      setIncurredByName(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
                    }
                  />
                </div>

                {/* INCURRED FOR */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Incurred For
                  </label>

                  <select
                    value={incurredFor}
                    onChange={(e) =>
                      setIncurredFor(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
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

                {/* PAID BY */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Paid By
                  </label>

                  <select
                    value={paidBy}
                    onChange={(e) => {
                      setPaidBy(
                        e.target.value
                      );

                      if (
                        e.target.value ===
                        "company"
                      ) {
                        setPaidByEmployeeId(
                          ""
                        );
                      }
                    }}
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
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

                {/* PAID BY EMPLOYEE */}

                {paidBy ===
                  "employee" && (

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Employee Who Paid
                    </label>

                    <select
                      value={
                        paidByEmployeeId
                      }
                      onChange={(e) =>
                        setPaidByEmployeeId(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border px-3 py-2"
                      disabled={
                        saving ||
                        uploading
                      }
                    >
                      <option value="">
                        Select Employee
                      </option>

                      {employees.map(
                        (emp) => (
                          <option
                            key={
                              emp._id
                            }
                            value={
                              emp._id
                            }
                          >
                            {emp.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                {/* STATUS */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
                    }
                  >
                    <option value="draft">
                      Draft
                    </option>

                    <option value="submitted">
                      Submitted
                    </option>

                    <option value="approved">
                      Approved
                    </option>

                    <option value="rejected">
                      Rejected
                    </option>

                    <option value="paid">
                      Paid
                    </option>
                  </select>
                </div>

                {/* DESCRIPTION */}

                <div className="md:col-span-2">

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
                    }
                  />

                </div>

                {/* REVIEW COMMENT */}

                <div className="md:col-span-2">

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Review / Admin Comment
                  </label>

                  <textarea
                    value={reviewComment}
                    onChange={(e) =>
                      setReviewComment(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Add admin comment..."
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={
                      saving ||
                      uploading
                    }
                  />

                  {status ===
                    "rejected" && (
                    <p className="mt-1 text-xs text-red-600">
                      Rejection comment is required.
                    </p>
                  )}

                </div>

              </div>

              {/* =========================
                  SAVE BUTTON
              ========================== */}

              <div className="mt-6 flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    uploading
                  }
                  className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                {/* APPROVE */}

                {item.status !==
                  "approved" &&
                  item.status !==
                    "paid" && (

                  <button
                    type="button"
                    onClick={
                      handleApprove
                    }
                    disabled={saving}
                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>

                )}

                {/* REJECT */}

                {item.status !==
                  "rejected" &&
                  item.status !==
                    "paid" && (

                  <button
                    type="button"
                    onClick={
                      handleReject
                    }
                    disabled={saving}
                    className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    Reject
                  </button>

                )}

                {/* MARK AS PAID */}

                {item.status ===
                  "approved" && (

                  <button
                    type="button"
                    onClick={
                      handleMarkAsPaid
                    }
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark as Paid
                  </button>

                )}

                {/* DELETE */}

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Delete Expense
                </button>

              </div>

            </div>

            {/* =========================
                CURRENT STATUS
            ========================== */}

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

              <h2 className="mb-4 text-lg font-semibold">
                Current Status
              </h2>

              <ExpenseStatusBadge
                status={item.status}
              />

              {item.reviewComment && (

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">

                  <p className="text-sm font-semibold">
                    Admin Comment
                  </p>

                  <p className="mt-1 whitespace-pre-line text-slate-700">
                    {item.reviewComment}
                  </p>

                </div>

              )}

            </div>

            {/* =========================
                RECEIPT
            ========================== */}

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

              <h2 className="mb-4 text-lg font-semibold">
                Receipt
              </h2>

              {/* CURRENT RECEIPT */}

              {receiptUrl ? (

                <div className="space-y-4">

                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    View / Download Receipt
                  </a>

                  {isPdf ? (

                    <iframe
                      src={receiptUrl}
                      title="Receipt"
                      className="h-[600px] w-full rounded-2xl border"
                    />

                  ) : (

                    <img
                      src={receiptUrl}
                      alt="Receipt"
                      className="max-h-[700px] w-full rounded-2xl bg-slate-50 object-contain"
                    />

                  )}

                </div>

              ) : (

                <p className="text-sm text-slate-500">
                  No receipt currently attached.
                </p>

              )}

              {/* UPLOAD / REPLACE */}

              <div className="mt-6 border-t pt-5">

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Upload / Replace Receipt
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={(e) =>
                    handleFileUpload(
                      e.target.files?.[0]
                    )
                  }
                  disabled={
                    saving ||
                    uploading
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />

                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG or PDF — maximum 5MB
                </p>

                {uploading && (
                  <p className="mt-2 text-sm text-slate-500">
                    Uploading receipt...
                  </p>
                )}

                {receiptFileName && (
                  <p className="mt-2 text-sm text-slate-600">
                    Selected:{" "}
                    <span className="font-medium">
                      {receiptFileName}
                    </span>
                  </p>
                )}

              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}