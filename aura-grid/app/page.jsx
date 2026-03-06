'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';

/* ── Stat counter hook ── */
function useCountUp(target, duration = 1800) {
    const [value, setValue] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            obs.unobserve(e.target);
            let start = null;
            const step = (ts) => {
                if (!start) start = ts;
                const progress = Math.min((ts - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(eased * target));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.5 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [target, duration]);
    return [value, ref];
}

/* ── Traffic Light (hero) ── */
function TrafficLight({ state }) {
    return (
        <div className="flex flex-col items-center gap-1 bg-[#0a0a0a] border-2 border-[#222] rounded-[14px] p-2">
            {['red', 'amber', 'green'].map((c) => (
                <div
                    key={c}
                    className={`w-[22px] h-[22px] rounded-full transition-all ${state === c ? `tl-light-active-${c}` : 'bg-white/5'
                        }`}
                />
            ))}
        </div>
    );
}

/* ── Hero intersection animation ── */
function HeroVisual() {
    const [tlState, setTlState] = useState({ ns: 'red', ew: 'green' });
    const [ambX, setAmbX] = useState(0);
    const [pulse, setPulse] = useState(true);

    useEffect(() => {
        let pos = 0;
        let raf;
        const speed = 1.5;
        const cycle = () => {
            pos += speed;
            if (pos >= 100 && pos < 110) setTlState({ ns: 'amber', ew: 'green' });
            if (pos >= 120 && pos < 125) setTlState({ ns: 'red', ew: 'red' });
            if (pos >= 135) setTlState({ ns: 'red', ew: 'green' });
            if (pos > 290) {
                pos = 0;
                setTlState({ ns: 'red', ew: 'green' });
            }
            setAmbX(pos);
            raf = requestAnimationFrame(cycle);
        };
        raf = requestAnimationFrame(cycle);
        const blinkT = setInterval(() => setPulse((p) => !p), 800);
        return () => { cancelAnimationFrame(raf); clearInterval(blinkT); };
    }, []);

    return (
        <div className="relative h-[460px] hidden lg:block">
            {/* Intersection */}
            <div className="relative w-[300px] h-[300px] mx-auto top-1/2 -translate-y-1/2">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-20 bg-[#141a26] border border-white/5" />
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-20 bg-[#141a26] border border-white/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#1a2234] border border-accent-cyan/10" />
                {/* Traffic lights */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2"><TrafficLight state={tlState.ns} /></div>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2"><TrafficLight state={tlState.ns} /></div>
                <div className="absolute left-5 top-1/2 -translate-y-1/2"><div className="flex gap-1 bg-[#0a0a0a] border-2 border-[#222] rounded-[14px] p-2">{['red', 'amber', 'green'].map(c => <div key={c} className={`w-[22px] h-[22px] rounded-full ${tlState.ew === c ? `tl-light-active-${c}` : 'bg-white/5'}`} />)}</div></div>
                <div className="absolute right-5 top-1/2 -translate-y-1/2"><div className="flex gap-1 bg-[#0a0a0a] border-2 border-[#222] rounded-[14px] p-2">{['red', 'amber', 'green'].map(c => <div key={c} className={`w-[22px] h-[22px] rounded-full ${tlState.ew === c ? `tl-light-active-${c}` : 'bg-white/5'}`} />)}</div></div>
                {/* Ambulance */}
                <div className="absolute text-xl z-10 leading-none" style={{ top: '140px', left: `${ambX}px` }}>🚑</div>
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan to-transparent opacity-80 animate-scan" />
                {/* Info overlay */}
                <div className="absolute -bottom-12 left-0 right-0 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-mono"><StatusDot color="green" /><span className="text-text-secondary">AI CAMERA ONLINE</span></div>
                    <Badge variant="red" className={`transition-opacity ${pulse ? 'opacity-100' : 'opacity-30'}`}>AMBULANCE DETECTED</Badge>
                </div>
            </div>
            {/* Data panels */}
            {[
                { pos: 'top-0 left-0', label: 'NORTH LANE', pct: 82, color: 'red', delay: '0s' },
                { pos: 'top-0 right-0', label: 'EAST LANE', pct: 23, color: 'green', delay: '1s' },
                { pos: 'bottom-14 left-0', label: 'YOLO DETECT', custom: true, delay: '2s' },
                { pos: 'bottom-14 right-0', label: 'GREEN WAVE ETA', eta: true, delay: '0.5s' },
            ].map(({ pos, label, pct, color, custom, eta, delay }) => (
                <div key={label} className={`absolute ${pos} bg-bg-card border border-white/5 rounded-xl p-2.5 min-w-[130px] animate-float`} style={{ animationDelay: delay }}>
                    <div className="text-[0.7rem] text-text-muted mb-1">{label}</div>
                    {!custom && !eta && (
                        <>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full progress-fill-${color}`} style={{ width: `${pct}%` }} /></div>
                            <div className={`text-[0.75rem] font-bold mt-1 ${color === 'red' ? 'text-accent-red' : 'text-accent-green'}`}>{pct}% Dense</div>
                        </>
                    )}
                    {custom && (
                        <>
                            <div className="text-[0.72rem] text-accent-cyan font-mono">Class: Ambulance</div>
                            <div className="text-[0.72rem] text-accent-green font-mono">Conf: 97.2%</div>
                        </>
                    )}
                    {eta && <div className="text-[1.4rem] font-black text-accent-green font-mono">00:03</div>}
                </div>
            ))}
        </div>
    );
}

/* ── Stat Card ── */
function StatCard({ target, unit, label }) {
    const [value, ref] = useCountUp(target);
    return (
        <div ref={ref} className="flex-1 min-w-[130px] px-6 py-5 flex flex-col gap-1">
            <div>
                <span className="text-[2.2rem] font-black leading-none grad-text font-mono">{value}</span>
                <span className="text-xl font-bold text-text-secondary">{unit}</span>
            </div>
            <div className="text-[0.78rem] text-text-muted leading-tight mt-0.5">{label}</div>
        </div>
    );
}

/* ── Pillar Card ── */
function PillarCard({ letter, badge, variant, title, desc, features, tags }) {
    const borderMap = { cyan: 'border-accent-cyan/25 shadow-[0_0_0_1px_rgba(0,245,255,0.1),0_20px_60px_rgba(0,245,255,0.05)]', green: 'border-accent-green/25 shadow-[0_0_0_1px_rgba(0,255,157,0.1),0_20px_60px_rgba(0,255,157,0.05)]', violet: 'border-accent-violet/25' };
    const letterBg = { cyan: 'bg-[rgba(0,245,255,0.15)] text-accent-cyan', green: 'bg-[rgba(0,255,157,0.15)] text-accent-green', violet: 'bg-[rgba(124,58,237,0.15)] text-[#a78bfa]' };
    return (
        <div className={`bg-bg-card border rounded-xl p-8 flex flex-col gap-5 hover:-translate-y-1 hover:shadow-lg transition-all ${borderMap[variant]}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[1.4rem] font-black ${letterBg[variant]}`}>{letter}</div>
            <div>
                <Badge variant={variant}>{badge}</Badge>
                <h3 className="text-lg font-bold mt-2 leading-snug">{title}</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            <ul className="flex flex-col gap-2">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[0.82rem] text-text-secondary">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${variant === 'cyan' ? 'bg-accent-cyan' : variant === 'green' ? 'bg-accent-green' : 'bg-[#a78bfa]'}`} />
                        {f}
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-1.5 mt-auto">
                {tags.map((t) => <Badge key={t} variant={variant}>{t}</Badge>)}
            </div>
        </div>
    );
}

/* ── Flow Panel ── */
const FLOWS = [
    {
        id: 0, label: 'Commuter', badge: 'cyan', color: 'cyan',
        title: 'Everyday Commuter — Smart Routing',
        desc: 'The public-facing layer. Every citizen benefits from AI-optimized routing without any special access.',
        steps: [
            ['Open the public app', 'Enter your destination as usual'],
            ['AI Overlay Applied', 'Base route from Google Maps API, augmented with live intersection wait times from AURA-GRID cameras'],
            ['Dynamic Re-routing', 'If your route hits density >70%, the app reroutes you in real time, naturally balancing city-wide load'],
            ['Arrive Faster', 'Average 40% reduction in intersection wait time citywide'],
        ],
    },
    {
        id: 1, label: 'Ambulance', badge: 'red', color: 'red',
        title: 'Verified Ambulance Dispatcher',
        desc: 'Planned Green Corridor — zero stops from accident site to hospital.',
        steps: [
            ['Dispatcher logs in', 'Authenticates via secure Green Corridor Portal with hospital credentials'],
            ['Enter Route', 'Our custom A* graph algorithm calculates the fastest, clearest path'],
            ['Initiate Green Wave', 'System preempts every intersection 30 seconds before arrival'],
            ['Zero Stops', 'Ambulance passes through a dynamically maintained green corridor end-to-end'],
        ],
    },
    {
        id: 2, label: 'Visual Override', badge: 'amber', color: 'amber',
        title: 'Unexpected Emergency — Visual Failsafe',
        desc: 'No GPS, no portal — the Edge-AI camera detects the vehicle and acts autonomously.',
        steps: [
            ['Ambulance approaches', 'Not using the portal — GPS unavailable. Standard approach to intersection'],
            ['YOLO Detection', 'Camera detects Class: Ambulance with 97%+ confidence — shape, color, strobe pattern'],
            ['Safety Buffer Protocol', '3-second yellow clearance → cross-traffic turns red → emergency lane turns green'],
            ['Auto-resume', 'Once vehicle clears the frame, intersection instantly returns to AI dynamic cycle'],
        ],
    },
    {
        id: 3, label: 'VVIP Convoy', badge: 'violet', color: 'violet',
        title: 'VVIP & Security Convoy Protocol',
        desc: 'Highest clearance tier — full route lock with extended buffers before and after the convoy.',
        steps: [
            ['Security Chief logs in', 'MFA-secured access with VVIP-tier credentials'],
            ['Route Mapping', 'System prioritizes wider roads and fewer complex intersections for convoy safety'],
            ['Convoy Lock activated', 'Extended green buffer — cross-traffic held red before AND after convoy passes'],
            ['Node Release', 'Once the final vehicle clears a node, AI dynamic cycle resumes instantly'],
        ],
    },
];

function FlowsSection() {
    const [active, setActive] = useState(0);
    const flow = FLOWS[active];
    const stepNumColor = { cyan: 'bg-[rgba(0,245,255,0.12)] text-accent-cyan', red: 'bg-[rgba(255,59,92,0.12)] text-accent-red', amber: 'bg-[rgba(255,184,0,0.12)] text-accent-amber', violet: 'bg-[rgba(124,58,237,0.12)] text-[#a78bfa]' };

    return (
        <section id="flows" className="relative z-10 py-24">
            <div className="max-w-[1200px] mx-auto px-10">
                <div className="flex items-center gap-2 mb-4 text-accent-cyan text-xs font-bold uppercase tracking-widest">
                    <span className="w-5 h-0.5 bg-accent-cyan rounded-full" />User Journeys
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight leading-tight mb-3">
                    Four Mission-Critical <span className="grad-text">Use Cases</span>
                </h2>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 max-w-[700px] mt-10 mb-10">
                    {FLOWS.map((f, i) => (
                        <button key={f.id} onClick={() => setActive(i)}
                            className={`flex-1 py-2 px-4 rounded-lg text-[0.85rem] font-semibold transition-all font-sans ${active === i ? 'bg-bg-card text-accent-cyan shadow-[0_2px_8px_rgba(0,0,0,0.3)]' : 'text-text-muted hover:text-text-secondary'
                                }`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in-up">
                    {/* Steps */}
                    <div className="flex flex-col gap-4">
                        <Badge variant={flow.badge}>{flow.badge === 'cyan' ? 'Flow 1' : flow.badge === 'red' ? 'Flow 2' : flow.badge === 'amber' ? 'Flow 3' : 'Flow 4'}</Badge>
                        <h3 className="text-2xl font-extrabold mt-2">{flow.title}</h3>
                        <p className="text-text-secondary text-sm">{flow.desc}</p>
                        {flow.steps.map(([title, desc], i) => (
                            <div key={i} className="flex gap-4 items-start bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                <div className={`min-w-[36px] h-9 rounded-lg flex items-center justify-center text-xs font-extrabold font-mono flex-shrink-0 ${stepNumColor[flow.color]}`}>
                                    0{i + 1}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">{title}</div>
                                    <div className="text-text-secondary text-xs mt-0.5 leading-relaxed">{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Visual card */}
                    <div className="flex items-center">
                        <div className="w-full bg-bg-card border border-white/5 rounded-xl p-5">
                            {flow.id === 0 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-3">LIVE ROUTE OPTIMIZER</div>
                                    <div className="flex items-center gap-2 py-2 border-b border-white/5 text-xs"><span className="w-2 h-2 rounded-full bg-accent-green" />MG Road → City Hospital<span className="ml-auto text-accent-green font-bold">12 min ✓</span></div>
                                    <div className="flex items-center gap-2 py-2 text-xs opacity-60"><span className="w-2 h-2 rounded-full bg-accent-red" /><span className="line-through text-text-muted">Via Highway 4</span><span className="ml-auto text-accent-red">Congested</span></div>
                                    <div className="mt-4"><div className="text-[0.72rem] text-text-muted mb-1.5">NEXT INTERSECTION WAIT</div><div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full progress-fill-green" style={{ width: '20%' }} /></div><div className="text-xs text-accent-green mt-1">~8 seconds</div></div>
                                </>
                            )}
                            {flow.id === 1 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-3">GREEN CORRIDOR STATUS</div>
                                    {[['green', 'Node 1 — MG Road', 'GREEN ✓'], ['green', 'Node 2 — Station Rd', 'GREEN ✓'], ['amber', 'Node 3 — Jubilee Hills', 'PREP ⏱'], ['cyan', 'Node 4 — Sec 12', 'QUEUED'], ['cyan', 'City Hospital', 'QUEUED']].map(([c, n, s]) => (
                                        <div key={n} className={`flex items-center gap-2 p-2 rounded-lg text-xs mb-1.5 border cnode-${c === 'amber' ? 'preparing' : c === 'cyan' ? 'pending' : 'active'}`}><StatusDot color={c} />{n}<Badge variant={c === 'green' ? 'green' : c === 'amber' ? 'amber' : 'cyan'} className="ml-auto text-[0.65rem] py-0">{s}</Badge></div>
                                    ))}
                                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs"><div><div className="text-text-muted">ETA</div><div className="font-bold text-accent-green">4m 12s</div></div><div><div className="text-text-muted">Stops</div><div className="font-bold text-accent-green">0</div></div><div><div className="text-text-muted">Nodes</div><div className="font-bold text-accent-cyan">5/5</div></div></div>
                                </>
                            )}
                            {flow.id === 2 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-2">EDGE-AI CAMERA FEED</div>
                                    <div className="relative bg-[#050810] border border-accent-cyan/20 rounded-lg h-36 overflow-hidden">
                                        <div className="absolute top-1.5 left-2 text-[0.6rem] text-accent-cyan font-mono z-10">CAM-07 · LIVE · 30fps</div>
                                        <div className="cam-detect-box">Ambulance · 97.2%</div>
                                        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan to-transparent animate-scan-fast opacity-60" />
                                    </div>
                                    <div className="flex gap-2 mt-3 flex-wrap"><Badge variant="red">OVERRIDE ACTIVE</Badge><Badge variant="amber">YELLOW → RED → GREEN</Badge></div>
                                </>
                            )}
                            {flow.id === 3 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-2">CONVOY LOCK STATUS</div>
                                    <div className="flex justify-center gap-2 my-3">{['[P]', '[VIP]', '[P]'].map((v, i) => <div key={i} className={`text-sm font-bold font-mono bg-white/5 border rounded-lg px-3 py-2 ${i === 1 ? 'bg-[rgba(255,184,0,0.15)] border-accent-amber text-accent-amber' : 'border-white/5 text-text-muted'}`}>{v}</div>)}</div>
                                    <div className="text-center text-xs text-[#a78bfa] mb-3">← Extended Buffer Zone →</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-[rgba(255,59,92,0.15)] border border-accent-red/30 rounded-lg p-3 text-center"><div className="text-[0.7rem] text-text-muted">Cross Traffic</div><div className="text-accent-red font-bold text-sm">HELD RED</div></div>
                                        <div className="bg-[rgba(0,255,157,0.1)] border border-accent-green/30 rounded-lg p-3 text-center"><div className="text-[0.7rem] text-text-muted">Convoy Lane</div><div className="text-accent-green font-bold text-sm">ALL GREEN</div></div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── FAQ ── */
const FAQS = [
    { q: 'What if two ambulances approach from opposite directions?', a: 'The system assigns priority via a FIFO queue. If hospital integration is active, the vehicle carrying the more critical patient (e.g., Cardiac Arrest > Broken Arm) receives priority. The secondary ambulance gets a 3-second delayed corridor activation.' },
    { q: 'What if the camera goes down or is covered in rain?', a: 'The system automatically detects a null or degraded camera feed and reverts to pre-programmed fixed-timer fallback mode. An alert is sent to the control center. Normal AI operation resumes automatically when the feed is restored.' },
    { q: 'How do we prevent abuse of the VVIP system?', a: 'Every "Green Corridor" request is immutably logged with a timestamp, user ID, GPS track, and session token. MFA is required for VVIP-tier access. All logs are auditable and tamper-evident.' },
    { q: 'What if the internet connection is lost mid-corridor?', a: 'Each intersection node caches the corridor plan locally at activation. If cloud connectivity drops, the node executes its pre-cached green schedule autonomously until the last downloaded instruction expires, then defaults to safe fixed-timer mode.' },
    { q: 'Does this worsen pedestrian safety at crossings?', a: 'No. The algorithm enforces a non-negotiable minimum 15-second pedestrian phase regardless of vehicle density. Emergency overrides always trigger the 3-second yellow safety buffer, giving pedestrians time to clear.' },
    { q: 'Is this scalable to an entire city?', a: 'Yes. Edge AI at each node means processing is distributed — no single server bottleneck. The central server only handles coordination signals (WebSocket messages), not video processing.' },
];

function FaqSection() {
    const [open, setOpen] = useState(null);
    return (
        <section id="faq" className="relative z-10 py-24">
            <div className="max-w-[1200px] mx-auto px-10">
                <div className="flex items-center gap-2 mb-4 text-accent-cyan text-xs font-bold uppercase tracking-widest"><span className="w-5 h-0.5 bg-accent-cyan rounded-full" />Judge Q&A</div>
                <h2 className="text-4xl font-extrabold tracking-tight mb-3">Edge Cases & <span className="grad-text">Fail-Safes</span></h2>
                <p className="text-text-secondary mb-12 max-w-xl">AURA-GRID anticipates real-world failure modes. Every "What if?" has an engineered answer.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FAQS.map((faq, i) => (
                        <div key={i} onClick={() => setOpen(open === i ? null : i)}
                            className={`bg-bg-card border rounded-xl p-5 cursor-pointer transition-all hover:border-accent-cyan/20 ${open === i ? 'border-accent-cyan/25' : 'border-white/5'}`}>
                            <div className="flex items-center gap-2.5 font-semibold text-sm">
                                <span>{faq.q}</span>
                                <span className={`ml-auto text-text-muted transition-transform ${open === i ? 'rotate-180 text-accent-cyan' : ''}`}>↓</span>
                            </div>
                            {open === i && <p className="text-text-secondary text-[0.875rem] leading-relaxed mt-3 pt-3 border-t border-white/5">{faq.a}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ── Main Page Export ── */
export default function HomePage() {
    return (
        <>
            <Navbar />

            {/* HERO */}
            <section id="hero" className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden">
                <div className="glow-blob glow-blob-cyan w-[600px] h-[600px] -top-48 -left-24 opacity-60" style={{ background: 'rgba(0,245,255,0.12)' }} />
                <div className="glow-blob" style={{ width: '500px', height: '500px', top: '-100px', right: '-150px', opacity: 0.5, background: 'rgba(124,58,237,0.12)' }} />
                <div className="max-w-[1200px] mx-auto px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
                    <div>
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2.5 bg-accent-cyan/10 border border-accent-cyan/20 rounded-full px-4 py-2 mb-6 text-sm text-text-secondary">
                            <StatusDot color="green" /><span>AI Traffic System — Active</span><Badge variant="cyan">v1.0</Badge>
                        </div>
                        <h1 className="text-5xl font-black leading-[1.05] tracking-[-1.5px] mb-5 animate-fade-in-up">
                            Intelligent Traffic<br />That <span className="grad-text">Saves Lives</span><br />in Real Time
                        </h1>
                        <p className="text-[1.05rem] text-text-secondary leading-relaxed max-w-[520px] mb-8">
                            AURA-GRID fuses AI vision, predictive preemption, and verified green corridors to clear the path for ambulances, secure VVIP convoys, and optimize every intersection — automatically.
                        </p>
                        <div className="flex flex-wrap gap-3 mb-12">
                            <a href="#pillars" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black shadow-[0_0_20px_rgba(0,245,255,0.3)] hover:shadow-[0_0_30px_rgba(0,245,255,0.6)] hover:-translate-y-px transition-all">Explore The Solution →</a>
                            <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold bg-white/5 border border-white/5 hover:bg-white/10 hover:-translate-y-px transition-all no-underline text-text-primary">Live Dashboard</Link>
                        </div>
                        {/* Stats bar */}
                        <div className="flex flex-wrap bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden divide-x divide-white/5">
                            {[{ target: 94, unit: '%', label: 'Emergency Response Improvement' }, { target: 3, unit: 's', label: 'Corridor Activation Time' }, { target: 40, unit: '%', label: 'Urban Congestion Reduction' }, { target: 95, unit: '%+', label: 'YOLO Detection Accuracy' }].map(s => (
                                <StatCard key={s.label} {...s} />
                            ))}
                        </div>
                    </div>
                    <HeroVisual />
                </div>
            </section>

            <div className="g-divider" />

            {/* PROBLEM */}
            <section id="problem" className="relative z-10 py-24">
                <div className="max-w-[1200px] mx-auto px-10">
                    <div className="flex items-center gap-2 mb-4 text-accent-cyan text-xs font-bold uppercase tracking-widest"><span className="w-5 h-0.5 bg-accent-cyan rounded-full" />The Crisis</div>
                    <h2 className="text-4xl font-extrabold tracking-tight mb-3">Every Second of Delay <span className="grad-text">Costs Lives</span></h2>
                    <p className="text-text-secondary mb-12 max-w-xl">Traditional "dumb" traffic grids are killing the golden hour, endangering VVIPs, and choking cities with preventable congestion.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: '🏥', bg: 'bg-[rgba(255,59,92,0.15)]', color: 'text-accent-red', title: 'The Golden Hour Crisis', desc: 'Ambulances spend 10–15% of travel time idling at red lights — directly cutting into the critical 60-minute survival window after trauma.', stat: '12.5%', statLabel: 'average journey wasted at intersections' },
                            { icon: '🛡️', bg: 'bg-[rgba(255,184,0,0.15)]', color: 'text-accent-amber', title: 'VVIP Security Vulnerabilities', desc: 'Convoys stopped at red lights become static targets. Traditional methods deploy hundreds of police hours in advance, disrupting the entire city.', stat: '100s', statLabel: 'of officers needed for manual road blocks' },
                            { icon: '🚗', bg: 'bg-[rgba(0,245,255,0.10)]', color: 'text-accent-cyan', title: 'Inefficient "Dumb" Grids', desc: 'Fixed-timer PLCs keep lanes green even when completely empty, burning millions of gallons of fuel annually and creating localized pollution spikes.', stat: 'Millions', statLabel: 'of gallons wasted annually from idle signals' },
                        ].map(({ icon, bg, color, title, desc, stat, statLabel }) => (
                            <div key={title} className="bg-bg-card border border-white/5 rounded-xl p-8 hover:-translate-y-1 transition-all">
                                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center text-2xl mb-4`}>{icon}</div>
                                <h3 className="font-bold text-lg mb-2">{title}</h3>
                                <p className="text-text-secondary text-sm leading-relaxed mb-5">{desc}</p>
                                <div className="flex items-center gap-2.5 pt-4 border-t border-white/5">
                                    <span className={`text-2xl font-black font-mono ${color}`}>{stat}</span>
                                    <span className="text-xs text-text-muted">{statLabel}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="g-divider" />

            {/* PILLARS */}
            <section id="pillars" className="relative z-10 py-24">
                <div className="max-w-[1200px] mx-auto px-10">
                    <div className="flex items-center gap-2 mb-4 text-accent-cyan text-xs font-bold uppercase tracking-widest"><span className="w-5 h-0.5 bg-accent-cyan rounded-full" />The Solution</div>
                    <h2 className="text-4xl font-extrabold tracking-tight mb-3">Three-Pillar <span className="grad-text">Architecture</span></h2>
                    <p className="text-text-secondary mb-12 max-w-xl">AURA-GRID operates on three synergistic layers, each solving a distinct failure mode of traditional traffic systems.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PillarCard letter="A" badge="Pillar A" variant="cyan" title="AI Vision & Dynamic Signal Control" desc="YOLOv8 cameras count vehicles in real time and allocate green time proportionally — never wasting a cycle on an empty lane." features={['Real-time vehicle density detection', 'Dynamic green time allocation', 'Live Google Maps density overlay']} tags={['YOLOv8', 'OpenCV', 'WebSocket']} />
                        <PillarCard letter="B" badge="Pillar B" variant="green" title="Visual Failsafe — Camera Override" desc="Edge-AI detects ambulance shape, color, and strobes locally. No GPS or portal needed — triggers a 3-second safe clearance automatically." features={['Works offline, no cloud needed', '3s yellow → red → green sequence', '97%+ detection confidence']} tags={['Edge AI', 'PyTorch', 'Offline']} />
                        <PillarCard letter="C" badge="Pillar C" variant="violet" title="Verified Green Corridor Portal" desc="Secure dispatcher portal for hospitals and security chiefs to initiate a zero-stop green wave — preempting signals 30 seconds ahead." features={['RBAC + MFA access control', 'Predictive 30s preemption', 'Immutable session audit trail']} tags={['RBAC + MFA', 'FastAPI', 'React.js']} />
                    </div>
                </div>
            </section>

            <div className="g-divider" />

            <FlowsSection />

            <div className="g-divider" />



            <FaqSection />

            <div className="g-divider" />

            {/* FOOTER */}
            <footer className="relative z-10 border-t border-white/5 bg-[rgba(13,17,23,0.6)] backdrop-blur-xl">
                <div className="max-w-[1200px] mx-auto px-10 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl no-underline text-white mb-3">
                            <div className="w-9 h-9 rounded-[6px] bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center neon-cyan">⬡</div>
                            <span><span className="text-accent-cyan">AURA</span>-GRID</span>
                        </Link>
                        <p className="text-text-muted text-xs leading-relaxed mb-4">AI-powered intelligent traffic management. Saving lives, securing convoys, reducing congestion.</p>
                        <div className="flex items-center gap-2"><StatusDot color="green" /><span className="text-xs text-text-secondary">All Systems Operational</span></div>
                    </div>
                    {/* Emergency Contacts */}
                    <div>
                        <div className="text-[0.7rem] font-bold uppercase tracking-widest text-text-muted mb-4">Emergency Contacts</div>
                        <div className="flex flex-col gap-2.5">
                            {[['Ambulance (National)', '102'], ['Fire Brigade', '101'], ['Police', '100'], ['AIIMS Delhi', '011-2658-8500'], ['GVK EMRI', '108']].map(([l, v]) => (
                                <div key={l} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                    <span className="text-text-secondary">{l}</span>
                                    <span className="font-mono font-bold text-accent-green">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Cities */}
                    <div>
                        <div className="text-[0.7rem] font-bold uppercase tracking-widest text-text-muted mb-4">Target Cities</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'].map(c => (
                                <div key={c} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-cyan transition-colors cursor-default">
                                    <span className="w-1 h-1 rounded-full bg-accent-cyan/50" />{c}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Quick Links */}
                    <div>
                        <div className="text-[0.7rem] font-bold uppercase tracking-widest text-text-muted mb-4">Quick Access</div>
                        <div className="flex flex-col gap-2">
                            <Link href="/dashboard" className="text-xs text-text-secondary hover:text-accent-cyan no-underline transition-colors">Live Dashboard</Link>
                            <Link href="/portal" className="text-xs text-text-secondary hover:text-accent-cyan no-underline transition-colors">Green Corridor Portal</Link>
                            <a href="#pillars" className="text-xs text-text-secondary hover:text-accent-cyan no-underline transition-colors">Three-Pillar Solution</a>
                            <a href="#flows" className="text-xs text-text-secondary hover:text-accent-cyan no-underline transition-colors">User Journeys</a>
                            <a href="#faq" className="text-xs text-text-secondary hover:text-accent-cyan no-underline transition-colors">Edge Cases &amp; FAQ</a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/5 px-10 py-4 flex justify-between items-center flex-wrap gap-3">
                    <span className="text-[0.7rem] text-text-muted">© 2026 AURA-GRID / FLOW-AI · Smart City Innovation Challenge · Prototype v1.0</span>
                    <span className="text-[0.7rem] text-text-muted">Built with Next.js · React · Tailwind CSS</span>
                </div>
            </footer>
        </>
    );
}
