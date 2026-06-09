import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  Bell,
  Bus,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  DoorOpen,
  Fan,
  Gauge,
  Lightbulb,
  MapPin,
  Megaphone,
  Navigation,
  PhoneCall,
  RefreshCw,
  Route,
  ShieldCheck,
  Snowflake,
  Users,
  Wifi,
  Wrench,
} from 'lucide-react';
import axios from 'axios';
import './DriverPanel.css';

const API_BASE = 'http://localhost:5000/api';

const makeToast = (type, text) => ({ id: Date.now(), type, text });

function DriverPanel() {
  const navigate = useNavigate();

  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('route');

  const [doorsOpen, setDoorsOpen] = useState(false);
  const [lightsOn, setLightsOn] = useState(true);
  const [climateOn, setClimateOn] = useState(true);
  const [temperature, setTemperature] = useState(22);
  const [announcement, setAnnouncement] = useState('Следующая остановка');
  const [incident, setIncident] = useState(null);
  const [manualStopIndex, setManualStopIndex] = useState(0);

  const selectedBus = buses.find((bus) => (bus.plate || bus.id) === selectedBusId);
  const currentRoute = routes.find((route) => route.id === driverData?.routeId || route.id === selectedBus?.routeId);

  const routeStops = useMemo(() => {
    if (!currentRoute) return [];
    if (Array.isArray(currentRoute.stopOrder) && currentRoute.stopOrder.length > 0) {
      return currentRoute.stopOrder
        .map((id) => stops.find((stop) => stop.id === id))
        .filter(Boolean);
    }
    return stops.filter((stop) => stop.routeId === currentRoute.id);
  }, [currentRoute, stops]);

  const liveStopIndex = useMemo(() => {
    if (!routeStops.length) return 0;
    const byName = routeStops.findIndex((stop) => stop.name === driverData?.nextStop);
    if (byName >= 0) return byName;
    return Math.min(routeStops.length - 1, manualStopIndex);
  }, [routeStops, driverData, manualStopIndex]);

  const progress = routeStops.length > 1
    ? Math.round((liveStopIndex / (routeStops.length - 1)) * 100)
    : Math.round(driverData?.progress || 0);

  const showToast = (type, text) => {
    setToast(makeToast(type, text));
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(null), 2600);
  };

  const loadBaseData = async () => {
    setLoading(true);
    setError('');
    try {
      const [busRes, routeRes, stopRes] = await Promise.all([
        axios.get(`${API_BASE}/buses`),
        axios.get(`${API_BASE}/routes`),
        axios.get(`${API_BASE}/stops`),
      ]);
      setBuses(Array.isArray(busRes.data) ? busRes.data : []);
      setRoutes(Array.isArray(routeRes.data) ? routeRes.data : []);
      setStops(Array.isArray(stopRes.data) ? stopRes.data : []);
    } catch (e) {
      setError('Backend недоступен. Запусти сервер на localhost:5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (!selectedBusId) {
      setDriverData(null);
      return undefined;
    }

    const fetchDriver = async () => {
      try {
        const res = await axios.get(`${API_BASE}/driver/${encodeURIComponent(selectedBusId)}`);
        setDriverData(res.data);
      } catch (e) {
        setError('Не удалось получить данные выбранного автобуса.');
      }
    };

    fetchDriver();
    const interval = window.setInterval(fetchDriver, 2500);
    return () => window.clearInterval(interval);
  }, [selectedBusId]);

  useEffect(() => {
    if (routeStops.length && driverData?.nextStop) {
      const index = routeStops.findIndex((stop) => stop.name === driverData.nextStop);
      if (index >= 0) setManualStopIndex(index);
    }
  }, [routeStops, driverData]);

  const sendStatus = async (status, label, type = 'info') => {
    showToast(type, label);
    if (!selectedBusId) return;
    try {
      await axios.post(`${API_BASE}/buses/status`, { plate: selectedBusId, status });
    } catch (e) {
      showToast('warning', 'Команда показана локально, но backend не подтвердил статус.');
    }
  };

  const selectBus = (bus) => {
    setSelectedBusId(bus.plate || bus.id);
    setManualStopIndex(0);
    setIncident(null);
    setActiveTab('route');
  };

  const moveStop = (delta) => {
    if (!routeStops.length) return;
    const next = Math.max(0, Math.min(routeStops.length - 1, manualStopIndex + delta));
    setManualStopIndex(next);
    sendStatus(`STOP_${next}`, `Текущая остановка: ${routeStops[next].name}`);
  };

  const toggleDoors = () => {
    const next = !doorsOpen;
    setDoorsOpen(next);
    sendStatus(next ? 'DOORS_OPEN' : 'DOORS_CLOSED', next ? 'Двери открыты' : 'Двери закрыты', next ? 'warning' : 'success');
  };

  const toggleLights = () => {
    const next = !lightsOn;
    setLightsOn(next);
    sendStatus(next ? 'LIGHTS_ON' : 'LIGHTS_OFF', next ? 'Свет в салоне включен' : 'Свет в салоне выключен');
  };

  const toggleClimate = () => {
    const next = !climateOn;
    setClimateOn(next);
    sendStatus(next ? 'CLIMATE_ON' : 'CLIMATE_OFF', next ? `Климат включен: ${temperature}°C` : 'Климат выключен');
  };

  const changeTemperature = (delta) => {
    const next = Math.max(16, Math.min(30, temperature + delta));
    setTemperature(next);
    setClimateOn(true);
    sendStatus(`TEMP_${next}`, `Температура установлена: ${next}°C`);
  };

  const makeAnnouncement = (text) => {
    setAnnouncement(text);
    sendStatus('ANNOUNCEMENT', `Объявление: ${text}`);
  };

  const reportIncident = (type) => {
    const labels = {
      delay: 'Задержка отправлена диспетчеру',
      technical: 'Техническая заявка отправлена',
      sos: 'SOS отправлен диспетчеру',
    };
    setIncident(type);
    sendStatus(type.toUpperCase(), labels[type], type === 'sos' ? 'danger' : 'warning');
  };

  if (loading) {
    return (
      <div className="driver-page driver-centered">
        <RefreshCw className="spin" size={34} />
        <h1>Загрузка водительской панели</h1>
        <p>Получаем автобусы, маршруты и остановки.</p>
      </div>
    );
  }

  if (!selectedBusId) {
    return (
      <div className="driver-page">
        <header className="driver-topbar">
          <button className="driver-icon-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Панель водителя</h1>
            <p>Выбери автобус на линии, чтобы открыть рабочий режим.</p>
          </div>
          <button className="driver-refresh-btn" onClick={loadBaseData}>
            <RefreshCw size={16} /> Обновить
          </button>
        </header>

        {error && <div className="driver-error"><AlertTriangle size={18} /> {error}</div>}

        <section className="bus-picker-grid">
          {buses.map((bus) => {
            const route = routes.find((item) => item.id === bus.routeId);
            return (
              <button key={bus.id} className="bus-picker-card" onClick={() => selectBus(bus)}>
                <div className="bus-picker-icon"><Bus size={24} /></div>
                <div>
                  <strong>{bus.plate || bus.id}</strong>
                  <span>Маршрут {route?.number || bus.routeId}</span>
                  <small>{route?.name || 'Линия без названия'}</small>
                </div>
                <ChevronRight size={20} />
              </button>
            );
          })}
        </section>

        {!buses.length && (
          <div className="driver-empty">
            <Bus size={42} />
            <h2>Нет автобусов</h2>
            <p>Запусти backend или перезапусти его, чтобы демо-маршруты попали в базу.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="driver-page driver-workspace">
      {toast && (
        <div className={`driver-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <Bell size={18} />}
          {toast.text}
        </div>
      )}

      <header className="driver-console-header">
        <button className="driver-icon-btn" onClick={() => setSelectedBusId(null)}>
          <ArrowLeft size={20} />
        </button>
        <div className="driver-title-block">
          <span>Автобус {driverData?.plate || selectedBusId}</span>
          <h1>Маршрут {driverData?.routeNumber || currentRoute?.number || selectedBus?.routeId}</h1>
          <p>{driverData?.routeName || currentRoute?.name || 'Рабочая смена'}</p>
        </div>
        <div className="driver-live-stats">
          <div><Gauge size={18} /> {driverData?.speed || 0} км/ч</div>
          <div><Users size={18} /> {driverData?.passengers || 0}</div>
          <div><Battery size={18} /> 94%</div>
          <div><Wifi size={18} /> online</div>
        </div>
      </header>

      <main className="driver-layout">
        <section className="driver-main-panel">
          <div className="driver-tabs">
            <button className={activeTab === 'route' ? 'active' : ''} onClick={() => setActiveTab('route')}>
              <Route size={16} /> Маршрут
            </button>
            <button className={activeTab === 'systems' ? 'active' : ''} onClick={() => setActiveTab('systems')}>
              <ShieldCheck size={16} /> Системы
            </button>
            <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
              <AlertTriangle size={16} /> События
            </button>
          </div>

          {activeTab === 'route' && (
            <div className="route-board">
              <div className="next-stop-card">
                <div>
                  <span>Следующая остановка</span>
                  <h2>{routeStops[liveStopIndex]?.name || driverData?.nextStop || 'Остановка не выбрана'}</h2>
                  <p>Прогресс рейса: {progress}%</p>
                </div>
                <Navigation size={38} />
              </div>

              <div className="route-progress-line">
                <div style={{ width: `${progress}%` }} />
              </div>

              <div className="route-stop-list">
                {routeStops.map((stop, index) => (
                  <button
                    key={stop.id}
                    className={`route-stop-row ${index < liveStopIndex ? 'done' : ''} ${index === liveStopIndex ? 'current' : ''}`}
                    onClick={() => {
                      setManualStopIndex(index);
                      sendStatus(`STOP_${index}`, `Выбрана остановка: ${stop.name}`);
                    }}
                  >
                    <CircleDot size={16} />
                    <span>{stop.name}</span>
                    {index === liveStopIndex && <strong>сейчас</strong>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'systems' && (
            <div className="systems-grid">
              <div className={`system-tile ${doorsOpen ? 'warning' : 'ok'}`}>
                <DoorOpen size={28} />
                <span>Двери</span>
                <strong>{doorsOpen ? 'Открыты' : 'Закрыты'}</strong>
              </div>
              <div className={`system-tile ${climateOn ? 'ok' : ''}`}>
                <Snowflake size={28} />
                <span>Климат</span>
                <strong>{climateOn ? `${temperature}°C` : 'Выкл.'}</strong>
              </div>
              <div className={`system-tile ${lightsOn ? 'ok' : ''}`}>
                <Lightbulb size={28} />
                <span>Свет</span>
                <strong>{lightsOn ? 'Включен' : 'Выключен'}</strong>
              </div>
              <div className={`system-tile ${incident ? 'warning' : 'ok'}`}>
                <Wrench size={28} />
                <span>Статус</span>
                <strong>{incident ? 'Есть событие' : 'Норма'}</strong>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="events-panel">
              <h2>Журнал смены</h2>
              <div className="event-line"><CheckCircle2 size={16} /> Автобус подключен к диспетчерской системе.</div>
              <div className="event-line"><MapPin size={16} /> Текущая остановка: {routeStops[liveStopIndex]?.name || 'не определена'}.</div>
              <div className="event-line"><Megaphone size={16} /> Последнее объявление: {announcement}.</div>
              {incident && <div className="event-line warning"><AlertTriangle size={16} /> Активное событие: {incident}.</div>}
            </div>
          )}
        </section>

        <aside className="driver-control-panel">
          <h2>Управление рейсом</h2>

          <div className="control-row two">
            <button className="driver-control-btn primary" onClick={() => moveStop(-1)}>Пред. остановка</button>
            <button className="driver-control-btn primary" onClick={() => moveStop(1)}>След. остановка</button>
          </div>

          <button className={`driver-control-btn ${doorsOpen ? 'danger' : ''}`} onClick={toggleDoors}>
            <DoorOpen size={18} /> {doorsOpen ? 'Закрыть двери' : 'Открыть двери'}
          </button>

          <div className="control-row three">
            <button className="driver-control-btn" onClick={() => changeTemperature(-1)}>-</button>
            <button className={`driver-control-btn ${climateOn ? 'active' : ''}`} onClick={toggleClimate}>
              <Fan size={16} /> {temperature}°C
            </button>
            <button className="driver-control-btn" onClick={() => changeTemperature(1)}>+</button>
          </div>

          <button className={`driver-control-btn ${lightsOn ? 'active' : ''}`} onClick={toggleLights}>
            <Lightbulb size={18} /> {lightsOn ? 'Выключить свет' : 'Включить свет'}
          </button>

          <div className="announcement-box">
            <span>Объявления</span>
            <button onClick={() => makeAnnouncement(`Следующая остановка: ${routeStops[liveStopIndex]?.name || driverData?.nextStop || 'по маршруту'}`)}>
              <Megaphone size={16} /> Следующая остановка
            </button>
            <button onClick={() => makeAnnouncement('Оплатите проезд и держитесь за поручни')}>
              <Megaphone size={16} /> Безопасность
            </button>
          </div>

          <div className="incident-box">
            <span>Диспетчер</span>
            <button onClick={() => reportIncident('delay')}>
              <ClockIcon /> Сообщить задержку
            </button>
            <button onClick={() => reportIncident('technical')}>
              <Wrench size={16} /> Тех. проблема
            </button>
            <button className="sos-control" onClick={() => reportIncident('sos')}>
              <PhoneCall size={18} /> SOS
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

function ClockIcon() {
  return <span className="clock-dot" />;
}

export default DriverPanel;
