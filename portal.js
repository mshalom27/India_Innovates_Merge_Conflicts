/* ============================================================
   AURA-GRID – portal.js: Portal Login, Route Calculation, Wave Sim
   ============================================================ */

/* ── OTP auto-advance ── */
document.querySelectorAll('.otp-digit').forEach((input, i, arr) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && i < arr.length - 1) arr[i + 1].focus();
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !input.value && i > 0) arr[i - 1].focus();
    });
});

/* ── Login Handler ── */
function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = '⏳ Verifying credentials...';
    btn.disabled = true;

    const role = document.getElementById('login-role').value;
    const userId = document.getElementById('login-id').value;

    setTimeout(() => {
        document.getElementById('portal-login').style.display = 'none';
        document.getElementById('portal-main').style.display = 'block';

        const roleLabels = {
            ambulance: '🚑 Hospital Dispatcher',
            police: '👮 Police Chief',
            vvip: '⭐ VVIP Security Director',
        };
        document.getElementById('portal-role-badge').textContent = roleLabels[role] || '🚑 Hospital Dispatcher';
        document.getElementById('portal-user').textContent = userId;

        addAuditEntry('AUTH', `User ${userId} authenticated via MFA · Role: ${roleLabels[role]}`);
        addAuditEntry('SESSION', `Portal accessed at ${new Date().toLocaleTimeString()} · GPS: 17.3850°N 78.4867°E`);

        // Update button type for ambulance
        if (role === 'vvip') {
            document.getElementById('corridor-type-badge').textContent = '⭐ VVIP Secure Corridor';
            document.querySelectorAll('.cts-opt').forEach((o, i) => {
                if (i === 2) { o.classList.add('active'); } else { o.classList.remove('active'); }
            });
        }
    }, 1800);
}

/* ── Logout ── */
function logout() {
    document.getElementById('portal-main').style.display = 'none';
    document.getElementById('portal-login').style.display = 'flex';
}

/* ── Corridor Type Selection ── */
const typeBadges = {
    ambulance: '🚑 Emergency Green Corridor',
    fire: '🚒 Fire Truck Corridor',
    vvip: '⭐ VVIP Secure Corridor',
};
function setCorridorType(el) {
    document.querySelectorAll('.cts-opt').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
    const type = el.dataset.type;
    const badge = document.getElementById('corridor-type-badge');
    if (badge) badge.textContent = typeBadges[type] || typeBadges.ambulance;
}

/* ── Swap Locations ── */
function swapLocations() {
    const oEl = document.getElementById('origin');
    const dEl = document.getElementById('dest');
    const tmp = oEl.value;
    oEl.value = dEl.value;
    dEl.value = tmp;
}

/* ── Calculate Route ── */
function calculateRoute() {
    const origin = document.getElementById('origin').value;
    const dest = document.getElementById('dest').value;
    if (!origin || !dest) return;

    const btn = document.querySelector('[onclick="calculateRoute()"]');
    btn.textContent = '⏳ Calculating optimal route...';
    btn.disabled = true;

    addAuditEntry('ROUTE', `Route calculation initiated: ${origin} → ${dest}`);

    setTimeout(() => {
        btn.textContent = '🗺️ Calculate Optimal Route';
        btn.disabled = false;
        document.getElementById('route-results').style.display = 'flex';

        // Show corridor path on SVG map
        const path = document.getElementById('corridor-path');
        if (path) { path.style.opacity = '1'; path.style.transition = 'opacity 0.5s ease'; }

        addAuditEntry('ROUTE', `AI path computed: 6 nodes · Est. 4m 12s · 0 stops`);
        // Animate ambulance on map
        startMapAmbulance();
    }, 2000);
}

/* ── Initiate Green Wave ── */
let etaSeconds = 252;
let portalEtaTimer = null;

