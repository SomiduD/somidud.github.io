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

// Skills matrix with icons — matches the original deployed site
const SKILLS_DATA = {
    'Mobile & Cross-Platform': [
        { icon: '🐦', name: 'Flutter' }, { icon: '🎯', name: 'Dart' },
        { icon: '🔥', name: 'Firebase' }, { icon: '🗺️', name: 'Google Maps API' },
    ],
    'Web & Backend': [
        { icon: '🌐', name: 'HTML/CSS' }, { icon: '⚡', name: 'JavaScript' },
        { icon: '🐘', name: 'PHP' }, { icon: '🗄️', name: 'SQL Server' },
        { icon: '🐬', name: 'MySQL' }, { icon: '⚛️', name: 'React' },
        { icon: '☕', name: 'Java' }, { icon: '🔗', name: 'REST APIs' },
    ],
    'Embedded Systems & IoT': [
        { icon: '🤖', name: 'Arduino' }, { icon: '📡', name: 'ESP32/ESP8266' },
        { icon: '🍓', name: 'Raspberry Pi' }, { icon: '⚙️', name: 'C/C++' },
        { icon: '🐍', name: 'Python' }, { icon: '📶', name: 'MQTT' },
    ],
    'Dev Tools & Design': [
        { icon: '🐙', name: 'Git & GitHub' }, { icon: '🎨', name: 'UI/UX Design' },
        { icon: '🗃️', name: 'SSMS' }, { icon: '🔀', name: 'DB Triggers' },
        { icon: '📊', name: 'Data Migration' }, { icon: '🐳', name: 'Docker' },
        { icon: '📉', name: 'R' },
    ]
};

// Default project catalog (shown when master_cv_data.json is unavailable)
const DEFAULT_PROJECTS = [
    { id: 1, title: 'Greenify', category: 'Sustainability • Mobile App', description: 'An eco-focused tracking Mobile Application built to monitor environmental impact metrics, encouraging sustainable lifestyle choices through localized data insight analytics.', tags: ['Flutter', 'Firebase', 'Dart', 'Charts'], youtubeUrl: '', github: 'https://github.com/somidud', live: '#' },
    { id: 2, title: 'PlannGo', category: 'Architecture Orchestration • Mobile', description: 'A full-scale native tourism orchestration Mobile Application featuring asynchronous real-time data streaming, client authentication states, and interactive route mapping.', tags: ['Flutter', 'Firebase', 'Maps API', 'Dart'], youtubeUrl: '', github: 'https://github.com/somidud', live: '#' },
    { id: 3, title: 'UtilityOne', category: 'Relational Engines • Mobile App', description: 'A centralized utility operational platform running custom server database triggers, strict relation mapping, and isolated application access roles.', tags: ['PHP', 'SQL Server', 'HTML/CSS', 'SSMS'], youtubeUrl: '', github: 'https://github.com/somidud', live: '#' },
    { id: 4, title: 'Research Shuffle', category: 'Data Processing • Web Engine', description: 'A collaborative research management pipeline designed to sort, categorize, and cross-reference academic documentation datasets with advanced indexing.', tags: ['PHP', 'React', 'Docker', 'R'], youtubeUrl: '', github: 'https://github.com/somidud', live: '#' },
    { id: 5, title: 'IoT Fire Fighting Robot', category: 'Embedded Firmware • Robotics', description: 'An automated emergency response node integrating active thermal sensor matrices, real-time telemetry, and physical flame-retardant actuation loops.', tags: ['Arduino', 'C++', 'ESP32', 'Sensors'], youtubeUrl: '', github: 'https://github.com/somidud', live: '#' },
    { id: 6, title: 'Smart Home Hub', category: 'IoT Architecture • Embedded', description: 'A centralized IoT control system with real-time sensor data streaming and automated device management through a responsive web dashboard with MQTT protocol.', tags: ['Raspberry Pi', 'Python', 'MQTT', 'Node.js'], youtubeUrl: '', github: 'https://github.com/somidud', live: '#' },
];

