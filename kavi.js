'use strict';
// ============================================================
// KAVI — Somidu's AI portfolio guide (male full-body avatar in a coat)
// Every answer is generated from MASTER_CV_DATA, so it is always in sync
// with the website and the CV (including anything edited in Admin mode).
// ============================================================
let kaviContext = { lastProject: null, lastTopic: null };

function toggleChat() {
    chatOpen = !chatOpen;
    document.getElementById('chat-panel')?.classList.toggle('open', chatOpen);
    document.getElementById('chat-char-widget')?.classList.toggle('chat-open', chatOpen);
    if (chatOpen) {
        hideSpeechBubble();
        setTimeout(() => document.getElementById('chat-input')?.focus(), 300);
    }
}

function showSpeechBubble(text, duration = 4000) {
    if (chatOpen) return;
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

function askKavi(text) {
    const inp = document.getElementById('chat-input');
    if (inp) inp.value = text;
    sendChatMessage();
}

async function sendChatMessage() {
    const inp = document.getElementById('chat-input');
    const txt = inp?.value.trim(); if (!txt) return;
    if (inp) { inp.value = ''; inp.style.height = 'auto'; }
    addChatMessage('user', esc(txt));
    chatHistory.push({ role: 'user', content: txt });
    showTypingIndicator(); speakAvatar(true);
    setTimeout(() => {
        removeTypingIndicator(); speakAvatar(false);
        const reply = getKaviResponse(txt);
        addChatMessage('assistant', reply);
        chatHistory.push({ role: 'assistant', content: reply });
    }, 600 + Math.random() * 500);
}

// ---------- helpers ----------
function kChips(list) {
    return `<div class="kavi-chips">${list.map(t => `<button type="button" class="kavi-chip" onclick="askKavi('${t.replace(/'/g, "\\'")}')">${esc(t)}</button>`).join('')}</div>`;
}
const K_DEFAULT_CHIPS = ['Show his projects', 'What are his skills?', 'Work experience', 'Education', 'Contact details', 'Tell me a joke'];

function kHas(q, ...words) { return words.some(w => w instanceof RegExp ? w.test(q) : q.includes(w)); }

function kProjectLine(p) { return `• <strong>${esc(p.title)}</strong> — ${esc(p.category)}`; }

function kProjectDetail(p) {
    kaviContext.lastProject = p;
    return `🚀 <strong>${esc(p.title)}</strong> <em>(${esc(p.category)})</em><br>${esc(p.description)}<br><br>🛠️ <strong>Tech:</strong> ${p.tags.map(esc).join(', ')}`
        + (p.github && p.github !== '#' ? `<br>🐙 <a href="${esc(p.github)}" target="_blank" rel="noopener">GitHub</a>` : '')
        + (p.live && p.live !== '#' ? ` · 🌐 <a href="${esc(p.live)}" target="_blank" rel="noopener">Live demo</a>` : '');
}

function kFindProject(q) {
    const stop = new Set(['the', 'and', 'app', 'application', 'project', 'platform', 'system', 'real', 'time', 'web', 'engine', 'about', 'tell', 'more', 'with', 'what', 'is']);
    let best = null, bestScore = 0;
    ALL_PROJECTS.forEach(p => {
        const name = p.title.toLowerCase();
        let score = q.includes(name) ? 10 : 0;
        name.split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stop.has(w)).forEach(w => { if (new RegExp('\\b' + w + '\\b').test(q)) score += 3; });
        if (score > bestScore) { best = p; bestScore = score; }
    });
    return bestScore >= 3 ? best : null;
}

function kSkillIndex() {
    const out = [];
    Object.entries(MASTER_CV_DATA.skills || {}).forEach(([cat, list]) => list.forEach(s => out.push({ name: s, cat })));
    return out;
}

