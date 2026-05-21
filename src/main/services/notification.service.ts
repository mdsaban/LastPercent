import { Notification } from 'electron';

export function sendNotification(title: string, body: string) {
  if (!Notification.isSupported()) return;
  new Notification({ title, body, silent: false }).show();
}
