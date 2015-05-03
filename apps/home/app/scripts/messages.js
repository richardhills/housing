var React = require('react');

module.exports = {
  onStartup: '<b>Oxford needs 28,000 homes by 2026.<br><br>Where would you build?</b><br><br>To start building, click on the map',
  onStartFirstBuilding: '<b>Congratulations!</b> You have started building some homes.<br>Single click to draw the edge of where you want to build, and double click to finish.',
  onStartEndBuilding: function(count, target) { return '<p><b>Congrats!</b> You have built ' + count + ' new homes. Can you build ' + (target-count) + ' more?</p>';},
  onTargetCompleted: function(count, target) { return '<p><b>Congratulations!</b><br/><br/>Oxford needed ' + target + ' homes and you have built ' + count + ', enough to last until 2026.</p>'; },
};
