import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Wind } from 'lucide-react';
import './WeatherWidget.css';

function WeatherWidget() {
  const [weather, setWeather] = useState({
    temp: 18,
    condition: 'Sunny',
    city: 'Almaty',
  });

  useEffect(() => {
    const conditions = ['Sunny', 'Cloudy', 'Rainy'];
    const interval = window.setInterval(() => {
      setWeather((prev) => ({
        ...prev,
        temp: 15 + Math.floor(Math.random() * 10),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
      }));
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const getIcon = () => {
    switch (weather.condition) {
      case 'Sunny':
        return <Sun size={22} color="#f59e0b" />;
      case 'Cloudy':
        return <Cloud size={22} color="#64748b" />;
      case 'Rainy':
        return <CloudRain size={22} color="#2563eb" />;
      default:
        return <Wind size={22} color="#14b8a6" />;
    }
  };

  return (
    <div className="weather-widget">
      <div className="weather-icon">{getIcon()}</div>
      <div className="weather-info">
        <div className="temp">{weather.temp}°C</div>
        <div className="city">{weather.city}</div>
      </div>
    </div>
  );
}

export default WeatherWidget;
