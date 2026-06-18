import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Tooltip, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useLocation } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './UserMap.css';
import { Compass, MapPin, Search, Navigation, Plus, Minus, X } from 'lucide-react';
import axios from 'axios';

/* ── POI DATA WITH GPS COORDS ── */
const CATEGORY_DATA = {
  "Интересные локации": [
    { id: 1, title: "Озеро Сайран", img: "https://picsum.photos/seed/sairan/200", lat: 43.237, lng: 76.866 },
    { id: 2, title: "Кок Тобе", img: "https://picsum.photos/seed/koktobe/200", lat: 43.232, lng: 76.974 },
    { id: 3, title: "Каток Медеу", img: "https://picsum.photos/seed/medeu/200", lat: 43.157, lng: 77.059 },
    { id: 4, title: "Шымбулак", img: "https://picsum.photos/seed/shym/200", lat: 43.127, lng: 77.080 },
    { id: 5, title: "Большое Алматинское Озеро", img: "https://picsum.photos/seed/bao/200", lat: 43.050, lng: 76.984 },
    { id: 9, title: "Горельник", img: "https://picsum.photos/seed/gor/200", lat: 43.136, lng: 77.054 },
    { id: 10, title: "Центральный Государственный музей", img: "https://picsum.photos/seed/mus/200", lat: 43.235, lng: 76.949 },
    { id: 11, title: "Музей искусств им. Кастеева", img: "https://picsum.photos/seed/kasteyev/200", lat: 43.237, lng: 76.917 },
    { id: 12, title: "Вознесенский собор", img: "https://picsum.photos/seed/sobor/200", lat: 43.258, lng: 76.953 },
  ],
  "Парки": [
    { id: 13, title: "Парк Горького", img: "https://picsum.photos/seed/gorko/200", lat: 43.262, lng: 76.971 },
    { id: 14, title: "Парк 28 гвардейцев-панфиловцев", img: "https://picsum.photos/seed/panf/200", lat: 43.258, lng: 76.953 },
    { id: 15, title: "Президентский парк", img: "https://picsum.photos/seed/prespark/200", lat: 43.193, lng: 76.887 },
    { id: 16, title: "Ботанический Сад", img: "https://picsum.photos/seed/botsad/200", lat: 43.222, lng: 76.915 },
    { id: 19, title: "Роща Баума", img: "https://picsum.photos/seed/bauma/200", lat: 43.301, lng: 76.945 },
  ],
  "Еда": [
    { id: 25, title: "Арбат (ул. Панфилова)", img: "https://picsum.photos/seed/arbat/200", lat: 43.261, lng: 76.941 },
    { id: 26, title: "Зеленый Базар", img: "https://picsum.photos/seed/greenbazar/200", lat: 43.263, lng: 76.954 },
    { id: 27, title: "Ресторан Navat (Достык)", img: "https://picsum.photos/seed/navat/200", lat: 43.242, lng: 76.956 },
    { id: 28, title: "Кафе Киноглаз", img: "https://picsum.photos/seed/kino/200", lat: 43.250, lng: 76.940 },
    { id: 31, title: "Гастромаркет PlatformA", img: "https://picsum.photos/seed/platforma/200", lat: 43.241, lng: 76.921 },
  ],
  "Пляжи": [
    { id: 42, title: "Пляжная зона Сайран", img: "https://picsum.photos/seed/beach1/200", lat: 43.235, lng: 76.853 },
    { id: 40, title: "Пляжи Первомайских прудов", img: "https://picsum.photos/seed/beach2/200", lat: 43.342, lng: 76.851 },
  ],
  "Здоровье": [
    { id: 47, title: "Медеу — лестница здоровья", img: "https://picsum.photos/seed/health1/200", lat: 43.157, lng: 77.059 },
    { id: 51, title: "Arasan Wellness SPA", img: "https://picsum.photos/seed/health2/200", lat: 43.264, lng: 76.947 },
    { id: 49, title: "Санаторий Almaty Resort", img: "https://picsum.photos/seed/health3/200", lat: 43.192, lng: 76.872 },
  ],
  "Торговля": [
    { id: 57, title: "ТРЦ Mega Alma-Ata", img: "https://picsum.photos/seed/mega/200", lat: 43.201, lng: 76.892 },
    { id: 58, title: "ТРЦ Dostyk Plaza", img: "https://picsum.photos/seed/dostyk/200", lat: 43.234, lng: 76.957 },
    { id: 59, title: "Esentai Mall", img: "https://picsum.photos/seed/esentai/200", lat: 43.218, lng: 76.928 },
    { id: 62, title: "Алматинский зоопарк", img: "https://picsum.photos/seed/zoo/200", lat: 43.262, lng: 76.975 },
    { id: 66, title: "Выставочный центр Атакент", img: "https://picsum.photos/seed/atakent/200", lat: 43.225, lng: 76.913 },
    { id: 67, title: "Аэропорт Алматы ALA", img: "https://picsum.photos/seed/airport/200", lat: 43.352, lng: 77.040 },
  ],
};

