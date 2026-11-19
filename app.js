'use strict';
// ============================================================
// CONSTANTS & STATE
// ============================================================
const MAX_PINNED = 6;
let ALL_PROJECTS = [];
let pinnedProjects = [];
let MASTER_CV_DATA = {};
let generatedCVHTML = null;
let currentCVRole = '';
let adminAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
let chatOpen = false;
let chatHistory = [];
let terminalOpen = false;
let snakeRunning = false;
let snakeTimer = null;
const CELL = 16, COLS = 24, ROWS = 18;
let snake = [], dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 }, food = {}, score = 0;

// Skill icons (looked up by keyword so edited/added skills still get an icon)
const SKILL_ICON_RULES = [
    ['python', '🐍'], ['c#', '🎼'], ['dart', '🎯'], ['php', '🐘'], ['html', '🌐'], ['c++', '⚙️'], ['typescript', '🔷'], ['javascript', '⚡'],
    ['react', '⚛️'], ['next', '▲'], ['vite', '⚡'], ['tailwind', '🌬️'], ['flutter', '🐦'],
    ['node', '🟢'], ['express', '🚂'], ['socket', '🔌'], ['jwt', '🔑'], ['mcp', '🧩'], ['model context', '🧩'],
    ['mongo', '🍃'], ['firebase', '🔥'], ['sql server', '🗄️'], ['sqlite', '🪶'], ['schema', '📐'], ['mysql', '🐬'],
    ['docker', '🐳'], ['github actions', '🤖'], ['git', '🐙'], ['playwright', '🎭'], ['devtools', '🧪'], ['cdp', '🧪'],
    ['ai sdk', '✨'], ['gemini', '💎'], ['machine learning', '🧠'], ['esp32', '📡'], ['iot', '📶'], ['arduino', '🤖'], ['raspberry', '🍓'],
    ['curation', '🗂️'], ['annotation', '🏷️'], ['validation', '✅'], ['ui/ux', '🎨'], ['design', '🎨'], ['figma', '🎨'], ['java', '☕'], ['r', '📉']
];
function skillIcon(name) {
    const n = String(name).toLowerCase();
    for (const [k, icon] of SKILL_ICON_RULES) { if (k.length > 1 ? n.includes(k) : n === k) return icon; }
    return '🔹';
}
function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// MASTER CV DATA (single source of truth: site + chatbot + CV generator)
// ============================================================
const CV_STORE_KEY = 'cvDataOverride';
function cloneData(o) { return JSON.parse(JSON.stringify(o)); }
function getDefaultCV() { return cloneData(window.CV_DEFAULT || { personal: {}, skills: {}, projects: [], education: [], experience: [] }); }
function loadCVOverride() {
    try { const s = localStorage.getItem(CV_STORE_KEY); if (s) return JSON.parse(s); } catch (e) { }
    return null;
}
function saveCVOverride() {
    localStorage.setItem(CV_STORE_KEY, JSON.stringify(MASTER_CV_DATA));
    localStorage.setItem('cvDirty', '1');
    if (typeof updatePublishBadge === 'function') updatePublishBadge();
}

function projectsFromCV() {
    return (MASTER_CV_DATA.projects || []).map((p, i) => ({
        id: p.id ?? (Date.now() + i), title: p.name || p.title || 'Untitled', category: p.category || '',
        description: p.description || '', tags: p.technologies || p.tags || [],
        youtubeUrl: p.youtubeUrl || '', orient: p.orient || 'auto', github: p.github || 'https://github.com/somidud', live: p.live || '#',
        userAdded: !!p.userAdded
    }));
}

// Writes the site's project list back into the CV data so website & CV always agree
function persistProjectsToCV() {
    MASTER_CV_DATA.projects = ALL_PROJECTS.map(p => ({
        id: p.id, name: p.title, category: p.category, description: p.description, technologies: p.tags,
        youtubeUrl: p.youtubeUrl, orient: p.orient || 'auto', github: p.github, live: p.live, userAdded: !!p.userAdded
    }));
    saveCVOverride();
}

function refreshSiteFromCV() {
    ALL_PROJECTS = projectsFromCV();
    pinnedProjects = loadPinnedProjects().filter(id => ALL_PROJECTS.some(p => p.id === id));
    if (!pinnedProjects.length) pinnedProjects = ALL_PROJECTS.slice(0, MAX_PINNED).map(p => p.id);
    renderPinnedGrid();
    renderTimeline();
    renderExperience();
    renderSkillsGrid();
    renderAboutBits();
    if (typeof initProfileSlideshow === 'function') initProfileSlideshow();
}

async function initMasterData() {
    let base;
    try {
        const res = await fetch('master_cv_data.json?v=' + Date.now());
        if (!res.ok) throw new Error('JSON not found');
        base = await res.json();
    } catch (e) {
        console.warn('master_cv_data.json unavailable — using bundled defaults');
        base = getDefaultCV();
    }
    MASTER_CV_DATA = loadCVOverride() || base;
    refreshSiteFromCV();
}

function renderAboutBits() {
    const p = MASTER_CV_DATA.personal || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.textContent = v; };
    set('stat-projects', ALL_PROJECTS.length + '+');
    set('stat-skills', Object.values(MASTER_CV_DATA.skills || {}).flat().length + '+');
    set('about-bio', MASTER_CV_DATA.summary || '');
    set('about-location', p.location);
    set('contact-location', p.location);
    set('contact-phone', p.phone);
    set('contact-email', p.email);
    const phoneLink = document.getElementById('about-phone-link');
    if (phoneLink && p.phone) { phoneLink.textContent = p.phone; phoneLink.href = 'tel:' + p.phone.replace(/[^+\d]/g, ''); }
    const tel = document.getElementById('contact-phone-link');
    if (tel && p.phone) { tel.textContent = p.phone; tel.href = 'tel:' + p.phone.replace(/[^+\d]/g, ''); }
}

