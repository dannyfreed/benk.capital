var supergoose = require('supergoose');
var timestamps = require('mongoose-timestamp');

module.exports = function(mongoose) {

  var Schema = mongoose.Schema;

  var schema = new Schema({
    email: { type: String },
    usdInvestment: { type: Number },
    cryptoType: { type: String },
    cryptoAmount: {type: Number },
    cryptoPrice: {type: Number }
  });

  schema.plugin(supergoose);
  schema.plugin(timestamps);

  var models = {
    Investment  : mongoose.model( 'Investment', schema)
  };

  return models;

};
