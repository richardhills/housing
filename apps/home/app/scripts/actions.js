var Reflux = require('reflux');
var immutable = require('immutable');

module.exports = () => {

  var MapActions = Reflux.createActions([
    'build_type_changed', 'build_features_changed', 'clear_all', 'showWolfsonPrizePlan', 'first_load'
  ]);
  
  return immutable.Map({
    map_actions: MapActions,
  });
};
