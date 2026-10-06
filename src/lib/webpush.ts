import webpush from "web-push";

const publicVapidKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BHSFve7XC0oNLrMRWEOpW1Vs8lsdXBSmuuGoYNbQvNnwoItO0S8EXzcqFb1yARUYtqzVXszGWfymoi-RvTOqlXo";
const privateVapidKey =
  process.env.VAPID_PRIVATE_KEY ||
  "Lxxl11p3sIBrXdBoGmsC4IqF5aHqqyLFVKTE6gsR4Qw";
const vapidSubject =
  process.env.VAPID_SUBJECT || "mailto:support@hotelannapoorna.com";

webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export async function sendWebPush(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload
) {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    return await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error("Web push dispatch failed:", error);
    return null;
  }
}

export { webpush, publicVapidKey };