function renderExperience() {
    const wrap = document.getElementById('exp-wrapper');
    if (!wrap) return;
    const exp = MASTER_CV_DATA.experience || [];
    wrap.innerHTML = exp.length ? exp.map((e, i) => `
        <div class="exp-item reveal visible">
            <div class="exp-dot"></div>
            <div class="exp-card">
                <div class="exp-top"><h3>${esc(e.role)}</h3><span class="exp-period">${esc(e.period)}</span></div>
                <div class="exp-org">${esc(e.organization)}</div>
                <p>${esc(e.details)}</p>
            </div>
        </div>`).join('') : '<p style="color:var(--text-muted)">No experience added yet.</p>';
}

// ============================================================
// PINNING STATE
// ============================================================
function loadPinnedProjects() {
    if (Array.isArray(MASTER_CV_DATA.pinned) && MASTER_CV_DATA.pinned.length) return MASTER_CV_DATA.pinned;
    try {
        const saved = localStorage.getItem('pinnedProjects');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) { }
    return ALL_PROJECTS.slice(0, 6).map(p => p.id);
}

function savePinnedProjects(arr) {
    localStorage.setItem('pinnedProjects', JSON.stringify(arr));
    MASTER_CV_DATA.pinned = [...arr];
    saveCVOverride();
}
function saveUserProjects() { localStorage.setItem('userProjects', JSON.stringify(ALL_PROJECTS.filter(p => p.userAdded))); }
function loadUserProjects() {
    try {
        const saved = localStorage.getItem('userProjects');
        if (saved) JSON.parse(saved).forEach(p => { if (!ALL_PROJECTS.find(e => e.id === p.id)) ALL_PROJECTS.push(p); });
    } catch (e) { }
}

// ============================================================
// STARTUP & TYPEWRITER
// ============================================================
const STARTUP_WORDS = ['Hello 👋', 'ආයුබෝවන් 🙏', 'வணக்கம் 🤝', 'Hola', 'Bonjour', 'こんにちは', 'Hallo', 'नमस्ते', '你好', 'مرحبا'];

(function runStartup() {
    const overlay = document.getElementById('startup-overlay');
    const textEl = document.getElementById('startup-text');
    if (!overlay || !textEl) return;
    let idx = 0;
    function next() {
        if (idx < STARTUP_WORDS.length) {
            textEl.style.animation = 'none'; textEl.offsetHeight;
            textEl.innerText = STARTUP_WORDS[idx++];
            textEl.style.animation = 'popIn 0.25s ease-in-out';
            setTimeout(next, 270);
        } else {
            overlay.style.transform = 'translateY(-100vh)';
            overlay.style.opacity = '0';
            document.body.classList.remove('loading');
            setTimeout(() => overlay.style.display = 'none', 900);
        }
    }
    window.addEventListener('DOMContentLoaded', next);
})();

function initTypewriter() {
    const el = document.getElementById('typewriter-text');
    if (!el) return;
    const titles = ['Full-Stack Software Engineer', 'AI & IoT Developer', 'Computer Science Undergraduate', 'Flutter & Mobile Developer', 'Next.js & React Developer', 'Automation & RPA Builder'];
    let idx = 0, charIdx = 0, deleting = false;
    function tick() {
        const current = titles[idx];
        if (!deleting) {
            el.textContent = current.slice(0, ++charIdx);
            if (charIdx === current.length) { deleting = true; setTimeout(tick, 1800); return; }
            setTimeout(tick, 75);
        } else {
            el.textContent = current.slice(0, --charIdx);
            if (charIdx === 0) { deleting = false; idx = (idx + 1) % titles.length; setTimeout(tick, 400); return; }
            setTimeout(tick, 38);
        }
    }
    tick();
}

// ============================================================
// THEME TOGGLE
// ============================================================
(function initTheme() {
    const html = document.documentElement;
    const saved = localStorage.getItem('portfolio-theme') || 'dark';
    html.setAttribute('data-theme', saved);
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('theme-btn');
        if (btn) btn.addEventListener('click', () => {
            const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            localStorage.setItem('portfolio-theme', next);
        });
    });
})();

// ============================================================
// MUSIC TOGGLE
// ============================================================
(function initMusic() {
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('music-btn');
        const audio = document.getElementById('welcome-audio');
        const body = document.body;
        if (!btn || !audio) return;
        btn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().then(() => body.setAttribute('data-audio-state', 'playing')).catch(() => { });
            } else {
                audio.pause();
                body.setAttribute('data-audio-state', 'paused');
            }
        });
    });
})();

// ============================================================
// HERO CANVAS PARTICLES
// ============================================================
function initParticleCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const PCOUNT = 70, MAX_DIST = 160;
    let mouse = { x: null, y: null }, particles = [], animId;

    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.6; this.vy = (Math.random() - 0.5) * 0.6;
            this.r = Math.random() * 1.8 + 0.5;
            this.pulse = Math.random() * Math.PI * 2; this.ps = 0.015 + Math.random() * 0.02;
            this.hue = Math.random() > 0.7 ? 280 : 185;
        }
        update() {
            this.x += this.vx; this.y += this.vy; this.pulse += this.ps;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            if (mouse.x !== null) {
                const dx = this.x - mouse.x, dy = this.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d < 100) { this.x += dx / d * 1.5; this.y += dy / d * 1.5; }
            }
        }
        draw() {
            const a = 0.45 + Math.sin(this.pulse) * 0.3;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = this.hue === 185 ? `rgba(0,245,255,${a})` : `rgba(123,47,255,${a})`;
            ctx.fill();
        }
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DIST) {
                    const a = (1 - dist / MAX_DIST) * 0.35;
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0,245,255,${a})`; ctx.lineWidth = 0.6; ctx.stroke();
                }
            }
            if (mouse.x !== null) {
                const dx = particles[i].x - mouse.x, dy = particles[i].y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(123,47,255,${(1 - dist / 180) * 0.55})`; ctx.lineWidth = 0.8; ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        animId = requestAnimationFrame(animate);
    }

    function init() {
        resize();
        particles = Array.from({ length: PCOUNT }, () => new Particle());
        cancelAnimationFrame(animId); animate();
    }

    window.addEventListener('resize', init);
    document.getElementById('hero')?.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    document.getElementById('hero')?.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });
    init();
}

