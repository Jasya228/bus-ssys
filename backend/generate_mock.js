const fs = require('fs');

// Список автобусов, которые тебе нужны в базе
const targetRoutes = ["12", "34", "65", "92", "79", "45", "121", "98", "3", "106", "28", "56", "17", "40"];

const overpassUrl = "https://overpass-api.de/api/interpreter";

// Используем прямой ID Алматы в OSM (3600159495), это работает в 10 раз быстрее и стабильнее
const routeFilters = targetRoutes.map(num => `relation["route"="bus"]["ref"="${num}"](area.searchArea);`).join('\n');
const query = `
[out:json][timeout:60];
area(3600159495)->.searchArea;
(
${routeFilters}
);
out body;
>;
out skel qt;
`;

async function generateMockData() {
    console.log("Собираю реальные остановки Алматы через прямой ID региона...");
    try {
        const response = await fetch(overpassUrl, {
            method: "POST",
            body: query,
            headers: {
                'User-Agent': 'SmartTransitBot/1.0'
            }
        });

        // Проверяем статус ответа сервера
        if (!response.ok) {
            const textError = await response.text();
            console.error(`\nОшибка сервера Overpass (Статус ${response.status}).`);
            if (response.status === 429) {
                console.error("Сервер перегружен запросами. Подожди 1-2 минуты и запусти снова.");
            }
            return;
        }

        const data = await response.json();

        if (!data.elements || data.elements.length === 0) {
            console.log("Маршруты не найдены. Возможно, временный сбой базы данных OSM.");
            return;
        }

        const nodes = {};
        const finalData = {
            routes: [],
            stops: [],
            buses: []
        };

        // 1. Собираем базу координат всех остановок
        data.elements.forEach(el => {
            if (el.type === 'node' && el.lat && el.lon) {
                nodes[el.id] = {
                    name: el.tags && el.tags.name ? el.tags.name : "Остановка",
                    lat: el.lat,
                    lng: el.lon
                };
            }
        });

        let routeIdCounter = 1;

        // 2. Генерируем структуру
        data.elements.forEach(el => {
            if (el.type === 'relation' && el.tags) {
                const routeNumber = el.tags.ref || "0";
                if (!targetRoutes.includes(routeNumber)) return;

                const from = el.tags.from || "Старт";
                const to = el.tags.to || "Конец";
                const currentRouteId = routeIdCounter++;

                const routePath = [];
                let stopIndex = 1;

                if (el.members) {
                    el.members.forEach(member => {
                        if (member.type === 'node' && nodes[member.ref]) {
                            if (member.role === 'stop' || member.role === 'platform') {
                                const nodeData = nodes[member.ref];

                                finalData.stops.push({
                                    id: `${currentRouteId}_${stopIndex}`,
                                    routeId: currentRouteId,
                                    name: nodeData.name,
                                    lat: nodeData.lat,
                                    lng: nodeData.lng
                                });

                                routePath.push([nodeData.lat, nodeData.lng]);
                                stopIndex++;
                            }
                        }
                    });
                }

                if (routePath.length > 0) {
                    finalData.routes.push({
                        id: currentRouteId,
                        number: routeNumber,
                        name: `${from} — ${to}`,
                        path: routePath
                    });

                    const midIndex = Math.floor(routePath.length / 2);
                    const quarterIndex = Math.floor(routePath.length / 4);

                    const busPoints = [
                        { idx: 0, pass: 15 },
                        { idx: midIndex, pass: 25 },
                        { idx: Math.min(routePath.length - 2, midIndex + quarterIndex), pass: 35 }
                    ];

                    busPoints.forEach((bp, bIdx) => {
                        const point = routePath[bp.idx] || routePath[0];
                        finalData.buses.push({
                            id: `b_${currentRouteId}_${bIdx}`,
                            routeId: currentRouteId,
                            lat: point[0],
                            lng: point[1],
                            passengers: bp.pass
                        });
                    });
                }
            }
        });

        finalData.routes.sort((a, b) => parseFloat(a.number) - parseFloat(b.number));

        fs.writeFileSync('mockData.json', JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`\n Успех! Файл mockData.json обновлен. Добавлено маршрутов: ${finalData.routes.length}`);

    } catch (error) {
        console.error("Ошибка парсинга JSON:", error.message);
        console.error("Попробуй перезапустить скрипт через минуту.");
    }
}

generateMockData();