function kFindSkills(q) {
    const hits = [];
    kSkillIndex().forEach(({ name, cat }) => {
        const full = name.toLowerCase();
        const core = full.replace(/\(.*?\)/g, '').replace(/[0-9]+/g, '').trim();
        const aliases = new Set([full, core, ...core.split(/[\s/&,]+/).filter(w => w.length > 3)]);
        if (core.length <= 3) aliases.add(core);
        for (const a of aliases) {
            if (!a) continue;
            const esc2 = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = a.length <= 3 ? new RegExp('(^|[^a-z0-9+#])' + esc2 + '($|[^a-z0-9+#])') : new RegExp('\\b' + esc2);
            if (re.test(q)) { hits.push({ name, cat }); break; }
        }
    });
    return hits;
}

function kProjectsUsing(skillName) {
    const core = skillName.toLowerCase().replace(/\(.*?\)/g, '').replace(/[0-9]+/g, '').trim();
    const firstWord = core.split(/[\s/]+/)[0];
    return ALL_PROJECTS.filter(p => (p.tags.concat([p.description])).join(' ').toLowerCase().includes(core.length > 3 ? firstWord : core));
}

const K_SKILL_CATS = [
    [/language|programming|coding|code in/, 'Programming Languages'],
    [/front|framework|ui library|react|next|flutter|tailwind/, 'Frontend & Frameworks'],
    [/backend|back-end|api|server|node|express|socket|jwt/, 'Backend & APIs'],
    [/database|db|sql|mongo|firebase|data store/, 'Databases'],
    [/devops|docker|ci\/cd|automation|tooling|tools|git|playwright/, 'DevOps, Automation & Tooling'],
    [/\bai\b|hardware|iot|machine|ml|esp32|embedded|gemini/, 'AI & Hardware'],
    [/annotation|curation|design|data & design/, 'Data & Design'],
];

function kEduFilter(q) {
    const edu = MASTER_CV_DATA.education || [];
    const map = [
        [/a\/l|a-level|advanced level|biology/, e => /advanced level/i.test(e.degree)],
        [/o\/l|o-level|ordinary level/, e => /ordinary level/i.test(e.degree)],
        [/scholarship|grade 5|grade five/, e => /scholarship/i.test(e.degree)],
        [/diploma/, e => /diploma/i.test(e.degree)],
        [/immunology|molecular|colombo/, e => /colombo/i.test(e.institution)],
        [/english|nibm/, e => /english/i.test(e.degree)],
        [/nsbm|plymouth|bsc|degree|university|undergrad/, e => /nsbm/i.test(e.institution)],
        [/school|college|bandaranayake|anura/, e => /bandaranayake|anura/i.test(e.institution)],
        [/esoft|metro|pearson/, e => /esoft/i.test(e.institution)],
    ];
    for (const [re, fn] of map) if (re.test(q)) { const r = edu.filter(fn); if (r.length) return r; }
    return null;
}

