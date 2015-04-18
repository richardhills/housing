var React = require('react');

module.exports = {
  onStartup: '<b>Oxford needs 28,000 homes by 2026.<br><br>Where would you build?</b><br><br>To start building, click on the map',
  onStartFirstBuilding: '<b>Congratulations!</b> You have started building some homes.<br>Single click to draw the edge of where you want to build, and double click to finish.',
  onStartEndBuilding: function(count) { return '<p><b>Congrats!</b> You have built ' + count + ' new homes. Can you build ' + (28000-count) + ' more?</p>';},
  onTargetCompleted: function(count) { return '<p><b>Congratulations!</b><br/><br/>Oxford needed 28000 homes and you have built ' + count + ', enough to last until 2026.</p>'; },
  sidePanel: (<p>Oxford needs 28,000 homes by 2026, and Oxfordshire requires more than 100,000. There is much political disagreement over these numbers (mostly the <a href="http://www.cpreoxon.org.uk/events/current-events/item/2426-public-meeting-on-over-development-of-oxfordshire">CPRE</a> and some <a href="http://www.lgcplus.com/opinion/lgc-columnists/in-depth-special-features/why-housing-is-our-priority-in-cash-strapped-times/5075577.article">City Councillors</a>), but one thing is certain; Oxford is desperately short of housing.</p>)
};
