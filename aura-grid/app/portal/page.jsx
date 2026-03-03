'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';

// Leaflet must be loaded client-side only (no SSR)
const DelhiMap = dynamic(() => import('@/components/DelhiMap'), {
    ssr: false, loading: () => (
        <div style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#00f5ff', fontSize: '0.9rem' }}>🗺️ Loading Delhi Map…</div>
    )
});

/* ── OTP Input ── */
function OtpInput() {
    const refs = Array.from({ length: 6 }, () => useRef(null));
    const defaults = ['4', '2', '7', '8', '1', '9'];
    return (
        <div className="flex gap-2 justify-center">
            {defaults.map((d, i) => (
                <input key={i} ref={refs[i]} type="text" maxLength={1} defaultValue={d}
                    onInput={e => { if (e.target.value && i < 5) refs[i + 1].current?.focus(); }}
                    onKeyDown={e => { if (e.key === 'Backspace' && !e.target.value && i > 0) refs[i - 1].current?.focus(); }}
                    className="w-11 h-12 text-center bg-white/5 border border-white/10 rounded-lg text-xl font-bold font-mono text-text-primary outline-none focus:border-[#a78bfa] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"
                />
            ))}
        </div>
    );
}

/* CityMap removed — replaced by DelhiMap (react-leaflet, loaded dynamically) */

