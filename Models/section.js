const mongoose = require('mongoose');

const dynamicSchema = new mongoose.Schema({
  // Remove specific fields; allow any fields dynamically
  fields: mongoose.Schema.Types.Mixed,
}, { strict: false });

const DynamicModel = mongoose.model('DynamicData', dynamicSchema, 'legaldrafting');

module.exports = DynamicModel;
