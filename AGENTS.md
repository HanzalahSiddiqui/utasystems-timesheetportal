# Project Guide

## Overview

UTA Timesheet Portal is a Next.js application for employee time reporting and administrative workforce and finance workflows. Employees submit monthly timesheets and expenses. Admins manage employees, clients, and holidays; review timesheets and expenses; generate and process payroll; create invoices; and view financial summaries.

## Main stack and layout

- Next.js App Router, React, and JavaScript.
- MongoDB with Mongoose models.
- NextAuth credentials authentication with JWT sessions.
- Cloudinary for receipt uploads and Resend for email notifications.
- `src/app/`: pages, layouts, and API route handlers.
- `src/components/`: shared UI.
- `src/models/`: Mongoose schemas.
- `src/lib/`: database, auth, integrations, and calculation helpers.
- `scripts/`: one-off data migration and backfill scripts.

## Instructions for changes

- Treat `sources/` and every file or directory beneath it as read-only. Do not edit, rename, move, delete, or generate files there. If a requested change appears to require modifying a source file, stop and explain the constraint.
- Keep changes scoped to the active `timesheet-portal` project. Do not edit the sibling `timesheet-portal - Copy` or backup directories unless explicitly requested.
- Preserve the employee/admin role boundary. Enforce authentication and role authorization in API handlers; hiding a UI control is not authorization.
- Keep employee ownership checks on employee-specific records. Admins can act across employee records only where the workflow requires it.
- Preserve workflow state transitions: timesheets move through draft/submitted/reviewed/reopened states; payroll through draft/finalized/paid; invoices through draft/finalized/sent/paid; expenses through submission, review, and payment.
- Keep payroll and invoice calculations on the server. Reuse shared calculation helpers where possible, and make changes consistent across generation, detail, export, and summary endpoints.
- Validate and normalize request data on the server. Do not trust client-supplied employee IDs, roles, totals, status values, or computed financial amounts.
- Do not expose credentials or environment variable values. Use the existing environment-based configuration for MongoDB, NextAuth, Cloudinary, and Resend.
- Follow the existing App Router and Mongoose patterns. Check related pages, API handlers, models, and shared components before changing a workflow.
- When changing persisted data shapes, account for existing MongoDB records and update or add a migration script when needed.
- Use the package scripts in `package.json` for applicable checks. Do not run migrations or destructive data operations without an explicit request.

## Useful commands

- `npm run dev` — start the development server.
- `npm run lint` — run ESLint.
- `npm run build` — create a production build.
- `npm run seed:admin` — create/seed the admin account using `.env.local`.
