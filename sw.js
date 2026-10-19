// 絕冬夜行 service worker：離線可玩（小說生成仍需連網）
const VER = 'xj-v9';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];
// 這些外部資源會在第一次連網載入後快取，之後可離線使用
const CDN = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 頁面導覽：優先連網（拿到最新版），失敗退回快取
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(VER).then(c => c.put('index.html', cp)); return r; })
        .catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // 同網域靜態檔與 CDN：先用快取，背景更新
  if (url.origin === location.origin || CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req)
          .then(r => {
            if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
            return r;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
  // 其餘（Puter 登入與 AI 呼叫等）一律直接走網路，不攔截
});
