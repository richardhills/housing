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

  homesBuilt: function(type) {
    if(type != 'other') {
      var baseline = this.props.map_store.getBaseline().get(type);
      var now = this.props.map_store.getHomesBuilt().get(type);
      if(now > baseline) {
        return " (+" + (now - baseline) + " extra built)";
      } else if(now < baseline) {
        return " (" + (now - baseline) + " lost)";
      } else {
        return "";
      }
    } else {
      return ""
    }
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
        <label htmlFor={value}>{label}{this.homesBuilt(value)}</label>
      </div>
    );
  },

  render: function() {
    var target = 28000;
    var extraHomesBuilt = this.props.map_store.getTotalExtraHomesBuilt();
    
    var stillRequiredMessage;
    if(extraHomesBuilt > 28000) {
      stillRequiredMessage = (<p><b>Congratulations! You've built enough homes to last until 2026</b></p>);
    } else {
      stillRequiredMessage = (<p><b>Still required: {28000 - extraHomesBuilt}</b></p>);
    }
    
    var newBuildMessage;
    if(extraHomesBuilt > 0) {
      newBuildMessage = (<p>Total new build: {extraHomesBuilt}</p>);
    } else if(extraHomesBuilt < 0) {
      newBuildMessage = (<p>Homes lost: {extraHomesBuilt}</p>);
    } else {
      newBuildMessage = (<p>-</p>);
    }
  
    return (
      <div className="home-controlbar">
        <h2>The Oxford Housing Crisis</h2>
        <p>
        {Messages.sidePanel}
        </p>
        <p>Where would you build?</p>
        <p>Click on the map to start building</p>
        {this.createCheckBox('flats', 'Flats')}
        {this.createCheckBox('terraced', 'Terraced Homes')}
        {this.createCheckBox('semi-detached', 'Semi-detached Homes')}
        {this.createCheckBox('detached', 'Detached Homes')}
        {this.createCheckBox('other', 'Non-housing')}
        {newBuildMessage}
        {stillRequiredMessage}
        <button onClick={this.startAgain}>Start again</button>
        <p><a href={this.props.map_store.getShareOnFacebookLink()} target='_blank'>Share your plan on facebook</a></p>
        <p><a href="mailto:richard.hills@gmail.com">richard.hills@gmail.com</a></p>
      </div>
    );
  }
});
