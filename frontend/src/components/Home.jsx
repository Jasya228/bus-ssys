import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Search,
  Navigation2,
  Clock3,
  Bus,
  ArrowRight,
  Sparkles,
  Map,
  Activity
} from 'lucide-react';
import axios from 'axios';
import './Home.css';

const API_BASE = '/api';

const POPULAR_DESTINATIONS = [
  { id: 'medeu', name: 'Каток Медеу', img: '/medeu.jpg', desc: 'Спортивный комплекс' },
  { id: 'airport', name: 'Аэропорт ALA', img: '/hero.png', desc: 'Международный терминал' },
  { id: 'koktobe', name: 'Кок-Тобе', img: '/kok_tobe.jpg', desc: 'Канатная дорога' },
  { id: 'mega', name: 'Mega Center', img: '/mega.png', desc: 'Торгово-развлекательный центр' },
];

function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [routes, setRoutes] = useState([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const routeRes = await axios.get(`${API_BASE}/routes`, { timeout: 2500 });
        setRoutes(Array.isArray(routeRes.data) ? routeRes.data : []);
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };

    load();
    const interval = window.setInterval(load, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate('/map', { state: { destination: query.trim() } });
    }
  };

  const goToMap = (dest = '') => {
    navigate('/map', { state: { destination: dest } });
  };

  return (
    <div className="home-modern-root">
      {/* Animated Background Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      <nav className="home-nav">
        <div className="nav-brand">
          <div className="brand-logo">
            <Bus size={20} strokeWidth={2.5} />
          </div>
          <span className="brand-text">SmartTransit</span>
        </div>
        <div className="nav-actions">
          <div className={`status-badge ${online ? 'online' : 'offline'}`}>
            <div className="status-dot"></div>
            {online ? 'Система активна' : 'Офлайн'}
          </div>
          <button className="open-map-btn" onClick={() => goToMap()}>
            <Map size={18} />
            Открыть Карту
          </button>
        </div>
      </nav>

      <main className="home-main-content">
        <section className="hero-section">
          <h1 className="hero-title">
            Твой идеальный маршрут <br />
            <span className="text-gradient">начинается здесь</span>
          </h1>
          
          <p className="hero-subtitle">
            Стройте точные маршруты до любимых мест, отслеживайте автобусы в реальном времени и планируйте поездки по Алматы с непревзойденной точностью.
          </p>

          <form className="hero-search-box" onSubmit={handleSearchSubmit}>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={22} />
              <input
                type="text"
                placeholder="Куда поедем? (например, Абая 27 или Сайран)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="search-submit-btn">
              Поехали <ArrowRight size={18} />
            </button>
          </form>
        </section>

        <section className="destinations-section">
          <div className="section-header">
            <h2 className="section-title">Популярные направления</h2>
            <button className="view-all-btn" onClick={() => goToMap()}>
              Смотреть все на карте
            </button>
          </div>
          
          <div className="destinations-grid">
            {POPULAR_DESTINATIONS.map((dest) => (
              <div 
                key={dest.id} 
                className="dest-card"
                onClick={() => goToMap(dest.name)}
              >
                <div className="dest-img-wrap">
                  <img src={dest.img} alt={dest.name} className="dest-img" />
                  <div className="dest-overlay">
                    <Navigation2 size={24} className="dest-nav-icon" />
                  </div>
                </div>
                <div className="dest-info">
                  <h3 className="dest-name">{dest.name}</h3>
                  <p className="dest-desc">{dest.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="stats-section">
          <div className="stat-card">
            <div className="stat-icon-wrap blue"><Activity size={24} /></div>
            <div className="stat-data">
              <div className="stat-value">{routes.length > 0 ? routes.length : '39+'}</div>
              <div className="stat-label">Маршрутов в сети</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap purple"><MapPin size={24} /></div>
            <div className="stat-data">
              <div className="stat-value">500+</div>
              <div className="stat-label">Умных остановок</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap teal"><Clock3 size={24} /></div>
            <div className="stat-data">
              <div className="stat-value">&lt; 1 мин</div>
              <div className="stat-label">Задержка трекинга</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