const K_JOKES = [
    'Why do programmers prefer dark mode? Because light attracts bugs. 🐛',
    'Why did the developer go broke? He used up all his cache. 💸',
    'A SQL query walks into a bar, walks up to two tables and asks: "Can I join you?" 🍻',
    'Why was the ESP32 so calm? It had great peripherals — and zero interrupts. 😌',
    'There are only 10 kinds of people: those who understand binary and those who don\'t.',
    '“It works on my machine” — then we\'ll ship your machine. 📦',
    'Docker joke? I\'d tell you, but it only works inside a container. 🐳',
];
const K_FACTS = [
    'Somidu built a chatbot that understands English, Sinhala, Tamil and Singlish shopping queries (Kapruka AI Shopping Assistant). 🇱🇰',
    'His IoT fire-fighting robot reads infrared flame sensors and ultrasonic sensors on an ESP32. 🔥🤖',
    'CollabBoard syncs Kanban cards live over WebSockets — and ships with CI/CD on GitHub Actions. ⚡',
    'Somidu studied Biology for his A/Levels and is now a Computer Science undergrad — a proper plot twist. 🧬➡️💻',
    'His lottery engine uses Markov chains and gap detection across a 15-factor scoring pipeline. 📈',
];
const K_pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- the brain ----------
function getKaviResponse(raw) {
    const q = raw.toLowerCase().replace(/[?!.]+$/g, '').trim();
    const p = MASTER_CV_DATA.personal || {};
    const projects = ALL_PROJECTS;
    const first = (p.name || 'Somidu').split(' ')[0];
    const chips = kChips;

    // follow-ups on the last project
    if (kaviContext.lastProject && /^(tell me more|more|more details|details|what tech|which tech|tech stack|how does it work)/.test(q)) {
        const lp = kaviContext.lastProject;
        return `🛠️ <strong>${esc(lp.title)}</strong> uses: ${lp.tags.map(esc).join(', ')}.<br>${esc(lp.description)}`;
    }

    if (/^(hi|hello|hey|hola|yo|sup|good (morning|afternoon|evening)|ayubowan|vanakkam|hii+)\b/.test(q)) {
        return `Hey there! 👋 I'm <strong>MMM</strong>, ${esc(first)}'s AI guide. I can tell you about his projects, skills, experience, education, or how to contact him.${chips(K_DEFAULT_CHIPS)}`;
    }
    if (kHas(q, 'who are you', 'your name', 'what are you', 'are you a bot', 'are you real', 'are you ai')) {
        return `I'm <strong>MMM</strong> 🧥 — a friendly AI guide living on ${esc(first)}'s portfolio. I'm not a human (I don't drink coffee… yet), but everything I say comes straight from his CV data. Ask away!`;
    }
    if (kHas(q, 'how are you', "what's up", 'whats up')) return `Running at 100% with zero bugs 😎 (okay, maybe one or two). How can I help you learn about ${esc(first)}?`;
    if (kHas(q, 'thank', 'cheers')) return `You're welcome! 🙌 Anything else you'd like to know? You can also say <em>"generate CV"</em>.`;
    if (/^(bye|goodbye|see you|cya|good night)/.test(q)) return `Goodbye! 👋 Thanks for stopping by — don't forget to say hi to ${esc(first)} at <strong>${esc(p.email)}</strong>.`;

    if (kHas(q, 'joke', 'funny', 'make me laugh', 'humor')) return `😄 ${K_pick(K_JOKES)}`;
    if (kHas(q, 'fun fact', 'interesting', 'surprise me', 'something cool', 'trivia')) return `🎲 <strong>Fun fact:</strong> ${K_pick(K_FACTS)}`;
    if (kHas(q, 'konami', 'easter egg', 'secret')) return `🤫 Try the classic: ↑ ↑ ↓ ↓ ← → ← → B A on your keyboard. Or press <strong>Ctrl + \`</strong> for a hidden terminal!`;
    if (kHas(q, 'party', 'confetti', 'celebrate')) { setTimeout(confettiBlast, 100); return '🎉 Party time!'; }
    if (kHas(q, 'coffee', 'tea')) return `☕ Somidu runs on coffee and curiosity. Fuel level: <strong>100%</strong>.`;
    if (kHas(q, 'game', 'snake')) return `🎮 Open the terminal with <strong>Ctrl + \`</strong> and type <code>play</code> for Snake!`;
    if (kHas(q, 'dark mode', 'light mode', 'theme')) { document.getElementById('theme-btn')?.click(); return '🌓 Theme switched!'; }

    if (kHas(q, /\b(cv|resume|résumé|curriculum)\b/)) {
        return `📄 Sure! I can open the <strong>CV Studio</strong> where you can pick a target role, customize sections, and download a PDF.<br><br><button type="button" class="kavi-cta" onclick="openCvModal()">✨ Open CV Studio</button>`;
    }

    // contact details
    if (kHas(q, 'phone', 'call him', 'mobile number', 'contact number', 'whatsapp', 'telephone')) return `📱 You can call Somidu on <strong>${esc(p.phone)}</strong>.`;
    if (kHas(q, 'email', 'e-mail', 'mail')) return `📧 <strong>${esc(p.email)}</strong>`;
    if (kHas(q, 'linkedin')) return `🔗 LinkedIn: <a href="https://${esc(p.linkedin)}" target="_blank" rel="noopener">${esc(p.linkedin)}</a>`;
    if (kHas(q, 'github', 'git hub', 'source code', 'repo')) return `🐙 GitHub: <a href="https://${esc(p.github)}" target="_blank" rel="noopener">${esc(p.github)}</a>`;
    if (kHas(q, 'portfolio', 'website', 'site')) return `🌐 Portfolio: <a href="https://${esc(p.portfolio)}" target="_blank" rel="noopener">${esc(p.portfolio)}</a>`;
    if (kHas(q, 'facebook')) return `📘 Facebook: <a href="https://${esc(p.facebook)}" target="_blank" rel="noopener">${esc(p.facebook)}</a>`;
    if (kHas(q, 'where', 'location', 'live', 'based', 'country', 'city', 'address', 'from') && !kHas(q, 'study', 'studied', 'work', 'school', 'university', 'college', 'project')) return `📍 Somidu is based in <strong>${esc(p.location)}</strong>.`;
    if (kHas(q, 'contact', 'reach', 'get in touch', 'hire', 'available', 'availability', 'open to', 'intern', 'looking for a job', 'freelance', 'recruit', 'opportunit')) {
        return `💼 Somidu is <strong>open to internships, freelance work and full-time roles</strong>.<br>📧 ${esc(p.email)}<br>📱 ${esc(p.phone)}<br>🔗 ${esc(p.linkedin)}<br>🐙 ${esc(p.github)}<br>📍 ${esc(p.location)}${chips(['Generate CV', 'Show his projects'])}`;
    }

    // specific project
    const proj = kFindProject(q);
    if (proj && !kHas(q, 'which project', 'what project', 'projects using', 'projects with')) return kProjectDetail(proj) + chips(['Show his projects', 'What are his skills?']);

    // experience
    if (kHas(q, 'experience', 'work history', 'employment', 'worked', 'career', 'innodata', 'ananda', 'fiverr', 'annotator', 'graphic', 'technician', 'where does he work', 'current job', 'working')) {
        const ex = MASTER_CV_DATA.experience || [];
        if (!ex.length) return `I don't have work experience listed yet. Ask ${esc(first)} directly at ${esc(p.email)}.`;
        return `💼 <strong>Work experience:</strong><br>${ex.map(e => `• <strong>${esc(e.role)}</strong> — ${esc(e.organization)} <em>(${esc(e.period)})</em><br>&nbsp;&nbsp;${esc(e.details)}`).join('<br>')}`;
    }

    // education
    if (kHas(q, 'education', 'study', 'studying', 'university', 'degree', 'school', 'college', 'qualification', 'certificate', 'diploma', 'a/l', 'o/l', 'a-level', 'o-level', 'advanced level', 'ordinary level', 'scholarship', 'nsbm', 'plymouth', 'academic', 'graduate', 'immunology', 'esoft', 'nibm')) {
        const sel = kEduFilter(q) || MASTER_CV_DATA.education || [];
        return `🎓 <strong>Education:</strong><br>${sel.map(e => `• <strong>${esc(e.degree)}</strong> — ${esc(e.institution)} <em>(${esc(e.period)})</em>`).join('<br>')}`;
    }

    if (kHas(q, 'language') && kHas(q, 'speak', 'spoken', 'sinhala', 'tamil', 'english')) {
        return `🗣️ His English credentials: Diploma in English (Esoft/Pearson) and Advanced Certificate in English Language (NIBM, Merit). His Kapruka assistant also handles English, Sinhala, Tamil and Singlish queries.`;
    }
    // projects (lists / tech filters)
    const skillHits = kFindSkills(q);
    const askingProjectsUsing = kHas(q, 'which project', 'what project', 'projects using', 'projects with', 'built with', 'built using', 'made with', 'projects in');
    if (askingProjectsUsing && skillHits.length) {
        const list = kProjectsUsing(skillHits[0].name);
        return list.length ? `🚀 Projects using <strong>${esc(skillHits[0].name)}</strong>:<br>${list.map(kProjectLine).join('<br>')}` : `I couldn't find a project tagged with ${esc(skillHits[0].name)}, but it is listed under his <strong>${esc(skillHits[0].cat)}</strong> skills.`;
    }
    if (kHas(q, 'project', 'deploy', 'built', 'build', 'portfolio work', 'case study', 'case studies', 'made', 'created', 'developed', 'showcase', 'apps')) {
        if (kHas(q, 'how many', 'count')) return `🚀 There are <strong>${projects.length}</strong> projects in the portfolio:<br>${projects.map(x => `• ${esc(x.title)}`).join('<br>')}`;
        if (kHas(q, 'best', 'favourite', 'favorite', 'proud', 'top', 'main', 'biggest', 'impressive')) {
            const top = projects.find(x => /kapruka/i.test(x.title)) || projects[0];
            return `🏆 One of his flagship builds:<br><br>${kProjectDetail(top)}${chips(['Show his projects'])}`;
        }
        return `🚀 <strong>Projects (${projects.length}):</strong><br>${projects.map(kProjectLine).join('<br>')}<br><br>Ask about any one by name, e.g. <em>"Tell me about ${esc(projects[0]?.title || 'a project')}"</em>.${chips(projects.slice(0, 3).map(x => 'Tell me about ' + x.title))}`;
    }

    // skills
    const askKnow = kHas(q, 'know', 'use', 'uses', 'familiar', 'proficient', 'experience with', 'experience in', 'good at', 'skilled', 'can he', 'does he', 'has he', 'worked with', 'expertise', 'knowledge');
    if (skillHits.length && (askKnow || kHas(q, 'skill', 'tech', 'stack', 'tool', 'language')) || (skillHits.length && q.split(/\s+/).length <= 4)) {
        const names = skillHits.map(h => `<strong>${esc(h.name)}</strong> (${esc(h.cat)})`).join(', ');
        const using = kProjectsUsing(skillHits[0].name);
        return `✅ Yes — ${names} ${skillHits.length > 1 ? 'are' : 'is'} in Somidu's skill set.` + (using.length ? `<br>📦 Used in: ${using.slice(0, 4).map(x => esc(x.title)).join(', ')}.` : '');
    }
    if (kHas(q, 'skill', 'tech', 'stack', 'technolog', 'language', 'framework', 'tool', 'good at', 'expert', 'speciali', 'proficien', 'competenc', 'program')) {
        for (const [re, cat] of K_SKILL_CATS) {
            if (re.test(q) && MASTER_CV_DATA.skills?.[cat]) return `⚡ <strong>${esc(cat)}:</strong> ${MASTER_CV_DATA.skills[cat].map(esc).join(', ')}`;
        }
        return `⚡ <strong>Somidu's tech stack:</strong><br>${Object.entries(MASTER_CV_DATA.skills || {}).map(([c, l]) => `• <strong>${esc(c)}:</strong> ${l.map(esc).join(', ')}`).join('<br>')}`;
    }
    // asking about a tech not on his CV
    const askMatch = q.match(/(?:know|use|uses|familiar with|experience (?:with|in)|worked with|skilled in|good at)\s+([a-z0-9+#.\- ]{2,25})$/);
    if (askMatch) {
        return `🤔 I don't see <strong>${esc(askMatch[1].trim())}</strong> listed in Somidu's CV. He does work with: ${kSkillIndex().slice(0, 12).map(s => esc(s.name)).join(', ')}… Ask about a skill category to see more.${chips(['What are his skills?'])}`;
    }
    if (kHas(q, 'ai ', ' ai', 'artificial', 'machine learning', 'gemini', 'chatbot', 'llm', 'mcp')) {
        const ai = projects.filter(x => /gemini|ml kit|ai|mcp|predictive/i.test(x.tags.join(' ') + x.description));
        return `🤖 AI-related work:<br>${ai.map(kProjectLine).join('<br>')}`;
    }
    if (kHas(q, 'iot', 'hardware', 'esp32', 'robot', 'embedded', 'sensor')) {
        const io = projects.filter(x => /iot|esp32|sensor|embedded|robot/i.test(x.tags.join(' ') + x.category));
        return `📡 IoT & hardware:<br>${io.map(kProjectLine).join('<br>')}`;
    }

    // about
    if (kHas(q, 'about', 'who is', 'summary', 'bio', 'introduce', 'tell me about somidu', 'tell me about him', 'describe', 'profile', 'overview', 'yourself', 'somidu')) {
        return `👨‍💻 <strong>${esc(p.fullName || p.name)}</strong><br><em>${esc(p.headline)}</em><br><br>${esc(MASTER_CV_DATA.summary)}${chips(['Show his projects', 'Work experience', 'Contact details'])}`;
    }
    if (kHas(q, 'age', 'old', 'salary', 'expect', 'married', 'religion', 'birthday', 'born')) {
        return `🔒 I only share what's on Somidu's professional profile. For anything else, please contact him directly: <strong>${esc(p.email)}</strong>.`;
    }


    // generic keyword search across all data
    const tokens = q.split(/[^a-z0-9+#]+/).filter(t => t.length > 3);
    const pool = [
        ...projects.map(x => ({ t: `<strong>${esc(x.title)}</strong> — ${esc(x.category)}`, s: (x.title + ' ' + x.description + ' ' + x.tags.join(' ')).toLowerCase() })),
        ...(MASTER_CV_DATA.education || []).map(e => ({ t: `🎓 <strong>${esc(e.degree)}</strong> — ${esc(e.institution)}`, s: (e.degree + ' ' + e.institution + ' ' + e.details).toLowerCase() })),
        ...(MASTER_CV_DATA.experience || []).map(e => ({ t: `💼 <strong>${esc(e.role)}</strong> — ${esc(e.organization)}`, s: (e.role + ' ' + e.organization + ' ' + e.details).toLowerCase() })),
    ];
    const found = pool.filter(x => tokens.some(t => x.s.includes(t))).slice(0, 4);
    if (found.length) return `🔎 Here's what I found related to that:<br>${found.map(x => '• ' + x.t).join('<br>')}`;

    return `Hmm, I don't have that in Somidu's profile 🤔. I can help with his <strong>projects, skills, experience, education, contact details</strong> — or tell you a joke!<br>For anything else, email <strong>${esc(p.email)}</strong>.${chips(K_DEFAULT_CHIPS)}`;
}

// ============================================================
// FUN STUFF
// ============================================================
function confettiBlast() {
    const colors = ['#00f5ff', '#7b2fff', '#ff2d78', '#00ff88', '#ffaa00', '#ffffff'];
    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden';
    for (let i = 0; i < 90; i++) {
        const c = document.createElement('i');
        const size = 6 + Math.random() * 8;
        c.style.cssText = `position:absolute;top:-20px;left:${Math.random() * 100}%;width:${size}px;height:${size * 0.5}px;background:${colors[i % colors.length]};opacity:.95;border-radius:2px;transform:rotate(${Math.random() * 360}deg);animation:confettiFall ${2.2 + Math.random() * 2}s ease-in ${Math.random() * 0.6}s forwards`;
        layer.appendChild(c);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 5200);
}

function initFunStuff() {
    // Konami code
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    window.addEventListener('keydown', e => {
        if (/input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        pos = (k === seq[pos]) ? pos + 1 : (k === seq[0] ? 1 : 0);
        if (pos === seq.length) {
            pos = 0; confettiBlast(); document.body.classList.toggle('party-mode');
            showToast('🎮 Konami unlocked! Party mode toggled.', 'success');
            showSpeechBubble('Whoa, you found it! 🕹️', 5000);
        }
    });
    // Profile photo: click to spin
    document.querySelector('.hero-photo-ring')?.addEventListener('click', function () {
        this.classList.remove('spin-fun'); void this.offsetWidth; this.classList.add('spin-fun');
        showToast('🌀 Wheee!', 'success');
    });
    // Clicking the name 5 times -> confetti
    let nameClicks = 0, nameTimer;
    document.querySelector('.hero-name')?.addEventListener('click', () => {
        nameClicks++; clearTimeout(nameTimer); nameTimer = setTimeout(() => nameClicks = 0, 1500);
        if (nameClicks >= 5) { nameClicks = 0; confettiBlast(); showToast('🎉 You found a secret!', 'success'); }
    });
    // Footer secret
    console.log('%c👋 Hey, fellow developer! %cLike what you see? Say hello: somidudilan2001@gmail.com', 'font-size:16px;font-weight:bold;color:#00f5ff', 'color:#7b2fff');
}