/* ── Main Portal ── */
export default function PortalPage() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [role, setRole] = useState('ambulance');
    const [userId, setUserId] = useState('DISP-AMB-0042');
    const [corridorType, setCorridorType] = useState('ambulance');
    const [routeShown, setRouteShown] = useState(false);
    const [corridorActive, setCorridorActive] = useState(false);
    const [etaSec, setEtaSec] = useState(252);
    const [showCorridor, setShowCorridor] = useState(false);
    const [auditLog, setAuditLog] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [initiating, setInitiating] = useState(false);
    const [activeNode, setActiveNode] = useState(null); // index of node ambulance is currently at

    const handleNodeUpdate = useCallback((n) => {
        setActiveNode(n);
        const NODES = ['Dwarka Mor Chowk', 'Palam Vihar', 'Dhaula Kuan', 'Shankar Vihar', 'AIIMS Gate'];
        if (n < NODES.length) addAudit('CORRIDOR', `🚑 Ambulance at ${NODES[n]}`);
        else addAudit('CORRIDOR', '🏥 Ambulance arrived at AIIMS, New Delhi');
    }, []);

    const addAudit = (type, msg) => {
        setAuditLog(prev => [{ type, msg, time: new Date().toLocaleTimeString() }, ...prev]);
    };

    // ETA countdown
    useEffect(() => {
        if (!corridorActive) return;
        const t = setInterval(() => setEtaSec(s => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [corridorActive]);


    function handleLogin(e) {
        e.preventDefault();
        setTimeout(() => {
            setLoggedIn(true);
            addAudit('AUTH', `User ${userId} authenticated via MFA`);
            addAudit('SESSION', `Portal accessed at ${new Date().toLocaleTimeString()}`);
        }, 1800);
    }

    function calcRoute() {
        setCalculating(true);
        addAudit('ROUTE', 'Route calculation initiated: Dwarka Sector 12 → AIIMS, New Delhi');
        setTimeout(() => {
            setCalculating(false);
            setRouteShown(true);
            setShowCorridor(true);
            addAudit('ROUTE', 'AI path computed via OSRM: 5 nodes · 4m 12s · 0 stops');
        }, 2000);
    }

    function initiateWave() {
        setInitiating(true);
        addAudit('CORRIDOR', '🚦 GREEN WAVE INITIATED — 5 Delhi nodes preempting');
        setTimeout(() => {
            setInitiating(false);
            setCorridorActive(true);
            addAudit('CORRIDOR', '✅ Dwarka Mor + Palam Vihar GREEN · Preempting Dhaula Kuan, Shankar Vihar');
        }, 2500);
    }

    function deactivate() {
        setCorridorActive(false);
        setActiveNode(null);
        addAudit('CORRIDOR', '⛔ Corridor manually terminated by dispatcher');
    }

    const roleLabels = { ambulance: '🚑 Hospital Dispatcher', police: '👮 Police Chief', vvip: '⭐ VVIP Security Director' };
    const etaStr = `${Math.floor(etaSec / 60)}m ${(etaSec % 60).toString().padStart(2, '0')}s`;

    /* ── LOGIN SCREEN ── */
    if (!loggedIn) return (
        <div className="min-h-screen bg-bg-deep font-sans flex items-center justify-center relative overflow-hidden">
            <div className="grid-bg" />
            <div className="glow-blob" style={{ width: '500px', height: '500px', top: '-200px', left: '-100px', opacity: 0.5, background: 'rgba(0,245,255,0.12)' }} />
            <div className="glow-blob" style={{ width: '400px', height: '400px', bottom: '-100px', right: '-100px', opacity: 0.4, background: 'rgba(124,58,237,0.12)' }} />

            <div className="relative z-10 w-full max-w-md mx-4 bg-[rgba(13,17,23,0.9)] backdrop-blur-xl border border-[rgba(124,58,237,0.25)] rounded-[32px] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(124,58,237,0.1)]">
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center gap-2.5 font-extrabold text-2xl mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center text-2xl neon-cyan">⬡</div>
                        <span><span className="text-accent-cyan">AURA</span>-GRID</span>
                    </div>
                    <Badge variant="violet">🔒 Secure Access Portal</Badge>
                    <h2 className="text-xl font-bold mt-3">Green Corridor Dispatcher</h2>
                    <p className="text-text-secondary text-sm mt-1 text-center">Authorized personnel only. All sessions are monitored and logged.</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Dispatcher ID / Badge Number</label>
                        <input className="input-field" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. DISP-AMB-0042" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Access Role</label>
                        <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
                            <option value="ambulance">🚑 Hospital Dispatcher (Ambulance)</option>
                            <option value="police">👮 Police Chief (Emergency)</option>
                            <option value="vvip">⭐ VVIP Security Director</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Access Code</label>
                        <input type="password" className="input-field" defaultValue="secret123" placeholder="••••••••" />
                    </div>
                    {/* MFA */}
                    <div className="bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.2)] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-3"><span>📱</span><span className="text-sm font-semibold">Multi-Factor Verification</span><Badge variant="violet" className="ml-auto">OTP Sent</Badge></div>
                        <OtpInput />
                    </div>
                    <button type="submit" className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black shadow-[0_0_20px_rgba(0,245,255,0.3)] hover:shadow-[0_0_30px_rgba(0,245,255,0.6)] transition-all font-sans cursor-pointer">
                        🔐 Authenticate & Access Portal
                    </button>
                </form>

                <div className="mt-5 pt-4 border-t border-white/5 text-center text-[0.7rem] text-text-muted">
                    🛡️ Secured with AES-256 · JWT · RBAC + MFA<br />
                    Session will be logged with timestamp, user ID, and GPS coordinates
                </div>
            </div>
        </div>
    );

    /* ── PORTAL MAIN ── */
    return (
        <div className="min-h-screen bg-bg-deep font-sans relative">
            <div className="grid-bg" />
            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-10 py-3.5 bg-bg-deep/95 border-b border-white/5 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl no-underline text-white">
                    <div className="w-8 h-8 rounded-[6px] bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center neon-cyan">⬡</div>
                    <span><span className="text-accent-cyan">AURA</span>-GRID</span>
                </Link>
                <div className="flex items-center gap-2.5">
                    <Badge variant="violet">{roleLabels[role]}</Badge>
                    <Badge variant="green"><StatusDot color="green" className="mr-1" />Session Active</Badge>
                    <span className="text-[0.78rem] text-text-muted font-mono">{userId}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">🖥 Dashboard</Link>
                    <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">← Home</Link>
                    <button onClick={() => setLoggedIn(false)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">Logout</button>
                </div>
            </nav>

            <div className="relative z-10 max-w-[1400px] mx-auto px-10 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-6">

                    {/* LEFT – Route Planner */}
                    <div className="flex flex-col gap-5">
                        <div className="bg-bg-card border border-white/5 rounded-xl p-6">
                            <Badge variant="red" id="cbadge">{corridorType === 'ambulance' ? '🚑 Emergency Green Corridor' : corridorType === 'fire' ? '🚒 Fire Truck Corridor' : '⭐ VVIP Secure Corridor'}</Badge>
                            <h3 className="text-lg font-bold mt-2.5 mb-1">Initiate Route</h3>
                            <p className="text-text-secondary text-sm mb-5">Set origin and destination. Our AI calculates the optimal path.</p>

                            {/* Corridor type */}
                            <div className="flex gap-2 mb-5">
                                {[['ambulance', '🚑', 'Ambulance'], ['fire', '🚒', 'Fire Truck'], ['vvip', '⭐', 'VVIP']].map(([v, ic, l]) => (
                                    <button key={v} onClick={() => setCorridorType(v)}
                                        className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm transition-all font-sans cursor-pointer ${corridorType === v ? 'bg-accent-cyan/10 border-accent-cyan/35 text-accent-cyan' : 'bg-white/[0.03] border-white/5 text-text-secondary hover:border-accent-cyan/25'}`}>
                                        <span className="text-xl">{ic}</span><span>{l}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col gap-3.5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Origin</label>
                                    <input className="input-field" defaultValue="Dwarka Sector 12, New Delhi" />
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <button className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:border-accent-cyan/30 text-base font-sans cursor-pointer">⇅</button>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Destination</label>
                                    <input className="input-field" defaultValue="AIIMS Hospital, New Delhi" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Vehicle ID</label>
                                        <input className="input-field" defaultValue="AMB-042" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Priority</label>
                                        <select className="input-field" style={{ color: '#0f172a', background: '#ffffff' }}>
                                            <option style={{ color: '#0f172a', background: '#ffffff' }}>🔴 Critical (Cardiac Arrest)</option>
                                            <option style={{ color: '#0f172a', background: '#ffffff' }}>🟠 High (Trauma)</option>
                                            <option style={{ color: '#0f172a', background: '#ffffff' }}>🟡 Medium</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={calcRoute} disabled={calculating}
                                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black disabled:opacity-60 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all font-sans cursor-pointer">
                                    {calculating ? '⏳ Calculating...' : '🗺️ Calculate Optimal Route'}
                                </button>
                            </div>

                            {/* Route results */}
                            {routeShown && (
                                <div className="mt-5 pt-5 border-t border-white/10 flex flex-col gap-4">
                                    <div className="text-[0.7rem] text-text-muted uppercase tracking-widest mb-1">AI Route Analysis</div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
                                            <div className="text-[0.68rem] text-text-muted uppercase mb-1">Standard GPS Route</div>
                                            <div className="text-2xl font-extrabold font-mono text-accent-amber">11m 20s</div>
                                            <div className="text-xs text-text-secondary mt-1">Via Highway 4 (congested)</div>
                                            <div className="text-xs text-text-muted mt-1.5">🛑 4 red light stops</div>
                                        </div>
                                        <div className="text-xs font-extrabold text-text-muted bg-white/5 border border-white/10 rounded-full px-2.5 py-1.5">VS</div>
                                        <div className="flex-1 bg-accent-green/5 border border-accent-green/30 rounded-xl p-3.5">
                                            <div className="text-[0.68rem] text-text-muted uppercase mb-1">AURA-GRID AI Route ⚡</div>
                                            <div className="text-2xl font-extrabold font-mono text-accent-green">4m 12s</div>
                                            <div className="text-xs text-text-secondary mt-1">Via MG Road (cleared)</div>
                                            <div className="text-xs text-accent-green mt-1.5">✅ 0 stops</div>
                                        </div>
                                    </div>
                                    {/* Node list */}
                                    <div>
                                        <div className="text-[0.7rem] text-text-muted uppercase tracking-widest mb-2">Route Nodes (6 Intersections)</div>
                                        <div className="flex flex-col gap-1.5">
                                            {[['N-05', 'Dwarka Mor Chowk', 'green', 'Ready'], ['N-06', 'Palam Vihar Intersection', 'green', 'Ready'], ['N-07', 'Dhaula Kuan Flyover', 'amber', 'Queued'], ['N-08', 'Shankar Vihar Junction', 'amber', 'Queued'], ['N-09', 'AIIMS Gate', 'cyan', 'Standby'], ['H-01', 'AIIMS, New Delhi', 'cyan', 'Standby']].map(([id, name, c, s]) => (
                                                <div key={id} className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs">
                                                    <span className="text-accent-cyan font-mono">{id}</span><span className="text-text-secondary flex-1">{name}</span><Badge variant={c} className="text-[0.62rem]">{s}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {!corridorActive && (
                                        <button onClick={initiateWave} disabled={initiating}
                                            className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-br from-accent-green to-[#00cc7a] text-black shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.6)] disabled:opacity-60 transition-all font-sans cursor-pointer">
                                            {initiating ? '⏳ Activating nodes...' : '🚦 Initiate Green Wave Now'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT – Map + Status */}
                    <div className="flex flex-col gap-5">
                        <div className="bg-bg-card border border-white/5 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-3">
                                <div><h3 className="text-base font-bold">Delhi Traffic Map</h3><p className="text-text-secondary text-xs">Live route · Dwarka → AIIMS via OSRM</p></div>
                                <Badge variant="cyan"><StatusDot color="cyan" className="mr-1" />Live</Badge>
                            </div>
                            <DelhiMap showCorridor={showCorridor} corridorActive={corridorActive} onNodeUpdate={handleNodeUpdate} />
                        </div>

                        {/* Corridor status */}
                        {corridorActive && (
                            <div className="bg-bg-card border border-white/5 rounded-xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div><Badge variant="red">🚨 GREEN WAVE ACTIVE</Badge><h3 className="mt-2 text-base font-bold">Corridor: AMB-042 → AIIMS, New Delhi</h3></div>
                                    <button onClick={deactivate} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">⛔ Terminate</button>
                                </div>
                                {/* Dynamic timeline — updates as ambulance moves */}
                                <div className="flex flex-col gap-0">
                                    {(() => {
                                        // All stops: origin + 5 nodes + destination
                                        const stops = [
                                            { label: 'Origin — Dwarka Sec 12', isOrigin: true },
                                            { label: 'N-05 · Dwarka Mor Chowk', nodeIdx: 0 },
                                            { label: 'N-06 · Palam Vihar', nodeIdx: 1 },
                                            { label: 'N-07 · Dhaula Kuan', nodeIdx: 2 },
                                            { label: 'N-08 · Shankar Vihar', nodeIdx: 3 },
                                            { label: 'N-09 → AIIMS Gate', nodeIdx: 4 },
                                        ];
                                        return stops.map(({ label, isOrigin, nodeIdx }, i, a) => {
                                            let type, status;
                                            if (isOrigin) {
                                                type = 'done'; status = '✓ Departed';
                                            } else if (activeNode === null) {
                                                type = 'pending'; status = 'Queued';
                                            } else if (nodeIdx < activeNode) {
                                                type = 'done'; status = '✓ Cleared';
                                            } else if (nodeIdx === activeNode) {
                                                type = 'active'; status = '🚑 In Transit';
                                            } else if (nodeIdx === activeNode + 1) {
                                                type = 'prep'; status = '⏱ Preempting';
                                            } else {
                                                type = 'pending'; status = 'Queued';
                                            }
                                            return (
                                                <div key={label} className="flex items-start gap-3 relative pb-2">
                                                    {i < a.length - 1 && <div className={`absolute left-[7px] top-4 w-0.5 h-full ${type === 'done' ? 'bg-accent-green/30' : type === 'active' ? 'bg-accent-cyan/30' : 'bg-white/10'}`} />}
                                                    <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 mt-0.5 ${type === 'done' ? 'bg-accent-green border-accent-green/50' :
                                                            type === 'active' ? 'bg-accent-cyan border-accent-cyan shadow-neon-cyan animate-pulse-dot' :
                                                                type === 'prep' ? 'bg-accent-amber border-accent-amber/50' : 'bg-[#334155] border-[#475569]'}`} />
                                                    <div>
                                                        <div className="text-sm font-semibold">{label}</div>
                                                        <div className={`text-xs mt-0.5 ${type === 'done' ? 'text-accent-green' : type === 'active' ? 'text-accent-cyan' : type === 'prep' ? 'text-accent-amber' : 'text-text-muted'}`}>{status}</div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                                    {[['ETA', etaStr, 'text-accent-green'], ['Stops', '0', 'text-accent-green'], ['Time Saved', '7m 08s', 'text-accent-cyan']].map(([l, v, c]) => (
                                        <div key={l}><div className="text-[0.65rem] text-text-muted uppercase tracking-wide mb-1">{l}</div><div className={`font-bold font-mono text-lg ${c}`}>{v}</div></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