// ============================================================
// EDUCATION TIMELINE
// ============================================================
function renderTimeline() {
    const wrapper = document.getElementById('edu-wrapper');
    if (!wrapper || !MASTER_CV_DATA.education) return;
    const colors = ['#22c55e', '#3b82f6', '#ec4899', '#f59e0b', '#a855f7', '#6b7280', '#ef4444', '#10b981'];
    wrapper.innerHTML = MASTER_CV_DATA.education.map((edu, i) => `
        <div class="edu-card ${i === 0 ? 'open' : ''}">
            <div class="edu-header" onclick="toggleAccordion(this)">
                <div class="edu-header-left">
                    <div class="edu-dot" style="background:${colors[i % colors.length]}"></div>
                    <div>
                        <div class="edu-title">${edu.institution}</div>
                        <div class="edu-subtitle">${edu.degree}</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0">
                    <span class="edu-year">${edu.period}</span>
                    <span class="edu-chevron">▼</span>
                </div>
            </div>
            <div class="edu-body">${edu.details}</div>
        </div>`).join('');
}

function toggleAccordion(header) {
    const card = header.closest('.edu-card');
    const isOpen = card.classList.contains('open');
    document.querySelectorAll('.edu-card.open').forEach(c => c.classList.remove('open'));
    if (!isOpen) card.classList.add('open');
}

// ============================================================
// SKILLS GRID
// ============================================================
function renderSkillsGrid() {
    const container = document.getElementById('skills-container');
    if (!container) return;
    container.innerHTML = Object.entries(MASTER_CV_DATA.skills || {}).map(([cat, skills]) => `
        <div class="reveal">
            <div class="stack-cat-title">${esc(cat)}</div>
            <div class="stack-grid">
                ${skills.map(s => `
                    <div class="stack-item">
                        <span class="stack-icon">${skillIcon(s)}</span>
                        <span>${esc(s)}</span>
                    </div>`).join('')}
            </div>
        </div>`).join('');
    initReveal();
}

// ============================================================
// PROJECT CARDS
// ============================================================
// ---------- VIDEO LINKS (YouTube / Google Drive / TikTok / Vimeo / MP4) ----------
function parseVideo(raw, orient) {
    const url = String(raw || '').trim();
    if (!url) return null;
    let m, kind = 'iframe', src = '', auto = 'landscape';
    if ((m = url.match(/(?:youtube\.com\/shorts\/)([\w-]{6,})/i))) { src = 'https://www.youtube.com/embed/' + m[1] + '?rel=0'; auto = 'portrait'; }
    else if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|v\/)|youtube-nocookie\.com\/embed\/)([\w-]{6,})/i))) { src = 'https://www.youtube.com/embed/' + m[1] + '?rel=0'; }
    else if ((m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/i))) { src = 'https://drive.google.com/file/d/' + m[1] + '/preview'; }
    else if ((m = url.match(/tiktok\.com\/(?:@[\w.\-]+\/video\/|embed\/(?:v2\/)?|v\/)(\d{8,})/i))) { src = 'https://www.tiktok.com/embed/v2/' + m[1]; auto = 'portrait'; }
    else if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i))) { src = 'https://player.vimeo.com/video/' + m[1]; }
    else if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) && /^https?:/i.test(url)) { kind = 'video'; src = url; }
    else return { kind: 'link', src: url, orient: 'landscape' };
    const o = ['landscape', 'portrait', 'square'].includes(orient) ? orient : auto;
    return { kind, src, orient: o };
}

function buildVideoMedia(p) {
    const v = parseVideo(p.youtubeUrl, p.orient);
    const ar = { landscape: ['16 / 9', 1.7778], portrait: ['9 / 16', 0.5625], square: ['1 / 1', 1] };
    if (!v || v.kind === 'link') {
        const link = v ? `<a href="${esc(v.src)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="margin-top:.4rem">Watch video ↗</a>` : '';
        return `<div class="card-media card-media-empty"><div class="video-placeholder">
            <div class="yt-play-icon">▶</div>
            <p style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono)">${v ? 'Link can\'t be embedded' : 'Preview unavailable'}</p>${link}</div></div>`;
    }
    const [css, n] = ar[v.orient];
    const inner = v.kind === 'video'
        ? `<video src="${esc(v.src)}" controls playsinline preload="metadata" onloadedmetadata="if(this.videoWidth){var f=this.parentElement;f.style.setProperty('--ar',this.videoWidth+' / '+this.videoHeight);f.style.setProperty('--arn',this.videoWidth/this.videoHeight);}"></video>`
        : `<iframe src="${esc(v.src)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen title="${esc(p.title)} demo"></iframe>`;
    return `<div class="card-media card-media-video"><div class="vid-frame" style="--ar:${css};--arn:${n}">${inner}</div></div>`;
}

function buildProjectCard(p, ctx = '') {
    const isPinned = pinnedProjects.includes(p.id);
    const tags = p.tags.map(t => `<span class="tag">${t}</span>`).join('');
    const media = buildVideoMedia(p);
    const editBtn = adminAuthenticated
        ? `<button class="proj-edit-btn" onclick="openEditProject(${p.id})" title="Edit project">✏️</button>` : '';
    const deleteBtn = adminAuthenticated
        ? `<button class="proj-delete-btn" onclick="deleteProject(${p.id})" title="Delete">🗑</button>` : '';
    const pinBtn = adminAuthenticated
        ? `<button id="${ctx}card-pin-${p.id}" class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="togglePin(${p.id})">${isPinned ? '⭐ Pinned' : '☆ Pin'}</button>` : '';
    return `
        <div class="project-card" id="${ctx}pcard-${p.id}">
            ${media}
            <div class="card-body">
                <span class="card-category">${p.category}</span>
                <h3>${p.title}${p.userAdded ? '<span class="custom-badge">Custom</span>' : ''}</h3>
                <p>${p.description}</p>
                <div class="card-tags">${tags}</div>
                <div class="card-actions">
                    <a href="${p.github}" target="_blank" class="btn btn-ghost btn-sm">GitHub</a>
                    <a href="${p.live}" target="_blank" class="btn btn-outline btn-sm">Live Demo</a>
                    ${pinBtn}
                    <div style="display:flex;gap:0.3rem;margin-left:auto">${editBtn}${deleteBtn}</div>
                </div>
            </div>
        </div>`;
}

