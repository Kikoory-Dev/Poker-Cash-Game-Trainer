// ====================================================================
// BOOT & VERSION
// ====================================================================
let currentPage = 1;
const dz = document.getElementById('drop-zone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');handleFiles(e.dataTransfer.files)});

// ─── TOAST ────────────────────────────────────────────────────
const APP_VERSION = '2.58';
console.log('Poker Tracker v' + APP_VERSION);
// Auto-update: check server version, hard-reload once if newer
(function(){
  var reloadGuard = 'pt_reloaded_' + APP_VERSION;
  fetch('version.json?cb=' + Date.now(), {cache:'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.version && d.version !== APP_VERSION) {
        if (!sessionStorage.getItem(reloadGuard)) {
          sessionStorage.setItem(reloadGuard, '1');
          var u = location.href.split('?')[0] + '?v=' + d.version;
          location.replace(u);
        }
      }
    })
    .catch(function(){});
})();
var vEl=document.createElement('div');
vEl.textContent='v'+APP_VERSION;
vEl.style.cssText='position:fixed;top:calc(env(safe-area-inset-top,0px) + 4px);right:6px;font-size:10px;color:#6db87a;background:rgba(0,0,0,0.4);padding:2px 6px;border-radius:6px;z-index:9999;pointer-events:none';
document.body.appendChild(vEl);
init();


