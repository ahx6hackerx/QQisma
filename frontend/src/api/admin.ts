import { api } from "./client";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  accountType: "OWNER" | "BROKER";
  status: UserStatus;
  statusReason: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  locked: boolean;
  propertiesCount: number;
  restrictionsCount: number;
}

export interface AdminUserDetail extends AdminUserRow {
  statusChangedAt: string | null;
  failedLogins: number;
  lockedUntil: string | null;
  transactionsCount: number;
  documentsCount: number;
  properties: { id: string; name: string; role: string }[];
  restrictions: { feature: string; label: string; reason: string; createdAt: string }[];
}

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationOpen: boolean;
  disabledFeatures: Record<string, string>;
}

export interface AdminStats {
  total: number;
  active: number;
  suspended: number;
  removed: number;
  owners: number;
  brokers: number;
  newLast7Days: number;
  newLast30Days: number;
  activeLast7Days: number;
  lockedNow: number;
  usersWithRestrictions: number;
  properties: number;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  audience: "ALL" | "OWNER" | "BROKER";
  recipientCount: number;
  createdAt: string;
}

export interface AdminLogRow {
  id: string;
  adminEmail: string;
  action: string;
  targetLabel: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export const adminApi = {
  stats: (): Promise<{ stats: AdminStats; recentUsers: AdminUserRow[]; platform: PlatformSettings }> =>
    api.get("/admin/stats").then((r) => r.data),

  users: (params: { search?: string; status?: string; accountType?: string; locked?: boolean; page?: number }): Promise<{
    users: AdminUserRow[];
    total: number;
    page: number;
    pageSize: number;
  }> => api.get("/admin/users", { params }).then((r) => r.data),

  user: (id: string): Promise<AdminUserDetail> => api.get(`/admin/users/${id}`).then((r) => r.data.user),
  ban: (id: string, reason: string) => api.post(`/admin/users/${id}/ban`, { reason }).then((r) => r.data),
  unban: (id: string) => api.post(`/admin/users/${id}/unban`).then((r) => r.data),
  remove: (id: string, confirmEmail: string) => api.post(`/admin/users/${id}/remove`, { confirmEmail }).then((r) => r.data),
  resetPassword: (id: string, password?: string): Promise<{ generated: boolean; temporaryPassword?: string }> =>
    api.post(`/admin/users/${id}/reset-password`, password ? { password } : {}).then((r) => r.data),
  forceLogout: (id: string) => api.post(`/admin/users/${id}/force-logout`).then((r) => r.data),
  unlock: (id: string) => api.post(`/admin/users/${id}/unlock`).then((r) => r.data),

  features: (): Promise<FeatureDef[]> => api.get("/admin/features").then((r) => r.data.features),
  disableFeature: (id: string, feature: string, reason: string) =>
    api.put(`/admin/users/${id}/features/${feature}`, { reason }).then((r) => r.data),
  enableFeature: (id: string, feature: string) => api.delete(`/admin/users/${id}/features/${feature}`).then((r) => r.data),

  platform: (): Promise<PlatformSettings> => api.get("/admin/platform").then((r) => r.data.platform),
  updatePlatform: (patch: Partial<PlatformSettings>): Promise<PlatformSettings> =>
    api.put("/admin/platform", patch).then((r) => r.data.platform),
  forceLogoutAll: (): Promise<{ count: number }> => api.post("/admin/force-logout-all").then((r) => r.data),

  announcements: (): Promise<AnnouncementRow[]> => api.get("/admin/announcements").then((r) => r.data.announcements),
  sendAnnouncement: (data: { title: string; message: string; audience: "ALL" | "OWNER" | "BROKER" }): Promise<AnnouncementRow> =>
    api.post("/admin/announcements", data).then((r) => r.data.announcement),

  auditLog: (page: number): Promise<{ logs: AdminLogRow[]; total: number; page: number; pageSize: number }> =>
    api.get("/admin/audit-log", { params: { page } }).then((r) => r.data),
};