function buildModalCard(p) {
    const isPinned = pinnedProjects.includes(p.id);
    const tags = p.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('');
    const editBtn = adminAuthenticated ? `<button class="proj-edit-btn" onclick="openEditProject(${p.id})" title="Edit">✏️</button>` : '';
    const deleteBtn = adminAuthenticated ? `<button class="proj-delete-btn" onclick="deleteProject(${p.id})">🗑</button>` : '';
    return `
        <div class="modal-card ${isPinned ? 'pinned' : ''}" id="mcard-${p.id}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem">
                <h4>${p.title}${p.userAdded ? '<span class="custom-badge">Custom</span>' : ''}</h4>
                <div style="display:flex;gap:0.25rem;flex-shrink:0">${editBtn}${deleteBtn}</div>
            </div>
            <p>${p.description}</p>
            <div style="margin:0.5rem 0">${tags}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem">
                <span style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono)">${p.category}</span>
                <button id="modal-pin-${p.id}" class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="togglePin(${p.id})">
                    ${isPinned ? '⭐ Unpin' : '☆ Pin'}
                </button>
            </div>
        </div>`;
}

function renderPinnedGrid() {
    const grid = document.getElementById('pinned-projects-grid');
    if (!grid) return;
    const pinned = ALL_PROJECTS.filter(p => pinnedProjects.includes(p.id)).slice(0, MAX_PINNED);
    grid.innerHTML = pinned.map(p => buildProjectCard(p)).join('');
    const sub = document.getElementById('pinned-subtitle');
    if (sub) sub.textContent = `${pinned.length} pinned from my project library`;
    renderAllProjects();
}

let allProjectsOpen = false;
function renderAllProjects() {
    const grid = document.getElementById('all-projects-grid');
    const btn = document.getElementById('all-projects-btn');
    if (btn) btn.innerHTML = allProjectsOpen ? '▲ Hide All Projects' : `📂 View All Projects (${ALL_PROJECTS.length})`;
    if (!grid) return;
    grid.hidden = !allProjectsOpen;
    grid.innerHTML = allProjectsOpen ? ALL_PROJECTS.map(p => buildProjectCard(p, 'all-')).join('') : '';
}
function toggleAllProjects() {
    allProjectsOpen = !allProjectsOpen;
    renderAllProjects();
    if (allProjectsOpen) document.getElementById('all-projects-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderModalGrid() {
    const container = document.getElementById('all-projects-modal');
    if (!container) return;
    container.innerHTML = ALL_PROJECTS.map(p => buildModalCard(p)).join('');
    updatePinCounter();
    if (adminAuthenticated && !document.getElementById('change-pw-section')) {
        const sec = document.createElement('div');
        sec.id = 'change-pw-section';
        sec.style.cssText = 'grid-column:1/-1;border-top:1px solid var(--border);padding-top:1.5rem;margin-top:1rem';
        sec.innerHTML = `<h4 style="font-family:var(--font-mono);font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">🔐 Change Admin Password</h4>
            <div style="display:flex;gap:0.5rem;align-items:center">
                <input type="password" id="new-pw-input" placeholder="New password (min 6 chars)" style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:0.6rem 0.9rem;color:var(--text-primary);font-size:0.88rem;outline:none">
                <button onclick="changeAdminPassword()" class="btn btn-outline btn-sm">Save</button>
            </div>`;
        container.parentElement.appendChild(sec);
    }
}

function updatePinCounter() {
    const c = document.getElementById('pin-counter');
    if (c) c.textContent = `${pinnedProjects.length} / ${MAX_PINNED} pinned`;
}

function togglePin(id) {
    const idx = pinnedProjects.indexOf(id);
    if (idx > -1) {
        pinnedProjects.splice(idx, 1);
    } else {
        if (pinnedProjects.length >= MAX_PINNED) {
            showToast(`⚠️ Maximum ${MAX_PINNED} deployments can be pinned!`, 'warning');
            return;
        }
        pinnedProjects.push(id);
        showToast(`⭐ "${ALL_PROJECTS.find(p => p.id === id)?.title}" pinned!`, 'success');
    }
    savePinnedProjects(pinnedProjects);
    renderModalGrid();
    renderPinnedGrid();
}

// ============================================================
// MODAL OPEN/CLOSE
// ============================================================
function openDeploymentsModal() {
    const old = document.getElementById('change-pw-section');
    if (old) old.remove();
    renderModalGrid();
    document.getElementById('modal-overlay').classList.add('open');
    document.body.classList.add('modal-open');
}

function closeDeploymentsModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.classList.remove('modal-open');
    renderPinnedGrid();
}

function openAddProject() {
    document.getElementById('add-project-overlay').classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('ap-title')?.focus(), 300);
}

function closeAddProject() {
    document.getElementById('add-project-overlay').classList.remove('open');
    document.body.classList.remove('modal-open');
}

function submitNewProject() {
    const title = document.getElementById('ap-title')?.value.trim();
    const category = document.getElementById('ap-category')?.value.trim();
    const description = document.getElementById('ap-description')?.value.trim();
    if (!title || !category || !description) { showToast('⚠️ Title, Category & Description are required!', 'warning'); return; }
    const rawTags = document.getElementById('ap-tags')?.value || '';
    const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : ['Project'];
    const youtubeUrl = document.getElementById('ap-youtube')?.value.trim() || '';
    const github = document.getElementById('ap-github')?.value.trim() || 'https://github.com/somidud';
    const live = document.getElementById('ap-live')?.value.trim() || '#';
    const shouldPin = document.getElementById('ap-pin')?.checked;
    const newId = Date.now();
    const orient = document.getElementById('ap-orient')?.value || 'auto';
    const proj = { id: newId, title, category, description, tags, youtubeUrl, orient, github, live, userAdded: true };
    ALL_PROJECTS.push(proj);
    saveUserProjects(); persistProjectsToCV();
    if (shouldPin && pinnedProjects.length < MAX_PINNED) { pinnedProjects.push(newId); savePinnedProjects(pinnedProjects); }
    closeAddProject();
    renderPinnedGrid();
    showToast(`🚀 "${title}" deployed successfully!`, 'success');
}

