"use client";

import { useRef, useState } from "react";

export default function ReceiptUploadField({
  value = "",
  onChange = () => {},
  label = "Receipt",
}) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
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
        onChange({
          receiptUrl: data.url,            // ✅ Cloudinary URL
          receiptFileName: data.name,
        });
      } else {
        alert("Upload failed");
      }
    } catch (error) {
      console.error(error);
      alert("Upload error");
    }

    setUploading(false);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
      />

      {uploading && (
        <p className="mt-2 text-xs text-blue-600">Uploading...</p>
      )}

      {fileName && (
        <p className="mt-2 text-xs text-slate-500">{fileName}</p>
      )}

      {value && (
        <div className="mt-3">
          {value.includes(".pdf") ? (
            <a
              href={value}
              target="_blank"
              className="text-blue-600 underline"
            >
              View Uploaded PDF
            </a>
          ) : (
            <img
              src={value}
              alt="Receipt preview"
              className="max-h-72 w-full object-contain bg-slate-50 rounded"
            />
          )}
        </div>
      )}
    </div>
  );
}