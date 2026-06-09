const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: { type: String, required: true },
  name: { type: String, required: true },
  stopOrder: [{ type: String }], // Array of stop IDs
  path: { type: [[Number]], default: [] } // GeoJSON style coordinates or array of [lat, lng]
});

module.exports = mongoose.model('Route', routeSchema);
