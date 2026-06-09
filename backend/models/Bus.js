const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  routeId: { type: String, required: true },
  currentStopIndex: { type: Number, default: 0 },
  passengers: { type: Number, default: 0 },
  lat: { type: Number },
  lng: { type: Number }
});

module.exports = mongoose.model('Bus', busSchema);
