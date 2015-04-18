var ready = require('domready');
var React = require('react');
var Reflux = require('reflux');
var vex = require('vex-js');
var dialog = require('vex-js/js/vex.dialog.js');

var Layout = require('./layout');
var MapStore = require('./map-store');
var actions = require('./actions')();
var store = Reflux.createStore(new MapStore(actions.get('map_actions')));

ready(function() {

  React.render(
    <Layout map_actions={actions.get('map_actions')} map_store={store} />,
    document.getElementById('home')
  );

  vex.defaultOptions.className = 'vex-theme-os';
  dialog.alert('Oxford requires 28,000 homes by 2026. Where would you build? To start building, double click a point on the map');
});