// ============================================================
// MASTER DATA INIT
// ============================================================
async function initMasterData() {
    try {
        const res = await fetch('master_cv_data.json');
        if (!res.ok) throw new Error('JSON not found');
        MASTER_CV_DATA = await res.json();
        ALL_PROJECTS = MASTER_CV_DATA.projects.map(p => ({
            id: p.id, title: p.name, category: p.category,
            description: p.description, tags: p.technologies,
            youtubeUrl: '', github: 'https://github.com/somidud', live: '#'
        }));
        // Pad with default projects if fewer than 6
        DEFAULT_PROJECTS.forEach(dp => {
            if (!ALL_PROJECTS.find(p => p.id === dp.id)) ALL_PROJECTS.push(dp);
        });
    } catch (e) {
        console.warn('master_cv_data.json unavailable — using defaults');
        ALL_PROJECTS = [...DEFAULT_PROJECTS];
        MASTER_CV_DATA = buildFallbackCVData();
    }
    loadUserProjects();
    pinnedProjects = loadPinnedProjects();
    renderPinnedGrid();
    renderTimeline();
    renderSkillsGrid();
}

function buildFallbackCVData() {
    return {
        personal: { name: 'Somidu Dilankara', headline: 'Full-Stack Software Engineer, IoT Architect, and Computer Science Scholar', email: 'somidudilan2001@gmail.com', location: 'Gampaha, Sri Lanka', linkedin: 'linkedin.com/in/somidu-dilankara-aaa819242', github: 'github.com/somidud', facebook: 'facebook.com/share/1LGZ6LKfCR/' },
        education: [
            { institution: 'NSBM Green University / Plymouth University', degree: 'BSc (Hons) Computer Science / Software Engineering', period: '2022 – Present', details: 'Advanced algorithms, OOP, software engineering principles, and distributed architectures.' },
            { institution: 'University of Moratuwa', degree: 'Trainee Full-Stack Web Developer', period: '2023', details: 'Production-grade backend patterns, client/server rendering, and database integration.' },
            { institution: 'University of Colombo', degree: 'Advanced Certificate – Immunology & Molecular Biology', period: '2022', details: 'Computational bio-informatics, genetic data analysis, scientific research methodologies.' },
            { institution: 'Google Digital Garage', degree: 'Certified Digital Marketer', period: '2021', details: 'Data-driven analytics, search optimization, and modern conversion frameworks.' },
            { institution: 'NIBM', degree: 'Advanced Certificate in English / Computing Foundations', period: '2021', details: 'Technical writing, presentations, and core computer science fundamentals.' },
            { institution: 'ESOFT Metro Campus', degree: 'Diploma in IT AND Diploma in English', period: '2020', details: 'Networking essentials, hardware concepts, professional communications.' },
            { institution: 'Bandaranayake College, Gampaha', degree: 'Secondary Studies', period: '– 2019', details: 'Science and mathematics streams.' },
            { institution: 'Anura Junior Model School, Yakkala', degree: 'Primary Education', period: '– 2012', details: 'Foundational primary curriculum.' },
        ],
        skills: { software_web: ['Flutter', 'Dart', 'React', 'PHP', 'Java', 'Python'], database_infrastructure: ['Firebase Core', 'SQL Server / SSMS', 'Docker', 'Database Triggers', 'Data Migration & Partitioning'], hardware_iot: ['ESP32', 'Arduino', 'Raspberry Pi', '3-Pin Sensors', 'IoT Architecture'], tools_design: ['Git/GitHub Pro', 'Figma UI/UX Layout Design', 'R'] },
        projects: DEFAULT_PROJECTS.map(p => ({ id: p.id, name: p.title, category: p.category, description: p.description, technologies: p.tags })),
        summary: 'Computer Science undergraduate at NSBM Green University with 3+ years of hands-on development experience. Specializing in crafting elegant, scalable digital architectures across mobile, web, and embedded hardware domains.'
    };
}

