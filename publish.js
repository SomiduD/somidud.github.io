'use strict';
// ============================================================
// PROFILE PHOTO SLIDESHOW  +  PHOTO MANAGER  +  PUBLISH TO ALL DEVICES
// ============================================================
// The site is static (GitHub Pages), so data typed in Admin mode lives in this
// browser only. "Publish" commits master_cv_data.json (+ uploaded photos) to your
// GitHub repo with the GitHub API, so every device sees the same content.

const DEFAULT_SLIDE_SECONDS = 8; // long enough to register a face (~3s), short enough to feel alive
let slideTimer = null, slideIdx = 0;

function getProfile() {
    const pr = MASTER_CV_DATA.profile || {};
    const images = Array.isArray(pr.images) && pr.images.length ? pr.images : ['SomiduD.jpeg'];
    return { images, interval: Math.min(60, Math.max(3, Number(pr.interval) || DEFAULT_SLIDE_SECONDS)) };
}

function initProfileSlideshow() {
    const wrap = document.getElementById('hero-slides'); const dots = document.getElementById('hero-dots');
    if (!wrap) return;
    clearInterval(slideTimer);
    const { images, interval } = getProfile();
    wrap.innerHTML = images.map((src, i) => `<img class="hero-slide ${i === 0 ? 'active' : ''}" src="${esc(src)}" alt="Somidu Dilankara photo ${i + 1}" ${i ? 'loading="lazy"' : ''} onerror="this.style.display='none'">`).join('');
    slideIdx = 0;
    if (dots) dots.innerHTML = images.length > 1 ? images.map((_, i) => `<button type="button" class="hero-dot ${i === 0 ? 'active' : ''}" aria-label="Photo ${i + 1}" data-i="${i}"></button>`).join('') : '';
    if (images.length < 2) return;
    const show = i => {
        slideIdx = (i + images.length) % images.length;
        wrap.querySelectorAll('.hero-slide').forEach((el, k) => el.classList.toggle('active', k === slideIdx));
        dots?.querySelectorAll('.hero-dot').forEach((el, k) => el.classList.toggle('active', k === slideIdx));
    };
    let paused = false;
    const start = () => { clearInterval(slideTimer); slideTimer = setInterval(() => { if (!paused && !document.hidden) show(slideIdx + 1); }, interval * 1000); };
    const ring = document.querySelector('.hero-photo');
    ring?.addEventListener('mouseenter', () => paused = true);
    ring?.addEventListener('mouseleave', () => paused = false);
    dots?.addEventListener('click', e => { const b = e.target.closest('.hero-dot'); if (b) { show(+b.dataset.i); start(); } });
    start();
}

// ---------- image helpers ----------
function fileToResizedDataURL(file, maxSide = 900, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = reject;
        fr.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const s = Math.min(1, maxSide / Math.max(img.width, img.height));
                const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', quality));
            };
            img.src = fr.result;
        };
        fr.readAsDataURL(file);
    });
}

// ---------- modals ----------
function pubEnsureDom() {
    if (document.getElementById('pub-overlay')) return;
    const w = document.createElement('div');
    w.innerHTML = `
    <div id="photo-overlay" class="pub-overlay"><div class="pub-box">
        <div class="cvs-head"><span class="modal-title">🖼️ Profile Photos</span><button class="modal-close" onclick="closePhotoManager()">✕</button></div>
        <div class="pub-body" id="photo-body"></div>
        <div class="cvs-foot"><button class="btn btn-primary btn-sm" onclick="photoSave()">💾 Save</button><button class="btn btn-ghost btn-sm" onclick="closePhotoManager()">Cancel</button>
            <span class="cvs-status">Then click ☁️ Publish to show them on every device</span></div>
    </div></div>
    <div id="pub-overlay" class="pub-overlay"><div class="pub-box">
        <div class="cvs-head"><span class="modal-title">☁️ Publish to All Devices</span><button class="modal-close" onclick="closePublish()">✕</button></div>
        <div class="pub-body" id="pub-body"></div>
        <div class="cvs-foot"><button class="btn btn-primary btn-sm" id="pub-go" onclick="doPublish()">🚀 Publish now</button><button class="btn btn-ghost btn-sm" onclick="closePublish()">Close</button>
            <span class="cvs-status" id="pub-status"></span></div>
    </div></div>`;
    while (w.firstChild) document.body.appendChild(w.firstChild);
    ['photo-overlay', 'pub-overlay'].forEach(id => document.getElementById(id).addEventListener('click', e => { if (e.target.id === id) { id === 'photo-overlay' ? closePhotoManager() : closePublish(); } }));
}

