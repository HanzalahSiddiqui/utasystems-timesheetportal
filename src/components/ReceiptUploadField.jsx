"use client";

import { useRef, useState } from "react";

export default function ReceiptUploadField({
  value = "",
  onChange = () => {},
  label = "Receipt Picture",
}) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({
        receiptUrl: String(reader.result || ""),
        receiptFileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
      />

      {fileName ? (
        <p className="mt-2 text-xs text-slate-500">{fileName}</p>
      ) : null}

      {value ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
          <img
            src={value}
            alt="Receipt preview"
            className="max-h-72 w-full object-contain bg-slate-50"
          />
        </div>
      ) : null}
    </div>
  );
}