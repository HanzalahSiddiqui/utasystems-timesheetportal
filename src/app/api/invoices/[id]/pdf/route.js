import React from "react";
import { Types } from "mongoose";
import { renderToStream } from "@react-pdf/renderer";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import "@/models/Client";
import "@/models/User";
import InvoicePdfDocument from "@/components/invoices/InvoicePdfDocument";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid invoice id" }, { status: 400 });
    }

    const invoice = await Invoice.findById(id)
      .populate("employeeId")
      .populate("clientId")
      .lean();

    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    const item = {
      ...invoice,
      invoiceNumber: invoice.invoiceNumber || "",
      issueDate: invoice.issueDate || invoice.createdAt || "",
      employeeName:
        invoice.employeeName ||
        invoice.employeeId?.name ||
        invoice.employeeId?.fullName ||
        "",
      jobTitle:
        invoice.jobTitle ||
        invoice.employeeId?.jobTitle ||
        invoice.employeeId?.designation ||
        "-",
      clientName:
        invoice.clientName ||
        invoice.clientId?.clientName ||
        "",
      clientEmail:
        invoice.clientEmail ||
        invoice.clientId?.clientEmail ||
        "",
      clientAddress:
        invoice.clientAddress ||
        invoice.clientId?.clientAddress ||
        "",
      billingDateFrom: invoice.billingDateFrom || "",
      billingDateTo: invoice.billingDateTo || "",
      professionalServiceCharges:
        invoice.professionalServiceCharges ??
        invoice.poAmount ??
        0,
      totalDue:
        invoice.totalDue ??
        invoice.professionalServiceCharges ??
        invoice.poAmount ??
        0,
    };

    const stream = await renderToStream(
      <InvoicePdfDocument item={item} />
    );

    const filename = `${item.invoiceNumber || "invoice"}.pdf`;

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation error:", error);

    return Response.json(
      {
        error: "Failed to generate invoice PDF",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}