function deleteProject(id) {
    if (!adminAuthenticated) return;
    const proj = ALL_PROJECTS.find(p => p.id === id);
    if (!proj || !confirm(`Delete "${proj.title}"?`)) return;
    ALL_PROJECTS.splice(ALL_PROJECTS.findIndex(p => p.id === id), 1);
    pinnedProjects = pinnedProjects.filter(pid => pid !== id);
    savePinnedProjects(pinnedProjects);
    saveUserProjects(); persistProjectsToCV();
    renderPinnedGrid();
    renderModalGrid();
    showToast(`🗑️ "${proj.title}" removed`, 'warning');
}

// ============================================================
// EDIT PROJECT
// ============================================================
function openEditProject(id) {
    if (!adminAuthenticated) return;
    const p = ALL_PROJECTS.find(proj => proj.id === id);
    if (!p) return;
    document.getElementById('ep-id').value = id;
    document.getElementById('ep-title').value = p.title || '';
    document.getElementById('ep-category').value = p.category || '';
    document.getElementById('ep-description').value = p.description || '';
    document.getElementById('ep-tags').value = (p.tags || []).join(', ');
    document.getElementById('ep-youtube').value = p.youtubeUrl || '';
    const eo = document.getElementById('ep-orient'); if (eo) eo.value = p.orient || 'auto';
    document.getElementById('ep-github').value = p.github || '';
    document.getElementById('ep-live').value = p.live || '';
    const overlay = document.getElementById('edit-project-overlay');
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('ep-title')?.focus(), 300);
}

function closeEditProject() {
    document.getElementById('edit-project-overlay')?.classList.remove('open');
    document.body.classList.remove('modal-open');
}

function saveEditProject() {
    const id = parseInt(document.getElementById('ep-id')?.value);
    const title = document.getElementById('ep-title')?.value.trim();
    const category = document.getElementById('ep-category')?.value.trim();
    const description = document.getElementById('ep-description')?.value.trim();
    if (!title || !category || !description) {
        showToast('⚠️ Title, Category & Description are required!', 'warning'); return;
    }
    const rawTags = document.getElementById('ep-tags')?.value || '';
    const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : ['Project'];
    const youtubeUrl = document.getElementById('ep-youtube')?.value.trim() || '';
    const github = document.getElementById('ep-github')?.value.trim() || 'https://github.com/somidud';
    const live = document.getElementById('ep-live')?.value.trim() || '#';
    const idx = ALL_PROJECTS.findIndex(p => p.id === id);
    if (idx === -1) { showToast('⚠️ Project not found!', 'warning'); return; }
    const wasUserAdded = ALL_PROJECTS[idx].userAdded;
    const orient = document.getElementById('ep-orient')?.value || 'auto';
    ALL_PROJECTS[idx] = { id, title, category, description, tags, youtubeUrl, orient, github, live, userAdded: wasUserAdded };
    if (wasUserAdded) saveUserProjects();
    persistProjectsToCV();
    closeEditProject();
    renderPinnedGrid();
    const modalOpen = document.getElementById('modal-overlay')?.classList.contains('open');
    if (modalOpen) renderModalGrid();
    showToast(`✅ "${title}" updated successfully!`, 'success');
}

// ============================================================
// ADMIN SECURITY
// ============================================================
const DEFAULT_ADMIN_PASS = 'Somidu@2026';

async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function initAdminSecurity() {
    if (!localStorage.getItem('adminPwHash')) {
        localStorage.setItem('adminPwHash', await sha256(DEFAULT_ADMIN_PASS));
    }
}

let secretClickCount = 0, secretClickTimer = null;
function handleSecretTrigger() {
    secretClickCount++;
    const dot = document.getElementById('nav-logo-dot');
    dot?.classList.add('triggered');
    setTimeout(() => dot?.classList.remove('triggered'), 300);
    clearTimeout(secretClickTimer);
    secretClickTimer = setTimeout(() => { secretClickCount = 0; }, 4000);
    if (secretClickCount >= 7) { secretClickCount = 0; openAdminLogin(); }
}

function setAdminMode(active) {
    adminAuthenticated = active;
    sessionStorage.setItem('adminAuthenticated', active ? 'true' : 'false');
    document.body.classList.toggle('admin-mode', active);
    document.getElementById('admin-badge')?.classList.toggle('visible', active);
    document.getElementById('admin-logout-btn')?.classList.toggle('visible', active);
}

function openAdminLogin() {
    document.getElementById('admin-login-overlay').classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('admin-password-input')?.focus(), 350);
    document.getElementById('admin-error-msg')?.classList.remove('show');
    const inp = document.getElementById('admin-password-input');
    if (inp) inp.value = '';
}

function closeAdminLogin() {
    document.getElementById('admin-login-overlay').classList.remove('open');
    document.body.classList.remove('modal-open');
}

