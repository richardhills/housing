var ready = require('domready');
var React = require('react');
var Reflux = require('reflux');

var Layout = require('./layout');
var MapStore = require('./map-store');
var actions = require('./actions')();
var store = Reflux.createStore(new MapStore(actions.get('map_actions')));

ready(function() {

  React.render(
    <Layout map_actions={actions.get('map_actions')} map_store={store} />,
    document.getElementById('home')
  );
});
