import { api } from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.register('/service-worker.js');
    } catch (err) {
      console.error('Service worker registration failed:', err);
    }
  }
}

export async function clearActiveNotifications() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.getNotifications) {
        const notifications = await registration.getNotifications();
        notifications.forEach((notification) => {
          notification.close();
        });
      }
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'clearNotifications' });
      }
    } catch (err) {
      console.error('Error clearing active notifications:', err);
    }
  }
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted.');
  }

  // Register Service Worker
  const registration = await registerServiceWorker();
  
  // Wait for it to be active
  await navigator.serviceWorker.ready;

  // Get public VAPID key from backend
  const { publicKey } = await api('/api/push/vapidPublicKey');
  const applicationServerKey = urlBase64ToUint8Array(publicKey);

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  // Send subscription to backend
  await api('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription)
  });

  return subscription;
}
