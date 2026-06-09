import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  ru: {
    brand: "SmartTransit",
    whereTo: "КУДА РВАНЕМ СЕГОДНЯ?",
    searchPlaceholder: "Например: ТЦ Мега Центр...",
    goButton: "ПОГНАЛИ НА КАРТУ",
    favorites: "В избранном",
    emptyFavorites: "У вас пока нет сохраненных маршрутов.",
    edit: "РЕДАКТИРОВАТЬ",
    done: "ГОТОВО",
    settings: "Настройки системы",
    analytics: "Аналитика ИИ",
    driverMode: "Режим водителя",
    back: "Назад",
    weather: "Погода",
    passengers: "пассажиров",
    eta: "Прибытие",
    activeRoute: "Активный маршрут",
    findRoute: "Найти маршрут",
    startPoint: "Откуда",
    endPoint: "Куда",
    voiceSearch: "Голосовой поиск активирован",
  },
  kk: {
    brand: "SmartTransit",
    whereTo: "БҮГІН ҚАЙДА БАРАМЫЗ?",
    searchPlaceholder: "Мысалы: Мега Орталығы...",
    goButton: "КАРТАҒА КЕТТІК",
    favorites: "Таңдаулылар",
    emptyFavorites: "Сізде әлі сақталған маршруттар жоқ.",
    edit: "ӨЗГЕРТУ",
    done: "ДАЙЫН",
    settings: "Жүйе параметрлері",
    analytics: "ЖИ Аналитикасы",
    driverMode: "Жүргізуші режимі",
    back: "Артқа",
    weather: "Ауа райы",
    passengers: "жолаушы",
    eta: "Келу уақыты",
    activeRoute: "Белсенді маршрут",
    findRoute: "Маршрутты табу",
    startPoint: "Қайдан",
    endPoint: "Қайда",
    voiceSearch: "Дауыстық іздеу белсендірілді",
  },
  en: {
    brand: "SmartTransit",
    whereTo: "WHERE ARE WE GOING TODAY?",
    searchPlaceholder: "Example: Mega Center...",
    goButton: "GO TO MAP",
    favorites: "Favorites",
    emptyFavorites: "You don't have any saved routes yet.",
    edit: "EDIT",
    done: "DONE",
    settings: "System Settings",
    analytics: "AI Analytics",
    driverMode: "Driver Mode",
    back: "Back",
    weather: "Weather",
    passengers: "passengers",
    eta: "Arrival",
    activeRoute: "Active Route",
    findRoute: "Find Route",
    startPoint: "From",
    endPoint: "To",
    voiceSearch: "Voice search activated",
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('smartTransitLang') || 'ru');

  useEffect(() => {
    localStorage.setItem('smartTransitLang', lang);
  }, [lang]);

  const t = (key) => translations[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
