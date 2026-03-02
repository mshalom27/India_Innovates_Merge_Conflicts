/* ============================================================
   AURA-GRID – dashboard.js: Live Simulation Engine
   ============================================================ */

/* ── Intersection node data ── */
const NODES = [
    { id: 'N-01', name: 'Central Sq × Main Blvd', density: 72, corridor: false, emergency: false },
    { id: 'N-02', name: 'Park St × Ring Rd', density: 34, corridor: false, emergency: false },
    { id: 'N-03', name: 'Airport Blvd × NH-4', density: 28, corridor: false, emergency: false },
    { id: 'N-04', name: 'Tech Park × Outer Ring', density: 61, corridor: false, emergency: false },
    { id: 'N-05', name: 'Civil Lines × MG Rd', density: 82, corridor: true, emergency: false },
    { id: 'N-06', name: 'Station Rd × Nehru Nagar', density: 91, corridor: true, emergency: false },
    { id: 'N-07', name: 'MG Road × Park Street', density: 55, corridor: true, emergency: true },
    { id: 'N-08', name: 'Jubilee Hills × NH-65', density: 47, corridor: true, emergency: false },
    { id: 'N-09', name: 'Sec 12 × Residential', density: 18, corridor: false, emergency: false },
    { id: 'N-10', name: 'Old City × Bazaar Rd', density: 78, corridor: false, emergency: false },
    { id: 'N-11', name: 'North Ave × Bypass', density: 43, corridor: false, emergency: false },
    { id: 'N-12', name: 'Outer Ring × Factory Rd', density: 23, corridor: false, emergency: false },
    { id: 'N-13', name: 'High Court × Museum Rd', density: 67, corridor: false, emergency: false },
    { id: 'N-14', name: 'East Gate × Highway 7', density: 52, corridor: false, emergency: false },
    { id: 'N-15', name: 'West End × Lake Blvd', density: 38, corridor: false, emergency: false },
    { id: 'N-16', name: 'Sec 4 × Arterial Rd', density: 84, corridor: false, emergency: false },
    { id: 'N-17', name: 'South Ring × Bypass', density: 29, corridor: false, emergency: false },
    { id: 'N-18', name: 'Commercial St × CBD', density: 95, corridor: false, emergency: false },
    { id: 'N-19', name: 'University Rd × NH-9', density: 41, corridor: false, emergency: false },
    { id: 'N-20', name: 'Industrial × Canal Rd', density: 14, corridor: false, emergency: false },
    { id: 'N-21', name: 'Stadium Rd × Bus Depot', density: 73, corridor: false, emergency: false },
    { id: 'N-22', name: 'Sector 7 × Metro Link', density: 57, corridor: false, emergency: false },
    { id: 'N-23', name: 'Port Rd × Dock Gate', density: 32, corridor: false, emergency: false },
    { id: 'N-24', name: 'City Hospital × Sec 9', density: 48, corridor: false, emergency: false },
];

/* ── Render intersection grid ── */
function densityColor(d) {
    if (d < 40) return 'var(--accent-green)';
    if (d < 70) return 'var(--accent-amber)';
    return 'var(--accent-red)';
}
function densityLight(d) {
    if (d < 40) return 'on-green';
    if (d < 70) return 'on-amber';
    return 'on-red';
}

function renderGrid() {
    const grid = document.getElementById('intersection-grid');
    if (!grid) return;
    grid.innerHTML = '';
    NODES.forEach((node, i) => {
        const div = document.createElement('div');
        div.className = 'int-node' +
            (node.corridor ? ' active-corridor' : '') +
            (node.emergency ? ' emergency' : '');
        div.onclick = () => showNodeDetail(node);
        const col = densityColor(node.density);
        const lc = densityLight(node.density);
        div.innerHTML = `
      <div>
        <div class="int-node-id">${node.id}</div>
        <div class="int-node-name">${node.name}</div>
      </div>
      <div class="int-node-density" style="color:${col}">${node.density}%</div>
      <div class="int-tl">
        <div class="int-tl-dot ${lc === 'on-red' ? 'on-red' : ''}"></div>
        <div class="int-tl-dot ${lc === 'on-amber' ? 'on-amber' : ''}"></div>
        <div class="int-tl-dot ${lc === 'on-green' ? 'on-green' : ''}"></div>
      </div>
    `;
        grid.appendChild(div);
    });
}

