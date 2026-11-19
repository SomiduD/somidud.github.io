'use strict';
// ============================================================
// CV STUDIO  — role-tailored CV generator (customize + download)
// CV EDITOR  — admin-only editor for all CV data
// ============================================================

const CVS_ACCENTS = ['#0891b2', '#7c3aed', '#16a34a', '#dc2626', '#ea580c', '#1f2937'];
const CVS_ROLE_CHIPS = [
    ['📱 Mobile Dev', 'Flutter Mobile Developer'], ['🌐 Full-Stack', 'Full-Stack Web Developer'], ['⚛️ Frontend', 'React / Next.js Frontend Developer'],
    ['🛠️ Backend', 'Node.js Backend Developer'], ['🤖 AI Engineer', 'AI / Machine Learning Engineer'], ['📡 IoT', 'IoT & Embedded Systems Engineer'],
    ['⚙️ DevOps / RPA', 'DevOps & Automation Engineer'], ['🏷️ Data Annotator', 'Data Annotation Specialist'], ['💼 Internship', 'Software Engineering Internship']
];
const CVS_KEYWORDS = [
    [/mobile|flutter|android|ios|app dev/, ['flutter', 'dart', 'firebase', 'mobile', 'ml kit']],
    [/front|react|next|ui|ux|web design/, ['react', 'next', 'tailwind', 'vite', 'javascript', 'typescript', 'html', 'ui/ux']],
    [/full.?stack|web|software/, ['react', 'next', 'node', 'express', 'mongo', 'socket', 'docker', 'php', 'sql', 'typescript']],
    [/back.?end|node|api|server/, ['node', 'express', 'jwt', 'mongo', 'sql', 'docker', 'socket', 'api', 'php', 'python']],
    [/iot|embedded|hardware|robot|firmware/, ['esp32', 'iot', 'c++', 'sensor', 'robot', 'embedded']],
    [/\bai\b|ml|machine|data sci|llm|gemini|intelligen/, ['gemini', 'ai', 'ml', 'machine', 'mcp', 'predictive', 'python', 'annotation']],
    [/devops|cloud|ci\/cd|docker|automation|rpa|qa|test/, ['docker', 'github actions', 'ci/cd', 'playwright', 'cdp', 'automation', 'python', 'git']],
    [/annotat|curation|data entry|labell?ing|validation/, ['annotation', 'curation', 'validation', 'data']],
    [/python/, ['python', 'sqlite', 'playwright']],
    [/php|sql|database|dba/, ['php', 'sql', 'database', 'trigger', 'mongo', 'sqlite']],
    [/design|graphic/, ['design', 'ui/ux']],
];

let CVS = null;

function cvsDefaultState() {
    const d = MASTER_CV_DATA, p = d.personal || {};
    return {
        role: '', keywords: [], template: 'modern', accent: CVS_ACCENTS[0], size: 'normal',
        sec: { summary: true, skills: true, experience: true, projects: true, education: true },
        headline: p.headline || '', summary: d.summary || '',
        projOrder: (d.projects || []).map(x => x.id),
        proj: new Set((d.projects || []).map(x => x.id)),
        cats: new Set(Object.keys(d.skills || {})), catOrder: Object.keys(d.skills || {}),
        exp: new Set((d.experience || []).map((_, i) => i)),
        edu: new Set((d.education || []).map((_, i) => i)),
    };
}

// ---------- tailoring ----------
function cvsScore(text, kws) { const t = String(text).toLowerCase(); return kws.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0); }