function initiateWave() {
    const btn = document.getElementById('initiate-btn');
    if (btn) {
        btn.textContent = '⏳ Activating corridor nodes...';
        btn.disabled = true;
    }
    addAuditEntry('CORRIDOR', '🚦 GREEN WAVE INITIATED — All 6 nodes preempting');

    setTimeout(() => {
        if (btn) btn.style.display = 'none';
        const statusPanel = document.getElementById('corridor-status-panel');
        if (statusPanel) statusPanel.style.display = 'block';

        addAuditEntry('CORRIDOR', '✅ Nodes N-05, N-06 turned GREEN · Preempting N-07, N-08');

        // Start ETA countdown
        portalEtaTimer = setInterval(() => {
            etaSeconds = Math.max(0, etaSeconds - 1);
            const m = Math.floor(etaSeconds / 60);
            const s = etaSeconds % 60;
            const el = document.getElementById('portal-eta');
            if (el) el.textContent = `${m}m ${s.toString().padStart(2, '0')}s`;
            if (etaSeconds === 0) { clearInterval(portalEtaTimer); arrivedAtHospital(); }
        }, 1000);
    }, 2500);
}

function arrivedAtHospital() {
    addAuditEntry('CORRIDOR', '🏥 Ambulance arrived at City General Hospital · Time saved: 7m 08s');
    addAuditEntry('CORRIDOR', '✅ Corridor closed · All 6 nodes returned to AI Dynamic Mode');
}

function deactivateCorridor() {
    if (portalEtaTimer) clearInterval(portalEtaTimer);
    document.getElementById('corridor-status-panel').style.display = 'none';
    addAuditEntry('CORRIDOR', '⛔ Corridor manually terminated by dispatcher');
}

/* ── Audit Log ── */
function addAuditEntry(type, msg) {
    const log = document.getElementById('audit-log');
    if (!log) return;
    const badgeMap = {
        AUTH: 'badge-cyan', SESSION: 'badge-violet', ROUTE: 'badge-amber', CORRIDOR: 'badge-green',
    };
    const entry = document.createElement('div');
    entry.className = 'audit-entry';
    entry.innerHTML = `
    <span class="mono" style="color:var(--text-muted);font-size:0.68rem;">[${new Date().toLocaleTimeString()}]</span>
    <span class="badge ${badgeMap[type] || 'badge-cyan'}" style="font-size:0.65rem;">${type}</span>
    <span style="font-size:0.78rem;">${msg}</span>
  `;
    log.prepend(entry);
}

/* ── Map Ambulance Animation ── */
let mapAmbX = 100;
let mapAmbY = 300;
let mapFrame;

function startMapAmbulance() {
    const amb = document.getElementById('map-amb');
    if (!amb) return;
    if (mapFrame) cancelAnimationFrame(mapFrame);

    // Path waypoints on SVG
    const waypoints = [
        { x: 140, y: 300 },
        { x: 140, y: 190 },
        { x: 280, y: 190 },
        { x: 280, y: 80 },
        { x: 420, y: 80 },
    ];
    let wpIdx = 0;

    function step() {
        if (wpIdx >= waypoints.length) return;
        const target = waypoints[wpIdx];
        const dx = target.x - mapAmbX;
        const dy = target.y - mapAmbY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) {
            mapAmbX = target.x; mapAmbY = target.y;
            wpIdx++;
        } else {
            const speed = 1.5;
            mapAmbX += (dx / dist) * speed;
            mapAmbY += (dy / dist) * speed;
        }
        amb.setAttribute('x', mapAmbX);
        amb.setAttribute('y', mapAmbY);
        mapFrame = requestAnimationFrame(step);
    }
    step();
}

/* ── Console Easter Egg ── */
console.log('%c🔒 AURA-GRID Green Corridor Portal', 'font-size:16px;font-weight:900;color:#a78bfa;');
console.log('%cAll sessions logged · Unauthorized access prosecutable', 'color:#ff3b5c;');
