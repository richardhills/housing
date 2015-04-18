var React = require('react');
var immutable = require('immutable');
var Reflux = require('reflux');

var ControlBar = require('./controlbar');
var Map = require('./map');
var Key = require('./key');


module.exports = React.createClass({
  mixins: [Reflux.ListenerMixin],

  componentDidMount() {
    this.listenTo(this.props.map_store, this.onMapStoreChanged);
  },

  onMapStoreChanged: function(data) {
    this.setState();
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