let PH = null;
function openPhotoManager() {
    if (!adminAuthenticated) { showToast('🔐 Admin login required', 'warning'); return; }
    pubEnsureDom();
    const p = getProfile(); PH = { images: [...p.images], interval: p.interval };
    document.getElementById('photo-overlay').classList.add('open'); document.body.classList.add('modal-open');
    photoRender();
}
function closePhotoManager() { document.getElementById('photo-overlay')?.classList.remove('open'); document.body.classList.remove('modal-open'); }
function photoRender() {
    document.getElementById('photo-body').innerHTML = `
        <p class="cvs-note" style="margin-bottom:.75rem">Add as many photos as you like. They fade in one after another on the home page (hover pauses, dots let visitors pick). Photos are resized automatically.</p>
        <div class="photo-grid">${PH.images.map((src, i) => `<div class="photo-item"><img src="${esc(src)}" alt="">
            <div class="photo-actions"><button type="button" onclick="photoMove(${i},-1)">←</button><button type="button" onclick="photoMove(${i},1)">→</button><button type="button" onclick="photoDel(${i})">🗑</button></div>${i === 0 ? '<span class="photo-first">first</span>' : ''}</div>`).join('')}
            <label class="photo-add">＋<small>Add photos</small><input type="file" accept="image/*" multiple hidden onchange="photoAdd(this)"></label></div>
        <div class="cve-field" style="margin-top:1rem;max-width:320px"><span>Seconds per photo (3–60) — 8 s recommended</span>
            <input type="number" min="3" max="60" value="${PH.interval}" oninput="PH.interval=Math.min(60,Math.max(3,+this.value||8))"></div>`;
}
async function photoAdd(input) {
    for (const f of [...input.files]) { try { PH.images.push(await fileToResizedDataURL(f)); } catch (e) { showToast('⚠️ Could not read ' + esc(f.name), 'warning'); } }
    input.value = ''; photoRender();
}
function photoDel(i) { if (PH.images.length <= 1) { showToast('⚠️ Keep at least one photo', 'warning'); return; } PH.images.splice(i, 1); photoRender(); }
function photoMove(i, d) { const j = i + d; if (j < 0 || j >= PH.images.length) return; [PH.images[i], PH.images[j]] = [PH.images[j], PH.images[i]]; photoRender(); }
function photoSave() {
    MASTER_CV_DATA.profile = { images: PH.images, interval: PH.interval };
    try { saveCVOverride(); } catch (e) { showToast('⚠️ Too many/large photos for browser storage — remove some', 'warning'); return; }
    initProfileSlideshow(); closePhotoManager(); showToast('✅ Photos saved — click ☁️ Publish to sync all devices', 'success');
}