function toggleAdminPwVisibility() {
    const inp = document.getElementById('admin-password-input');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function attemptAdminLogin() {
    const btn = document.getElementById('admin-login-btn');
    const inp = document.getElementById('admin-password-input');
    const err = document.getElementById('admin-error-msg');
    const pw = inp?.value; if (!pw) { inp?.focus(); return; }
    btn.textContent = '⏳ Verifying...'; btn.disabled = true;
    err?.classList.remove('show');
    try {
        if (await sha256(pw) === localStorage.getItem('adminPwHash')) {
            closeAdminLogin(); setAdminMode(true); spawnParticleBurst();
            showToast('🔐 Admin access granted! Welcome back, Somidu.', 'success');
            renderPinnedGrid();
        } else {
            err?.classList.add('show'); shakeElement(document.getElementById('admin-login-box'));
            if (inp) inp.value = ''; inp?.focus();
        }
    } catch (e) { err && (err.textContent = '⚠️ Verification failed.'); err?.classList.add('show'); }
    btn.textContent = '🔑 Authenticate'; btn.disabled = false;
}

function adminLogout() { setAdminMode(false); renderPinnedGrid(); showToast('👋 Logged out from admin mode', 'warning'); }

async function changeAdminPassword() {
    const val = document.getElementById('new-pw-input')?.value?.trim();
    if (!val || val.length < 6) { showToast('⚠️ Password must be at least 6 characters', 'warning'); return; }
    localStorage.setItem('adminPwHash', await sha256(val));
    const inp = document.getElementById('new-pw-input'); if (inp) inp.value = '';
    showToast('✅ Password changed successfully!', 'success');
}

// ============================================================
// TERMINAL
// ============================================================
(function initTerminalShortcut() {
    window.addEventListener('keydown', e => {
        if (e.ctrlKey && (e.key === '`' || e.key === '~')) { e.preventDefault(); toggleTerminal(); }
        if (e.key === 'Escape' && terminalOpen) closeTerminal();
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); openAdminLogin(); }
    });
})();

function toggleTerminal() { terminalOpen ? closeTerminal() : openTerminal(); }
function openTerminal() { terminalOpen = true; document.getElementById('terminal-panel').classList.add('open'); document.body.classList.add('terminal-open'); setTimeout(() => document.getElementById('term-input')?.focus(), 350); }
function closeTerminal() { terminalOpen = false; document.getElementById('terminal-panel').classList.remove('open'); document.body.classList.remove('terminal-open'); stopSnakeGame(); }

function termPrint(html, cls = 'term-output-color') {
    const out = document.getElementById('term-output');
    if (!out) return;
    const el = document.createElement('div'); el.className = `term-line`; el.innerHTML = `<span class="${cls}">${html}</span>`;
    out.appendChild(el); out.scrollTop = out.scrollHeight;
}

function termClear() {
    const out = document.getElementById('term-output'); if (out) out.innerHTML = '';
    stopSnakeGame();
}

const TERMINAL_COMMANDS = {
    help: () => {
        termPrint('╔═══════════════════════════════════╗', 'term-prompt-color');
        termPrint('║   Available Commands              ║', 'term-prompt-color');
        termPrint('╚═══════════════════════════════════╝', 'term-prompt-color');
        [['about', 'Display bio & info'], ['skills', 'List technical competencies'], ['projects', 'Show pinned deployments'], ['experience', 'Work history'], ['contact', 'Display contact info'], ['cv', 'Open the CV generator'], ['kavi', 'Say hi to my AI guide'], ['joke', 'Developer joke 😄'], ['coffee', '☕ fuel up'], ['matrix', 'Enter the matrix'], ['party', '🎉 confetti time'], ['whoami', 'Who are you?'], ['play', 'Launch Snake mini-game 🎮'], ['clear', 'Clear terminal'], ['help', 'Show this menu']].forEach(([cmd, desc]) => termPrint(`  <span class="term-prompt-color">${cmd.padEnd(11)}</span>— ${desc}`));
    },
    about: () => {
        const p = MASTER_CV_DATA.personal || {};
        termPrint(''); termPrint(`┌─ <span style="color:#fff">${esc(p.fullName || p.name)}</span> ────┐`, 'term-info-color');
        termPrint(`│  ${esc(p.headline || '')}`, 'term-info-color');
        termPrint(`│  📍 ${esc(p.location || '')}`, 'term-info-color');
        termPrint(`│  🎓 NSBM Green University — BSc (Hons) Computer Science`, 'term-info-color');
        termPrint(`│  💼 Open for internships & freelance`, 'term-info-color');
        termPrint(`└────────────────────────────────────────────┘`, 'term-info-color'); termPrint('');
    },
    experience: () => {
        termPrint(''); (MASTER_CV_DATA.experience || []).forEach(e => termPrint(`  💼 <span style="color:#fff">${esc(e.role)}</span> @ ${esc(e.organization)} <span class="term-info-color">(${esc(e.period)})</span>`)); termPrint('');
    },
    cv: () => { termPrint('📄 Opening CV generator...', 'term-success-color'); closeTerminal(); openCvModal(); },
    kavi: () => { termPrint("👋 MMM: \"Hey! Close this terminal and click me - I know everything about Somidu.\"", 'term-success-color'); if (typeof showSpeechBubble === 'function') { closeTerminal(); showSpeechBubble('You called? 😎', 4000); } },
    joke: () => {
        const jokes = ['Why do programmers prefer dark mode? Because light attracts bugs. 🐛', 'There are 10 types of people: those who understand binary and those who don\'t.', 'A SQL query walks into a bar, walks up to two tables and asks: "Can I join you?"', '!false — it\'s funny because it\'s true.', 'I would tell you a UDP joke, but you might not get it.', 'My code works. I have no idea why. My code doesn\'t work. I have no idea why.'];
        termPrint('😄 ' + jokes[Math.floor(Math.random() * jokes.length)], 'term-success-color');
    },
    coffee: () => { ['    ( (', '     ) )', '  .______.', '  |      |]', '  \\      /', '   `----\'', ''].forEach(l => termPrint(l.replace(/ /g, '&nbsp;'), 'term-info-color')); termPrint('☕ Caffeine level restored to 100%.', 'term-success-color'); },
    whoami: () => termPrint('visitor — a very welcome one. 🌟 Try "sudo hire somidu".', 'term-success-color'),
    sudo: (args) => termPrint(args && args.join(' ') === 'hire somidu' ? '✅ Permission granted! Email somidudilan2001@gmail.com to proceed. 🚀' : '🔒 Nice try. You are not in the sudoers file. This incident will be reported (to a rubber duck 🦆).', 'term-success-color'),
    party: () => { termPrint('🎉 PARTY MODE!', 'term-success-color'); confettiBlast(); },
    matrix: () => {
        document.body.classList.toggle('matrix-mode');
        termPrint(document.body.classList.contains('matrix-mode') ? '🟩 Wake up, Neo... (type "matrix" again to exit)' : '🔵 Back to reality.', 'term-success-color');
    },
    contact: () => {
        const p = MASTER_CV_DATA.personal || {};
        termPrint(''); termPrint(`📧 ${esc(p.email)}`, 'term-success-color');
        termPrint(`📱 ${esc(p.phone)}`, 'term-success-color');
        termPrint(`🌐 ${esc(p.portfolio)}`, 'term-success-color');
        termPrint(`🔗 ${esc(p.linkedin)}`, 'term-success-color');
        termPrint(`🐙 ${esc(p.github)}`, 'term-success-color'); termPrint(`📍 ${esc(p.location)}`, 'term-success-color'); termPrint('');
    },
    skills: () => {
        termPrint(''); Object.entries(MASTER_CV_DATA.skills || {}).forEach(([cat, skills]) => { termPrint(`  📁 <span style="color:#fff">${esc(cat)}</span>: <span class="term-output-color">${skills.map(esc).join('  •  ')}</span>`); }); termPrint('');
    },
    projects: () => {
        termPrint(''); termPrint('🚀 Pinned Deployments:', 'term-success-color');
        ALL_PROJECTS.filter(p => pinnedProjects.includes(p.id)).forEach((p, i) => termPrint(`  [${i + 1}] <span style="color:#fff">${p.title}</span> — ${p.category}`)); termPrint('');
    },
    clear: () => termClear(),
    play: () => { termClear(); termPrint('🎮 <span style="color:#fff">SNAKE</span> — Arrow keys to play. Press <span class="term-info-color">Q</span> to quit.', ''); startSnakeGame(); }
};

