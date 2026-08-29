import { subscribeToPush } from "@/app/push/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandaloneDisplay() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** Registers the service worker, requests permission, subscribes to push,
 * and records the subscription server-side. Shared by the dismissible
 * dashboard prompt and the permanent profile-page toggle so the two never
 * drift out of sync. */
export async function enablePushNotifications(): Promise<{ error?: string }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: "לא ניתנה הרשאה להתראות." };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { error: "שגיאת הגדרה - נסו שוב מאוחר יותר." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { error: "ההרשמה להתראות נכשלה - נסה/י שוב." };
  }

  const result = await subscribeToPush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  if (result?.error) return { error: result.error };

  return {};
}
