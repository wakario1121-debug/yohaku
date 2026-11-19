// 余白：ネットがなくても使えるようにするサービスワーカー
const CACHE="yohaku-dacbf6323e";
const FILES=["./","index.html","manifest.webmanifest","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith("yohaku-")&&k!=="yohaku-fonts").map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET") return;
  const url=new URL(req.url);
  // フォント：保存してあればそれを使い、裏で新しくする
  if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open("yohaku-fonts").then(async c=>{ const hit=await c.match(req); const net=fetch(req).then(r=>{ if(r.ok||r.type==="opaque") c.put(req,r.clone()); return r; }).catch(()=>hit||new Response("",{status:504})); e.waitUntil(net.catch(()=>{})); return hit||Promise.race([net,new Promise(r=>setTimeout(()=>r(new Response("",{status:504})),2500))]); }));
    return;
  }
  if(url.origin!==location.origin) return;
  // ページ本体：電波があれば最新、3秒で返事がなければ保存した版
  if(req.mode==="navigate"||url.pathname.endsWith("/index.html")){
    const net=fetch(req,{cache:"no-store"}).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put("index.html",cp)); } return r; });
    e.waitUntil(net.catch(()=>{}));
    e.respondWith(new Promise(res=>{ let done=false; const fall=()=>caches.match("index.html").then(h=>{ if(h&&!done){ done=true; res(h); } });
      const t=setTimeout(fall,3000);
      net.then(r=>{ if(!done&&r.ok){ done=true; clearTimeout(t); res(r); } else { clearTimeout(t); fall().then(()=>{ if(!done){ done=true; res(r); } }); } })
         .catch(()=>{ clearTimeout(t); fall().then(()=>{ if(!done){ done=true; res(Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req)));
});