function executeCommand(cmd) {
    const parts = cmd.trim().toLowerCase().split(' '); const main = parts[0];
    termPrint(`<span class="term-prompt-color">somidu@portfolio:~$</span> <span style="color:#fff">${cmd}</span>`, '');
    if (!cmd.trim()) return;
    if (TERMINAL_COMMANDS[main]) { TERMINAL_COMMANDS[main](parts.slice(1)); }
    else { termPrint(`Command not found: <span style="color:#ff2d78">${main}</span>. Type <span class="term-prompt-color">help</span>.`, 'term-error-color'); }
}

document.addEventListener('DOMContentLoaded', () => {
    const termInput = document.getElementById('term-input');
    const termHistory = []; let termHistoryIdx = -1;
    if (termInput) {
        termInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const cmd = this.value; termHistory.unshift(cmd); termHistoryIdx = -1; this.value = ''; executeCommand(cmd);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault(); if (termHistoryIdx < termHistory.length - 1) this.value = termHistory[++termHistoryIdx] || '';
            } else if (e.key === 'ArrowDown') {
                e.preventDefault(); if (termHistoryIdx > 0) this.value = termHistory[--termHistoryIdx] || ''; else { termHistoryIdx = -1; this.value = ''; }
            } else if ((e.key === 'q' || e.key === 'Q') && snakeRunning) { e.preventDefault(); stopSnakeGame(); termPrint('Game exited.'); }
        });
    }
});

// ============================================================
// SNAKE GAME
// ============================================================
function startSnakeGame() {
    const out = document.getElementById('term-output');
    const container = document.createElement('div');
    container.id = 'snake-container';
    container.innerHTML = `<div id="snake-score" class="term-line">Score: 0</div><canvas id="snake-canvas" width="${COLS * CELL}" height="${ROWS * CELL}" aria-label="Snake game canvas"></canvas>`;
    out.appendChild(container); out.scrollTop = out.scrollHeight;
    snake = [{ x: 12, y: 9 }, { x: 11, y: 9 }, { x: 10, y: 9 }]; dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 }; score = 0;
    snakeRunning = true; placeFood(); snakeLoop();
}

function placeFood() {
    do { food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
    while (snake.some(s => s.x === food.x && s.y === food.y));
}

function snakeLoop() {
    if (!snakeRunning) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(s => s.x === head.x && s.y === head.y)) { gameOver(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 10; const sc = document.getElementById('snake-score'); if (sc) sc.textContent = `Score: ${score}`; placeFood();
    } else { snake.pop(); }
    drawSnake(); snakeTimer = setTimeout(snakeLoop, 120);
}

function drawSnake() {
    const canvas = document.getElementById('snake-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,245,255,0.05)'; ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(canvas.width, y * CELL); ctx.stroke(); }
    const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
    const grad = ctx.createRadialGradient(fx, fy, 1, fx, fy, CELL / 2); grad.addColorStop(0, '#ff2d78'); grad.addColorStop(1, 'rgba(255,45,120,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(fx, fy, CELL / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff2d78'; ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
    snake.forEach((seg, i) => {
        const a = 0.5 + (0.5 * (snake.length - i) / snake.length);
        ctx.fillStyle = i === 0 ? `rgba(0,255,180,${a})` : `rgba(0,245,255,${a * 0.8})`;
        ctx.beginPath(); ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 5 : 4); ctx.fill();
    });
}

function gameOver() {
    snakeRunning = false; clearTimeout(snakeTimer);
    const canvas = document.getElementById('snake-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,7,0.8)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff2d78'; ctx.font = 'bold 18px Fira Code,monospace'; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillStyle = '#00f5ff'; ctx.font = '13px Fira Code,monospace'; ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 12);
    ctx.fillStyle = '#7878a8'; ctx.font = '11px Fira Code,monospace'; ctx.fillText('Type "play" to restart', canvas.width / 2, canvas.height / 2 + 36);
}

function stopSnakeGame() {
    snakeRunning = false; clearTimeout(snakeTimer);
    document.getElementById('snake-container')?.remove();
}

window.addEventListener('keydown', e => {
    if (!snakeRunning) return;
    const keys = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
    if (keys[e.key]) { e.preventDefault(); const nd = keys[e.key]; if (nd.x !== -dir.x || nd.y !== -dir.y) nextDir = nd; }
});

// ============================================================
// CONTACT FORM
// ============================================================
(function initContactForm() {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('portfolio-form');
        const overlay = document.getElementById('success-overlay');
        const submitBtn = document.getElementById('submit-btn');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const original = submitBtn.innerHTML;
            submitBtn.innerHTML = '⏳ Sending...'; submitBtn.disabled = true;
            fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
                .then(r => { if (r.ok) { overlay.classList.add('show'); form.reset(); } else { alert('There was an issue. Please try again!'); } })
                .catch(() => alert('Network error. Please check your connection.'))
                .finally(() => { submitBtn.innerHTML = original; submitBtn.disabled = false; });
        });
    });
})();

