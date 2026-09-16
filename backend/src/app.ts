import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import { authRouter } from "./modules/auth/auth.routes";
import { organizationsRouter } from "./modules/organizations/organizations.routes";
import { propertiesRouter } from "./modules/properties/properties.routes";
import { ownershipRouter } from "./modules/ownership/ownership.routes";
import { financeRouter } from "./modules/finance/finance.routes";
import { evidenceRouter } from "./modules/evidence/evidence.routes";
import { publicRouter } from "./modules/evidence/public.routes";
import { disputesRouter } from "./modules/disputes/disputes.routes";
import { closingRouter } from "./modules/closing/closing.routes";
import { distributionsRouter } from "./modules/distributions/distributions.routes";
import { decisionsRouter } from "./modules/decisions/decisions.routes";
import { documentsRouter } from "./modules/documents/documents.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { dashboardRouter } from "./modules/reports/dashboard.routes";
import { pdfReportRouter } from "./modules/reports/pdf.routes";
import { anomaliesRouter } from "./modules/reports/anomalies.routes";
import { bankImportRouter } from "./modules/finance/bankImport.routes";
import { ocrRouter } from "./modules/finance/ocr.routes";
import { tenantsRouter } from "./modules/tenants/tenants.routes";
import { tenantPortalRouter } from "./modules/tenants/public.routes";
import { vendorsRouter } from "./modules/maintenance/vendors.routes";
import { maintenanceRouter } from "./modules/maintenance/requests.routes";
import { listingsRouter } from "./modules/broker/listings.routes";
import { leadsRouter } from "./modules/broker/leads.routes";
import { brokerDashboardRouter } from "./modules/broker/dashboard.routes";

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "qisma-api" }));

// Auth & identity
app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);

// Public (unauthenticated) — third-party confirmation links
app.use("/api/public", publicRouter);
app.use("/api/public/tenant", tenantPortalRouter);

// Property-scoped modules — all mounted under /api/properties, each router
// declares its own sub-paths (e.g. /:propertyId/ownership).
app.use("/api/properties", propertiesRouter);
app.use("/api/properties", ownershipRouter);
app.use("/api/properties", financeRouter);
app.use("/api/properties", evidenceRouter);
app.use("/api/properties", disputesRouter);
app.use("/api/properties", closingRouter);
app.use("/api/properties", distributionsRouter);
app.use("/api/properties", decisionsRouter);
app.use("/api/properties", documentsRouter);
app.use("/api/properties", reportsRouter);
app.use("/api/properties", pdfReportRouter);
app.use("/api/properties", anomaliesRouter);
app.use("/api/properties", bankImportRouter);
app.use("/api/properties", ocrRouter);
app.use("/api/properties", tenantsRouter);
app.use("/api/properties", vendorsRouter);
app.use("/api/properties", maintenanceRouter);

// Cross-property
app.use("/api/notifications", notificationsRouter);
app.use("/api/dashboard", dashboardRouter);

// Broker workspace (separate from the property-ownership ledger above)
app.use("/api/broker/listings", listingsRouter);
app.use("/api/broker/leads", leadsRouter);
app.use("/api/broker/dashboard", brokerDashboardRouter);

app.use((req, res) => {
  res.status(404).json({ error: { message: "المسار غير موجود.", code: "NOT_FOUND" } });
});

app.use(errorHandler);
