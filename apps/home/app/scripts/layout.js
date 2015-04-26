var React = require('react');
var immutable = require('immutable');
var Reflux = require('reflux');
var dialog = require('vex-js/js/vex.dialog.js');

var Messages = require('./messages');
var ControlBar = require('./controlbar');
var Map = require('./map');
var Key = require('./key');


module.exports = React.createClass({
  mixins: [Reflux.ListenerMixin],

  componentDidMount() {
    this.listenTo(this.props.map_store, this.onMapStoreChanged);
    this.showHelpPopup = true;
    this.showTargetCompletedPopup = true;
    this.showFirstBuildPopup = true;
  },

  onMapStoreChanged: function(data) {
    this.setState();

    if(this.showTargetCompletedPopup & this.props.map_store.getTotalExtraHomesBuilt() >= 28000) {
      dialog.alert(Messages.onTargetCompleted(this.props.map_store.getTotalHomesBuilt()));
      this.showTargetCompletedPopup = false;
    } else if(this.showFirstBuildPopup & this.props.map_store.getTotalExtraHomesBuilt() > 0) {
      dialog.alert(Messages.onStartEndBuilding(this.props.map_store.getTotalHomesBuilt()));
      this.showFirstBuildPopup = false; 
    }
  },

  render: function() {
    return (
      <div className="home-layout">
        <div className="home-layout__controlbar">
          <ControlBar 
            map_actions={this.props.map_actions}
            map_store={this.props.map_store}/>
        </div>
        <div className="home-layout__contents">
          <div className="home-layout__map-container">
            <div className="home-layout__map">
              <Map
                map_store={this.props.map_store}
                map_actions={this.props.map_actions} />
            </div>
          </div>
          <div className="home-layout__key">
            <Key />
          </div>
        </div>
      </div>
    );
  }
});