function resetForm() { document.getElementById('success-overlay')?.classList.remove('show'); }

// ============================================================
// TOASTS & UTILS
// ============================================================
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`; toast.innerHTML = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3200);
}

function shakeElement(el) {
    if (!el) return;
    el.style.animation = 'none'; el.offsetHeight; el.style.animation = 'shake 0.5s ease';
    el.addEventListener('animationend', () => el.style.animation = '', { once: true });
}

function spawnParticleBurst() {
    const burst = document.createElement('div'); burst.className = 'particle-burst';
    burst.style.cssText = 'left:50%;top:50%;position:fixed;z-index:99998;pointer-events:none';
    const colors = ['#00f5ff', '#7b2fff', '#ff2d78', '#00ff88', '#ffaa00'];
    for (let i = 0; i < 32; i++) {
        const p = document.createElement('div'); const angle = (i / 32) * Math.PI * 2; const dist = 80 + Math.random() * 120;
        p.className = 'burst-particle'; p.style.cssText = `background:${colors[i % colors.length]};--tx:${Math.cos(angle) * dist}px;--ty:${Math.sin(angle) * dist}px;left:0;top:0;animation-delay:${Math.random() * 0.2}s`;
        burst.appendChild(p);
    }
    document.body.appendChild(burst); setTimeout(() => burst.remove(), 1200);
}

// ============================================================
// NAV SCROLL SPY
// ============================================================
window.addEventListener('scroll', () => {
    const nav = document.getElementById('nav');
    if (window.scrollY > 30) nav?.classList.add('scrolled');
    else nav?.classList.remove('scrolled');
    const sections = ['hero', 'about', 'experience', 'skills', 'deployments', 'contact'];
    let current = '';
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });
    document.querySelectorAll('.nav-link').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
}, { passive: true });

// ============================================================
// MOBILE NAV
// ============================================================
function initMobileNav() {
    const btn = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-nav');
    btn?.addEventListener('click', () => { btn.classList.toggle('open'); drawer?.classList.toggle('open'); });
    drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { btn?.classList.remove('open'); drawer?.classList.remove('open'); }));
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initReveal() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ============================================================
// MAIN INIT
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
    // Admin
    await initAdminSecurity();
    if (adminAuthenticated) setAdminMode(true);

    // Secret trigger on logo dot
    document.getElementById('nav-logo-dot')?.addEventListener('click', handleSecretTrigger);

    // Admin keyboard shortcut
    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); openAdminLogin(); }
    });

    // Admin modal overlay close on backdrop
    document.getElementById('admin-login-overlay')?.addEventListener('click', function (e) { if (e.target === this) closeAdminLogin(); });
    document.getElementById('modal-overlay')?.addEventListener('click', function (e) { if (e.target === this) closeDeploymentsModal(); });
    document.getElementById('add-project-overlay')?.addEventListener('click', function (e) { if (e.target === this) closeAddProject(); });
    document.getElementById('edit-project-overlay')?.addEventListener('click', function (e) { if (e.target === this) closeEditProject(); });
    document.getElementById('cv-modal-overlay')?.addEventListener('click', function (e) { if (e.target === this) closeCvModal(); });

    // Escape key closes any open modal
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.getElementById('edit-project-overlay')?.classList.contains('open')) closeEditProject();
            else if (document.getElementById('add-project-overlay')?.classList.contains('open')) closeAddProject();
            else if (document.getElementById('cv-modal-overlay')?.classList.contains('open')) closeCvModal();
            else if (document.getElementById('modal-overlay')?.classList.contains('open')) closeDeploymentsModal();
            else if (document.getElementById('admin-login-overlay')?.classList.contains('open')) closeAdminLogin();
            else if (chatOpen) toggleChat();
        }
    });

    // Admin password input Enter key
    document.getElementById('admin-password-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); attemptAdminLogin(); }
        if (e.key === 'Escape') closeAdminLogin();
    });

    // Chat input Enter key
    document.getElementById('chat-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
    document.getElementById('chat-input')?.addEventListener('input', function () {
        this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // CV role input Enter key
    document.getElementById('cv-role-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); generateCV(); }
    });

    // Character widget keyboard activation
    document.getElementById('chat-char-widget')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChat(); }
    });

    // Speech bubble — show welcome after 2s, then rotate every 30s
    setTimeout(() => showSpeechBubble('Hey! I\'m MMM 👋 Ask me anything!', 5000), 2000);
    const bubbleMessages = [
        'Ask me about Somidu\'s projects! 🚀',
        'Psst… try the Konami code 🎮',
        'Need his contact info? 📧',
        'Want to know his tech stack? ⚡',
        'Ask me for a dev joke! 😄',
        'Need a tailored CV? I can help! 📄',
    ];
    let bubbleIdx = 0;
    setInterval(() => {
        if (!chatOpen) {
            bubbleIdx = (bubbleIdx + 1) % bubbleMessages.length;
            showSpeechBubble(bubbleMessages[bubbleIdx], 4500);
        }
    }, 30000);

    // Master data & canvas & typewriter
    await initMasterData();
    initParticleCanvas();
    initTypewriter();
    initMobileNav();
    initReveal();
    if (typeof initFunStuff === 'function') initFunStuff();

    // Inject extra keyframe CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-6px)} 30%{transform:translateX(6px)} 45%{transform:translateX(-4px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} 90%{transform:translateX(2px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        canvas#snake-canvas { border-radius:5px; }
    `;
    document.head.appendChild(style);
});

// Expose for console debugging
window.generateAdminHash = sha256;
