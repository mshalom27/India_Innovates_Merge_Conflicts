'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icon paths broken by Next.js bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Delhi Node Graph ────────────────────────────────────────────────────────
export const DELHI_NODES = [
    { id: 'DWK', name: 'Dwarka Sector 12', pos: [28.5931, 77.0598] },
    { id: 'DWM', name: 'Dwarka Mor Chowk', pos: [28.5936, 77.0737] },
    { id: 'PVI', name: 'Palam Vihar Intersection', pos: [28.5889, 77.1005] },
    { id: 'IGI', name: 'IGI Airport T3', pos: [28.5562, 77.0999] },
    { id: 'DHK', name: 'Dhaula Kuan Flyover', pos: [28.5921, 77.1598] },
    { id: 'SVJ', name: 'Shankar Vihar Junction', pos: [28.5783, 77.1890] },
    { id: 'SAK', name: 'Saket District Centre', pos: [28.5244, 77.2167] },
    { id: 'AIM', name: 'AIIMS New Delhi', pos: [28.5672, 77.2100] },
    { id: 'CNG', name: 'Connaught Place', pos: [28.6315, 77.2167] },
    { id: 'RJP', name: 'Rajpath / India Gate', pos: [28.6129, 77.2295] },
    { id: 'NZM', name: 'Nizamuddin Station', pos: [28.5893, 77.2507] },
    { id: 'LPN', name: 'Lajpat Nagar', pos: [28.5700, 77.2373] },
    { id: 'NWD', name: 'Nehru Place', pos: [28.5484, 77.2517] },
    { id: 'KRB', name: 'Karol Bagh', pos: [28.6512, 77.1906] },
    { id: 'RHN', name: 'Rohini Sector 18', pos: [28.7421, 77.1034] },
    { id: 'GTK', name: 'GTK Road / Azadpur', pos: [28.7104, 77.1842] },
    { id: 'CSH', name: 'Civil Lines / ISBT', pos: [28.6804, 77.2255] },
    { id: 'PGM', name: 'Pragati Maidan', pos: [28.6188, 77.2435] },
    { id: 'GTB', name: 'GTB Hospital (Northeast)', pos: [28.6799, 77.3073] },
    { id: 'NDC', name: 'Narela / Outer Ring', pos: [28.8450, 77.1034] },
];

