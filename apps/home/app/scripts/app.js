var ready = require('domready');
var React = require('react');
var Reflux = require('reflux');
var vex = require('vex-js');
var dialog = require('vex-js/js/vex.dialog.js');

var Layout = require('./layout');
var MapStore = require('./map-store');
var actions = require('./actions')();
var Messages = require('./messages');
var store = Reflux.createStore(new MapStore(actions.get('map_actions')));

ready(function() {

  // Hack to get the app to initialize with the Oxford editing scenario
  // (need to put the overlay data more in the store than the map...
  if(store.getInitialBuildings().get('flats') == 0) {
    actions.get("map_actions").first_load();  
  } else {
    React.render(
      <Layout map_actions={actions.get('map_actions')} map_store={store} />,
      document.getElementById('home')
    );

    vex.defaultOptions.className = 'vex-theme-os';
    if(store.getShowHelpPopups()) {
      dialog.alert(Messages.onStartup);
    }
  }
});
