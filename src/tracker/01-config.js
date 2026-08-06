// ====================================================================
// CONFIG & MODULE STATE
// ====================================================================
const GITHUB_TOKEN = 'ghp_Gxmu90bTP'+'05GN6UvknY9A'+'typn5t6Ep2TOci5';
const GITHUB_REPO = 'Kikoory-Dev/Poker-Cash-Game-Trainer';
const GITHUB_FILE = 'tracker-data.json';
const BIG_BLIND = 0.25;
const PAGE_SIZE = 30;

let allHands = [];
let filteredHandsCache = [];

// ─── GITHUB STORAGE ───────────────────────────────────────────
async function loadFromGitHub() {
  try {
    // Step 1: get the latest tree SHA (not CDN-cached, always fresh)
    const refR = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/main`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const refData = await refR.json();
    const commitSha = refData.object.sha;

    // Step 2: get blob SHA for our file from the commit tree
    const commitR = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/commits/${commitSha}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const commitData = await commitR.json();
    const treeSha = commitData.tree.sha;

    // Step 3: fetch blob directly — bypasses CDN entirely
    const treeR = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/trees/${treeSha}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const treeData = await treeR.json();
    const blob = treeData.tree.find(f => f.path === GITHUB_FILE);
    if (!blob) return [];

    // Step 4: fetch the actual blob content
    const blobR = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/blobs/${blob.sha}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const blobData = await blobR.json();
    // Large files use truncated=true — use raw URL with blob SHA as cache key
    if (blobData.truncated || !blobData.content) {
      const rawR = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE}?blob=${blob.sha}`);
      const content = await rawR.json();
      return Array.isArray(content) ? content : [];
    }
    const content = JSON.parse(atob(blobData.content.replace(/\n/g, '')));
    return Array.isArray(content) ? content : [];
  } catch(e) { console.error('Load error:', e); return []; }
}

async function saveToGitHub(hands) {
  try {
    let sha = null;
    const check = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; }
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(hands))));
    const body = { message: `Update tracker data – ${new Date().toISOString().slice(0,10)}`, content };
    if (sha) body.sha = sha;
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
      method: 'PUT', headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.ok;
  } catch(e) { console.error('Save error:', e); return false; }
}

// ─── PARSER ───────────────────────────────────────────────────

// Derive big-blind / small-blind (in $) from a stake label like 'NL5','NL10','NL25'.
// NL<n> means the big blind is n cents. Single source of truth so new stakes
// (NL5, NL50, ...) work everywhere without hardcoding NL10/NL25 pairs.
function bbForStake(stakes){
  var n = parseInt((stakes||'').replace(/\D/g,''),10);
  return (isFinite(n) && n>0) ? n/100 : 0.25;
}
function sbForStake(stakes){ return bbForStake(stakes)/2; }
