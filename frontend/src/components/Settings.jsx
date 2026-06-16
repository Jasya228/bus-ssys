import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Bus,
  ChevronRight,
  CircleDot,
  Globe2,
  Info,
  Map,
  MapPin,
  Moon,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  UserCog,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import './Settings.css';

const THEME_LABELS = {
  default: 'Системная',
  cyber: 'Синяя',
  dark: 'Темная',
  light: 'Светлая',
};

function Settings() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { theme, setTheme, themes } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [voiceHints, setVoiceHints] = useState(true);
  const [compactMap, setCompactMap] = useState(false);

  const themeEntries = Object.keys(themes || {}).length
    ? Object.entries(themes)
    : [['default', { preview: ['#f8fafc', '#2f80ed', '#14b8a6'] }]];

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <header className="settings-brand-row">
          <button className="settings-back" onClick={() => navigate(-1)} aria-label="Назад">
            <ArrowLeft size={21} />
          </button>
          <div>
            <span>SmartTransit</span>
            <h1>Настройки</h1>
          </div>
        </header>

        <section className="settings-profile-card">
          <div className="profile-icon">
            <Smartphone size={24} />
          </div>
          <div>
            <h2>Transit Console</h2>
            <p>Маршруты, карта и городские сервисы Алматы.</p>
          </div>
          <span className="profile-status">online</span>
        </section>

        <nav className="settings-nav">
          <button className="active"><Map size={18} /> Карта маршрута</button>
          <button onClick={() => navigate('/driver')}><Bus size={18} /> Панель водителя</button>
        </nav>

        <SettingsGroup title="Основные">
          <SettingsSelect
            icon={Globe2}
            title="Язык"
            description="Интерфейс приложения"
            value={lang}
            onChange={(event) => setLang(event.target.value)}
          >
            <option value="ru">Русский</option>
            <option value="kk">Қазақша</option>
            <option value="en">English</option>
          </SettingsSelect>

          <SettingsToggle
            icon={Bell}
            title="Уведомления"
            description="Прибытие и изменения рейса"
            checked={notifications}
            onChange={() => setNotifications((value) => !value)}
          />

          <SettingsToggle
            icon={Volume2}
            title="Голосовые подсказки"
            description="Озвучивать шаги маршрута"
            checked={voiceHints}
            onChange={() => setVoiceHints((value) => !value)}
          />
        </SettingsGroup>

        <SettingsGroup title="Внешний вид">
          <div className="settings-row theme-row">
            <div className="row-icon"><Palette size={20} /></div>
            <div className="row-body">
              <h3>Тема</h3>
              <p>Цветовая схема интерфейса</p>
              <div className="theme-pills">
                {themeEntries.map(([key, item]) => (
                  <button
                    key={key}
                    className={theme === key ? 'selected' : ''}
                    onClick={() => setTheme(key)}
                  >
                    <span>
                      {(item.preview || ['#f8fafc', '#2f80ed', '#14b8a6']).slice(0, 3).map((color) => (
                        <i key={color} style={{ background: color }} />
                      ))}
                    </span>
                    {THEME_LABELS[key] || item.nameRu || item.name || key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SettingsToggle
            icon={Moon}
            title="Мягкий контраст"
            description="Спокойная карта и панели"
            checked={compactMap}
            onChange={() => setCompactMap((value) => !value)}
          />
        </SettingsGroup>

        <SettingsGroup title="Система">
          <SettingsLink
            icon={SlidersHorizontal}
            title="Параметры карты"
            description="Слои и отображение линий"
            onClick={() => navigate('/map')}
          />
          <SettingsLink
            icon={ShieldCheck}
            title="Безопасность"
            description="Локальные данные и доступы"
            onClick={() => {}}
          />
        </SettingsGroup>
      </aside>

      <main className="settings-map-workspace">
        <header className="workspace-header">
          <div>
            <span>Active route map</span>
            <h2>Обзор маршрута №34</h2>
            <p>Большая рабочая область для карты, маршрутов, остановок и live-статусов.</p>
          </div>
          <button onClick={() => navigate('/map')}>
            Открыть карту <ChevronRight size={18} />
          </button>
        </header>

        <section className="workspace-map-card">
          <div className="dashboard-map">
            <div className="dashboard-grid" />
            <div className="dash-road dash-road-a" />
            <div className="dash-road dash-road-b" />
            <div className="dash-road dash-road-c" />
            <div className="dash-route" />
            <div className="map-stop stop-a"><CircleDot size={14} /> Старт</div>
            <div className="map-stop stop-b"><Bus size={15} /> Автобус 34</div>
            <div className="map-stop stop-c"><MapPin size={15} /> Назначение</div>
          </div>
        </section>

        <section className="workspace-bottom-grid">
          <div className="workspace-stat-card">
            <span>ETA</span>
            <strong>7 мин</strong>
            <p>до ближайшей остановки</p>
          </div>
          <div className="workspace-stat-card">
            <span>Активные</span>
            <strong>22</strong>
            <p>автобуса на линии</p>
          </div>
          <div className="workspace-stat-card">
            <span>Интервал</span>
            <strong>5-8</strong>
            <p>минут между рейсами</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <section className="settings-group">
      <h2>{title}</h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}

function SettingsLink({ icon: Icon, title, description, onClick }) {
  return (
    <button className="settings-row clickable" onClick={onClick}>
      <div className="row-icon"><Icon size={20} /></div>
      <div className="row-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <ChevronRight className="row-chevron" size={20} />
    </button>
  );
}

function SettingsToggle({ icon: Icon, title, description, checked, onChange }) {
  return (
    <button className="settings-row clickable" onClick={onChange}>
      <div className="row-icon"><Icon size={20} /></div>
      <div className="row-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className={`settings-switch ${checked ? 'on' : ''}`}>
        <span />
      </span>
    </button>
  );
}

function SettingsSelect({ icon: Icon, title, description, value, onChange, children }) {
  return (
    <div className="settings-row">
      <div className="row-icon"><Icon size={20} /></div>
      <div className="row-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <select className="settings-select" value={value} onChange={onChange}>
        {children}
      </select>
    </div>
  );
}

export default Settings;
