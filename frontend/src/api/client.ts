import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("qisma_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalizes backend error shape ({ error: { message, code } }) into a
// plain Error so components can just do `catch (e) { setError(e.message) }`.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.error?.message ?? "حدث خطأ في الاتصال بالخادم.";
    return Promise.reject(new Error(message));
  }
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  register: (data: { fullName: string; email: string; password: string; phone?: string; accountType: "OWNER" | "BROKER" }) =>
    api.post("/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  updateMe: (data: { fullName?: string; phone?: string; avatar?: File }) => {
    const form = new FormData();
    if (data.fullName) form.append("fullName", data.fullName);
    if (data.phone !== undefined) form.append("phone", data.phone);
    if (data.avatar) form.append("avatar", data.avatar);
    return api.patch("/auth/me", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.user);
  },
};

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------
export const orgApi = {
  list: () => api.get("/organizations").then((r) => r.data.organizations),
  create: (name: string) => api.post("/organizations", { name }).then((r) => r.data.organization),
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const dashboardApi = {
  get: () => api.get("/dashboard").then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Properties & partners
// ---------------------------------------------------------------------------
export const propertiesApi = {
  list: () => api.get("/properties").then((r) => r.data.properties),
  create: (data: {
    organizationId: string;
    name: string;
    address?: string;
    estimatedValue?: number;
    ownershipShares: { email: string; fullName?: string; sharePercent: number }[];
  }) => api.post("/properties", data).then((r) => r.data.property),
  get: (propertyId: string) => api.get(`/properties/${propertyId}`).then((r) => r.data),
  update: (propertyId: string, data: Record<string, unknown>) =>
    api.patch(`/properties/${propertyId}`, data).then((r) => r.data.property),
  partners: (propertyId: string) => api.get(`/properties/${propertyId}/partners`).then((r) => r.data.partners),
  invitePartner: (propertyId: string, data: { email: string; fullName?: string; role: string }) =>
    api.post(`/properties/${propertyId}/partners`, data).then((r) => r.data),
  updatePartnerRole: (propertyId: string, userId: string, role: string) =>
    api.patch(`/properties/${propertyId}/partners/${userId}`, { role }).then((r) => r.data.membership),
};

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------
export const ownershipApi = {
  current: (propertyId: string) => api.get(`/properties/${propertyId}/ownership`).then((r) => r.data),
  history: (propertyId: string) => api.get(`/properties/${propertyId}/ownership/history`).then((r) => r.data.history),
  transfer: (propertyId: string, data: { shares: { userId: string; sharePercent: number }[]; note?: string }) =>
    api.post(`/properties/${propertyId}/ownership/transfer`, data).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Finance / ledger
// ---------------------------------------------------------------------------
export const financeApi = {
  list: (propertyId: string, params?: Record<string, string | number | undefined>) =>
    api.get(`/properties/${propertyId}/transactions`, { params }).then((r) => r.data),
  create: (
    propertyId: string,
    data: { type: string; category: string; amount: number; description?: string; date: string }
  ) => api.post(`/properties/${propertyId}/transactions`, data).then((r) => r.data.transaction),
  update: (propertyId: string, id: string, data: Record<string, unknown>) =>
    api.patch(`/properties/${propertyId}/transactions/${id}`, data).then((r) => r.data.transaction),
  review: (propertyId: string, id: string) =>
    api.post(`/properties/${propertyId}/transactions/${id}/review`).then((r) => r.data.transaction),
  whereDidTheMoneyGo: (propertyId: string, year: number, month: number) =>
    api.get(`/properties/${propertyId}/where-did-the-money-go`, { params: { year, month } }).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Evidence, requests & confirmations
// ---------------------------------------------------------------------------
export const evidenceApi = {
  listForTransaction: (propertyId: string, transactionId: string) =>
    api.get(`/properties/${propertyId}/transactions/${transactionId}/evidence`).then((r) => r.data.evidence),
  upload: (propertyId: string, transactionId: string, file: File, note?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (note) form.append("note", note);
    return api
      .post(`/properties/${propertyId}/transactions/${transactionId}/evidence`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.evidence);
  },
  requests: (propertyId: string, status?: string) =>
    api.get(`/properties/${propertyId}/evidence-requests`, { params: { status } }).then((r) => r.data.requests),
  createRequest: (propertyId: string, data: { transactionId?: string; assignedToId?: string; message: string }) =>
    api.post(`/properties/${propertyId}/evidence-requests`, data).then((r) => r.data.request),
  completeRequest: (propertyId: string, id: string) =>
    api.post(`/properties/${propertyId}/evidence-requests/${id}/complete`).then((r) => r.data.request),
  requestConfirmation: (
    propertyId: string,
    transactionId: string,
    data: { respondentName: string; respondentContact?: string }
  ) => api.post(`/properties/${propertyId}/transactions/${transactionId}/confirmation-request`, data).then((r) => r.data),
  discrepancies: (propertyId: string) =>
    api.get(`/properties/${propertyId}/discrepancies`).then((r) => r.data.discrepancies),
};

export const publicApi = {
  getConfirmation: (id: string) => api.get(`/public/confirmations/${id}`).then((r) => r.data),
  respondConfirmation: (id: string, data: { confirmed: boolean; actualAmount?: number }) =>
    api.post(`/public/confirmations/${id}/respond`, data).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
export const disputesApi = {
  list: (propertyId: string, status?: string) =>
    api.get(`/properties/${propertyId}/disputes`, { params: { status } }).then((r) => r.data.disputes),
  create: (propertyId: string, data: { transactionId: string; reason: string }) =>
    api.post(`/properties/${propertyId}/disputes`, data).then((r) => r.data.dispute),
  comment: (propertyId: string, id: string, message: string) =>
    api.post(`/properties/${propertyId}/disputes/${id}/comments`, { message }).then((r) => r.data.comment),
  resolve: (propertyId: string, id: string, data: { resolutionNote: string; correctedAmount?: number }) =>
    api.post(`/properties/${propertyId}/disputes/${id}/resolve`, data).then((r) => r.data.dispute),
};

// ---------------------------------------------------------------------------
// Monthly closing & distributions
// ---------------------------------------------------------------------------
export const closingApi = {
  list: (propertyId: string) => api.get(`/properties/${propertyId}/closings`).then((r) => r.data.closings),
  preview: (propertyId: string, year: number, month: number) =>
    api.get(`/properties/${propertyId}/closings/preview`, { params: { year, month } }).then((r) => r.data),
  close: (propertyId: string, data: { year: number; month: number; force?: boolean }) =>
    api.post(`/properties/${propertyId}/closings`, data).then((r) => r.data.closing),
};

export const distributionsApi = {
  list: (propertyId: string) => api.get(`/properties/${propertyId}/distributions`).then((r) => r.data.distributions),
  create: (propertyId: string, monthlyClosingId: string) =>
    api.post(`/properties/${propertyId}/distributions`, { monthlyClosingId }).then((r) => r.data.distribution),
  approve: (propertyId: string, id: string) =>
    api.post(`/properties/${propertyId}/distributions/${id}/approve`).then((r) => r.data.distribution),
  payItem: (propertyId: string, id: string, itemId: string) =>
    api.post(`/properties/${propertyId}/distributions/${id}/items/${itemId}/pay`).then((r) => r.data.item),
  myShare: (propertyId: string) => api.get(`/properties/${propertyId}/my-share`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------
export const decisionsApi = {
  list: (propertyId: string, status?: string) =>
    api.get(`/properties/${propertyId}/decisions`, { params: { status } }).then((r) => r.data.decisions),
  create: (propertyId: string, data: { title: string; description?: string; amount?: number }) =>
    api.post(`/properties/${propertyId}/decisions`, data).then((r) => r.data.decision),
  vote: (propertyId: string, id: string, choice: "APPROVE" | "REJECT") =>
    api.post(`/properties/${propertyId}/decisions/${id}/vote`, { choice }).then((r) => r.data),
  approve: (propertyId: string, id: string) =>
    api.post(`/properties/${propertyId}/decisions/${id}/approve`).then((r) => r.data.decision),
  reject: (propertyId: string, id: string) =>
    api.post(`/properties/${propertyId}/decisions/${id}/reject`).then((r) => r.data.decision),
  execute: (propertyId: string, id: string) =>
    api.post(`/properties/${propertyId}/decisions/${id}/execute`).then((r) => r.data.decision),
};

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export const documentsApi = {
  list: (propertyId: string, category?: string) =>
    api.get(`/properties/${propertyId}/documents`, { params: { category } }).then((r) => r.data.documents),
  upload: (propertyId: string, file: File, category: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    return api
      .post(`/properties/${propertyId}/documents`, form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.document);
  },
  remove: (propertyId: string, id: string) => api.delete(`/properties/${propertyId}/documents/${id}`),
};

// ---------------------------------------------------------------------------
// Reports, activity & audit
// ---------------------------------------------------------------------------
export const reportsApi = {
  monthly: (propertyId: string, year: number, month: number) =>
    api.get(`/properties/${propertyId}/reports/monthly`, { params: { year, month } }).then((r) => r.data),
  partner: (propertyId: string, userId: string) =>
    api.get(`/properties/${propertyId}/reports/partner/${userId}`).then((r) => r.data),
  activity: (propertyId: string) => api.get(`/properties/${propertyId}/activity`).then((r) => r.data.activity),
  auditLog: (propertyId: string) => api.get(`/properties/${propertyId}/audit-log`).then((r) => r.data.logs),
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const notificationsApi = {
  list: (unreadOnly?: boolean) => api.get("/notifications", { params: { unreadOnly } }).then((r) => r.data),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
};

// ---------------------------------------------------------------------------
// Broker workspace
// ---------------------------------------------------------------------------
export const brokerApi = {
  dashboard: () => api.get("/broker/dashboard").then((r) => r.data),
  listings: {
    list: (params?: { status?: string; listingType?: string }) =>
      api.get("/broker/listings", { params }).then((r) => r.data.listings),
    get: (id: string) => api.get(`/broker/listings/${id}`).then((r) => r.data.listing),
    create: (data: Record<string, unknown>) => api.post("/broker/listings", data).then((r) => r.data.listing),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/broker/listings/${id}`, data).then((r) => r.data.listing),
    remove: (id: string) => api.delete(`/broker/listings/${id}`),
  },
  leads: {
    list: (params?: { status?: string; listingId?: string }) => api.get("/broker/leads", { params }).then((r) => r.data.leads),
    create: (data: Record<string, unknown>) => api.post("/broker/leads", data).then((r) => r.data.lead),
    update: (id: string, data: Record<string, unknown>) => api.patch(`/broker/leads/${id}`, data).then((r) => r.data.lead),
    remove: (id: string) => api.delete(`/broker/leads/${id}`),
  },
};