// ============================================================
// PINNING STATE
// ============================================================
function loadPinnedProjects() {
    try {
        const saved = localStorage.getItem('pinnedProjects');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) { }
    return ALL_PROJECTS.slice(0, 6).map(p => p.id);
}

function savePinnedProjects(arr) { localStorage.setItem('pinnedProjects', JSON.stringify(arr)); }
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
    const titles = ['Full-Stack Software Engineer', 'IoT Architect', 'Computer Science Scholar', 'Flutter & Mobile Developer', 'Java Backend Developer', 'React Developer'];
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
    container.innerHTML = Object.entries(SKILLS_DATA).map(([cat, skills]) => `
        <div class="reveal">
            <div class="stack-cat-title">${cat}</div>
            <div class="stack-grid">
                ${skills.map(s => `
                    <div class="stack-item">
                        <span class="stack-icon">${s.icon}</span>
                        <span>${s.name}</span>
                    </div>`).join('')}
            </div>
        </div>`).join('');
    initReveal();
}

// ============================================================
// PROJECT CARDS
// ============================================================
function buildProjectCard(p) {
    const isPinned = pinnedProjects.includes(p.id);
    const tags = p.tags.map(t => `<span class="tag">${t}</span>`).join('');
    const isValidYT = p.youtubeUrl && p.youtubeUrl.startsWith('https://');
    const media = isValidYT
        ? `<iframe src="${p.youtubeUrl}" allow="accelerometer;autoplay;encrypted-media;gyroscope" allowfullscreen title="${p.title} demo"></iframe>`
        : `<div class="video-placeholder">
            <div class="yt-play-icon">▶</div>
            <p style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono)">Preview unavailable</p>
           </div>`;
    const editBtn = adminAuthenticated
        ? `<button class="proj-edit-btn" onclick="openEditProject(${p.id})" title="Edit project">✏️</button>` : '';
    const deleteBtn = adminAuthenticated
        ? `<button class="proj-delete-btn" onclick="deleteProject(${p.id})" title="Delete">🗑</button>` : '';
    const pinBtn = adminAuthenticated
        ? `<button id="card-pin-${p.id}" class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="togglePin(${p.id})">${isPinned ? '⭐ Pinned' : '☆ Pin'}</button>` : '';
    return `
        <div class="project-card" id="pcard-${p.id}">
            <div class="card-media">${media}</div>
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
            showToast('⚠️ Maximum 6 deployments can be pinned!', 'warning');
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
    const proj = { id: newId, title, category, description, tags, youtubeUrl, github, live, userAdded: true };
    ALL_PROJECTS.push(proj);
    saveUserProjects();
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
    saveUserProjects();
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
    ALL_PROJECTS[idx] = { id, title, category, description, tags, youtubeUrl, github, live, userAdded: wasUserAdded };
    if (wasUserAdded) saveUserProjects();
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
// CHATBOT "CHARACTER" / HERMIONE
// ============================================================
function toggleChat() {
    chatOpen = !chatOpen;
    document.getElementById('chat-panel')?.classList.toggle('open', chatOpen);
    // Animate the character widget
    document.getElementById('chat-char-widget')?.classList.toggle('chat-open', chatOpen);
    if (chatOpen) {
        hideSpeechBubble();
        setTimeout(() => document.getElementById('chat-input')?.focus(), 300);
    }
}

function showSpeechBubble(text, duration = 4000) {
    if (chatOpen) return; // Don't show bubble when chat is already open
    const bubble = document.getElementById('char-speech-bubble');
    const bubbleText = document.getElementById('char-bubble-text');
    if (!bubble) return;
    if (bubbleText) bubbleText.textContent = text;
    bubble.classList.add('visible');
    clearTimeout(window._bubbleTimer);
    window._bubbleTimer = setTimeout(() => bubble.classList.remove('visible'), duration);
}

function hideSpeechBubble() {
    clearTimeout(window._bubbleTimer);
    document.getElementById('char-speech-bubble')?.classList.remove('visible');
}

function speakAvatar(talking) {
    document.querySelector('.chat-avatar-container')?.classList.toggle('speaking', talking);
}

function addChatMessage(role, content) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerHTML = `<div class="msg-bubble">${content}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg assistant'; div.id = 'typing-indicator';
    div.innerHTML = `<div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
    container.appendChild(div); container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() { document.getElementById('typing-indicator')?.remove(); }

async function sendChatMessage() {
    const inp = document.getElementById('chat-input');
    const txt = inp?.value.trim(); if (!txt) return;
    if (inp) { inp.value = ''; inp.style.height = 'auto'; }
    addChatMessage('user', txt);
    chatHistory.push({ role: 'user', content: txt });
    showTypingIndicator(); speakAvatar(true);
    setTimeout(() => {
        removeTypingIndicator(); speakAvatar(false);
        const reply = getHermioneResponse(txt);
        addChatMessage('assistant', reply);
        chatHistory.push({ role: 'assistant', content: reply });
    }, 1200 + Math.random() * 600);
}

function getHermioneResponse(q) {
    const lower = q.toLowerCase();
    const p = MASTER_CV_DATA.personal || {};
    if (lower.match(/^(hi|hello|hey|greet)/)) return `Hello! 👋 I'm Hermione, <strong>Somidu Dilankara's</strong> personal AI assistant. I can tell you about his skills, education, projects, and availability. What would you like to know?`;
    if (lower.includes('skill') || lower.includes('tech') || lower.includes('program') || lower.includes('know')) {
        return `⚡ Somidu's core competencies include:<br>• <strong>Mobile:</strong> Flutter, Dart, Firebase<br>• <strong>Web/Backend:</strong> React, PHP, Java, JavaScript<br>• <strong>Database:</strong> SQL Server, MySQL, Docker<br>• <strong>IoT/Embedded:</strong> ESP32, Arduino, Raspberry Pi<br>• <strong>Design Tools:</strong> Figma, R, Git/GitHub`;
    }
    if (lower.includes('project') || lower.includes('deploy') || lower.includes('built') || lower.includes('work')) {
        return `🚀 Selected deployments:<br>${ALL_PROJECTS.slice(0, 5).map(p => `• <strong>${p.title}</strong> — ${p.category}`).join('<br>')}`;
    }
    if (lower.includes('education') || lower.includes('study') || lower.includes('university') || lower.includes('degree') || lower.includes('school')) {
        return `🎓 Academic highlights:<br>• <strong>NSBM Green University</strong> — BSc Computer Science (Ongoing)<br>• <strong>University of Moratuwa</strong> — Full-Stack Web Dev<br>• <strong>Google Digital Garage</strong> — Certified Digital Marketer<br>+ more certifications`;
    }
    if (lower.includes('contact') || lower.includes('email') || lower.includes('reach') || lower.includes('hire')) {
        return `📧 You can contact Somidu at:<br><strong>${p.email || 'somidudilan2001@gmail.com'}</strong><br>🔗 LinkedIn: ${p.linkedin || 'linkedin.com/in/somidu-dilankara-aaa819242'}<br>💼 He's open to internships, freelance &amp; full-time roles!`;
    }
    if (lower.includes('location') || lower.includes('where') || lower.includes('from') || lower.includes('country')) {
        return `📍 Somidu is based in <strong>Gampaha, Sri Lanka</strong>.`;
    }
    if (lower.includes('available') || lower.includes('intern') || lower.includes('job') || lower.includes('free')) {
        return `💼 Yes! Somidu is <strong>actively open</strong> to internships, freelance collaborations, and full-time roles in software development and engineering.`;
    }
    return `I don't have that specific information in my knowledge base. Please contact Somidu directly at <strong>${p.email || 'somidudilan2001@gmail.com'}</strong> for a detailed conversation!`;
}