/* ── Node detail panel ── */
function showNodeDetail(node) {
    const panel = document.getElementById('node-detail');
    document.getElementById('nd-id').textContent = node.id;
    document.getElementById('nd-name').textContent = node.name;
    const ns = Math.min(node.density + 10, 99);
    const ew = Math.max(100 - node.density - 10, 5);
    document.getElementById('nd-ns').textContent = ns + '%';
    document.getElementById('nd-ew').textContent = ew + '%';
    document.getElementById('nd-ns-bar').style.width = ns + '%';
    document.getElementById('nd-ew-bar').style.width = ew + '%';
    document.getElementById('nd-cycle').textContent = Math.round(15 + node.density * 0.4) + 's';
    document.getElementById('nd-det').textContent = (800 + Math.round(node.density * 15)).toLocaleString();
    panel.classList.add('visible');
}
function closeNodeDetail() {
    document.getElementById('node-detail').classList.remove('visible');
}
function activateCorridor() {
    showToast();
}

/* ── Live data simulation ── */
function simulateLiveDensity() {
    NODES.forEach(node => {
        const delta = Math.floor(Math.random() * 7) - 3;
        node.density = Math.max(5, Math.min(99, node.density + delta));
    });
    renderGrid();
    updateSidebarDensities();
}

function updateSidebarDensities() {
    const lanes = [
        { id: 'ld-1', txtId: 'ld-1-txt', node: 15 },
        { id: 'ld-2', txtId: 'ld-2-txt', node: 10 },
        { id: 'ld-3', txtId: 'ld-3-txt', node: 2 },
        { id: 'ld-4', txtId: 'ld-4-txt', node: 11 },
        { id: 'ld-5', txtId: 'ld-5-txt', node: 17 },
    ];
    lanes.forEach(l => {
        const d = NODES[l.node].density;
        const el = document.getElementById(l.id);
        const txt = document.getElementById(l.txtId);
        if (el) { el.style.width = d + '%'; el.style.background = densityColor(d); }
        if (txt) { txt.textContent = d + '%'; txt.style.color = densityColor(d); }
    });
}

/* ── ETA countdown ── */
let etaSeconds = 222;
function updateETA() {
    etaSeconds = Math.max(0, etaSeconds - 1);
    const m = Math.floor(etaSeconds / 60);
    const s = etaSeconds % 60;
    const el = document.getElementById('amb-eta');
    if (el) el.textContent = `${m}m ${s.toString().padStart(2, '0')}s`;
    const speedEl = document.getElementById('amb-speed');
    if (speedEl) {
        const spd = 60 + Math.floor(Math.random() * 20);
        speedEl.textContent = spd + ' km/h';
    }
}

/* ── Traffic flow chart ── */
function drawChart() {
    const canvas = document.getElementById('flowChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    const data = [];
    for (let i = 0; i < 24; i++) {
        data.push(20 + Math.random() * 60 + Math.sin(i * 0.5) * 20);
    }

    ctx.clearRect(0, 0, w, h);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,245,255,0.3)');
    grad.addColorStop(1, 'rgba(0,245,255,0.0)');

    ctx.beginPath();
    data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (val / 100) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (val / 100) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(0,245,255,0.8)'; ctx.lineWidth = 2;
    ctx.stroke();
}

/* ── Toast ── */
function showToast() {
    const t = document.getElementById('toast');
    if (!t) return;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 5000);
}
function closeToast() {
    document.getElementById('toast').classList.remove('show');
}

/* ── Simulate emergency button ── */
function simulateAlert() {
    const randomNode = NODES[Math.floor(Math.random() * NODES.length)];
    randomNode.emergency = true;
    renderGrid();
    showToast();

    // Alert list prepend
    const alertList = document.getElementById('alert-list');
    if (alertList) {
        const item = document.createElement('div');
        item.className = 'alert-item alert-red';
        item.innerHTML = `
      <div class="alert-dot" style="background:var(--accent-red);"></div>
      <div>
        <div class="alert-msg">🚑 Visual Override — ${randomNode.id}: Ambulance detected (97.8%)</div>
        <div class="alert-time mono">${new Date().toLocaleTimeString()}</div>
      </div>`;
        alertList.prepend(item);
    }

    // Reset after 8s
    setTimeout(() => {
        randomNode.emergency = false;
        renderGrid();
    }, 8000);
}

/* ── Mode selector ── */
document.querySelectorAll('.mode-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.mode-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
    });
});

/* ── Init ── */
renderGrid();
drawChart();

setInterval(simulateLiveDensity, 2200);
setInterval(updateETA, 1000);
setInterval(drawChart, 5000);

// Show toast after 3 seconds for drama
setTimeout(showToast, 3000);
