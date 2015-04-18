var React = require('react');
var immutable = require('immutable');
var Reflux = require('reflux');

var Messages = require('./messages');

module.exports = React.createClass({
  buildTypeChanged: function(event) {
    this.props.map_actions.build_type_changed(event.target.value);
  },
  
  startAgain: function(event) {
    this.props.map_actions.clear_all();
  },

  createCheckBox: function(value, label) {
    return (
      <div>
        <input
            type="radio"
            name="type"
            checked={this.props.map_store.getBuildType() === value ? true : false}
            value={value}
            id={value}
            onChange={this.buildTypeChanged} />
        <label htmlFor={value}>{label} (+{this.props.map_store.getHomesBuilt().get(value)} extra built)</label>
      </div>
    );
  },

  render: function() {
    var target = 28000;
    var stillRequiredMessage;
    if(this.props.map_store.getTotalHomesBuilt() > 28000) {
      stillRequiredMessage = (<p><b>Congratulations! You've built enough homes to last until 2026</b></p>);
    } else {
      stillRequiredMessage = (<p><b>Still required: {28000 - this.props.map_store.getTotalHomesBuilt()}</b></p>);
    }
  
    return (
      <div className="home-controlbar">
        <h2>The Oxford Housing Crisis</h2>
        <p>
        {Messages.sidePanel}
        </p>
        <p>Where would you build?</p>
        <p>Double click on the map to start building</p>
        {this.createCheckBox('flats', 'Flats')}
        {this.createCheckBox('terraced', 'Terraced Homes')}
        {this.createCheckBox('semi-detached', 'Semi-detached Homes')}
        {this.createCheckBox('detached', 'Detached Homes')}
        <p>Total new build: {this.props.map_store.getTotalHomesBuilt()}</p>
        {stillRequiredMessage}
        <button onClick={this.startAgain}>Start again</button>
        <p><a href={this.props.map_store.getShareOnFacebookLink()} target='_blank'>Share your plan on facebook</a></p>
        <p><a href="mailto:richard.hills@gmail.com">richard.hills@gmail.com</a></p>
      </div>
    );
  }
});