// ============================================================
// AI CV GENERATOR
// ============================================================
function openCvModal() {
    const overlay = document.getElementById('cv-modal-overlay');
    overlay?.classList.add('open');
    document.body.classList.add('modal-open');
    const status = document.getElementById('cv-status');
    if (status) status.textContent = '';
    document.getElementById('cv-download-zone')?.style && (document.getElementById('cv-download-zone').style.display = 'none');
    document.getElementById('cv-progress-bar')?.style && (document.getElementById('cv-progress-bar').style.display = 'none');
    const btn = document.getElementById('cv-gen-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Generate &amp; Download PDF`; }
    generatedCVHTML = null;
    document.querySelectorAll('.cv-chip').forEach(c => c.classList.remove('selected'));
    const inp = document.getElementById('cv-role-input'); if (inp) inp.value = '';
    setTimeout(() => inp?.focus(), 350);
}

function closeCvModal() {
    document.getElementById('cv-modal-overlay')?.classList.remove('open');
    document.body.classList.remove('modal-open');
}

function selectChip(el, role) {
    document.querySelectorAll('.cv-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    const inp = document.getElementById('cv-role-input'); if (inp) inp.value = role;
}

async function generateCV() {
    const role = document.getElementById('cv-role-input')?.value.trim();
    if (!role) { showToast('⚠️ Please specify a target role first!', 'warning'); return; }
    currentCVRole = role;
    const btn = document.getElementById('cv-gen-btn');
    const progBar = document.getElementById('cv-progress-bar');
    const progFill = document.getElementById('cv-progress-fill');
    const status = document.getElementById('cv-status');
    btn.disabled = true; btn.textContent = '⏳ Generating...';
    progBar.style.display = 'block'; progFill.style.width = '0%';
    const steps = [
        [15, '🔍 Analyzing qualifications...'],
        [40, `🧠 Optimizing for "${role}"...`],
        [70, '📝 Re-ranking skills & projects...'],
        [90, '✨ Composing tailored layout...'],
        [100, '✅ Ready to download!']
    ];
    for (const [pct, msg] of steps) {
        await new Promise(r => setTimeout(r, 700));
        progFill.style.width = pct + '%';
        if (status) status.textContent = msg;
    }
    generatedCVHTML = buildCVTemplate(localOptimizeCV(MASTER_CV_DATA, role), role);
    document.getElementById('cv-download-zone').style.display = 'flex';
    const label = document.getElementById('cv-download-label');
    if (label) label.textContent = `Optimized for: ${role}`;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Regenerate`;
    btn.disabled = false;
    showToast(`🎉 CV generated for "${role}"!`, 'success');
}

function localOptimizeCV(data, role) {
    const r = role.toLowerCase();
    const optimized = JSON.parse(JSON.stringify(data));
    const keywords = {
        frontend: ['JavaScript', 'HTML5', 'CSS3', 'React', 'UI/UX'],
        mobile: ['Flutter', 'Dart', 'Firebase', 'Maps API'],
        iot: ['Arduino', 'ESP32', 'Raspberry Pi', 'C++', 'MQTT', 'Python'],
        java: ['Java', 'Spring', 'Backend'],
        docker: ['Docker', 'DevOps', 'Cloud'],
        fullstack: ['PHP', 'MySQL', 'JavaScript', 'Firebase'],
        data: ['MySQL', 'SQL Server', 'Python', 'R'],
    };
    let matchKey = 'fullstack';
    for (const k of Object.keys(keywords)) { if (r.includes(k)) { matchKey = k; break; } }
    const rel = keywords[matchKey];
    if (optimized.projects) {
        optimized.projects = [...optimized.projects].sort((a, b) => {
            const sA = (a.technologies || []).filter(t => rel.some(rt => t.toLowerCase().includes(rt.toLowerCase()))).length;
            const sB = (b.technologies || []).filter(t => rel.some(rt => t.toLowerCase().includes(rt.toLowerCase()))).length;
            return sB - sA;
        });
    }
    return optimized;
}

function buildCVTemplate(data, role) {
    const p = data.personal || MASTER_CV_DATA.personal || {};
    const edu = data.education || MASTER_CV_DATA.education || [];
    const projects = data.projects || MASTER_CV_DATA.projects || [];
    const skills = data.skills || MASTER_CV_DATA.skills || {};
    const allSkills = Object.values(skills).flat();
    return `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 48px;color:#111;background:#fff;line-height:1.55;">
        <div style="border-bottom:3px solid #00b4cc;padding-bottom:20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end">
            <div>
                <h1 style="margin:0;font-size:28px;font-weight:900;color:#0f0f1a;letter-spacing:-0.03em">${p.name || 'Somidu Dilankara'}</h1>
                <h3 style="margin:6px 0 0;font-weight:500;font-size:13px;color:#7b2fff">Optimized for: ${role}</h3>
            </div>
            <div style="text-align:right;font-size:11px;color:#555;line-height:1.7">
                <div>${p.email || ''}</div>
                <div>${p.location || ''}</div>
                <div>${p.linkedin || ''}</div>
                <div>${p.github || ''}</div>
            </div>
        </div>
        <div style="margin-bottom:20px">
            <h2 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#00b4cc;margin:0 0 8px">Profile Summary</h2>
            <p style="font-size:12.5px;color:#333;margin:0">${data.summary || MASTER_CV_DATA.summary || ''}</p>
        </div>
        <div style="margin-bottom:20px">
            <h2 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#00b4cc;margin:0 0 8px">Core Skills</h2>
            <div style="display:flex;flex-wrap:wrap;gap:5px">${allSkills.map(s => `<span style="font-size:11px;padding:3px 10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:50px;color:#0369a1">${s}</span>`).join('')}</div>
        </div>
        <div style="margin-bottom:20px">
            <h2 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#00b4cc;margin:0 0 10px">Key Projects</h2>
            ${projects.slice(0, 4).map(pr => `
            <div style="margin-bottom:14px;padding-left:12px;border-left:3px solid #7b2fff">
                <div style="font-size:13px;font-weight:700">${pr.name || pr.title} <span style="font-weight:400;color:#777;font-size:11px">— ${pr.category}</span></div>
                <div style="font-size:12px;color:#444;margin:3px 0">${pr.description}</div>
                <div style="font-size:11px;color:#888">${(pr.technologies || pr.tags || []).join(' • ')}</div>
            </div>`).join('')}
        </div>
        <div style="margin-bottom:20px">
            <h2 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#00b4cc;margin:0 0 10px">Education</h2>
            ${edu.slice(0, 5).map(e => `
            <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                    <div style="font-size:13px;font-weight:700">${e.institution}</div>
                    <div style="font-size:12px;color:#555">${e.degree}</div>
                </div>
                <div style="font-size:11px;color:#888;flex-shrink:0;margin-left:12px">${e.period}</div>
            </div>`).join('')}
        </div>
        <div style="border-top:1px solid #e0e0e0;padding-top:12px;font-size:10px;color:#aaa;text-align:center;margin-top:24px">
            Generated by AI CV Generator · ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })} · ${p.email || 'somidudilan2001@gmail.com'}
        </div>
    </div>`;
}

function downloadGeneratedCV() {
    if (!generatedCVHTML) { showToast('⚠️ Please generate the CV first!', 'warning'); return; }
    const btn = document.getElementById('cv-download-btn');
    if (btn) { btn.textContent = '⏳ Creating PDF...'; btn.disabled = true; }
    const container = document.createElement('div');
    container.innerHTML = generatedCVHTML;
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;background:#fff;z-index:-1';
    document.body.appendChild(container);
    const filename = `CV_SomiduDilankara_${currentCVRole.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    html2pdf().set({
        margin: [8, 8, 8, 8], filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] }
    }).from(container.firstChild).save()
        .then(() => {
            document.body.removeChild(container);
            if (btn) { btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Download PDF`; btn.disabled = false; }
            showToast('📄 CV downloaded successfully!', 'success');
        }).catch(err => {
            document.body.removeChild(container);
            if (btn) { btn.textContent = '⚠️ Error — Retry'; btn.disabled = false; }
            console.error(err);
        });
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
        [['about', 'Display bio & info'], ['skills', 'List technical competencies'], ['projects', 'Show pinned deployments'], ['contact', 'Display contact info'], ['play', 'Launch Snake mini-game 🎮'], ['clear', 'Clear terminal'], ['help', 'Show this menu']].forEach(([cmd, desc]) => termPrint(`  <span class="term-prompt-color">${cmd.padEnd(10)}</span>— ${desc}`));
    },
    about: () => {
        termPrint(''); termPrint(`┌─ <span style="color:#fff">Somidu Dilankara</span> ────────────────────┐`, 'term-info-color');
        termPrint(`│  Full-Stack Software Engineer & IoT Architect  │`, 'term-info-color');
        termPrint(`│  📍 Gampaha, Sri Lanka                         │`, 'term-info-color');
        termPrint(`│  🎓 NSBM Green University — BSc CS             │`, 'term-info-color');
        termPrint(`│  💼 Open for internships & freelance           │`, 'term-info-color');
        termPrint(`└─────────────────────────────────────────────────┘`, 'term-info-color'); termPrint('');
    },
    skills: () => {
        termPrint(''); Object.entries(SKILLS_DATA).forEach(([cat, skills]) => { termPrint(`  📁 <span style="color:#fff">${cat}</span>: <span class="term-output-color">${skills.map(s => s.name).join('  •  ')}</span>`); }); termPrint('');
    },
    projects: () => {
        termPrint(''); termPrint('🚀 Pinned Deployments:', 'term-success-color');
        ALL_PROJECTS.filter(p => pinnedProjects.includes(p.id)).forEach((p, i) => termPrint(`  [${i + 1}] <span style="color:#fff">${p.title}</span> — ${p.category}`)); termPrint('');
    },
    contact: () => {
        termPrint(''); termPrint('📧 somidudilan2001@gmail.com', 'term-success-color');
        termPrint('🔗 linkedin.com/in/somidu-dilankara-aaa819242', 'term-success-color');
        termPrint('🐙 github.com/somidud', 'term-success-color'); termPrint('📍 Gampaha, Sri Lanka', 'term-success-color'); termPrint('');
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
    const sections = ['hero', 'about', 'skills', 'deployments', 'contact'];
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

    // Speech bubble — show welcome after 2s, then rotate every 45s
    setTimeout(() => showSpeechBubble('Hi! I\'m your AI assistant \ud83d\udc4b', 5000), 2000);
    const bubbleMessages = [
        'Ask me about Somidu\'s projects! \ud83d\ude80',
        'Need his contact info? \ud83d\udce7',
        'Want to know his tech stack? \u26a1',
        'Curious about his education? \ud83c\udf93',
        'Click me to start chatting! \ud83d\udcac',
    ];
    let bubbleIdx = 0;
    setInterval(() => {
        if (!chatOpen) {
            bubbleIdx = (bubbleIdx + 1) % bubbleMessages.length;
            showSpeechBubble(bubbleMessages[bubbleIdx], 4500);
        }
    }, 45000);

    // Master data & canvas & typewriter
    await initMasterData();
    initParticleCanvas();
    initTypewriter();
    initMobileNav();
    initReveal();

    // Inject extra keyframe CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-6px)} 30%{transform:translateX(6px)} 45%{transform:translateX(-4px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} 90%{transform:translateX(2px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        canvas#snake-canvas { border-radius:5px; }
        .hermione-eyes { animation: hermioneBlink 4s infinite; }
        @keyframes hermioneBlink { 0%,90%,100%{transform:scaleY(1);} 95%{transform:scaleY(0.1);} }
        .hermione-head-group { animation: hermioneFloat 3s ease-in-out infinite; }
        @keyframes hermioneFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-1.5px);} }
        .chat-avatar-container.speaking .hermione-mouth { animation: hermioneTalk 0.35s ease-in-out infinite alternate; }
        @keyframes hermioneTalk { 0%{d:path("M 16.5 26.5 Q 20 29 23.5 26.5");} 100%{d:path("M 16.5 26.5 Q 20 30.5 23.5 26.5");} }
    `;
    document.head.appendChild(style);
});

// Expose for console debugging
window.generateAdminHash = sha256;