// Weighted edges: [nodeId, nodeId, distanceMetres]
const EDGES = [
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

function buildGraph(nodes, edges) {
    const graph = {};
    nodes.forEach(n => { graph[n.id] = []; });
    edges.forEach(([a, b, w]) => {
        graph[a].push({ id: b, weight: w });
        graph[b].push({ id: a, weight: w });
    });
    return graph;
}
const GRAPH = buildGraph(DELHI_NODES, EDGES);

// ─── Dijkstra's Algorithm ─────────────────────────────────────────────────────
export function dijkstra(graph, sourceId, targetId) {
    const dist = {};
    const prev = {};
    const visited = new Set();
    DELHI_NODES.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
    dist[sourceId] = 0;
    const queue = [{ id: sourceId, d: 0 }];
    while (queue.length > 0) {
        queue.sort((a, b) => a.d - b.d);
        const { id: u } = queue.shift();
        if (visited.has(u)) continue;
        visited.add(u);
        if (u === targetId) break;
        for (const { id: v, weight } of (graph[u] || [])) {
            if (visited.has(v)) continue;
            const alt = dist[u] + weight;
            if (alt < dist[v]) {
                dist[v] = alt;
                prev[v] = u;
                queue.push({ id: v, d: alt });
            }
        }
    }
    const path = [];
    let cur = targetId;
    while (cur !== null) { path.unshift(cur); cur = prev[cur]; }
    if (path[0] !== sourceId) return { path: [sourceId, targetId], totalDist: Infinity };
    return { path, totalDist: dist[targetId] };
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function haversine(a, b) {
    const R = 6371000;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 +
        Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function closestIndex(routeCoords, pos) {
    let best = 0, bestDist = Infinity;
    routeCoords.forEach((c, i) => {
        const d = haversine(c, pos);
        if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
}

// ─── Icon Factories (called inside component, never at module scope) ──────────
function makePin(color, glowColor, size = 12) {
    return L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid ${glowColor};box-shadow:0 0 8px ${glowColor}80;"></div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
}
function makeCircle(color, border, size = 18) {
    return L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid ${border};box-shadow:0 0 12px ${color};"></div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
}
function makeAmbulance() {
    return L.divIcon({
        className: '',
        html: '<div style="width:26px;height:26px;border-radius:50%;background:#00f5ff;border:3px solid #fff;box-shadow:0 0 14px #00f5ff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#0a0f1e;">+</div>',
        iconSize: [26, 26], iconAnchor: [13, 13],
    });
}
function nodeIcon(state) {
    const map = {
        cleared: ['#00ff9d', '#00ff9d'],
        active: ['#00f5ff', '#00f5ff'],
        prep: ['#ffb800', '#ffb800'],
        pending: ['#64748b', 'transparent'],
    };
    const [bg, glow] = map[state] || map.pending;
    return makePin(bg, glow, 12);
}

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─── Inner component: updates map view when centre changes (avoids remounting MapContainer) ──
function ChangeMapView({ center }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom(), { animate: true, duration: 0.8 });
    }, [center[0], center[1]]);
    return null;
}

// ─── Moving Ambulance ─────────────────────────────────────────────────────────
function MovingAmbulance({ routeCoords, active, nodeThresholds, onNodeUpdate, totalNodes }) {
    const timerRef = useRef(null);
    const indexRef = useRef(0);
    const lastNodeRef = useRef(-1);
    const [pos, setPos] = useState(routeCoords[0] || [28.59, 77.12]);
    // create icon inside component (browser env guaranteed)
    const icon = useRef(null);
    if (!icon.current) icon.current = makeAmbulance();

    useEffect(() => {
        if (!active || routeCoords.length === 0) return;
        indexRef.current = 0;
        lastNodeRef.current = -1;
        setPos(routeCoords[0]);
        const step = () => {
            if (indexRef.current >= routeCoords.length - 1) {
                onNodeUpdate && onNodeUpdate(totalNodes);
                return;
            }
            indexRef.current += 1;
            setPos(routeCoords[indexRef.current]);
            if (nodeThresholds && onNodeUpdate) {
                for (let n = lastNodeRef.current + 1; n < nodeThresholds.length; n++) {
                    if (indexRef.current >= nodeThresholds[n]) {
                        lastNodeRef.current = n;
                        onNodeUpdate(n);
                    }
                }
            }
            timerRef.current = setTimeout(step, 70);
        };
        timerRef.current = setTimeout(step, 70);
        return () => clearTimeout(timerRef.current);
    }, [active, routeCoords]);

    return <Marker position={pos} icon={icon.current} />;
}

function getNodeState(nodeIdx, activeNode) {
    if (activeNode === null || activeNode === undefined) return 'pending';
    if (nodeIdx < activeNode) return 'cleared';
    if (nodeIdx === activeNode) return 'active';
    if (nodeIdx === activeNode + 1) return 'prep';
    return 'pending';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DelhiMap({ showCorridor, corridorActive, originId, destinationId, pathNodeIds, onNodeUpdate }) {
    const [routeCoords, setRouteCoords] = useState([]);
    const [nodeThresholds, setNodeThresholds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeNode, setActiveNode] = useState(null);

    // Create icons inside component so DOM is always available
    const originIconRef = useRef(null);
    const destIconRef = useRef(null);
    if (!originIconRef.current) originIconRef.current = makeCircle('#00f5ff', '#fff');
    if (!destIconRef.current) destIconRef.current = makeCircle('#a78bfa', '#fff');

    const nodeById = (id) => DELHI_NODES.find(n => n.id === id);
    const origin = nodeById(originId) || DELHI_NODES[0];
    const destination = nodeById(destinationId) || DELHI_NODES[7];

    const intermediateNodes = (pathNodeIds || [])
        .slice(1, -1)
        .map(id => DELHI_NODES.find(n => n.id === id))
        .filter(Boolean);

    const handleNodeUpdate = useCallback((n) => {
        setActiveNode(n);
        onNodeUpdate && onNodeUpdate(n);
    }, [onNodeUpdate]);

    const mapCenter = [
        (origin.pos[0] + destination.pos[0]) / 2,
        (origin.pos[1] + destination.pos[1]) / 2,
    ];

    useEffect(() => {
        if (!showCorridor || !pathNodeIds || pathNodeIds.length < 2) {
            setRouteCoords([]);
            setActiveNode(null);
            return;
        }
        setLoading(true);
        setActiveNode(null);

        const waypoints = pathNodeIds.map(id => nodeById(id)?.pos).filter(Boolean);
        const coordStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                    setRouteCoords(coords);
                    setNodeThresholds(intermediateNodes.map(node => closestIndex(coords, node.pos)));
                }
                setLoading(false);
            })
            .catch(() => {
                setRouteCoords(waypoints);
                setNodeThresholds(intermediateNodes.map((_, i) =>
                    Math.floor((i + 1) * waypoints.length / (intermediateNodes.length + 1))
                ));
                setLoading(false);
            });
    }, [showCorridor, pathNodeIds?.join(',')]);

    return (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '380px' }}>
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(5,12,24,0.75)', color: '#00f5ff', fontSize: '0.9rem', fontWeight: 600,
                }}>
                    Computing shortest path via OSRM...
                </div>
            )}
            {/* 
                No `key` prop on MapContainer — remounting MapContainer on every
                origin/destination change causes Leaflet to try to appendChild into
                a pane that React already unmounted (React 18 Strict Mode issue).
                Instead, ChangeMapView updates the center reactively from inside.
            */}
            <MapContainer
                center={mapCenter}
                zoom={11}
                style={{ height: '100%', width: '100%', background: '#050c18' }}
                zoomControl={true}
                attributionControl={false}
            >
                <TileLayer url={DARK_TILES} attribution={TILES_ATTR} />

                {/* Reactively recentre the map without remounting the whole container */}
                <ChangeMapView center={mapCenter} />

                {/* Origin marker */}
                <Marker position={origin.pos} icon={originIconRef.current}>
                    <Popup><strong>Origin</strong><br />{origin.name}</Popup>
                </Marker>

                {/* Destination marker */}
                <Marker position={destination.pos} icon={destIconRef.current}>
                    <Popup><strong>Destination</strong><br />{destination.name}</Popup>
                </Marker>

                {/* Corridor route line */}
                {showCorridor && routeCoords.length > 0 && (
                    <Polyline
                        positions={routeCoords}
                        pathOptions={{
                            color: '#00f5ff', weight: 4, opacity: 0.9,
                            dashArray: corridorActive ? null : '10, 6',
                        }}
                    />
                )}

                {/* Intermediate node markers */}
                {showCorridor && intermediateNodes.map((node, i) => {
                    const state = corridorActive ? getNodeState(i, activeNode) : 'pending';
                    return (
                        <Marker key={node.id} position={node.pos} icon={nodeIcon(state)}>
                            <Popup>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{node.id}</span><br />
                                {node.name}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Ambulance animation */}
                {corridorActive && routeCoords.length > 0 && (
                    <MovingAmbulance
                        routeCoords={routeCoords}
                        active={corridorActive}
                        nodeThresholds={nodeThresholds}
                        onNodeUpdate={handleNodeUpdate}
                        totalNodes={intermediateNodes.length}
                    />
                )}
            </MapContainer>

            {/* Legend */}
            <div style={{
                position: 'absolute', bottom: '10px', right: '10px', zIndex: 500,
                background: 'rgba(5,12,24,0.88)', border: '1px solid rgba(0,245,255,0.15)',
                borderRadius: '8px', padding: '6px 10px', display: 'flex', gap: '10px',
                fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)',
            }}>
                {[['#00ff9d', 'Cleared'], ['#00f5ff', 'In Transit'], ['#ffb800', 'Preempting'], ['#64748b', 'Queued']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block' }} />
                        {l}
                    </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '20px', height: '3px', background: '#00f5ff', display: 'inline-block' }} />
                    Corridor
                </span>
            </div>
        </div>
    );
}
