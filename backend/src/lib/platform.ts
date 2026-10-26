import { prisma } from "./prisma";

// Platform-wide switches stored in the platform_settings table, with a
// short in-memory cache so the gate in requireAuth doesn't hit the DB
// for them on every single request.
export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationOpen: boolean;
  // feature key -> reason shown to users
  disabledFeatures: Record<string, string>;
}

const DEFAULTS: PlatformSettings = {
  maintenanceMode: false,
  maintenanceMessage: "المنصة تحت الصيانة حاليًا. الرجاء المحاولة لاحقًا.",
  registrationOpen: true,
  disabledFeatures: {},
};

const KEY = "platform";
const TTL_MS = 5000;
let cache: { value: PlatformSettings; at: number } | null = null;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value = DEFAULTS;
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: KEY } });
    if (row) value = { ...DEFAULTS, ...JSON.parse(row.value) };
  } catch {
    value = DEFAULTS;
  }
  cache = { value, at: Date.now() };
  return value;
}

export async function savePlatformSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  const next: PlatformSettings = { ...current, ...patch };
  await prisma.platformSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  cache = { value: next, at: Date.now() };
  return next;
}
