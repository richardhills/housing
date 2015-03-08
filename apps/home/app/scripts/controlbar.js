var React = require('react');
var immutable = require('immutable');
var Reflux = require('reflux');

module.exports = React.createClass({
  buildTypeChanged: function(event) {
    this.props.map_actions.build_type_changed(event.target.value);
  },
  
  startAgain: function(event) {
    this.props.map_actions.clear_all();
  },

  createCheckBox: function(value, label) {
    return (
      <li>
        <input
            type="radio"
            name="type"
            checked={this.props.map_store.getBuildType() === value ? true : false}
            value={value}
            id={value}
            onChange={this.buildTypeChanged} />
        <label htmlFor={value}>{label}</label>
      </li>
    );
  },

  getTotalHomesBuilt() {
    var built = this.props.map_store.getHomesBuilt();
    var total = 0;
    built.forEach(function(count) {
      total += count;
    });
    return total;
  },

  render: function() {
    return (
      <div className="home-controlbar">
        <h2>Double click on the map to start building</h2>
        <p>What would you build?</p>
        <ul>
          {this.createCheckBox('flats', 'Flats')}
          {this.createCheckBox('terraced', 'Terraced Homes')}
          {this.createCheckBox('semi-detached', 'Semi-detached Homes')}
          {this.createCheckBox('detached', 'Detached Homes')}
        </ul>
        <p>Total new build:</p>
        <ul>
          <li>Flats: {this.props.map_store.getHomesBuilt().get('flats')}</li>
          <li>Terraced: {this.props.map_store.getHomesBuilt().get('terraced')}</li>
          <li>Semi-Detached: {this.props.map_store.getHomesBuilt().get('semi-detached')}</li>
          <li>Detached: {this.props.map_store.getHomesBuilt().get('detached')}</li>
          <li>Total: {this.getTotalHomesBuilt()}</li  >
        </ul>
        <button onClick={this.startAgain}>Start again</button>
        <p><a href={this.props.map_store.getShareOnFacebookLink()} target='_blank'>Share your plan on facebook</a></p>
        <p><a href="mailto:richard.hills@gmail.com">richard.hills@gmail.com</a></p>
      </div>
    );
  }
});