function cvsTailor(role) {
    const d = MASTER_CV_DATA, r = role.toLowerCase();
    let kws = [];
    CVS_KEYWORDS.forEach(([re, list]) => { if (re.test(r)) kws.push(...list); });
    r.split(/[^a-z0-9+#.]+/).filter(w => w.length > 2 && !['and', 'the', 'developer', 'engineer', 'junior', 'senior', 'intern', 'internship', 'software'].includes(w)).forEach(w => kws.push(w));
    kws = [...new Set(kws)];
    CVS.role = role; CVS.keywords = kws;
    const projects = d.projects || [];
    const scored = projects.map((p, i) => ({ id: p.id, s: cvsScore([p.name, p.category, p.description, (p.technologies || []).join(' ')].join(' '), kws), i }));
    scored.sort((a, b) => b.s - a.s || a.i - b.i);
    CVS.projOrder = scored.map(x => x.id);
    const take = kws.length ? Math.max(3, Math.min(5, scored.filter(x => x.s > 0).length)) : projects.length;
    CVS.proj = new Set(CVS.projOrder.slice(0, take));
    const cats = Object.entries(d.skills || {}).map(([c, l], i) => ({ c, s: cvsScore(c + ' ' + l.join(' '), kws), i }));
    cats.sort((a, b) => b.s - a.s || a.i - b.i);
    CVS.catOrder = cats.map(x => x.c);
    const base = d.summary || '';
    CVS.summary = `Seeking a ${role} position. ` + base;
}

// ---------- document builder ----------
function cvsProjLinks(pr, fs, color) {
    const generic = 'https://github.com/somidud';
    const list = [pr.github && pr.github !== generic && ['GitHub', pr.github], pr.live && pr.live !== '#' && ['Live demo', pr.live], pr.youtubeUrl && ['Video', pr.youtubeUrl]].filter(Boolean);
    if (!list.length) return '';
    return `<div style="font-size:${fs - 1}px;margin-top:1px">${list.map(([l, u]) => `<a href="${esc(u)}" style="color:${color};text-decoration:underline">${l} ↗</a>`).join(' &nbsp;·&nbsp; ')}</div>`;
}
function cvsBuildHTML() {
    const d = MASTER_CV_DATA, p = d.personal || {}, a = CVS.accent;
    const tpl = CVS.template, compact = CVS.size === 'compact';
    const fs = compact ? 11 : 12;
    const font = tpl === 'classic' ? "Georgia,'Times New Roman',serif" : "'Inter','Segoe UI',Arial,sans-serif";
    const h2 = (t) => tpl === 'classic'
        ? `<h2 style="font-size:${fs + 1}px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#111;border-bottom:1.5px solid #111;padding-bottom:2px;margin:${compact ? 12 : 16}px 0 6px">${t}</h2>`
        : `<h2 style="font-size:${fs - 1}px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${a};border-bottom:1px solid #e5e7eb;padding-bottom:3px;margin:${compact ? 12 : 18}px 0 7px">${t}</h2>`;
    const U = s => /^(https?:|mailto:|tel:)/i.test(s) ? s : 'https://' + s;
    const L = (label, href) => `<a href="${esc(href)}" style="color:inherit;text-decoration:none">${esc(label)}</a>`;
    const contact = [p.phone && L(p.phone, 'tel:' + p.phone.replace(/[^+\d]/g, '')), p.email && L(p.email, 'mailto:' + p.email), p.location && esc(p.location),
        p.portfolio && L(p.portfolio, U(p.portfolio)), p.linkedin && L(p.linkedin, U(p.linkedin)), p.github && L(p.github, U(p.github))].filter(Boolean);
    const align = tpl === 'classic' ? 'center' : 'left';
    let html = `<div class="cv-doc" style="width:794px;box-sizing:border-box;padding:${compact ? 28 : 36}px 44px;background:#fff;color:#111827;font-family:${font};font-size:${fs}px;line-height:1.5;text-align:left">`;
    html += `<div style="text-align:${align};${tpl === 'classic' ? '' : `border-left:6px solid ${a};padding-left:14px;`}margin-bottom:6px">
        <div style="font-size:${compact ? 24 : 28}px;font-weight:800;letter-spacing:-.01em;color:#0f172a">${esc(p.fullName || p.name)}</div>
        <div style="font-size:${fs + 2}px;font-weight:600;color:${tpl === 'classic' ? '#374151' : a};margin-top:2px">${esc(CVS.headline)}</div>
        <div style="font-size:${fs - 1}px;color:#4b5563;margin-top:6px">${contact.join(' &nbsp;•&nbsp; ')}</div>
    </div>`;
    if (CVS.sec.summary && CVS.summary.trim()) html += h2('Professional Summary') + `<p style="margin:0">${esc(CVS.summary)}</p>`;

    if (CVS.sec.skills) {
        const rows = CVS.catOrder.filter(c => CVS.cats.has(c) && d.skills[c]).map(c => {
            const list = [...d.skills[c]].sort((x, y) => cvsScore(y, CVS.keywords) - cvsScore(x, CVS.keywords));
            if (tpl === 'modern') return `<div style="margin-bottom:6px"><div style="font-weight:700;font-size:${fs - 1}px;color:#374151;margin-bottom:3px">${esc(c)}</div>${list.map(s => `<span style="display:inline-block;font-size:${fs - 1}px;padding:1px 9px;margin:0 4px 4px 0;border:1px solid ${a};border-radius:50px;color:#111827">${esc(s)}</span>`).join('')}</div>`;
            return `<div style="margin-bottom:3px"><b>${esc(c)}:</b> ${list.map(esc).join(', ')}</div>`;
        });
        if (rows.length) html += h2('Technical Skills') + rows.join('');
    }
    if (CVS.sec.experience) {
        const items = (d.experience || []).filter((_, i) => CVS.exp.has(i));
        if (items.length) html += h2('Work Experience') + items.map(e => `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;page-break-inside:avoid"><tr><td style="vertical-align:top"><b>${esc(e.role)}</b> — <span style="color:#374151">${esc(e.organization)}</span></td><td style="text-align:right;white-space:nowrap;vertical-align:top;color:#4b5563;font-size:${fs - 1}px">${esc(e.period)}</td></tr><tr><td colspan="2" style="color:#374151;padding-top:2px">${esc(e.details)}</td></tr></table>`).join('');
    }
    if (CVS.sec.projects) {
        const byId = Object.fromEntries((d.projects || []).map(x => [x.id, x]));
        const items = CVS.projOrder.filter(id => CVS.proj.has(id) && byId[id]).map(id => byId[id]);
        if (items.length) html += h2('Key Projects') + items.map(pr => `<div style="margin-bottom:${compact ? 7 : 10}px;page-break-inside:avoid"><div><b>${esc(pr.name)}</b> <span style="color:#6b7280;font-size:${fs - 1}px">| ${esc(pr.category)}</span></div><div style="color:#374151">${esc(pr.description)}</div><div style="color:${tpl === 'classic' ? '#111' : a};font-size:${fs - 1}px;margin-top:1px"><b>Tech:</b> ${(pr.technologies || []).map(esc).join(', ')}</div>${cvsProjLinks(pr, fs, tpl === 'classic' ? '#111' : a)}</div>`).join('');
    }
    if (CVS.sec.education) {
        const items = (d.education || []).filter((_, i) => CVS.edu.has(i));
        if (items.length) html += h2('Education') + items.map(e => `<table style="width:100%;border-collapse:collapse;margin-bottom:5px;page-break-inside:avoid"><tr><td style="vertical-align:top"><b>${esc(e.degree)}</b><br><span style="color:#374151">${esc(e.institution)}</span></td><td style="text-align:right;white-space:nowrap;vertical-align:top;color:#4b5563;font-size:${fs - 1}px">${esc(e.period)}</td></tr></table>`).join('');
    }
    html += `</div>`;
    return html;
}

// ---------- modal construction ----------
function cvsEnsureDom() {
    if (document.getElementById('cvs-overlay')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div id="cvs-overlay"><div id="cvs-box" role="dialog" aria-label="CV Studio">
        <div class="cvs-head"><span class="modal-title">✨ CV Studio</span>
            <div class="cvs-head-right"><span class="cvs-hint">Tip: click inside the preview to edit text directly</span><button class="modal-close" onclick="closeCvModal()" aria-label="Close">✕</button></div></div>
        <div class="cvs-body">
            <div class="cvs-controls" id="cvs-controls"></div>
            <div class="cvs-preview"><div id="cvs-paper-wrap"><div id="cvs-paper" contenteditable="true" spellcheck="false"></div></div></div>
        </div>
        <div class="cvs-foot">
            <button class="btn btn-primary btn-sm" id="cvs-dl-pdf" onclick="cvsDownloadPDF()">⬇ Download PDF</button>
            <button class="btn btn-outline btn-sm" onclick="cvsDownloadDoc()">📝 Word (.doc)</button>
            <button class="btn btn-ghost btn-sm" onclick="cvsPrint()">🖨 Print</button>
            <span id="cvs-status" class="cvs-status"></span>
        </div>
    </div></div>
    <div id="cve-overlay"><div id="cve-box" role="dialog" aria-label="CV Data Editor">
        <div class="cvs-head"><span class="modal-title">🛠️ CV Data Editor <span class="admin-tag">ADMIN</span></span>
            <button class="modal-close" onclick="closeCvEditor()" aria-label="Close">✕</button></div>
        <div class="cve-body" id="cve-body"></div>
        <div class="cvs-foot">
            <button class="btn btn-primary btn-sm" onclick="cveSave()">💾 Save & Apply</button>
            <button class="btn btn-outline btn-sm" onclick="cveExport()">⬆ Export JSON</button>
            <label class="btn btn-outline btn-sm" style="cursor:pointer">⬇ Import JSON<input type="file" accept="application/json" hidden onchange="cveImport(this)"></label>
            <button class="btn btn-ghost btn-sm" onclick="cveReset()">↺ Reset to defaults</button>
            <span class="cvs-status">Saved in this browser · export to keep a backup</span>
        </div>
    </div></div>`;
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    document.getElementById('cvs-overlay').addEventListener('click', e => { if (e.target.id === 'cvs-overlay') closeCvModal(); });
    document.getElementById('cve-overlay').addEventListener('click', e => { if (e.target.id === 'cve-overlay') closeCvEditor(); });
    window.addEventListener('resize', cvsFit);
    window.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (document.getElementById('cve-overlay').classList.contains('open')) closeCvEditor();
        else if (document.getElementById('cvs-overlay').classList.contains('open')) closeCvModal();
    });
}

function openCvModal() {
    cvsEnsureDom();
    CVS = cvsDefaultState();
    const pre = document.getElementById('cvs-overlay');
    pre.classList.add('open'); document.body.classList.add('modal-open');
    cvsRenderControls(); cvsRenderPreview();
    document.getElementById('cvs-status').textContent = '';
}
function closeCvModal() {
    document.getElementById('cvs-overlay')?.classList.remove('open');
    if (!document.getElementById('cve-overlay')?.classList.contains('open')) document.body.classList.remove('modal-open');
}

function cvsFit() {
    const wrap = document.getElementById('cvs-paper-wrap'); const holder = wrap?.parentElement;
    if (!wrap || !holder) return;
    const scale = Math.min(1, (holder.clientWidth - 24) / 794);
    wrap.style.zoom = scale;
}
function cvsRenderPreview() {
    const paper = document.getElementById('cvs-paper');
    if (paper) paper.innerHTML = cvsBuildHTML();
    cvsFit();
}

function cvsSet(key, val, rerenderControls) { CVS[key] = val; if (rerenderControls) cvsRenderControls(); cvsRenderPreview(); }
function cvsToggle(setName, val, on) { on ? CVS[setName].add(val) : CVS[setName].delete(val); cvsRenderPreview(); }
function cvsSec(k, on) { CVS.sec[k] = on; cvsRenderPreview(); }
function cvsApplyRole(role) {
    role = (role ?? document.getElementById('cvs-role')?.value ?? '').trim();
    if (!role) { showToast('⚠️ Enter or pick a target role first', 'warning'); return; }
    cvsTailor(role); cvsRenderControls(); cvsRenderPreview();
    showToast(`🎯 CV tailored for “${esc(role)}”`, 'success');
}
function cvsResetAll() { CVS = cvsDefaultState(); cvsRenderControls(); cvsRenderPreview(); }

function cvsRenderControls() {
    const d = MASTER_CV_DATA, el = document.getElementById('cvs-controls'); if (!el) return;
    const chk = (checked, onchange, label) => `<label class="cvs-check"><input type="checkbox" ${checked ? 'checked' : ''} onchange="${onchange}"> <span>${label}</span></label>`;
    const byId = Object.fromEntries((d.projects || []).map(x => [x.id, x]));
    el.innerHTML = `
    <div class="cvs-block"><h4>🎯 Target role</h4>
        <div class="cvs-chips">${CVS_ROLE_CHIPS.map(([l, r]) => `<button type="button" class="cv-chip ${CVS.role === r ? 'selected' : ''}" onclick="cvsApplyRole('${r.replace(/'/g, "\\'")}')">${l}</button>`).join('')}</div>
        <div class="cvs-row"><input id="cvs-role" class="cvs-input" type="text" value="${esc(CVS.role)}" placeholder="…or type any role, e.g. Junior Software Engineer" onkeydown="if(event.key==='Enter'){event.preventDefault();cvsApplyRole();}">
        <button class="btn btn-primary btn-sm" onclick="cvsApplyRole()">Tailor</button></div>
        <p class="cvs-note">Tailoring re-orders skills and picks the most relevant projects. You can still toggle anything below.</p></div>
    <div class="cvs-block"><h4>🎨 Design</h4>
        <div class="cvs-seg">${['modern', 'classic'].map(t => `<button type="button" class="${CVS.template === t ? 'on' : ''}" onclick="cvsSet('template','${t}',true)">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
        <div class="cvs-seg">${['normal', 'compact'].map(t => `<button type="button" class="${CVS.size === t ? 'on' : ''}" onclick="cvsSet('size','${t}',true)">${t[0].toUpperCase() + t.slice(1)} spacing</button>`).join('')}</div>
        <div class="cvs-swatches">${CVS_ACCENTS.map(c => `<button type="button" class="cvs-swatch ${CVS.accent === c ? 'on' : ''}" style="background:${c}" aria-label="Accent ${c}" onclick="cvsSet('accent','${c}',true)"></button>`).join('')}<input type="color" value="${CVS.accent}" oninput="cvsSet('accent',this.value)" title="Custom colour"></div></div>
    <div class="cvs-block"><h4>📑 Sections</h4><div class="cvs-grid2">
        ${[['summary', 'Summary'], ['skills', 'Skills'], ['experience', 'Experience'], ['projects', 'Projects'], ['education', 'Education']].map(([k, l]) => chk(CVS.sec[k], `cvsSec('${k}',this.checked)`, l)).join('')}</div></div>
    <div class="cvs-block"><h4>✏️ Headline & summary</h4>
        <input class="cvs-input" type="text" value="${esc(CVS.headline)}" oninput="cvsSet('headline',this.value)">
        <textarea class="cvs-input" rows="5" oninput="cvsSet('summary',this.value)">${esc(CVS.summary)}</textarea></div>
    <div class="cvs-block"><h4>🚀 Projects</h4>${CVS.projOrder.filter(id => byId[id]).map(id => chk(CVS.proj.has(id), `cvsToggle('proj',${JSON.stringify(id)},this.checked)`, esc(byId[id].name))).join('')}</div>
    <div class="cvs-block"><h4>⚡ Skill groups</h4>${CVS.catOrder.map(c => chk(CVS.cats.has(c), `cvsToggle('cats',${esc(JSON.stringify(c))},this.checked)`, esc(c))).join('')}</div>
    <div class="cvs-block"><h4>💼 Experience</h4>${(d.experience || []).map((e, i) => chk(CVS.exp.has(i), `cvsToggle('exp',${i},this.checked)`, `${esc(e.role)} <small>(${esc(e.organization)})</small>`)).join('') || '<p class="cvs-note">None</p>'}</div>
    <div class="cvs-block"><h4>🎓 Education</h4>${(d.education || []).map((e, i) => chk(CVS.edu.has(i), `cvsToggle('edu',${i},this.checked)`, esc(e.degree))).join('')}</div>
    <div class="cvs-block cvs-actions">
        <button class="btn btn-ghost btn-sm" onclick="cvsResetAll()">↺ Reset customisation</button>
        ${adminAuthenticated ? `<button class="btn btn-outline btn-sm" onclick="openCvEditor()">🛠️ Edit CV data (admin)</button>` : `<p class="cvs-note">🔐 Admin mode unlocks the CV data editor.</p>`}
    </div>`;
}

// ---------- export ----------
function cvsCurrentHTML() {
    const paper = document.getElementById('cvs-paper');
    const tmp = document.createElement('div'); tmp.innerHTML = paper ? paper.innerHTML : cvsBuildHTML();
    return tmp.innerHTML;
}
function cvsFileBase() {
    const p = MASTER_CV_DATA.personal || {};
    return `CV_${(p.name || 'Somidu').replace(/\s+/g, '_')}${CVS?.role ? '_' + CVS.role.replace(/[^a-z0-9]+/gi, '_') : ''}`;
}
function cvsStatus(msg) { const s = document.getElementById('cvs-status'); if (s) s.textContent = msg; }

// Splits the CV into real A4 pages (no block is ever cut in half), then renders each page to the PDF.
const CVS_PAGE_W = 794, CVS_PAGE_H = 1123;
function cvsPaginate(html, host) {
    const probe = document.createElement('div'); probe.innerHTML = html;
    const doc = probe.firstElementChild;
    const mount = document.createElement('div'); mount.style.cssText = 'position:absolute;left:0;top:0;width:' + CVS_PAGE_W + 'px;visibility:hidden';
    mount.appendChild(doc.cloneNode(true)); host.appendChild(mount);
    const measured = mount.firstElementChild;
    const cs = getComputedStyle(measured);
    const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const avail = CVS_PAGE_H - padV - 4;
    const kids = [...measured.children].map(k => {
        const st = getComputedStyle(k);
        return { html: k.outerHTML, h: k.offsetHeight + parseFloat(st.marginTop) + parseFloat(st.marginBottom), isHead: k.tagName === 'H2', mt: parseFloat(st.marginTop) };
    });
    mount.remove();
    const pages = []; let cur = [], used = 0;
    kids.forEach((k, i) => {
        const next = kids[i + 1];
        let need = k.h + (k.isHead && next ? Math.min(next.h, 60) : 0); // keep a heading with its first lines
        if (cur.length && used + need > avail) { pages.push(cur); cur = []; used = 0; }
        if (!cur.length && k.isHead) { used -= k.mt; }
        cur.push(k); used += k.h;
    });
    if (cur.length) pages.push(cur);
    const proto = doc.cloneNode(false);
    return pages.map(list => {
        const pg = proto.cloneNode(false);
        pg.style.height = CVS_PAGE_H + 'px'; pg.style.overflow = 'hidden'; pg.style.width = CVS_PAGE_W + 'px';
        pg.innerHTML = list.map((k, i) => i === 0 && k.isHead ? k.html.replace('<h2 style="', '<h2 style="margin-top:0;') : k.html).join('');
        return pg;
    });
}

async function cvsDownloadPDF() {
    if (typeof html2canvas === 'undefined' || !window.jspdf) { showToast('⚠️ PDF engine could not load (offline?). Use Print → Save as PDF.', 'warning'); return; }
    const btn = document.getElementById('cvs-dl-pdf'); const label = btn.innerHTML;
    btn.disabled = true; btn.textContent = '⏳ Creating PDF…';
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;top:0;left:-12000px;width:' + CVS_PAGE_W + 'px;background:#fff;z-index:-1';
    document.body.appendChild(host);
    try {
        if (document.fonts?.ready) await document.fonts.ready;
        const pages = cvsPaginate(cvsCurrentHTML(), host);
        pages.forEach(p => host.appendChild(p));
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, width: CVS_PAGE_W, height: CVS_PAGE_H, windowWidth: CVS_PAGE_W });
            if (i) pdf.addPage('a4', 'portrait');
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
            // make links clickable in the PDF
            const pr0 = pages[i].getBoundingClientRect(), k = 210 / CVS_PAGE_W;
            pages[i].querySelectorAll('a[href]').forEach(a => { const r = a.getBoundingClientRect(); if (r.width) pdf.link((r.left - pr0.left) * k, (r.top - pr0.top) * k, r.width * k, r.height * k, { url: a.href }); });
        }
        pdf.save(cvsFileBase() + '.pdf');
        showToast('📄 CV downloaded (' + pages.length + (pages.length > 1 ? ' pages)' : ' page)'), 'success'); cvsStatus('✔ PDF saved');
    } catch (err) {
        console.error(err); showToast('⚠️ PDF failed — try Print instead', 'warning');
    } finally { host.remove(); btn.disabled = false; btn.innerHTML = label; }
}
function cvsDownloadDoc() {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>CV</title></head><body>${cvsCurrentHTML()}</body></html>`;
    const url = URL.createObjectURL(new Blob(['\ufeff', html], { type: 'application/msword' }));
    const a = document.createElement('a'); a.href = url; a.download = cvsFileBase() + '.doc'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('📝 Word document downloaded', 'success');
}
function cvsPrint() {
    const w = window.open('', '_blank'); if (!w) { showToast('⚠️ Pop-up blocked — allow pop-ups to print', 'warning'); return; }
    w.document.write(`<html><head><title>${esc(cvsFileBase())}</title><style>@page{size:A4;margin:8mm}body{margin:0}.cv-doc{margin:0 auto}</style></head><body>${cvsCurrentHTML()}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
}

// ============================================================
// CV DATA EDITOR (admin)
// ============================================================
let CVE = null;

function openCvEditor() {
    if (!adminAuthenticated) { showToast('🔐 Admin login required', 'warning'); return; }
    cvsEnsureDom();
    const d = cloneData(MASTER_CV_DATA);
    CVE = {
        personal: Object.assign({ name: '', fullName: '', headline: '', email: '', phone: '', location: '', portfolio: '', linkedin: '', github: '', facebook: '' }, d.personal || {}),
        summary: d.summary || '',
        skills: Object.entries(d.skills || {}).map(([cat, l]) => ({ cat, items: l.join(', ') })),
        experience: (d.experience || []).map(e => ({ role: '', organization: '', period: '', details: '', ...e })),
        projects: (d.projects || []).map(p => ({ id: p.id, name: p.name || '', category: p.category || '', description: p.description || '', tech: (p.technologies || []).join(', '), github: p.github || '', live: p.live || '', youtubeUrl: p.youtubeUrl || '', orient: p.orient || 'auto', userAdded: !!p.userAdded })),
        education: (d.education || []).map(e => ({ institution: '', degree: '', period: '', details: '', ...e })),
    };
    document.getElementById('cve-overlay').classList.add('open'); document.body.classList.add('modal-open');
    cveRender();
}
function closeCvEditor() {
    document.getElementById('cve-overlay')?.classList.remove('open');
    if (!document.getElementById('cvs-overlay')?.classList.contains('open')) document.body.classList.remove('modal-open');
}

const CVE_FIELDS = {
    experience: [['role', 'Role / Title'], ['organization', 'Organisation'], ['period', 'Period'], ['details', 'Details', true]],
    projects: [['name', 'Name'], ['category', 'Category'], ['description', 'Description', true], ['tech', 'Technologies (comma separated)'], ['github', 'GitHub URL'], ['live', 'Live demo URL'], ['youtubeUrl', 'Video link (YouTube / Google Drive / TikTok / MP4)'], ['orient', 'Video orientation: auto, landscape, portrait or square']],
    education: [['degree', 'Degree / Qualification'], ['institution', 'Institution'], ['period', 'Period'], ['details', 'Details', true]],
};
const CVE_TITLES = { experience: e => e.role || 'New experience', projects: p => p.name || 'New project', education: e => e.degree || 'New qualification' };

function cveInput(label, value, onInput, textarea) {
    const v = esc(value);
    return `<label class="cve-field"><span>${label}</span>${textarea ? `<textarea rows="3" oninput="${onInput}">${v}</textarea>` : `<input type="text" value="${v}" oninput="${onInput}">`}</label>`;
}
function cveList(sec) {
    return `<div class="cve-section"><div class="cve-sec-head"><h3>${{ experience: '💼 Work experience', projects: '🚀 Projects', education: '🎓 Education' }[sec]} <small>(${CVE[sec].length})</small></h3>
        <button class="btn btn-outline btn-sm" onclick="cveAdd('${sec}')">+ Add</button></div>
        ${CVE[sec].map((it, i) => `<details class="cve-item"><summary><span>${esc(CVE_TITLES[sec](it))}</span>
            <span class="cve-item-actions"><button type="button" title="Move up" onclick="event.preventDefault();cveMove('${sec}',${i},-1)">↑</button><button type="button" title="Move down" onclick="event.preventDefault();cveMove('${sec}',${i},1)">↓</button><button type="button" title="Delete" onclick="event.preventDefault();cveDel('${sec}',${i})">🗑</button></span></summary>
            <div class="cve-grid">${CVE_FIELDS[sec].map(([f, l, ta]) => cveInput(l, it[f], `cveSetI('${sec}',${i},'${f}',this.value)`, ta)).join('')}</div></details>`).join('')}
    </div>`;
}
function cveRender() {
    const P = CVE.personal;
    const pf = [['name', 'Display name'], ['fullName', 'Full name (CV)'], ['headline', 'Headline / title'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'], ['portfolio', 'Portfolio'], ['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['facebook', 'Facebook']];
    document.getElementById('cve-body').innerHTML = `
    <div class="cve-section"><h3>👤 Personal</h3><div class="cve-grid">${pf.map(([f, l]) => cveInput(l, P[f], `CVE.personal['${f}']=this.value`)).join('')}</div></div>
    <div class="cve-section"><h3>📝 Professional summary</h3>${cveInput('Summary', CVE.summary, 'CVE.summary=this.value', true)}</div>
    <div class="cve-section"><div class="cve-sec-head"><h3>⚡ Skills <small>(group name + comma separated skills)</small></h3><button class="btn btn-outline btn-sm" onclick="cveAddSkill()">+ Add group</button></div>
        ${CVE.skills.map((s, i) => `<div class="cve-skill-row"><input type="text" value="${esc(s.cat)}" placeholder="Group name" oninput="CVE.skills[${i}].cat=this.value"><input type="text" value="${esc(s.items)}" placeholder="Skill 1, Skill 2, …" oninput="CVE.skills[${i}].items=this.value"><button type="button" onclick="cveMove('skills',${i},-1)">↑</button><button type="button" onclick="cveMove('skills',${i},1)">↓</button><button type="button" onclick="cveDel('skills',${i})">🗑</button></div>`).join('')}</div>
    ${cveList('experience')}${cveList('projects')}${cveList('education')}`;
}
function cveSetI(sec, i, f, v) { CVE[sec][i][f] = v; const s = document.querySelectorAll(`#cve-body details`); /* title refreshes on re-render */ }
function cveAdd(sec) {
    const blank = { experience: { role: '', organization: '', period: '', details: '' }, projects: { id: Date.now(), name: '', category: '', description: '', tech: '', github: 'https://github.com/somidud', live: '#', youtubeUrl: '', orient: 'auto', userAdded: true }, education: { institution: '', degree: '', period: '', details: '' } }[sec];
    CVE[sec].push(blank); cveRender();
    const items = document.querySelectorAll('#cve-body details'); items[items.length - 1]?.setAttribute('open', '');
}
function cveAddSkill() { CVE.skills.push({ cat: '', items: '' }); cveRender(); }
function cveDel(sec, i) { if (!confirm('Remove this entry?')) return; CVE[sec].splice(i, 1); cveRender(); }
function cveMove(sec, i, dir) { const a = CVE[sec], j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; cveRender(); }

function cveCollect() {
    const skills = {};
    CVE.skills.forEach(s => { const c = s.cat.trim(); const l = s.items.split(',').map(x => x.trim()).filter(Boolean); if (c && l.length) skills[c] = l; });
    return {
        pinned: MASTER_CV_DATA.pinned, profile: MASTER_CV_DATA.profile,
        personal: { ...CVE.personal },
        summary: CVE.summary.trim(),
        skills,
        experience: CVE.experience.filter(e => e.role.trim() || e.organization.trim()),
        projects: CVE.projects.filter(p => p.name.trim()).map(p => ({ id: p.id, name: p.name.trim(), category: p.category.trim(), description: p.description.trim(), technologies: p.tech.split(',').map(x => x.trim()).filter(Boolean), github: p.github.trim() || 'https://github.com/somidud', live: p.live.trim() || '#', youtubeUrl: p.youtubeUrl.trim(), orient: (p.orient || 'auto').trim().toLowerCase(), userAdded: !!p.userAdded })),
        education: CVE.education.filter(e => e.degree.trim() || e.institution.trim()),
    };
}
function cveSave() {
    const data = cveCollect();
    if (!data.personal.name.trim()) { showToast('⚠️ Display name is required', 'warning'); return; }
    MASTER_CV_DATA = data; saveCVOverride(); refreshSiteFromCV();
    // keep user-added projects persisted for the legacy store
    saveUserProjects();
    closeCvEditor();
    if (document.getElementById('cvs-overlay')?.classList.contains('open')) { CVS = cvsDefaultState(); cvsRenderControls(); cvsRenderPreview(); }
    showToast('✅ Saved on this device — click ☁️ Publish to show it on all devices', 'success');
}
function cveExport() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(cveCollect(), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'master_cv_data.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function cveImport(input) {
    const f = input.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
        try {
            const d = JSON.parse(r.result);
            if (!d.personal || !d.skills) throw new Error('Not a CV data file');
            MASTER_CV_DATA = d; saveCVOverride(); refreshSiteFromCV(); openCvEditor();
            showToast('⬇ Imported & applied', 'success');
        } catch (e) { showToast('⚠️ Invalid JSON file', 'warning'); }
        input.value = '';
    };
    r.readAsText(f);
}
function cveReset() {
    if (!confirm('Discard all your edits and restore the original CV data?')) return;
    localStorage.removeItem(CV_STORE_KEY); localStorage.removeItem('userProjects'); localStorage.removeItem('pinnedProjects');
    location.reload();
}

// Admin toolbar button + "Edit CV" on the about section appear in admin mode via CSS (body.admin-mode)

