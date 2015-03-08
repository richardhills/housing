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
      <div>
        <input
            type="radio"
            name="type"
            checked={this.props.map_store.getBuildType() === value ? true : false}
            value={value}
            id={value}
            onChange={this.buildTypeChanged} />
        <label htmlFor={value}>{label}</label>
      </div>
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
        <h2>The Oxford Housing Crisis</h2>
        <p>
          Oxford requires 28,000 homes by 2026, and Oxfordshire requires more than 100,000. There is much political disagreement over these numbers (mostly the <a href="http://www.cpreoxon.org.uk/events/current-events/item/2426-public-meeting-on-over-development-of-oxfordshire">CPRE</a> and some <a href="http://www.lgcplus.com/opinion/lgc-columnists/in-depth-special-features/why-housing-is-our-priority-in-cash-strapped-times/5075577.article">City Councillors</a>
          ), but one thing is certain; Oxford is desperately short of housing.
        </p>
        <p>Where would you build?</p>
        <p>Double click on the map to start building</p>
        {this.createCheckBox('flats', 'Flats')}
        {this.createCheckBox('terraced', 'Terraced Homes')}
        {this.createCheckBox('semi-detached', 'Semi-detached Homes')}
        {this.createCheckBox('detached', 'Detached Homes')}
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
