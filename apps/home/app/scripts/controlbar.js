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
  
  showWolfsonPrizePlan: function(event) {
    this.props.map_actions.showWolfsonPrizePlan();
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
    var building_type_key_image = 'static/assets/' + value + '.png';
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
        <img src={building_type_key_image} className="home-controlbar__keyimage" />
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
  
    var sidePanelMessage = this.props.map_store.getScenario().sidePanelMessage;
  
    return (
      <div className="home-controlbar">
        <h2>The Oxford Housing Crisis</h2>
        <p>
        {sidePanelMessage}
        </p>
        {this.createCheckBox('flats', 'Flats')}
        {this.createCheckBox('terraced', 'Terraced Homes')}
        {this.createCheckBox('semi-detached', 'Semi-detached Homes')}
        {this.createCheckBox('detached', 'Detached Homes')}
        {this.createCheckBox('other', 'Non-housing')}
        {newBuildMessage}
        {stillRequiredMessage}
        <div><button onClick={this.startAgain}>Show Oxford as it is today</button></div>
        <div><button onClick={this.showWolfsonPrizePlan}>Show Wolfson Prize Plan</button></div>
        <p><a href={this.props.map_store.getShareOnFacebookLink()} target='_blank'>Share your plan on facebook</a></p>
        <p><a href="mailto:richard.hills@gmail.com">richard.hills@gmail.com</a></p>
        <a href="https://github.com/richardhills/housing"  target='_blank'>Code on github</a>
      </div>
    );
  }
});