// ---------- publish ----------
function pubSettings() { try { return JSON.parse(localStorage.getItem('ghPublish')) || {}; } catch (e) { return {}; } }
function updatePublishBadge() {
    const b = document.getElementById('publish-btn');
    if (b) b.innerHTML = localStorage.getItem('cvDirty') ? '☁️ Publish to All Devices <span class="pub-dot" title="Unpublished changes"></span>' : '☁️ Publish to All Devices';
}
function openPublish() {
    if (!adminAuthenticated) { showToast('🔐 Admin login required', 'warning'); return; }
    pubEnsureDom();
    const s = pubSettings();
    document.getElementById('pub-body').innerHTML = `
        <p class="cvs-note" style="margin-bottom:.75rem">Publishing saves all your admin changes (projects, video links, pins, CV data, profile photos) into your GitHub repository, so <strong>every device</strong> sees them after ~1 minute.</p>
        <div class="cve-grid">
            <label class="cve-field"><span>Repository (owner/name)</span><input id="pub-repo" type="text" value="${esc(s.repo || 'SomiduD/somidud.github.io')}"></label>
            <label class="cve-field"><span>Branch</span><input id="pub-branch" type="text" value="${esc(s.branch || 'main')}"></label>
            <label class="cve-field" style="grid-column:1/-1"><span>GitHub access token (stored only in this browser)</span><input id="pub-token" type="password" value="${esc(s.token || '')}" placeholder="github_pat_…" autocomplete="off"></label>
        </div>
        <details class="cve-item" style="margin-top:.9rem"><summary>How do I get a token? (one-time, 1 minute)</summary>
            <ol class="cvs-note" style="padding:0 1rem 1rem 2rem;line-height:1.7">
                <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener" style="color:var(--accent)">github.com/settings/personal-access-tokens/new</a></li>
                <li>Repository access → <em>Only select repositories</em> → choose <strong>somidud.github.io</strong></li>
                <li>Permissions → Repository → <strong>Contents: Read and write</strong></li>
                <li>Generate the token, copy it, paste above. Use this only on your own devices.</li></ol></details>`;
    document.getElementById('pub-status').textContent = localStorage.getItem('cvDirty') ? '● Unpublished changes' : '✔ Everything is published';
    document.getElementById('pub-overlay').classList.add('open'); document.body.classList.add('modal-open');
}
function closePublish() { document.getElementById('pub-overlay')?.classList.remove('open'); document.body.classList.remove('modal-open'); }

function b64utf8(str) { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin); }

async function ghPut(cfg, path, contentB64, message) {
    const api = `https://api.github.com/repos/${cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const headers = { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    let sha;
    const g = await fetch(`${api}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`, { headers });
    if (g.ok) sha = (await g.json()).sha; else if (g.status !== 404) throw new Error(`GitHub ${g.status}: ${g.status === 401 ? 'bad token' : g.status === 403 ? 'token lacks permission' : 'cannot read ' + path}`);
    const r = await fetch(api, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message, content: contentB64, branch: cfg.branch, ...(sha ? { sha } : {}) }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) { } throw new Error(`GitHub ${r.status}: ${m || 'upload failed'}`); }
}

async function doPublish() {
    const cfg = { repo: document.getElementById('pub-repo').value.trim(), branch: document.getElementById('pub-branch').value.trim() || 'main', token: document.getElementById('pub-token').value.trim() };
    const st = document.getElementById('pub-status'), btn = document.getElementById('pub-go');
    if (!/^[\w.-]+\/[\w.-]+$/.test(cfg.repo) || !cfg.token) { showToast('⚠️ Enter repository and token', 'warning'); return; }
    localStorage.setItem('ghPublish', JSON.stringify(cfg));
    btn.disabled = true;
    try {
        const data = JSON.parse(JSON.stringify(MASTER_CV_DATA));
        const prof = data.profile || { images: ['SomiduD.jpeg'], interval: DEFAULT_SLIDE_SECONDS };
        for (let i = 0; i < prof.images.length; i++) {
            const src = prof.images[i];
            if (src.startsWith('data:')) {
                st.textContent = `Uploading photo ${i + 1}/${prof.images.length}…`;
                const path = `images/profile/photo-${Date.now()}-${i + 1}.jpg`;
                await ghPut(cfg, path, src.split(',')[1], 'Add profile photo');
                prof.images[i] = path;
            }
        }
        data.profile = prof;
        const json = JSON.stringify(data, null, 2);
        st.textContent = 'Publishing data…';
        await ghPut(cfg, 'master_cv_data.json', b64utf8(json + '\n'), 'Update portfolio data from admin');
        st.textContent = 'Updating offline fallback…';
        await ghPut(cfg, 'cv-data.js', b64utf8('window.CV_DEFAULT = ' + json + ';'), 'Update offline portfolio data');
        MASTER_CV_DATA = data;
        localStorage.removeItem(CV_STORE_KEY); localStorage.removeItem('cvDirty');
        updatePublishBadge(); initProfileSlideshow();
        st.textContent = '✔ Published — live on all devices in ~1 minute';
        showToast('🚀 Published! Other devices will update in about a minute.', 'success');
    } catch (e) {
        console.error(e); st.textContent = '✖ ' + e.message; showToast('⚠️ ' + esc(e.message), 'warning');
    } finally { btn.disabled = false; }
}

document.addEventListener('DOMContentLoaded', () => setTimeout(updatePublishBadge, 500));

