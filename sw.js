const CACHE_NAME = 'workspace-v1';

// 需要缓存的文件列表
const ASSETS = [
  'workspace.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// 安装：预缓存所有资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(e => {
        // 个别文件缓存失败不阻塞安装
        console.log('部分资源缓存失败:', e);
        return Promise.allSettled(
          ASSETS.map(url => cache.add(url).catch(() => {}))
        );
      });
    })
  );
  // 立即激活新SW，不等旧页面关闭
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 请求策略：网络优先，离线时走缓存
self.addEventListener('fetch', event => {
  // 只处理GET请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 网络成功，更新缓存
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          try { cache.put(event.request, clone); } catch(e) {}
        });
        return response;
      })
      .catch(() => {
        // 网络失败，从缓存取
        return caches.match(event.request).then(cached => {
          return cached || new Response('离线不可用', { status: 503 });
        });
      })
  );
});

// 收到skipWaiting消息时立即接管
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
