var React = require('react');

var current = {
  id: 'c',
  sidePanelMessage: (<p>Oxford needs 28,000 homes by 2026, and Oxfordshire requires more than 100,000. There is much political disagreement over these numbers (mostly the <a href="http://www.cpreoxon.org.uk/events/current-events/item/2426-public-meeting-on-over-development-of-oxfordshire">CPRE</a> and some <a href="http://www.lgcplus.com/opinion/lgc-columnists/in-depth-special-features/why-housing-is-our-priority-in-cash-strapped-times/5075577.article">City Councillors</a>), but one thing is certain; Oxford is desperately short of housing. <br/><br/>Where would you build?<br/><br/>Click on the map to start building</p>),
  showTargetPopup: true
};

var wolfson = {
  id: 'w',
  sidePanelMessage: (<p>This shows the <a href="http://www.policyexchange.org.uk/wolfsonprize/item/wolfson-economics-prize-2014">Wolfson Economics Prize winner</a> <a href="http://www.policyexchange.org.uk/images/WolfsonPrize2014/20140827%20rudlin%20stage%202.pdf">David Rudlin's proposal</a>, applied to Oxford. It focuses on 4 areas: extending Kidlington, extending Oxford in the west and in the south, and extending Abingdon northwards. <br/><br/>What would you change?<br/><br/>Click and drag the areas on the map to make changes.</p>),
  showTargetPopup: false
};

module.exports = {
  getScenarioById: function(id) {
    if(id == 'c') {
      return current;
    }
    if(id == 'w') {
      return wolfson;
    }
  },
  
  getDefault: function() {
    return current;
  }
};
