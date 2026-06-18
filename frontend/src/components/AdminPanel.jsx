import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './AdminPanel.css';
import { ArrowLeft, Camera, ShieldCheck, Activity, Map, Save, Lock } from 'lucide-react';
import axios from 'axios';

const getAdminBusIcon = (passengers) => {
  const p = passengers || 0;
  let bg = '#10B981';
  let shadow = 'rgba(16, 185, 129, 0.4)';
  if (p >= 45) {
    bg = '#EF4444';
    shadow = 'rgba(239, 68, 68, 0.5)';
  } else if (p >= 25) {
    bg = '#F59E0B';
    shadow = 'rgba(245, 158, 11, 0.5)';
  }

  return new L.DivIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};
      border:3px solid #ffffff;display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 12px ${shadow}; color: white; font-weight: bold; font-size: 11px;">
      ${p}
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
};

const editorStopIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #3B82F6;box-shadow:0 0 10px rgba(59,130,246,0.3);"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7]
});

const CAMERA_FEEDS = [
  { id: 'cam1', route: '12', plate: 'A 123 BCD', img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=400&auto=format&fit=crop' },
  { id: 'cam2', route: '92', plate: 'A 777 ZZZ', img: 'https://images.unsplash.com/photo-1600677561919-48222d431c43?q=80&w=400&auto=format&fit=crop' },
  { id: 'cam3', route: '38', plate: 'A 001 VIP', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=400&auto=format&fit=crop' },
  { id: 'cam4', route: '65', plate: 'A 555 QWE', img: 'https://images.unsplash.com/photo-1615655406736-b3e50b8eb950?q=80&w=400&auto=format&fit=crop' },
];

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [online, setOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [routeName, setRouteName] = useState("");
  const [routeNumber, setRouteNumber] = useState("");
  const [allRoutes, setAllRoutes] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [viewedRoute, setViewedRoute] = useState(null);
  const [editorStops, setEditorStops] = useState([]);
  const [editorPath, setEditorPath] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [stopPrompt, setStopPrompt] = useState({ show: false, lat: null, lng: null, name: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    if (editorStops.length < 2) {
      setEditorPath([]);
      return;
    }
    const coords = editorStops.map(s => `${s.lng},${s.lat}`).join(';');
    axios.get(`http://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then(res => {
        if (res.data.routes && res.data.routes[0]) {
          const geocoords = res.data.routes[0].geometry.coordinates;
          setEditorPath(geocoords.map(c => [c[1], c[0]]));
        }
      }).catch(e => console.error("OSRM Error", e));
  }, [editorStops]);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await axios.get('/api/buses', { timeout: 2000 });
        setBuses(Array.isArray(res.data) ? res.data : []);
        setOnline(true);
      } catch (e) {
        setOnline(false);
      }
    };
    
    const fetchInfra = async () => {
      try {
        const [rRes, sRes] = await Promise.all([
          axios.get('/api/routes'),
          axios.get('/api/stops')
        ]);
        setAllRoutes(Array.isArray(rRes.data) ? rRes.data : []);
        setAllStops(Array.isArray(sRes.data) ? sRes.data : []);
      } catch (e) { console.error("Error fetching routes/stops", e); }
    };

    fetchBuses();
    fetchInfra();
    const iv = setInterval(fetchBuses, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleMapClick = async (lat, lng) => {
    if (activeTab !== 'EDITOR') return;
    setStopPrompt({ show: true, lat, lng, name: '' });
  };

  const handleAddStopSubmit = async () => {
    if (!stopPrompt.name) {
      setStopPrompt({ show: false, lat: null, lng: null, name: '' });
      return;
    }
    try {
      const res = await axios.post('/api/stops', { 
        name: stopPrompt.name, 
        lat: stopPrompt.lat, 
        lng: stopPrompt.lng 
      });
      const newStop = res.data[0];
      setEditorStops(prev => [...prev, newStop]);
      showToast("Остановка добавлена", "success");
    } catch(e) {
      showToast("Ошибка при добавлении остановки", "error");
    }
    setStopPrompt({ show: false, lat: null, lng: null, name: '' });
  };

  const handleSaveRoute = async () => {
    if (!routeNumber || !routeName || editorStops.length < 2) {
      showToast("Заполните номер, название и добавьте минимум 2 остановки", "error");
      return;
    }
    setIsSaving(true);
    try {
      await axios.post('/api/routes', {
        number: routeNumber,
        name: routeName,
        stopOrder: editorStops.map(s => s.id)
      });
      showToast("Маршрут успешно создан!", "success");
      setRouteNumber("");
      setRouteName("");
      setEditorStops([]);
      
      const [rRes, sRes] = await Promise.all([
        axios.get('/api/routes'),
        axios.get('/api/stops')
      ]);
      setAllRoutes(rRes.data);
      setAllStops(sRes.data);
    } catch(e) {
      showToast("Ошибка при сохранении маршрута", "error");
    }
    setIsSaving(false);
  };

  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');
  const [activeCctvBus, setActiveCctvBus] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const offCanvasRef = useRef(document.createElement('canvas'));
  const lastFrameRef = useRef(null);
  const [mlModel, setMlModel] = useState(null);

  useEffect(() => {
    import('@tensorflow/tfjs').then(() => {
      import('@tensorflow-models/coco-ssd').then(cocoSsd => {
        cocoSsd.load().then(model => setMlModel(model))
               .catch(e => console.error("Error loading model", e));
      });
    });
  }, []);

  useEffect(() => {
    let animationId;
    const detectFrame = async () => {
      if (videoRef.current && canvasRef.current && mlModel && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
          canvas.width = video.clientWidth;
          canvas.height = video.clientHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          const predictions = await mlModel.detect(video, 50, 0.35);
          predictions.forEach(prediction => {
            if (prediction.class !== 'person') return;
            const [x, y, width, height] = prediction.bbox;
            const headSize = Math.min(width * 0.6, height * 0.25); 
            const headX = x + (width - headSize) / 2;
            const headY = y;
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;
            const scaledX = headX * scaleX;
            const scaledY = headY * scaleY;
            const scaledWidth = headSize * scaleX;
            const scaledHeight = headSize * scaleY;

            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
            
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

            ctx.fillStyle = '#3B82F6';
            ctx.font = 'bold 11px Inter';
            ctx.fillText(`ID_TRACK ${Math.round(prediction.score * 100)}%`, scaledX, scaledY > 12 ? scaledY - 5 : 12);
          });
        } catch (e) {}
      }
      animationId = requestAnimationFrame(detectFrame);
    };
    
    if (activeCctvBus && mlModel) detectFrame();
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [activeCctvBus, mlModel]);

  const totalPassengers = buses.reduce((acc, b) => acc + (b.passengers || 0), 0);
  const criticalBuses = buses.filter(b => b.passengers >= 45).length;

  const uniqueRoutes = [...new Set(buses.map(b => b.routeId))];
  const filteredBuses = selectedRouteFilter === 'ALL' 
    ? buses 
    : buses.filter(b => b.routeId === selectedRouteFilter);

  if (!isAuthenticated) {
    return (
      <div className="premium-auth-bg">
        <div className="premium-auth-card">
          <div className="auth-icon-wrapper">
            <Lock size={32} className="auth-icon" />
          </div>
          <h2>Вход в панель управления</h2>
          <p>Пожалуйста, введите пароль администратора для доступа к системе мониторинга.</p>
          <input 
            type="password" 
            className="premium-input"
            placeholder="Введите пароль..."
            value={passwordInput} 
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (passwordInput === '12345') setIsAuthenticated(true);
                else showToast('Неверный пароль', 'error');
              }
            }}
            autoFocus
          />
          <button className="premium-btn primary full-width" onClick={() => {
            if (passwordInput === '12345') setIsAuthenticated(true);
            else showToast('Неверный пароль', 'error');
          }}>
            Войти в систему
          </button>
        </div>
        {/* TOAST NOTIFICATION */}
        {toast.show && (
          <div className={`premium-toast ${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="premium-admin-root">
      <nav className="premium-navbar">
        <div className="nav-left">
          <button className="premium-btn-icon" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> <span>Назад</span>
          </button>
          <div className="nav-brand">
            <div className="brand-logo">
              <ShieldCheck size={20} />
            </div>
            <h2>SmartTransit Admin</h2>
          </div>
        </div>
        <div className="nav-center">
          <div className="premium-tabs">
            <button className={`premium-tab ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
              <Activity size={16}/> <span>Мониторинг</span>
            </button>
            <button className={`premium-tab ${activeTab === 'EDITOR' ? 'active' : ''}`} onClick={() => setActiveTab('EDITOR')}>
              <Map size={16}/> <span>Редактор маршрутов</span>
            </button>
          </div>
        </div>
        <div className="nav-right">
          <div className={`premium-status ${online ? 'ok' : 'err'}`}>
            <div className="status-dot"></div>
            {online ? 'API Подключен' : 'Сбой связи'}
          </div>
        </div>
      </nav>

      {activeTab === 'DASHBOARD' && (
        <div className="premium-dashboard">
          <div className="premium-kpi-bar">
            <div className="premium-kpi-card">
              <span className="kpi-label">Всего автобусов</span>
              <span className="kpi-value">{buses.length}</span>
            </div>
            <div className="premium-kpi-card">
              <span className="kpi-label">Пассажиропоток</span>
              <span className="kpi-value">{totalPassengers}</span>
            </div>
            <div className="premium-kpi-card">
              <span className="kpi-label">Перегружено</span>
              <span className="kpi-value alert">{criticalBuses}</span>
            </div>
            <div className="premium-kpi-card filter-card">
              <span className="kpi-label">Фильтр маршрутов</span>
              <select 
                className="premium-select" 
                value={selectedRouteFilter} 
                onChange={e => { setSelectedRouteFilter(e.target.value); setActiveCctvBus(null); }}
              >
                <option value="ALL">Весь автопарк</option>
                {uniqueRoutes.map(r => (
                  <option key={r} value={r}>Маршрут №{String(r).replace('route_vip_','').replace('route_synth_','')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="premium-grid">
            <div className="premium-panel list-panel">
              <div className="panel-header">
                <h3>Оперативная сводка</h3>
                <span className="badge">{filteredBuses.length} активных</span>
              </div>
              <div className="premium-table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Гос.Номер</th>
                      <th>Маршрут</th>
                      <th>Загруженность</th>
                      <th>Статус</th>
                      <th>Камера</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuses.map((bus) => {
                      const p = bus.passengers || 0;
                      let status = 'В норме';
                      let statusClass = 'normal';
                      if (p >= 45) { status = 'Переполнен'; statusClass = 'critical'; }
                      else if (p >= 25) { status = 'Уплотнен'; statusClass = 'warning'; }

                      const plateNum = String(bus.id).charCodeAt(bus.id.length-1) % 999;
                      const formattedPlate = `${plateNum.toString().padStart(3, '0')} ABC 02`;

                      return (
                        <tr key={bus.id} className={activeCctvBus?.id === bus.id ? 'active' : ''}>
                          <td><span className="plate-badge">{formattedPlate}</span></td>
                          <td><b>№{String(bus.routeId).replace('route_vip_','').replace('route_synth_','')}</b></td>
                          <td>{p} чел.</td>
                          <td><span className={`status-pill ${statusClass}`}>{status}</span></td>
                          <td>
                            <button className="premium-btn outline small" onClick={() => setActiveCctvBus({...bus, plate: formattedPlate})}>
                              Подключиться
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="premium-panel cctv-panel">
              <div className="panel-header">
                <h3>Камеры видеонаблюдения</h3>
                {activeCctvBus && <span className="badge live">LIVE</span>}
              </div>
              <div className="cctv-content">
                {activeCctvBus ? (
                  <div className="cctv-active">
                    <div className="cctv-video-wrapper">
                      <video ref={videoRef} src="/mock-stream.mp4" autoPlay loop muted playsInline />
                      <canvas ref={canvasRef} className="cctv-canvas" />
                      <div className="cctv-overlay">
                        БОРТ: {activeCctvBus.plate} | {mlModel ? 'ИИ АКТИВЕН' : 'ЗАГРУЗКА ИИ...'}
                      </div>
                      {activeCctvBus.passengers >= 45 && <div className="cctv-warn">ПЕРЕГРУЗ</div>}
                    </div>
                    <div className="cctv-info">
                      <div className="info-grid">
                        <div className="info-item">
                          <span>Гос.Номер</span>
                          <strong>{activeCctvBus.plate}</strong>
                        </div>
                        <div className="info-item">
                          <span>Маршрут</span>
                          <strong>№{String(activeCctvBus.routeId).replace('route_vip_','')}</strong>
                        </div>
                        <div className="info-item">
                          <span>Пассажиров</span>
                          <strong>{activeCctvBus.passengers}</strong>
                        </div>
                        <div className="info-item">
                          <span>Скорость</span>
                          <strong>42 км/ч</strong>
                        </div>
                      </div>
                      <button className="premium-btn danger full-width" onClick={() => setActiveCctvBus(null)}>
                        Отключить камеру
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="cctv-empty">
                    <Camera size={48} className="empty-icon" />
                    <h4>Нет активной трансляции</h4>
                    <p>Выберите автобус из списка слева для подключения к камерам салона.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'EDITOR' && (
        <div className="premium-editor">
          <div className="editor-sidebar">
            <div className="sidebar-section">
              <h3>Существующие маршруты</h3>
              <select 
                className="premium-select full-width" 
                value={viewedRoute?.id || ''}
                onChange={e => {
                  const r = allRoutes.find(rx => String(rx.id) === String(e.target.value));
                  setViewedRoute(r || null);
                }}
              >
                <option value="">-- Выберите для просмотра --</option>
                {allRoutes.map(r => (
                  <option key={r.id} value={r.id}>№{r.number} - {r.name}</option>
                ))}
              </select>
              {viewedRoute && (
                <p className="sub-text">Количество остановок: {viewedRoute.stopOrder?.length || 0}</p>
              )}
            </div>

            <div className="sidebar-section">
              <h3>Создание нового маршрута</h3>
              <p className="sub-text">Кликайте по карте для добавления остановок.</p>
              
              <div className="premium-form-group">
                <label>Номер маршрута</label>
                <input type="text" className="premium-input" placeholder="Например: 12" value={routeNumber} onChange={e => setRouteNumber(e.target.value)} />
              </div>
              <div className="premium-form-group">
                <label>Название маршрута</label>
                <input type="text" className="premium-input" placeholder="Например: Аэропорт - Центр" value={routeName} onChange={e => setRouteName(e.target.value)} />
              </div>

              <div className="stops-container">
                <h4>Остановки ({editorStops.length})</h4>
                <div className="stops-list-scroll">
                  {editorStops.map((s, i) => (
                    <div key={i} className="stop-badge">
                      <span className="stop-index">{i+1}</span>
                      <span className="stop-name">{s.name}</span>
                    </div>
                  ))}
                  {editorStops.length === 0 && <p className="empty-stops">Пока нет остановок</p>}
                </div>
              </div>

              <button className="premium-btn primary full-width" onClick={handleSaveRoute} disabled={isSaving}>
                {isSaving ? 'Сохранение...' : <><Save size={16}/> Сохранить Маршрут</>}
              </button>
            </div>
          </div>
          
          <div className="editor-map-container">
            <MapContainer center={[43.238, 76.889]} zoom={13} className="editor-leaflet">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <MapClickHandler onMapClick={handleMapClick} />
              
              {viewedRoute ? (() => {
                const stopsForRoute = (viewedRoute.stopOrder || [])
                  .map(stopId => allStops.find(s => String(s.id) === String(stopId)))
                  .filter(Boolean);
                return (
                  <>
                    {stopsForRoute.map((s, i) => (
                      <Marker key={`exist-${i}`} position={[s.lat || 0, s.lng || 0]} icon={editorStopIcon}>
                        <Popup>Остановка: {s.name}</Popup>
                      </Marker>
                    ))}
                    {Array.isArray(viewedRoute.path) && viewedRoute.path.length > 0 ? (
                      <Polyline positions={viewedRoute.path} color="#3B82F6" weight={5} opacity={0.8} />
                    ) : (
                      stopsForRoute.length > 1 ? (
                        <Polyline positions={stopsForRoute.map(s => [s.lat || 0, s.lng || 0])} color="#3B82F6" weight={5} opacity={0.5} dashArray="5,10" />
                      ) : null
                    )}
                  </>
                );
              })() : null}

              {editorStops.map((s, i) => (
                <Marker key={`new-${i}`} position={[s.lat || 0, s.lng || 0]} icon={editorStopIcon}>
                  <Popup>{s.name} (Новая)</Popup>
                </Marker>
              ))}
              {Array.isArray(editorPath) && editorPath.length > 1 ? (
                <Polyline positions={editorPath} color="#10B981" weight={4} dashArray="8,8" />
              ) : (
                editorStops && editorStops.length > 1 ? (
                  <Polyline positions={editorStops.map(s => [s.lat || 0, s.lng || 0])} color="#10B981" weight={4} dashArray="8,8" />
                ) : null
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`premium-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {stopPrompt.show && (
        <div className="premium-modal-overlay">
          <div className="premium-modal">
            <h3>Новая остановка</h3>
            <p>Введите название локации для добавления в маршрут.</p>
            <input 
              type="text" 
              className="premium-input full-width"
              placeholder="Название остановки"
              value={stopPrompt.name} 
              autoFocus
              onChange={e => setStopPrompt(prev => ({...prev, name: e.target.value}))}
              onKeyDown={e => e.key === 'Enter' && handleAddStopSubmit()}
            />
            <div className="modal-actions">
              <button className="premium-btn outline" onClick={() => setStopPrompt({show: false, lat: null, lng: null, name: ''})}>Отмена</button>
              <button className="premium-btn primary" onClick={handleAddStopSubmit}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

