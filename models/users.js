var supergoose = require('supergoose');
var timestamps = require('mongoose-timestamp');

module.exports = function(mongoose) {

  var Schema = mongoose.Schema;

  var schema = new Schema({
    userId: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    hash: { type: String },
    isAdmin: { type: Boolean, default: false },
  });

  schema.plugin(supergoose);
  schema.plugin(timestamps);

  var models = {
    User  : mongoose.model( 'User', schema)
  };

  return models;

};
