const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  routeId: { type: String, default: null },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

module.exports = mongoose.model('Stop', stopSchema);
