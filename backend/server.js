const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const axios = require('axios');

const Stop = require('./models/Stop');
const Route = require('./models/Route');
const Bus = require('./models/Bus');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let busesMemory = []; // We keep buses in memory for 1sec tick performance

async function startServer() {
  console.log("Starting MongoDB Memory Server...");
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri);
  console.log("Connected to in-memory MongoDB");

  // Seed DB if empty
  const stopsCount = await Stop.countDocuments();
  if (stopsCount === 0) {
    console.log("Seeding Database from mockData.json...");
    const DB_PATH = path.join(__dirname, 'mockData.json');
    if (fs.existsSync(DB_PATH)) {
      const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      
      // Seed Stops
      for (let s of dbData.stops) {
        await Stop.create({ id: s.id, routeId: s.routeId, name: s.name, lat: s.lat, lng: s.lng });
      }
      
      // Seed Routes
      for (let r of dbData.routes) {
        // Find stop IDs belonging to this route to build stopOrder
        const routeStops = dbData.stops.filter(s => s.routeId === r.id).map(s => s.id);
        await Route.create({
          id: r.id.toString(),
          number: r.number,
          name: r.name,
          stopOrder: routeStops,
          path: r.path
        });
      }

      // Load Buses into Memory (and DB for completeness)
      for (let b of dbData.buses) {
        await Bus.create({ id: b.id, routeId: b.routeId.toString(), passengers: b.passengers, lat: b.lat, lng: b.lng });
        busesMemory.push({
          id: b.id,
          routeId: b.routeId.toString(),
          passengers: b.passengers,
          lat: b.lat,
          lng: b.lng,
          pathIndex: 0,
          direction: 1
        });
      }
      console.log("Seeding complete!");
    }
  }

  // SIMULATION ENGINE
  setInterval(async () => {
    // To avoid DB hits every second, we keep routes cached or fetch them once
    const routes = await Route.find({});
    
    busesMemory = busesMemory.map(bus => {
      const route = routes.find(r => r.id === bus.routeId);
      if (!route || !route.path || route.path.length < 2) return bus;

      let nextIndex = (bus.pathIndex || 0) + ((bus.direction || 1) * 0.05);

      if (nextIndex >= route.path.length - 1) {
        bus.direction = -1;
        nextIndex = route.path.length - 1;
      } else if (nextIndex <= 0) {
        bus.direction = 1;
        nextIndex = 0;
      }

      const segmentIndex = Math.floor(nextIndex);
      const fraction = nextIndex - segmentIndex;
      const p1 = route.path[segmentIndex];
      const p2 = route.path[segmentIndex + 1] || p1;

      const lat = p1[0] + (p2[0] - p1[0]) * fraction;
      const lng = p1[1] + (p2[1] - p1[1]) * fraction;

      // simulate random passenger changes
      let passengers = bus.passengers || 20;
      if (Math.random() < 0.1) {
        passengers += Math.floor(Math.random() * 7) - 3; // -3 to +3
        passengers = Math.max(5, Math.min(65, passengers)); // 5 to 65
      }

      return { ...bus, lat, lng, pathIndex: nextIndex, passengers };
    });
  }, 1000);

  // --- API ENDPOINTS ---

  app.get('/api/routes', async (req, res) => {
    const routes = await Route.find({});
    res.json(routes);
  });

  app.get('/api/stops', async (req, res) => {
    const stops = await Stop.find({});
    res.json(stops);
  });

  app.get('/api/buses', (req, res) => {
    res.json(busesMemory); // fast memory response
  });

  // ADMIN: Add Stop
  app.post('/api/stops', async (req, res) => {
    try {
      const { name, lat, lng } = req.body;
      const id = 'stop_' + Date.now();
      
      const newStop = await Stop.create({ id, name, lat, lng });
      res.status(201).json([newStop]);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ADMIN: Delete Stop
  app.delete('/api/stops/:id', async (req, res) => {
    try {
      await Stop.deleteOne({ id: req.params.id });
      res.status(200).json({ success: true });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ADMIN: Build Route
  app.post('/api/routes', async (req, res) => {
    try {
      const { number, name, stopOrder } = req.body;
      const id = 'route_' + Date.now();

      // Fetch stop coordinates
      const stops = await Stop.find({ id: { $in: stopOrder } });
      
      // Order stops as per stopOrder array
      const orderedStops = stopOrder.map(sId => stops.find(s => s.id === sId)).filter(Boolean);

      let pathCoords = [];
      if (orderedStops.length > 1) {
        // OSRM Snapping
        const coordsStr = orderedStops.map(s => `${s.lng},${s.lat}`).join(';');
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
        
        try {
          const osrmRes = await axios.get(osrmUrl);
          if (osrmRes.data && osrmRes.data.routes && osrmRes.data.routes[0]) {
            // OSRM returns [lng, lat], we need [lat, lng] for Leaflet
            pathCoords = osrmRes.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          }
        } catch(e) {
          console.error("OSRM Error, falling back to straight lines:", e.message);
          pathCoords = orderedStops.map(s => [s.lat, s.lng]);
        }
      }

      const newRoute = await Route.create({
        id,
        number,
        name,
        stopOrder,
        path: pathCoords.length > 0 ? pathCoords : orderedStops.map(s => [s.lat, s.lng])
      });

      // Add a simulation bus for the new route
      busesMemory.push({
        id: `b_${id}_1`,
        routeId: id,
        passengers: 20,
        lat: orderedStops[0]?.lat || 43.238,
        lng: orderedStops[0]?.lng || 76.889,
        pathIndex: 0,
        direction: 1
      });

      res.status(201).json(newRoute);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ADMIN: Delete Route
  app.delete('/api/routes/:id', async (req, res) => {
    try {
      await Route.deleteOne({ id: req.params.id });
      res.status(200).json({ success: true });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Haversine formula
  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // TRANSIT ROUTING ENGINE v2 — поддержка частичного маршрута
  app.get('/api/search-route', async (req, res) => {
    try {
      const fromLat = parseFloat(req.query.fromLat);
      const fromLng = parseFloat(req.query.fromLng);
      const toLat   = parseFloat(req.query.toLat);
      const toLng   = parseFloat(req.query.toLng);

      if (!fromLat || !fromLng || !toLat || !toLng) {
        return res.status(400).json({ error: 'Missing coordinates' });
      }

      // Helper for true pedestrian paths via OSRM foot profile
      const getWalkingPath = async (lat1, lng1, lat2, lng2) => {
        try {
          const url = `http://router.project-osrm.org/route/v1/foot/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
          const res = await axios.get(url, { timeout: 1500 });
          if (res.data && res.data.routes && res.data.routes.length > 0) {
            return res.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          }
        } catch(e) {
          console.error('OSRM foot error:', e.message);
        }
        return [[lat1, lng1], [lat2, lng2]]; // Fallback straight line
      };

      const directWalkDist = getDistanceFromLatLonInKm(fromLat, fromLng, toLat, toLng);

      const routes = await Route.find({});
      const stops  = await Stop.find({});

      let bestTransit = null;
      let bestScore   = Infinity; // score = walk1 + walk2 (lower = better)

      for (const route of routes) {
        const routeStops = stops.filter(s => s.routeId === route.id);
        if (routeStops.length < 2) continue;

        // Find BEST boarding stop (closest to user, within 4km)
        let bestBoard = null, bestBoardDist = Infinity;
        for (const s of routeStops) {
          const d = getDistanceFromLatLonInKm(fromLat, fromLng, s.lat, s.lng);
          if (d < 4.0 && d < bestBoardDist) { bestBoardDist = d; bestBoard = s; }
        }
        if (!bestBoard) continue;

        // Among stops AFTER boarding stop, find CLOSEST stop to destination
        // (this enables partial route: bus → closest stop → walk)
        const boardIdx = routeStops.indexOf(routeStops.find(s => s.id === bestBoard.id));
        let bestAlight = null, bestAlightDist = Infinity;

        for (let i = boardIdx + 1; i < routeStops.length; i++) {
          const s = routeStops[i];
          const d = getDistanceFromLatLonInKm(toLat, toLng, s.lat, s.lng);
          if (d < bestAlightDist) { bestAlightDist = d; bestAlight = s; }
        }
        if (!bestAlight) continue;

        // Score: only use this route if bus meaningfully improves distance to destination
        const distAfterBus = getDistanceFromLatLonInKm(bestAlight.lat, bestAlight.lng, toLat, toLng);
        const distIfWalkDirect = directWalkDist;

        // Bus helps if: alight stop is closer to target than user's current position
        const userDistToTarget = directWalkDist;
        if (distAfterBus >= userDistToTarget) continue; // bus doesn't help

        const score = bestBoardDist + distAfterBus;
        if (score < bestScore) {
          bestScore = score;
          bestTransit = {
            route,
            startStop: bestBoard,
            endStop: bestAlight,
            walk1Dist: bestBoardDist,
            walk2Dist: distAfterBus,
            boardIdx,
          };
        }
      }

      // If no transit better than walking, walk direct
      if (!bestTransit || directWalkDist <= bestScore * 0.6) {
        return res.json({
          type: 'WALK_ONLY',
          walk1: await getWalkingPath(fromLat, fromLng, toLat, toLng),
          walk1Dist: directWalkDist,
          isDirect: true
        });
      }

      // Build bus path geometry
      const routeStops = stops.filter(s => s.routeId === bestTransit.route.id);
      const boardIdx   = routeStops.findIndex(s => s.id === bestTransit.startStop.id);
      const alightIdx  = routeStops.findIndex(s => s.id === bestTransit.endStop.id);

      let busPath = [];
      if (bestTransit.route.path && bestTransit.route.path.length > 1) {
        // Slice route geometry between board and alight stop
        const path = bestTransit.route.path;
        let si = 0, ei = path.length - 1, minSD = Infinity, minED = Infinity;
        path.forEach((coord, i) => {
          const ds = getDistanceFromLatLonInKm(bestTransit.startStop.lat, bestTransit.startStop.lng, coord[0], coord[1]);
          const de = getDistanceFromLatLonInKm(bestTransit.endStop.lat, bestTransit.endStop.lng, coord[0], coord[1]);
          if (ds < minSD) { minSD = ds; si = i; }
          if (de < minED) { minED = de; ei = i; }
        });
        if (si <= ei) busPath = path.slice(si, ei + 1);
        else busPath = path.slice(ei, si + 1).reverse();
      } else {
        // Fallback: straight lines through stops
        for (let i = boardIdx; i <= alightIdx && i < routeStops.length; i++) {
          busPath.push([routeStops[i].lat, routeStops[i].lng]);
        }
      }

      const walk2Dist = bestTransit.walk2Dist;
      const isPartial = walk2Dist > 0.1; // more than 100m walk at end
      
      const walk1Path = await getWalkingPath(fromLat, fromLng, bestTransit.startStop.lat, bestTransit.startStop.lng);
      const walk2Path = await getWalkingPath(bestTransit.endStop.lat, bestTransit.endStop.lng, toLat, toLng);

      return res.json({
        type: 'TRANSIT',
        isPartial,
        route: { number: bestTransit.route.number, name: bestTransit.route.name },
        stop1: bestTransit.startStop,
        stop2: bestTransit.endStop,
        walk1: walk1Path,
        busPath,
        walk2: walk2Path,
        walk1Dist: bestTransit.walk1Dist,
        walk2Dist,
        isDirect: false
      });

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // --- SERVE FRONTEND (NO NGINX NEEDED) ---
  const frontendDistPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Full Stack Server started on port ${PORT}`));
}

startServer().catch(console.error);
