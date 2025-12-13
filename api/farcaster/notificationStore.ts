type NotificationToken = {
  fid: number;
  token: string;
  url: string;
};

const store = new Map<number, NotificationToken>();

export async function saveNotificationToken(data: NotificationToken) {
  store.set(data.fid, data);
}

export async function removeNotificationToken(fid: number) {
  store.delete(fid);
}

export async function getNotificationToken(fid: number) {
  return store.get(fid) ?? null;
}