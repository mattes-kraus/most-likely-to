self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/'
        }
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'Most Likely To', options)
      );
    } catch (e) {
      console.error('Error parsing push data', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async function() {
      try {
        if (self.registration && self.registration.getNotifications) {
          const notifications = await self.registration.getNotifications();
          notifications.forEach(function(n) {
            n.close();
          });
        }
      } catch (e) {
        console.error('Error closing notifications on click', e);
      }

      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            return client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })()
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'clearNotifications') {
    if (self.registration && self.registration.getNotifications) {
      self.registration.getNotifications().then(function(notifications) {
        notifications.forEach(function(notification) {
          notification.close();
        });
      });
    }
  }
});
