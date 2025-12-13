// api/farcaster/notificationStore.ts

export type NotificationToken = {
  fid: number;
  token: string;
  url: string;
};

// 👇 GLOBAL SCOPE (penting)
const globalAny = globalThis as any;

if (!globalAny.__KIMMI_NOTIFICATION_STORE__) {
  globalAny.__KIMMI_NOTIFICATION_STORE__ = new Map<number, NotificationToken>();
}

const store: Map<number, NotificationToken> =
  globalAny.__KIMMI_NOTIFICATION_STORE__;

export async function saveNotificationToken(data: NotificationToken) {
  store.set(data.fid, data);
}

export async function removeNotificationToken(fid: number) {
  store.delete(fid);
}

export async function getNotificationToken(fid: number) {
  return store.get(fid) ?? null;
}