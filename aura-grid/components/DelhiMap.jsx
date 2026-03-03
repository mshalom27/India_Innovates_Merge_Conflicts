'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icon paths broken by Next.js bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Delhi route: Dwarka Sector 12 → AIIMS New Delhi
export const ORIGIN = [28.5931, 77.0598];
export const DESTINATION = [28.5672, 77.2100];

export const CORRIDOR_NODES = [
    { id: 'N-05', name: 'Dwarka Mor Chowk', pos: [28.5936, 77.0737] },
    { id: 'N-06', name: 'Palam Vihar Intersection', pos: [28.5889, 77.1005] },
    { id: 'N-07', name: 'Dhaula Kuan Flyover', pos: [28.5921, 77.1598] },
    { id: 'N-08', name: 'Shankar Vihar Junction', pos: [28.5783, 77.1890] },
    { id: 'N-09', name: 'AIIMS Gate', pos: [28.5680, 77.2088] },
];

// Haversine distance between two [lat, lng] points in metres
function dist(a, b) {
    const R = 6371000;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 +
        Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Find the route-coord index closest to a given position
function closestIndex(routeCoords, pos) {
    let best = 0, bestDist = Infinity;
    routeCoords.forEach((c, i) => {
        const d = dist(c, pos);
        if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
}

// Icons
const ambulanceIcon = L.divIcon({
    className: '',
    html: '<div style="font-size:22px;line-height:1;filter:drop-shadow(0 0 6px #00f5ff);">🚑</div>',
    iconSize: [28, 28], iconAnchor: [14, 14],
});

const nodeIcon = (state) => {
    const color = state === 'cleared' ? '#00ff9d' : state === 'active' ? '#00f5ff' : state === 'prep' ? '#ffb800' : '#64748b';
    const glow = state === 'cleared' ? '#00ff9d' : state === 'active' ? '#00f5ff' : state === 'prep' ? '#ffb800' : 'transparent';
    return L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid ${color}88;box-shadow:0 0 8px ${glow};"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
    });
};

const originIcon = L.divIcon({
    className: '',
    html: '<div style="font-size:20px;line-height:1;">📍</div>',
    iconSize: [24, 24], iconAnchor: [12, 24],
});
const destIcon = L.divIcon({
    className: '',
    html: '<div style="font-size:20px;line-height:1;">🏥</div>',
    iconSize: [24, 24], iconAnchor: [12, 24],
});

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Moving ambulance — calls onNodeUpdate(nodeIdx) when it crosses a new node (0-based, -1 = before first node)
function MovingAmbulance({ routeCoords, active, nodeThresholds, onNodeUpdate }) {
    const timerRef = useRef(null);
    const indexRef = useRef(0);
    const lastNodeRef = useRef(-1);
    const [pos, setPos] = useState(ORIGIN);

    useEffect(() => {
        if (!active || routeCoords.length === 0) return;
        indexRef.current = 0;
        lastNodeRef.current = -1;

        const step = () => {
            if (indexRef.current >= routeCoords.length - 1) {
                // Reached destination
                onNodeUpdate && onNodeUpdate(CORRIDOR_NODES.length);
                return;
            }
            indexRef.current += 1;
            const currentIdx = indexRef.current;
            setPos(routeCoords[currentIdx]);

            // Check if we've crossed a new node threshold
            if (nodeThresholds && onNodeUpdate) {
                for (let n = lastNodeRef.current + 1; n < nodeThresholds.length; n++) {
                    if (currentIdx >= nodeThresholds[n]) {
                        lastNodeRef.current = n;
                        onNodeUpdate(n);
                    }
                }
            }

            timerRef.current = setTimeout(step, 80);
        };
        timerRef.current = setTimeout(step, 80);
        return () => clearTimeout(timerRef.current);
    }, [active, routeCoords]);

    return <Marker position={pos} icon={ambulanceIcon} />;
}

// nodeState: 'cleared' | 'active' | 'prep' | 'pending'
function getNodeState(nodeIdx, activeNode) {
    if (activeNode === null || activeNode === undefined) return 'pending';
    if (nodeIdx < activeNode) return 'cleared';
    if (nodeIdx === activeNode) return 'active';
    if (nodeIdx === activeNode + 1) return 'prep';
    return 'pending';
}

export default function DelhiMap({ showCorridor, corridorActive, onNodeUpdate }) {
    const [routeCoords, setRouteCoords] = useState([]);
    const [nodeThresholds, setNodeThresholds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeNode, setActiveNode] = useState(null);

    const handleNodeUpdate = useCallback((n) => {
        setActiveNode(n);
        onNodeUpdate && onNodeUpdate(n);
    }, [onNodeUpdate]);

    useEffect(() => {
        if (!showCorridor) { setRouteCoords([]); setActiveNode(null); return; }
        setLoading(true);

        const waypoints = [ORIGIN, ...CORRIDOR_NODES.map(n => n.pos), DESTINATION];
        const coordStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                    setRouteCoords(coords);
                    // Pre-compute node thresholds (route indices where each node is crossed)
                    const thresholds = CORRIDOR_NODES.map(node => closestIndex(coords, node.pos));
                    setNodeThresholds(thresholds);
                }
                setLoading(false);
            })
            .catch(() => {
                const fallback = [ORIGIN, ...CORRIDOR_NODES.map(n => n.pos), DESTINATION];
                setRouteCoords(fallback);
                // Evenly space thresholds for fallback
                setNodeThresholds(CORRIDOR_NODES.map((_, i) => Math.floor((i + 1) * fallback.length / (CORRIDOR_NODES.length + 1))));
                setLoading(false);
            });
    }, [showCorridor]);

    return (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '360px' }}>
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(5,12,24,0.7)', color: '#00f5ff', fontSize: '0.9rem', fontWeight: 600,
                }}>
                    ⏳ Fetching optimal route via OSRM…
                </div>
            )}
            <MapContainer
                center={[28.5831, 77.1350]}
                zoom={12}
                style={{ height: '100%', width: '100%', background: '#050c18' }}
                zoomControl={true}
                attributionControl={false}
            >
                <TileLayer url={DARK_TILES} attribution={TILES_ATTR} />

                <Marker position={ORIGIN} icon={originIcon}>
                    <Popup>🚑 Origin: Dwarka Sector 12</Popup>
                </Marker>
                <Marker position={DESTINATION} icon={destIcon}>
                    <Popup>🏥 AIIMS, New Delhi</Popup>
                </Marker>

                {showCorridor && routeCoords.length > 0 && (
                    <Polyline
                        positions={routeCoords}
                        pathOptions={{
                            color: '#00f5ff', weight: 4, opacity: 0.9,
                            dashArray: corridorActive ? null : '10, 6',
                        }}
                    />
                )}

                {showCorridor && CORRIDOR_NODES.map((node, i) => {
                    const state = corridorActive ? getNodeState(i, activeNode) : 'pending';
                    return (
                        <Marker key={node.id} position={node.pos} icon={nodeIcon(state)}>
                            <Popup>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{node.id}</span><br />
                                {node.name}<br />
                                <span style={{ fontSize: '0.75rem', color: state === 'cleared' ? '#00b86b' : state === 'active' ? '#0099cc' : '#999' }}>
                                    {state === 'cleared' ? '✓ Cleared' : state === 'active' ? '🚑 In Transit' : state === 'prep' ? '⏱ Preempting' : 'Queued'}
                                </span>
                            </Popup>
                        </Marker>
                    );
                })}

                {corridorActive && routeCoords.length > 0 && nodeThresholds.length > 0 && (
                    <MovingAmbulance
                        routeCoords={routeCoords}
                        active={corridorActive}
                        nodeThresholds={nodeThresholds}
                        onNodeUpdate={handleNodeUpdate}
                    />
                )}
            </MapContainer>

            <div style={{
                position: 'absolute', bottom: '10px', right: '10px', zIndex: 500,
                background: 'rgba(5,12,24,0.85)', border: '1px solid rgba(0,245,255,0.15)',
                borderRadius: '8px', padding: '6px 10px', display: 'flex', gap: '10px',
                fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)'
            }}>
                {[['#00ff9d', 'Cleared'], ['#00f5ff', 'In Transit'], ['#ffb800', 'Preempting'], ['#64748b', 'Queued']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block' }} />
                        {l}
                    </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '24px', height: '3px', background: '#00f5ff', display: 'inline-block' }} />
                    Corridor
                </span>
            </div>
        </div>
    );
}
