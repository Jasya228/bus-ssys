import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './AdminPanel.css';
import { ArrowLeft, Users, Camera, AlertTriangle, ShieldCheck, Activity, Maximize, Map, PlusCircle, Save } from 'lucide-react';
import axios from 'axios';

// Get color coded bus icon based on occupancy
const getAdminBusIcon = (passengers) => {
  const p = passengers || 0;
  let bg = '#10B981'; // Green
  let shadow = 'rgba(16, 185, 129, 0.4)';
  if (p >= 45) {
    bg = '#EF4444'; // Red
    shadow = 'rgba(239, 68, 68, 0.5)';
  } else if (p >= 25) {
    bg = '#F59E0B'; // Yellow
    shadow = 'rgba(245, 158, 11, 0.5)';
  }

  return new L.DivIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};
      border:3px solid #1E293B;display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 15px ${shadow}; color: white; font-weight: bold; font-size: 11px;">
      ${p}
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
};

const editorStopIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #3B82F6;box-shadow:0 0 10px rgba(59,130,246,1);"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7]
});

// Mock camera feeds
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
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD' | 'EDITOR'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Editor State
  const [routeName, setRouteName] = useState("");
  const [routeNumber, setRouteNumber] = useState("");
  const [allRoutes, setAllRoutes] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [viewedRoute, setViewedRoute] = useState(null); // Which existing route to show
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
          setEditorPath(geocoords.map(c => [c[1], c[0]])); // leaflet is lat,lng
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
      showToast("Заполните номер, название и добавьте минимум 2 остановки (кликом по карте).", "error");
      return;
    }
    setIsSaving(true);
    try {
      await axios.post('/api/routes', {
        number: routeNumber,
        name: routeName,
        stopOrder: editorStops.map(s => s.id)
      });
      alert("Маршрут успешно создан!");
      setRouteNumber("");
      setRouteName("");
      setEditorStops([]);
      
      // Refresh infra
      const [rRes, sRes] = await Promise.all([
        axios.get('/api/routes'),
        axios.get('/api/stops')
      ]);
      setAllRoutes(rRes.data);
      setAllStops(sRes.data);

    } catch(e) {
      alert("Ошибка при сохранении маршрута");
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
    // Load TFJS model
    import('@tensorflow/tfjs').then(() => {
      import('@tensorflow-models/coco-ssd').then(cocoSsd => {
        cocoSsd.load().then(model => {
          setMlModel(model);
        }).catch(e => console.error("Error loading model", e));
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

        // --- RAW MOTION DETECTION (Pixel Diffing) ---
        try {
          const offCanvas = offCanvasRef.current;
          const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
          const cols = 32;
          const rows = 24;
          offCanvas.width = cols;
          offCanvas.height = rows;
          offCtx.drawImage(video, 0, 0, cols, rows);
          const currentData = offCtx.getImageData(0, 0, cols, rows).data;

          if (lastFrameRef.current) {
            const lastData = lastFrameRef.current;
            for (let i = 0; i < currentData.length; i += 4) {
              const diff = Math.abs(currentData[i] - lastData[i]) + 
                           Math.abs(currentData[i+1] - lastData[i+1]) + 
                           Math.abs(currentData[i+2] - lastData[i+2]);
              
              if (diff > 45) { // Motion sensitivity threshold
                const pIdx = i / 4;
                const cx = pIdx % cols;
                const cy = Math.floor(pIdx / cols);
                const dX = (cx / cols) * canvas.width;
                const dY = (cy / rows) * canvas.height;
                const dW = canvas.width / cols;
                const dH = canvas.height / rows;

                ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)'; // Orange
                ctx.lineWidth = 1;
                ctx.strokeRect(dX, dY, dW, dH);
                
                if (Math.random() > 0.98) {
                  ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
                  ctx.font = '9px "Courier New"';
                  ctx.fillText('MOV_DETECT', dX, dY - 2);
                }
              }
            }
          }
          lastFrameRef.current = new Uint8ClampedArray(currentData);
        } catch (e) {}
        // --- END MOTION DETECTION ---

        // --- ML OBJECT DETECTION ---
        try {
          // Detect more objects with lower confidence to catch partial faces/bodies
          const predictions = await mlModel.detect(video, 50, 0.35);
          
          predictions.forEach(prediction => {
            if (prediction.class !== 'person') return;

            const [x, y, width, height] = prediction.bbox;
            
            // AI Head Tracking logic: Extract the head region from the full person bbox
            // The head is typically at the top center of the person's bounding box
            const headSize = Math.min(width * 0.6, height * 0.25); 
            const headX = x + (width - headSize) / 2;
            const headY = y;

            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;

            const scaledX = headX * scaleX;
            const scaledY = headY * scaleY;
            const scaledWidth = headSize * scaleX;
            const scaledHeight = headSize * scaleY;

            ctx.strokeStyle = '#00FF41';
            ctx.lineWidth = 2;
            
            // Draw crosshairs style corners instead of full box for cooler look
            const cornerSize = scaledWidth * 0.2;
            ctx.beginPath();
            // Top-left
            ctx.moveTo(scaledX, scaledY + cornerSize);
            ctx.lineTo(scaledX, scaledY);
            ctx.lineTo(scaledX + cornerSize, scaledY);
            // Top-right
            ctx.moveTo(scaledX + scaledWidth - cornerSize, scaledY);
            ctx.lineTo(scaledX + scaledWidth, scaledY);
            ctx.lineTo(scaledX + scaledWidth, scaledY + cornerSize);
            // Bottom-right
            ctx.moveTo(scaledX + scaledWidth, scaledY + scaledHeight - cornerSize);
            ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight);
            ctx.lineTo(scaledX + scaledWidth - cornerSize, scaledY + scaledHeight);
            // Bottom-left
            ctx.moveTo(scaledX + cornerSize, scaledY + scaledHeight);
            ctx.lineTo(scaledX, scaledY + scaledHeight);
            ctx.lineTo(scaledX, scaledY + scaledHeight - cornerSize);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(0, 255, 65, 0.1)';
            ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

            ctx.fillStyle = '#00FF41';
            ctx.font = 'bold 11px "Courier New"';
            ctx.fillText(
              `HEAD_TRK ${Math.round(prediction.score * 100)}%`,
              scaledX, scaledY > 12 ? scaledY - 5 : 12
            );
          });
        } catch (e) {}
      }
      animationId = requestAnimationFrame(detectFrame);
    };
    
    if (activeCctvBus && mlModel) {
      detectFrame();
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [activeCctvBus, mlModel]);

  const totalPassengers = buses.reduce((acc, b) => acc + (b.passengers || 0), 0);
  const criticalBuses = buses.filter(b => b.passengers >= 45).length;

  const uniqueRoutes = [...new Set(buses.map(b => b.routeId))];
  const filteredBuses = selectedRouteFilter === 'ALL' 
    ? buses 
    : buses.filter(b => b.routeId === selectedRouteFilter);

  if (!isAuthenticated) {
    return (
      <div className="admin-root" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="nasa-modal">
          <h4 style={{ marginTop: 0, color: '#EF4444', letterSpacing: '2px' }}>ОГРАНИЧЕННЫЙ ДОСТУП</h4>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>Введите пароль администратора:</p>
          <input 
            type="password" 
            className="nasa-input"
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: '15px', background: '#1F2937', color: 'white', padding: '10px', border: '1px solid #374151', borderRadius: '4px' }}
            value={passwordInput} 
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (passwordInput === '12345') setIsAuthenticated(true);
                else alert('Неверный пароль!');
              }
            }}
            autoFocus
          />
          <div className="nasa-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="nasa-btn primary" style={{ background: '#EF4444', color: '#FFF', padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }} onClick={() => {
              if (passwordInput === '12345') setIsAuthenticated(true);
              else alert('Неверный пароль!');
            }}>АВТОРИЗОВАТЬСЯ</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root">
      <nav className="admin-navbar">
        <div className="nav-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} /> Назад
          </button>
          <div className="admin-brand">
            <ShieldCheck className="brand-icon" size={24} />
            <h2>Департамент Мониторинга (Админ-Панель)</h2>
          </div>
        </div>
        <div className="nav-center">
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
              <Activity size={16}/> Мониторинг AI
            </button>
            <button className={`tab-btn ${activeTab === 'EDITOR' ? 'active' : ''}`} onClick={() => setActiveTab('EDITOR')}>
              <Map size={16}/> Редактор маршрутов
            </button>
          </div>
        </div>
        <div className="nav-right">
          <div className={`system-status ${online ? 'ok' : 'err'}`}>
            <div className="blob"></div>
            {online ? 'API Активен' : 'Сбой связи'}
          </div>
        </div>
      </nav>

      {activeTab === 'DASHBOARD' && (
        <div className="admin-content-nasa">
          <div className="nasa-top-panel">
            <div className="nasa-kpi">
              <span className="nasa-label">ВСЕГО АВТОБУСОВ</span>
              <span className="nasa-value">{buses.length}</span>
            </div>
            <div className="nasa-kpi">
              <span className="nasa-label">ОБЩИЙ ПАССАЖИРОПОТОК</span>
              <span className="nasa-value">{totalPassengers}</span>
            </div>
            <div className="nasa-kpi">
              <span className="nasa-label">ПЕРЕГРУЖЕНО (КРИТ.)</span>
              <span className="nasa-value alert">{criticalBuses}</span>
            </div>
            <div className="nasa-kpi">
              <span className="nasa-label">ФИЛЬТР МАРШРУТА</span>
              <select 
                className="nasa-select" 
                value={selectedRouteFilter} 
                onChange={e => { setSelectedRouteFilter(e.target.value); setActiveCctvBus(null); }}
              >
                <option value="ALL">ВЕСТЬ ПАРК (Все маршруты)</option>
                {uniqueRoutes.map(r => (
                  <option key={r} value={r}>Маршрут №{r.replace('route_vip_','').replace('route_synth_','')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="nasa-main-grid">
            {/* Left: Scalable List of Buses */}
            <div className="nasa-list-section">
              <div className="nasa-header">
                <span className="blink">●</span> ОПЕРАТИВНАЯ СВОДКА (БОРТОВ: {filteredBuses.length})
              </div>
              <div className="nasa-table-wrapper">
                <table className="nasa-table">
                  <thead>
                    <tr>
                      <th>ГОС.НОМЕР</th>
                      <th>МАРШРУТ</th>
                      <th>ПАССАЖИРОВ</th>
                      <th>СТАТУС САЛОНА</th>
                      <th>ДЕЙСТВИЕ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuses.map((bus, idx) => {
                      const p = bus.passengers || 0;
                      let status = 'В НОРМЕ';
                      let sColor = '#10B981';
                      if (p >= 45) { status = 'ПЕРЕПОЛНЕН'; sColor = '#EF4444'; }
                      else if (p >= 25) { status = 'УПЛОТНЕН'; sColor = '#F59E0B'; }

                      // Generate a fake license plate based on string to keep it consistent
                      const plateNum = String(bus.id).charCodeAt(bus.id.length-1) % 999;
                      const formattedPlate = `${plateNum.toString().padStart(3, '0')} ABC 02`;

                      return (
                        <tr key={bus.id} className={activeCctvBus?.id === bus.id ? 'active-row' : ''}>
                          <td style={{fontFamily: 'monospace', fontSize: 13}}><b>{formattedPlate}</b></td>
                          <td><b>№ {bus.routeId.replace('route_vip_','').replace('route_synth_','')}</b></td>
                          <td style={{fontSize: 13}}><b>{p}</b> чел.</td>
                          <td style={{color: sColor, fontWeight: 'bold'}}>{status}</td>
                          <td>
                            <button className="nasa-btn" onClick={() => setActiveCctvBus({...bus, plate: formattedPlate})}>
                              ПОДКЛЮЧИТЬ КАМЕРУ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Active CCTV Stream (Single Feed) */}
            <div className="nasa-cctv-section">
              <div className="nasa-header">
                <span className="blink">●</span> ВИДЕОНАБЛЮДЕНИЕ В РЕАЛЬНОМ ВРЕМЕНИ
              </div>
              <div className="nasa-cctv-viewer">
                {activeCctvBus ? (() => {
                  const p = activeCctvBus.passengers || 0;
                  let status = 'В НОРМЕ';
                  let sColor = '#10B981';
                  if (p >= 45) { status = 'ПЕРЕПОЛНЕН (КРИТИЧЕСКИ)'; sColor = '#EF4444'; }
                  else if (p >= 25) { status = 'УПЛОТНЕН (ВНИМАНИЕ)'; sColor = '#F59E0B'; }

                  const imgIdx = activeCctvBus.id.length % CAMERA_FEEDS.length;
                  const feedImg = CAMERA_FEEDS[imgIdx].img;

                  return (
                    <div className="nasa-cam-card single" style={{borderColor: sColor}}>
                      <div className="nasa-cam-video">
                        <video ref={videoRef} src="/mock-stream.mp4" autoPlay loop muted playsInline style={{
                          width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'grayscale(0.5) contrast(1.2)'
                        }} />
                        <canvas ref={canvasRef} style={{
                          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none'
                        }} />
                        <div className="nasa-cam-overlay-top">
                           СОЕДИНЕНИЕ УСТАНОВЛЕНО | БОРТ: {activeCctvBus.plate} | {mlModel ? 'YOLO-AI: ACTIVE | MOTION_SENSE: ACTIVE' : 'INITIALIZING...'}
                        </div>
                        {p >= 45 && <div className="nasa-cam-warn-flash">ОБНАРУЖЕН ПЕРЕГРУЗ</div>}
                      </div>
                      <div className="nasa-cam-telemetry">
                        <div className="tel-row"><span className="tel-lbl">ГОС.НОМЕР</span><span className="tel-val">{activeCctvBus.plate}</span></div>
                        <div className="tel-row"><span className="tel-lbl">МАРШРУТ</span><span className="tel-val">№ {activeCctvBus.routeId.replace('route_vip_','')}</span></div>
                        <div className="tel-row"><span className="tel-lbl">КООРДИНАТЫ</span><span className="tel-val">{activeCctvBus.lat.toFixed(4)}, {activeCctvBus.lng.toFixed(4)}</span></div>
                        <div className="tel-row"><span className="tel-lbl">ЛЮДЕЙ В САЛОНЕ</span><span className="tel-val" style={{fontSize: '18px'}}>{p}</span></div>
                        <div className="tel-row"><span className="tel-lbl">СТАТУС ИИ</span><span className="tel-val" style={{color: sColor}}>{status}</span></div>
                        <div style={{marginTop: 'auto'}}>
                           <button className="nasa-btn danger" onClick={() => setActiveCctvBus(null)}>ОТКЛЮЧИТЬ ТРАНСЛЯЦИЮ</button>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="nasa-no-signal">
                    <Camera size={48} color="#1E293B" />
                    <p>НЕТ ПОДКЛЮЧЕНИЯ</p>
                    <span>Выберите автобус из списка слева, чтобы начать трансляцию с камер наблюдения салона.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'EDITOR' && (
        <div className="admin-editor-content">
          <div className="editor-sidebar">
            
            <div className="existing-routes-section" style={{marginBottom: '20px', borderBottom: '1px solid #1F2937', paddingBottom: '20px'}}>
              <h3 style={{marginTop: 0, color: '#38BDF8'}}>Существующие маршруты</h3>
              <select 
                className="nasa-select" 
                style={{width: '100%'}}
                value={viewedRoute?.id || ''}
                onChange={e => {
                  const r = allRoutes.find(rx => rx.id === e.target.value);
                  setViewedRoute(r || null);
                }}
              >
                <option value="">-- Выберите для просмотра --</option>
                {allRoutes.map(r => (
                  <option key={r.id} value={r.id}>№{r.number} - {r.name}</option>
                ))}
              </select>
              {viewedRoute && (
                <div style={{marginTop: '10px', fontSize: '13px', color: '#9CA3AF'}}>
                  Остановок: {viewedRoute.stopOrder?.length || 0}
                </div>
              )}
            </div>

            <h3 style={{marginTop: 0}}>Создание нового маршрута</h3>
            <p style={{fontSize: 14, color: '#9CA3AF'}}>Кликайте по карте, чтобы добавить новые остановки.</p>
            
            <div className="form-group">
              <label>Номер маршрута:</label>
              <input type="text" placeholder="Напр. 12" value={routeNumber} onChange={e => setRouteNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Название маршрута:</label>
              <input type="text" placeholder="Напр. ЖД Вокзал - Аэропорт" value={routeName} onChange={e => setRouteName(e.target.value)} />
            </div>

            <div className="stops-list">
              <h4>Остановки ({editorStops.length}):</h4>
              {editorStops.map((s, i) => (
                <div key={i} className="stop-item">
                  <span className="stop-num">{i+1}</span>
                  <span className="stop-name">{s.name}</span>
                </div>
              ))}
              {editorStops.length === 0 && <span style={{color: '#6B7280', fontSize: 13}}>Пока нет остановок (режим создания)</span>}
            </div>

            <button className="save-btn" onClick={handleSaveRoute} disabled={isSaving}>
              {isSaving ? 'Сохранение...' : <><Save size={16}/> Сохранить Маршрут</>}
            </button>
          </div>
          <div className="editor-map-wrapper">
            <MapContainer center={[43.238, 76.889]} zoom={13} className="editor-map">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <MapClickHandler onMapClick={handleMapClick} />
              
              {/* Draw Viewed Existing Route */}
              {viewedRoute ? (() => {
                const stopsForRoute = (viewedRoute.stopOrder || [])
                  .map(stopId => allStops.find(s => s.id === stopId))
                  .filter(Boolean);
                return (
                  <>
                    {stopsForRoute.map((s, i) => (
                      <Marker key={`exist-${i}`} position={[s.lat || 0, s.lng || 0]} icon={editorStopIcon}>
                        <Popup>Остановка: {s.name}</Popup>
                      </Marker>
                    ))}
                    {Array.isArray(viewedRoute.path) && viewedRoute.path.length > 0 ? (
                      <Polyline positions={viewedRoute.path} color="#10B981" weight={5} opacity={0.8} />
                    ) : (
                      stopsForRoute.length > 1 ? (
                        <Polyline positions={stopsForRoute.map(s => [s.lat || 0, s.lng || 0])} color="#10B981" weight={5} opacity={0.5} dashArray="5,10" />
                      ) : null
                    )}
                  </>
                );
              })() : null}

              {/* Draw New Route Being Created */}
              {editorStops.map((s, i) => (
                <Marker key={`new-${i}`} position={[s.lat || 0, s.lng || 0]} icon={editorStopIcon}>
                  <Popup>{s.name} (Новая)</Popup>
                </Marker>
              ))}
              {Array.isArray(editorPath) && editorPath.length > 1 ? (
                <Polyline positions={editorPath} color="#38BDF8" weight={4} dashArray="8,8" />
              ) : (
                editorStops && editorStops.length > 1 ? (
                  <Polyline positions={editorStops.map(s => [s.lat || 0, s.lng || 0])} color="#38BDF8" weight={4} dashArray="8,8" />
                ) : null
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`nasa-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* PROMPT MODAL */}
      {stopPrompt.show && (
        <div className="nasa-modal-overlay">
          <div className="nasa-modal">
            <h4 style={{marginTop: 0, color: '#38BDF8', letterSpacing: '2px'}}>НОВАЯ ОСТАНОВКА</h4>
            <p style={{fontSize: '14px', color: '#9CA3AF'}}>Введите название локации для добавления в маршрут:</p>
            <input 
              type="text" 
              className="nasa-input"
              style={{width: '100%', boxSizing: 'border-box', marginBottom: '15px'}}
              value={stopPrompt.name} 
              autoFocus
              onChange={e => setStopPrompt(prev => ({...prev, name: e.target.value}))}
              onKeyDown={e => e.key === 'Enter' && handleAddStopSubmit()}
            />
            <div className="nasa-modal-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button className="nasa-btn" onClick={() => setStopPrompt({show: false, lat: null, lng: null, name: ''})}>ОТМЕНА</button>
              <button className="nasa-btn primary" style={{background: '#38BDF8', color: '#000'}} onClick={handleAddStopSubmit}>ДОБАВИТЬ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