const CATEGORIES = Object.keys(CATEGORY_DATA);

/* ── All POIs flat list for search ── */
const ALL_POIS = Object.values(CATEGORY_DATA).flat();

/* ── Icons ── */
const getBusIcon = (passengers) => {
  const p = passengers || 0;
  let bg = '#10B981'; // Green
  if (p >= 45) bg = '#ef4444'; // Red
  else if (p >= 25) bg = '#f59e0b'; // Yellow
  return new L.DivIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:10px;background:${bg};
      border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 12px rgba(0,0,0,0.18);">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A2.99 2.99 0 0020 16V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
        <path d="M6 12h12M6 6h12"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>
      </svg></div>`,
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
};

const stopIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:12px;height:12px;border-radius:50%;
    background:#fff;border:3px solid #2f80ed;
    box-shadow:0 2px 8px rgba(47,128,237,0.4);"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6],
});

const destIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;
    background:#ef4444;border:3px solid #fff;
    box-shadow:0 2px 10px rgba(239,68,68,0.5);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

/* ── Map helpers ── */
function CustomControls() {
  const map = useMap();
  return (
    <div className="anime-map-controls">
      <button className="control-btn" onClick={() => map.zoomIn()}><Plus size={18} /></button>
      <div className="control-divider"></div>
      <button className="control-btn" onClick={() => map.zoomOut()}><Minus size={18} /></button>
      <div className="control-spacer"></div>
      <button className="control-btn" onClick={() => map.locate({ setView: true, maxZoom: 16 })}><Compass size={18} /></button>
      <button className="control-btn primary" onClick={() => map.locate({ setView: true, maxZoom: 16 })}><Navigation size={18} /></button>
    </div>
  );
}

function FlyTo({ route, transitRoute }) {
  const map = useMap();
  useEffect(() => {
    if (route?.path?.length) {
      const valid = route.path.filter(Array.isArray);
      if (valid.length) map.flyToBounds(L.latLngBounds(valid), { padding: [80, 80], duration: 1.2 });
    }
  }, [route, map]);
  useEffect(() => {
    if (transitRoute?.walk1?.length && transitRoute?.walk2?.length) {
      const allCoords = [
        ...(transitRoute.walk1 || []),
        ...(transitRoute.busPath || []),
        ...(transitRoute.busPath1 || []),
        ...(transitRoute.transferWalk || []),
        ...(transitRoute.busPath2 || []),
        ...(transitRoute.walk2 || [])
      ];
      const valid = allCoords.filter(Array.isArray);
      if (valid.length > 1) map.flyToBounds(L.latLngBounds(valid), { padding: [80, 80], duration: 1.2 });
    }
  }, [transitRoute, map]);
  return null;
}

/* ════════════════════════════════
   MAIN COMPONENT
════════════════════════════════ */
export default function UserMap() {
  const navigate = useNavigate();
  const location = useLocation();

  const [allRoutes, setAllRoutes] = useState([]);
  const [allBuses, setAllBuses] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [routeObj, setRouteObj] = useState(null);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [transitRoute, setTransitRoute] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [activePoi, setActivePoi] = useState(null);
  const [routeError, setRouteError] = useState('');

  const searchRef = useRef(null);

  /* ── Click outside to close dropdown ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── POI click: build route ── */
  const handlePoiClick = async (poi) => {
    setIsLoadingRoute(true);
    setRouteError('');
    setTransitRoute(null);
    setActivePoi(poi);
    setShowDropdown(false);
    setQuery('');

    const target = { ...poi };

    if (!target.lat || !target.lng) {
      setIsLoadingRoute(false);
      setRouteError('Координаты не найдены. Выберите место из списка.');
      return;
    }

    const runCalc = async (origin) => {
      try {
        const res = await axios.get('/api/search-route', {
          params: { fromLat: origin.lat, fromLng: origin.lng, toLat: target.lat, toLng: target.lng }
        });
        const result = res.data;
        if (result && !result.error) {
          setTransitRoute(result);
        } else {
          setRouteError('Маршрут не найден. Попробуйте другое место.');
        }
      } catch (e) {
        console.error('Route calc error:', e);
        setRouteError(`Ошибка при построении маршрута: ${e.response?.data?.error || e.message}`);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => runCalc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => runCalc({ lat: 43.238, lng: 76.889 }),
        { timeout: 5000 }
      );
    } else {
      runCalc({ lat: 43.238, lng: 76.889 });
    }
  };

  /* ── Destination from Home page ── */
  const dest = location.state?.destination || '';
  useEffect(() => {
    const BASE = '/api';
    axios.get(`${BASE}/routes`).then(r => {
      const fetched = Array.isArray(r.data) ? r.data : [];
      setAllRoutes(fetched);
      if (dest) {
        const f = fetched.find(x => x.name.toLowerCase().includes(dest.toLowerCase()) || String(x.number) === dest);
        if (f) setRouteObj(f);
        else {
          const poi = ALL_POIS.find(p => p.title.toLowerCase().includes(dest.toLowerCase()));
          if (poi) handlePoiClick(poi);
        }
      }
    }).catch(() => {});
    axios.get(`${BASE}/stops`).then(r => setAllStops(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [dest]);

  /* ── Bus polling ── */
  useEffect(() => {
    const poll = () => axios.get('/api/buses', { timeout: 2000 })
      .then(r => setAllBuses(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, []);

  /* ── Search suggestions: POIs + routes + Nominatim ── */
  const [externalPois, setExternalPois] = useState([]);
  
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) {
      setExternalPois([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}, Алматы&viewbox=76.7,43.4,77.1,43.1&bounded=1&limit=4`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            const places = res.data.map(p => ({
              id: 'nom_' + p.place_id,
              title: p.display_name.split(',')[0] + (p.display_name.split(',')[1] ? ',' + p.display_name.split(',')[1] : ''),
              lat: parseFloat(p.lat),
              lng: parseFloat(p.lon),
              _isExternal: true
            }));
            setExternalPois(places);
          } else {
            setExternalPois([]);
          }
        })
        .catch(e => console.error("Nominatim error:", e));
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matchPois = ALL_POIS.filter(p => p.title.toLowerCase().includes(q)).slice(0, 3);
    const matchRoutes = allRoutes
      .filter(r => r.name?.toLowerCase().includes(q) || String(r.number).includes(q))
      .slice(0, 3)
      .map(r => ({ ...r, _isRoute: true }));
    return [...matchRoutes, ...matchPois, ...externalPois].slice(0, 7);
  }, [query, allRoutes, externalPois]);

  const mapBuses = useMemo(() => {
    let targetIds = routeObj ? [routeObj.id] : [];
    if (!routeObj && transitRoute) {
      if (transitRoute.isTransfer) {
        const m1 = allRoutes.find(r => String(r.number) === String(transitRoute.route1?.number));
        const m2 = allRoutes.find(r => String(r.number) === String(transitRoute.route2?.number));
        if (m1) targetIds.push(m1.id);
        if (m2) targetIds.push(m2.id);
      } else if (transitRoute.route?.number) {
        const m = allRoutes.find(r => String(r.number) === String(transitRoute.route.number));
        if (m) targetIds.push(m.id);
      }
    }
    return targetIds.length ? allBuses.filter(b => targetIds.includes(b.routeId)) : [];
  }, [routeObj, allBuses, transitRoute, allRoutes]);

  const mapStops = useMemo(() => {
    let targetIds = routeObj ? [routeObj.id] : [];
    if (!routeObj && transitRoute) {
      if (transitRoute.isTransfer) {
        const m1 = allRoutes.find(r => String(r.number) === String(transitRoute.route1?.number));
        const m2 = allRoutes.find(r => String(r.number) === String(transitRoute.route2?.number));
        if (m1) targetIds.push(m1.id);
        if (m2) targetIds.push(m2.id);
      } else if (transitRoute.route?.number) {
        const m = allRoutes.find(r => String(r.number) === String(transitRoute.route.number));
        if (m) targetIds.push(m.id);
      }
    }
    return targetIds.length ? allStops.filter(s => targetIds.includes(s.routeId)) : [];
  }, [routeObj, allStops, transitRoute, allRoutes]);

  /* ── Clear everything ── */
  const clearRoute = () => {
    setTransitRoute(null);
    setActivePoi(null);
    setRouteError('');
    setRouteObj(null);
  };

  return (
    <div className="anime-root">
      {/* MAP */}
      <div className="anime-map-container">
        <MapContainer center={[43.238, 76.889]} zoom={13} zoomControl={false} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="© CartoDB"
            className="anime-map-tiles"
          />

          {/* Selected route path */}
          {routeObj?.path && <>
            <Polyline positions={routeObj.path} color="#e0f0ff" weight={10} opacity={0.5} />
            <Polyline positions={routeObj.path} color="#2f80ed" weight={4} opacity={1} />
          </>}

          {/* Route stops */}
          {mapStops.map(s => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={stopIcon}>
              <Tooltip direction="top" offset={[0, -8]} opacity={1} className="anime-tooltip">{s.name}</Tooltip>
            </Marker>
          ))}

          {/* Live buses */}
          {mapBuses.map(bus => (
            <Marker key={bus.id} position={[bus.lat, bus.lng]} icon={getBusIcon(bus.passengers)}>
              <Popup className="anime-popup">
                <b>Маршрут: {bus.routeId}</b><br />
                Пассажиров: {bus.passengers || 0}
              </Popup>
            </Marker>
          ))}

          {/* Transit route */}
          {transitRoute && activePoi && transitRoute.walk1?.length > 0 && <>
            {/* Walk 1 */}
            <Polyline positions={transitRoute.walk1} color="#667085" weight={3} dashArray="8,6" opacity={0.8} />

            {/* DIRECT OR NO TRANSFER */}
            {!transitRoute.isTransfer && !transitRoute.isDirect && transitRoute.busPath?.length > 0 && (
              <Polyline positions={transitRoute.busPath} color="#2f80ed" weight={5} opacity={1} />
            )}

            {/* WITH TRANSFER */}
            {transitRoute.isTransfer && transitRoute.busPath1?.length > 0 && (
              <Polyline positions={transitRoute.busPath1} color="#2f80ed" weight={5} opacity={1} />
            )}
            {transitRoute.isTransfer && transitRoute.transferWalk?.length > 0 && (
              <Polyline positions={transitRoute.transferWalk} color="#f59e0b" weight={3} dashArray="8,6" opacity={0.8} />
            )}
            {transitRoute.isTransfer && transitRoute.busPath2?.length > 0 && (
              <Polyline positions={transitRoute.busPath2} color="#10B981" weight={5} opacity={1} />
            )}

            {/* Walk 2 (partial — дальше пешком) */}
            {!transitRoute.isDirect && transitRoute.walk2?.length > 0 && (
              <Polyline positions={transitRoute.walk2} color="#f59e0b" weight={3} dashArray="8,6" opacity={0.9} />
            )}

            {/* User position */}
            <Marker position={transitRoute.walk1[0]} icon={stopIcon}>
              <Tooltip direction="bottom" offset={[0, 8]} opacity={1} className="anime-tooltip" permanent>Вы здесь</Tooltip>
            </Marker>

            {/* Boarding stop 1 */}
            {!transitRoute.isDirect && transitRoute.stop1 && (
              <Marker position={[transitRoute.stop1.lat, transitRoute.stop1.lng]} icon={stopIcon}>
                <Tooltip direction="top" offset={[0, -8]} opacity={1} className="anime-tooltip" permanent>🚌 {transitRoute.stop1.name}</Tooltip>
              </Marker>
            )}

            {/* Transfer / Alighting */}
            {transitRoute.isTransfer ? (
              <>
                <Marker position={[transitRoute.stop2.lat, transitRoute.stop2.lng]} icon={stopIcon}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} className="anime-tooltip" permanent>🔄 Выход: {transitRoute.stop2.name}</Tooltip>
                </Marker>
                <Marker position={[transitRoute.stop3.lat, transitRoute.stop3.lng]} icon={stopIcon}>
                  <Tooltip direction="bottom" offset={[0, 8]} opacity={1} className="anime-tooltip" permanent>🚌 Пересадка: {transitRoute.stop3.name}</Tooltip>
                </Marker>
                <Marker position={[transitRoute.stop4.lat, transitRoute.stop4.lng]} icon={stopIcon}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} className="anime-tooltip" permanent>⬇ Выход: {transitRoute.stop4.name}</Tooltip>
                </Marker>
              </>
            ) : (
              !transitRoute.isDirect && transitRoute.stop2 && (
                <Marker position={[transitRoute.stop2.lat, transitRoute.stop2.lng]} icon={stopIcon}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} className="anime-tooltip" permanent>⬇ {transitRoute.stop2.name}</Tooltip>
                </Marker>
              )
            )}

            {/* Destination */}
            {activePoi?.lat && activePoi?.lng && (
              <Marker position={[activePoi.lat, activePoi.lng]} icon={destIcon}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1} className="anime-tooltip" permanent>📍 {activePoi.title}</Tooltip>
              </Marker>
            )}
          </>}

          <FlyTo route={routeObj} transitRoute={transitRoute} />
          <CustomControls />
        </MapContainer>
      </div>

      {/* SIDEBAR */}
      <div className="anime-sidebar-glass">
        <div className="sidebar-header-decor"></div>

        <div className="sidebar-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="sidebar-title">Городской<br />Компас</h1>
            {(transitRoute || routeObj) && (
              <button onClick={clearRoute} style={{
                border: 0, background: '#f0f4f8', borderRadius: 10, padding: '6px 10px',
                cursor: 'pointer', color: '#667085', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit'
              }}>
                <X size={14} /> Сбросить
              </button>
            )}
          </div>

          {/* Search */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <div className="anime-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Сайран, Медеу, маршрут 34..."
                value={query}
                onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && suggestions.length > 0) {
                    const first = suggestions[0];
                    first._isRoute ? setRouteObj(first) : handlePoiClick(first);
                  }
                  if (e.key === 'Escape') setShowDropdown(false);
                }}
              />
              {query && (
                <button onClick={() => { setQuery(''); setShowDropdown(false); }} style={{
                  border: 0, background: 'none', cursor: 'pointer', padding: 4, color: '#9aa5b4', display: 'flex'
                }}><X size={16} /></button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="anime-search-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, marginTop: 6 }}>
                {suggestions.map((item) => item._isRoute ? (
                  <div key={'route_' + item.id} className="search-result-item"
                    onClick={() => { setRouteObj(item); setQuery(''); setShowDropdown(false); }}>
                    <span className="route-num" style={{ background: '#eef6ff', color: '#2f80ed' }}>{item.number}</span>
                    <span className="route-name">{item.name}</span>
                  </div>
                ) : (
                  <div key={'poi_' + item.id} className="search-result-item"
                    onClick={() => handlePoiClick(item)}>
                    <span className="route-num" style={{ background: '#fef3c7', color: '#92400e' }}>
                      <MapPin size={13} />
                    </span>
                    <span className="route-name">{item.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loading */}
          {isLoadingRoute && <div className="route-loading">🔍 Строим маршрут...</div>}

          {/* Error */}
          {routeError && (
            <div style={{ padding: '12px 14px', background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 14, color: '#cf1322', fontWeight: 600, fontSize: 13 }}>
              {routeError}
            </div>
          )}

          {/* Route Instructions */}
          {transitRoute && !isLoadingRoute && (
            <div className="route-instructions">
              <div className="route-instructions h3" style={{ fontSize: 11, fontWeight: 900, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Маршрут
              </div>
              <div className="route-dest-name">📍 {activePoi?.title}</div>

              {transitRoute.isDirect ? (
                <div className="instruction-step walk">
                  <span className="icon">🚶‍♂️</span>
                  <div className="step-detail">Пешком {(transitRoute.walk1Dist * 1000).toFixed(0)} м напрямую</div>
                </div>
              ) : transitRoute.isTransfer ? (
                <>
                  <div className="instruction-step walk">
                    <span className="icon">🚶‍♂️</span>
                    <div className="step-detail">Пешком <b>{(transitRoute.walk1Dist * 1000).toFixed(0)} м</b> до остановки<br /><span style={{ color: '#2f80ed', fontSize: 12 }}>«{transitRoute.stop1?.name}»</span></div>
                  </div>
                  <div className="instruction-step bus">
                    <span className="icon">🚌</span>
                    <div className="step-detail">Автобус №<b>{transitRoute.route1?.number}</b><br /><span style={{ color: '#667085', fontSize: 12 }}>до «{transitRoute.stop2?.name}»</span></div>
                    <span className="step-badge">#{transitRoute.route1?.number}</span>
                  </div>
                  <div className="instruction-step walk">
                    <span className="icon">🔄</span>
                    <div className="step-detail">Пересадка <b>{(transitRoute.transferWalkDist * 1000).toFixed(0)} м</b><br /><span style={{ color: '#10B981', fontSize: 12 }}>Идите к «{transitRoute.stop3?.name}»</span></div>
                  </div>
                  <div className="instruction-step bus">
                    <span className="icon">🚌</span>
                    <div className="step-detail">Автобус №<b>{transitRoute.route2?.number}</b><br /><span style={{ color: '#667085', fontSize: 12 }}>до «{transitRoute.stop4?.name}»</span></div>
                    <span className="step-badge" style={{background:'#e6f4ea', color:'#10b981'}}>#{transitRoute.route2?.number}</span>
                  </div>
                  <div className="instruction-step walk">
                    <span className="icon">🥾</span>
                    <div className="step-detail">Пешком <b>{(transitRoute.walk2Dist * 1000).toFixed(0)} м</b> до цели</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="instruction-step walk">
                    <span className="icon">🚶‍♂️</span>
                    <div className="step-detail">
                      Пешком <b>{(transitRoute.walk1Dist * 1000).toFixed(0)} м</b> до остановки<br />
                      <span style={{ color: '#2f80ed', fontSize: 12 }}>«{transitRoute.stop1?.name}»</span>
                    </div>
                  </div>
                  <div className="instruction-step bus">
                    <span className="icon">🚌</span>
                    <div className="step-detail">
                      Автобус №<b>{transitRoute.route?.number}</b> — {transitRoute.route?.name}<br />
                      <span style={{ color: '#667085', fontSize: 12 }}>до остановки «{transitRoute.stop2?.name}»</span>
                    </div>
                    <span className="step-badge">#{transitRoute.route?.number}</span>
                  </div>
                  {transitRoute.walk2Dist > 0.05 && (
                    <div className={`instruction-step ${transitRoute.isPartial ? 'walk-partial' : 'walk'}`}>
                      <span className="icon">{transitRoute.isPartial ? '🥾' : '🚶‍♂️'}</span>
                      <div className="step-detail">
                        Пешком <b>{(transitRoute.walk2Dist * 1000).toFixed(0)} м</b> до цели
                        {transitRoute.isPartial && (
                          <><br /><span className="partial-badge">Автобус не доезжает — идти от «{transitRoute.stop2?.name}»</span></>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Categories */}
          <div className="anime-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`cat-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >{cat}</button>
            ))}
          </div>

          {/* POI Cards */}
          <div className="anime-poi-list">
            {CATEGORY_DATA[activeCategory].map(poi => (
              <div className="poi-card" key={poi.id} onClick={() => handlePoiClick(poi)}>
                <img src={poi.img} alt={poi.title} />
                <div className="poi-card-title">{poi.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP NAV */}
      <div className="anime-top-nav">
        <div className="top-nav-logo">
          <Compass size={18} className="logo-icon" /> SmartTransit
        </div>
      </div>
    </div>
  );
}
