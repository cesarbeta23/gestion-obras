// Service worker de Gestión de Obras.
//
// Por ahora solo guarda la app (el HTML, el JS y el CSS) para que abra sin señal.
// NO guarda los datos de las obras ni encola marcas: eso es el paso siguiente.
// Las peticiones a Supabase pasan derecho a la red y nunca se sirven de caché,
// para que nadie vea avance viejo creyendo que es el de ahora.

const CACHE = 'obras-v1';
const BASICOS = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Datos y login: siempre a la red, nunca de caché.
  if (url.hostname.endsWith('supabase.co') || url.pathname.startsWith('/api/')) return;

  // Lo demás: primero la red (para tomar la versión nueva al desplegar),
  // y si no hay señal, lo que haya guardado.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
  );
});
