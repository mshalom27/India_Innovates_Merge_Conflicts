'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';
import { DELHI_NODES, dijkstra } from '@/components/DelhiMap';

// Leaflet must be loaded client-side only (no SSR)
const DelhiMap = dynamic(() => import('@/components/DelhiMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#00f5ff', fontSize: '0.9rem' }}>
            Loading map…
        </div>
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
    const [activeNode, setActiveNode] = useState(null);
    const [vehicleId, setVehicleId] = useState('AMB-042');

    // Origin / destination selection
    const [originId, setOriginId] = useState('DWK');       // Dwarka Sector 12
    const [destinationId, setDestinationId] = useState('AIM'); // AIIMS

    // Computed shortest path (array of node IDs)
    const [pathNodeIds, setPathNodeIds] = useState([]);
    const [pathDistKm, setPathDistKm] = useState(null);

    // Derived: intermediate nodes on the current path (excl. origin/dest)
    const intermediateNodes = pathNodeIds
        .slice(1, -1)
        .map(id => DELHI_NODES.find(n => n.id === id))
        .filter(Boolean);

    const originNode = DELHI_NODES.find(n => n.id === originId) || DELHI_NODES[0];
    const destNode = DELHI_NODES.find(n => n.id === destinationId) || DELHI_NODES[7];

    const handleNodeUpdate = useCallback((n) => {
        setActiveNode(n);
        if (n < intermediateNodes.length) {
            addAudit('CORRIDOR', `Vehicle at ${intermediateNodes[n]?.name || 'waypoint'}`);
        } else {
            addAudit('CORRIDOR', `Vehicle arrived at ${destNode.name}`);
        }
    }, [intermediateNodes, destNode]);

    const addAudit = (type, msg) => {
        setAuditLog(prev => [{ type, msg, time: new Date().toLocaleTimeString() }, ...prev]);
    };

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
        if (originId === destinationId) return;
        setCalculating(true);
        addAudit('ROUTE', `Route calculation: ${originNode.name} → ${destNode.name}`);

        setTimeout(() => {
            // Run Dijkstra
            const { path, totalDist } = dijkstra(
                // We need to pass the graph — build it on the fly using the exported nodes
                buildGraphLocal(),
                originId,
                destinationId
            );
            setPathNodeIds(path);
            setPathDistKm(totalDist === Infinity ? null : (totalDist / 1000).toFixed(1));
            setCalculating(false);
            setRouteShown(true);
            setShowCorridor(true);
            setCorridorActive(false);
            setActiveNode(null);
            const via = path.length > 2 ? `${path.length - 2} waypoints` : 'direct';
            addAudit('ROUTE', `Dijkstra path: ${path.length} nodes · ${(totalDist / 1000).toFixed(1)} km · via ${via}`);
        }, 1500);
    }

    function initiateWave() {
        setInitiating(true);
        addAudit('CORRIDOR', `GREEN WAVE INITIATED — ${intermediateNodes.length} nodes preempting`);
        // Reset ETA based on distance (~40 km/h avg)
        if (pathDistKm) setEtaSec(Math.round(pathDistKm / 40 * 3600));
        setTimeout(() => {
            setInitiating(false);
            setCorridorActive(true);
            addAudit('CORRIDOR', `${originNode.name} cleared · En route to ${destNode.name}`);
        }, 2000);
    }

    function deactivate() {
        setCorridorActive(false);
        setActiveNode(null);
        addAudit('CORRIDOR', 'Corridor manually terminated by dispatcher');
    }

    function swapOriginDest() {
        setOriginId(destinationId);
        setDestinationId(originId);
        setRouteShown(false);
        setShowCorridor(false);
        setCorridorActive(false);
        setPathNodeIds([]);
    }

    const roleLabels = {
        ambulance: 'Hospital Dispatcher',
        police: 'Police Chief',
        vvip: 'VVIP Security Director'
    };
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
                    <Badge variant="violet">Secure Access Portal</Badge>
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
                            <option value="ambulance">Hospital Dispatcher (Ambulance)</option>
                            <option value="police">Police Chief (Emergency)</option>
                            <option value="vvip">VVIP Security Director</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Access Code</label>
                        <input type="password" className="input-field" defaultValue="secret123" placeholder="••••••••" />
                    </div>
                    {/* MFA */}
                    <div className="bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.2)] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-semibold">Multi-Factor Verification</span>
                            <Badge variant="violet" className="ml-auto">OTP Sent</Badge>
                        </div>
                        <OtpInput />
                    </div>
                    <button type="submit" className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black shadow-[0_0_20px_rgba(0,245,255,0.3)] hover:shadow-[0_0_30px_rgba(0,245,255,0.6)] transition-all font-sans cursor-pointer">
                        Authenticate &amp; Access Portal
                    </button>
                </form>

                <div className="mt-5 pt-4 border-t border-white/5 text-center text-[0.7rem] text-text-muted">
                    Secured with AES-256 · JWT · RBAC + MFA<br />
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
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">Dashboard</Link>
                    <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">← Home</Link>
                    <button onClick={() => setLoggedIn(false)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">Logout</button>
                </div>
            </nav>

            <div className="relative z-10 max-w-[1400px] mx-auto px-10 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-6">

                    {/* LEFT – Route Planner */}
                    <div className="flex flex-col gap-5">
                        <div className="bg-bg-card border border-white/5 rounded-xl p-6">
                            <Badge variant="red" id="cbadge">
                                {corridorType === 'ambulance' ? 'Emergency Green Corridor' : corridorType === 'fire' ? 'Fire Truck Corridor' : 'VVIP Secure Corridor'}
                            </Badge>
                            <h3 className="text-lg font-bold mt-2.5 mb-1">Initiate Route</h3>
                            <p className="text-text-secondary text-sm mb-5">Select origin and destination. Dijkstra&apos;s algorithm computes the shortest path.</p>

                            {/* Corridor type */}
                            <div className="flex gap-2 mb-5">
                                {[['ambulance', 'Ambulance'], ['fire', 'Fire Truck'], ['vvip', 'VVIP']].map(([v, l]) => (
                                    <button key={v} onClick={() => setCorridorType(v)}
                                        className={`flex-1 py-3 px-2 rounded-xl border text-sm transition-all font-sans cursor-pointer ${corridorType === v ? 'bg-accent-cyan/10 border-accent-cyan/35 text-accent-cyan' : 'bg-white/[0.03] border-white/5 text-text-secondary hover:border-accent-cyan/25'}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col gap-3.5">
                                {/* Origin dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Origin</label>
                                    <select className="input-field" style={{ color: '#f1f5f9', background: '#111827' }} value={originId} onChange={e => { setOriginId(e.target.value); setRouteShown(false); setShowCorridor(false); setCorridorActive(false); }}>
                                        {DELHI_NODES.map(n => (
                                            <option key={n.id} value={n.id} disabled={n.id === destinationId} style={{ color: '#0f172a', background: '#f8fafc' }}>{n.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Swap button */}
                                <div className="flex items-center gap-2.5">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <button onClick={swapOriginDest} title="Swap origin and destination"
                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:border-accent-cyan/30 text-base font-sans cursor-pointer">
                                        ⇅
                                    </button>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {/* Destination dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Destination</label>
                                    <select className="input-field" style={{ color: '#f1f5f9', background: '#111827' }} value={destinationId} onChange={e => { setDestinationId(e.target.value); setRouteShown(false); setShowCorridor(false); setCorridorActive(false); }}>
                                        {DELHI_NODES.map(n => (
                                            <option key={n.id} value={n.id} disabled={n.id === originId} style={{ color: '#0f172a', background: '#f8fafc' }}>{n.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Vehicle ID</label>
                                        <input className="input-field" value={vehicleId} onChange={e => setVehicleId(e.target.value)} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Priority</label>
                                        <select className="input-field" style={{ color: '#0f172a', background: '#ffffff' }}>
                                            <option style={{ color: '#0f172a', background: '#ffffff' }}>Critical (Cardiac Arrest)</option>
                                            <option style={{ color: '#0f172a', background: '#ffffff' }}>High (Trauma)</option>
                                            <option style={{ color: '#0f172a', background: '#ffffff' }}>Medium</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={calcRoute} disabled={calculating || originId === destinationId}
                                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black disabled:opacity-60 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all font-sans cursor-pointer">
                                    {calculating ? 'Computing...' : 'Calculate Shortest Path'}
                                </button>
                            </div>

                            {/* Route results */}
                            {routeShown && pathNodeIds.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-white/10 flex flex-col gap-4">
                                    <div className="text-[0.7rem] text-text-muted uppercase tracking-widest mb-1">Dijkstra Route Analysis</div>

                                    {/* Distance comparison */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
                                            <div className="text-[0.68rem] text-text-muted uppercase mb-1">Standard GPS Route</div>
                                            <div className="text-2xl font-extrabold font-mono text-accent-amber">
                                                {pathDistKm ? `${(pathDistKm * 1.45).toFixed(1)} km` : '—'}
                                            </div>
                                            <div className="text-xs text-text-secondary mt-1">Congested road network</div>
                                            <div className="text-xs text-text-muted mt-1.5">Multiple signal stops</div>
                                        </div>
                                        <div className="text-xs font-extrabold text-text-muted bg-white/5 border border-white/10 rounded-full px-2.5 py-1.5">VS</div>
                                        <div className="flex-1 bg-accent-green/5 border border-accent-green/30 rounded-xl p-3.5">
                                            <div className="text-[0.68rem] text-text-muted uppercase mb-1">AURA-GRID Shortest Path</div>
                                            <div className="text-2xl font-extrabold font-mono text-accent-green">
                                                {pathDistKm ? `${pathDistKm} km` : '—'}
                                            </div>
                                            <div className="text-xs text-text-secondary mt-1">Via {pathNodeIds.length - 2} cleared waypoints</div>
                                            <div className="text-xs text-accent-green mt-1.5">Zero stops</div>
                                        </div>
                                    </div>

                                    {/* Node list — dynamic from Dijkstra path */}
                                    <div>
                                        <div className="text-[0.7rem] text-text-muted uppercase tracking-widest mb-2">
                                            Route Nodes ({pathNodeIds.length} Total)
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {pathNodeIds.map((id, idx) => {
                                                const node = DELHI_NODES.find(n => n.id === id);
                                                if (!node) return null;
                                                const isOrigin = idx === 0;
                                                const isDest = idx === pathNodeIds.length - 1;
                                                const statusColor = isOrigin ? 'cyan' : isDest ? 'violet' : 'green';
                                                const statusLabel = isOrigin ? 'Origin' : isDest ? 'Destination' : 'Waypoint';
                                                return (
                                                    <div key={id} className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs">
                                                        <span className="text-accent-cyan font-mono">{node.id}</span>
                                                        <span className="text-text-secondary flex-1">{node.name}</span>
                                                        <Badge variant={statusColor} className="text-[0.62rem]">{statusLabel}</Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {!corridorActive && (
                                        <button onClick={initiateWave} disabled={initiating}
                                            className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-br from-accent-green to-[#00cc7a] text-black shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.6)] disabled:opacity-60 transition-all font-sans cursor-pointer">
                                            {initiating ? 'Activating nodes...' : 'Initiate Green Wave'}
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
                                <div>
                                    <h3 className="text-base font-bold">Delhi Traffic Map</h3>
                                    <p className="text-text-secondary text-xs">
                                        {routeShown && pathNodeIds.length > 0
                                            ? `${originNode.name} → ${destNode.name} · ${pathDistKm || '?'} km · Dijkstra shortest path`
                                            : 'Select origin and destination, then calculate route'}
                                    </p>
                                </div>
                                <Badge variant="cyan"><StatusDot color="cyan" className="mr-1" />Live</Badge>
                            </div>
                            <DelhiMap
                                showCorridor={showCorridor}
                                corridorActive={corridorActive}
                                originId={originId}
                                destinationId={destinationId}
                                pathNodeIds={pathNodeIds}
                                onNodeUpdate={handleNodeUpdate}
                            />
                        </div>

                        {/* Corridor status */}
                        {corridorActive && (
                            <div className="bg-bg-card border border-white/5 rounded-xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <Badge variant="red">GREEN WAVE ACTIVE</Badge>
                                        <h3 className="mt-2 text-base font-bold">Corridor: {vehicleId} — {originNode.name} → {destNode.name}</h3>
                                    </div>
                                    <button onClick={deactivate} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">Terminate</button>
                                </div>

                                {/* Dynamic timeline from Dijkstra path */}
                                <div className="flex flex-col gap-0">
                                    {pathNodeIds.map((id, idx) => {
                                        const node = DELHI_NODES.find(n => n.id === id);
                                        if (!node) return null;
                                        const isOrigin = idx === 0;
                                        const isDest = idx === pathNodeIds.length - 1;
                                        // Intermediate node index (0-based)
                                        const intIdx = idx - 1;
                                        let type, status;
                                        if (isOrigin) {
                                            type = 'done'; status = 'Departed';
                                        } else if (isDest) {
                                            type = activeNode >= intermediateNodes.length ? 'done' : 'pending';
                                            status = activeNode >= intermediateNodes.length ? 'Arrived' : 'Destination';
                                        } else if (activeNode === null) {
                                            type = 'pending'; status = 'Queued';
                                        } else if (intIdx < activeNode) {
                                            type = 'done'; status = 'Cleared';
                                        } else if (intIdx === activeNode) {
                                            type = 'active'; status = 'In Transit';
                                        } else if (intIdx === activeNode + 1) {
                                            type = 'prep'; status = 'Preempting';
                                        } else {
                                            type = 'pending'; status = 'Queued';
                                        }
                                        return (
                                            <div key={id} className="flex items-start gap-3 relative pb-2">
                                                {idx < pathNodeIds.length - 1 && (
                                                    <div className={`absolute left-[7px] top-4 w-0.5 h-full ${type === 'done' ? 'bg-accent-green/30' : type === 'active' ? 'bg-accent-cyan/30' : 'bg-white/10'}`} />
                                                )}
                                                <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 mt-0.5 ${type === 'done' ? 'bg-accent-green border-accent-green/50' :
                                                    type === 'active' ? 'bg-accent-cyan border-accent-cyan shadow-neon-cyan animate-pulse-dot' :
                                                        type === 'prep' ? 'bg-accent-amber border-accent-amber/50' :
                                                            'bg-[#334155] border-[#475569]'}`}
                                                />
                                                <div>
                                                    <div className="text-sm font-semibold">
                                                        {isOrigin ? 'Origin' : isDest ? 'Destination' : node.id} — {node.name}
                                                    </div>
                                                    <div className={`text-xs mt-0.5 ${type === 'done' ? 'text-accent-green' :
                                                        type === 'active' ? 'text-accent-cyan' :
                                                            type === 'prep' ? 'text-accent-amber' : 'text-text-muted'}`}>
                                                        {status}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                                    {[['ETA', etaStr, 'text-accent-green'], ['Stops', '0', 'text-accent-green'], ['Distance', `${pathDistKm || '?'} km`, 'text-accent-cyan']].map(([l, v, c]) => (
                                        <div key={l}>
                                            <div className="text-[0.65rem] text-text-muted uppercase tracking-wide mb-1">{l}</div>
                                            <div className={`font-bold font-mono text-lg ${c}`}>{v}</div>
                                        </div>
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

// Local graph builder (mirrors DelhiMap internals — avoids circular import of GRAPH)
function buildGraphLocal() {
    const EDGES_LOCAL = [
        ['DWK', 'DWM', 1100], ['DWM', 'PVI', 2400], ['PVI', 'IGI', 3700],
        ['IGI', 'SAK', 5500], ['PVI', 'DHK', 5700], ['DWM', 'DHK', 6800],
        ['DHK', 'SVJ', 3100], ['SVJ', 'AIM', 2500], ['SVJ', 'LPN', 3400],
        ['AIM', 'LPN', 1800], ['AIM', 'SAK', 4800], ['LPN', 'NZM', 2100],
        ['LPN', 'NWD', 3100], ['NZM', 'NWD', 2800], ['NZM', 'PGM', 2400],
        ['PGM', 'RJP', 1400], ['RJP', 'CNG', 2200], ['CNG', 'KRB', 2800],
        ['CNG', 'CSH', 3600], ['KRB', 'GTK', 3900], ['KRB', 'DHK', 5400],
        ['CSH', 'GTK', 2800], ['CSH', 'CNG', 3600], ['GTK', 'RHN', 5600],
        ['GTK', 'NDC', 9200], ['RHN', 'NDC', 8800], ['CSH', 'GTB', 7400],
        ['PGM', 'GTB', 6700], ['SAK', 'NWD', 3200], ['RJP', 'PGM', 1400],
        ['DHK', 'CNG', 7800], ['DHK', 'KRB', 6200],
    ];
    const graph = {};
    DELHI_NODES.forEach(n => { graph[n.id] = []; });
    EDGES_LOCAL.forEach(([a, b, w]) => {
        graph[a].push({ id: b, weight: w });
        graph[b].push({ id: a, weight: w });
    });
    return graph;
}
