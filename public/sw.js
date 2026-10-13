// 11단계 서비스 워커: 오프라인 안내 화면 하나만 저장합니다.
// 보호 자료(/api/…)와 자료실 화면은 저장하지 않고 항상 서버에 묻습니다. 토큰·기기 ID도 다루지 않습니다.
const CACHE = 'vault-offline-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

// 화면 이동 요청만 다루고, 네트워크가 끊겼을 때만 오프라인 안내를 보여 줍니다.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
