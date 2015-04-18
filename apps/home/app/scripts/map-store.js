var immutable = require('immutable');
var ol = require('openlayers');
var jquery = require('jquery');

module.exports = class MapStore {

  constructor(map_actions) {
    this.map_actions = map_actions;
    this.data = immutable.Map({'build_type': 'flats',
                               'homes_built': this.calculateHomesBuilt([]),
                               'initial_buildings': this.calculateInitialBuildingsFromQueryString()});
  }

  init(data) {
    this.listenTo(this.map_actions.build_type_changed,
                  this.onBuildTypeChanged);
    this.listenTo(this.map_actions.build_features_changed,
                  this.onBuildFeaturesChanged);
    this.listenTo(this.map_actions.clear_all,
                  this.onClearAll);
  }
  
  getInitialBuildings() {
    return this.data.get('initial_buildings');
  }
  
  getBuildType() {
    return this.data.get('build_type');
  }
  
  getHomesBuilt() {
    return this.data.get('homes_built');
  }

  getTotalHomesBuilt() {
    var built = this.getHomesBuilt();
    var total = 0;
    built.forEach(function(count) {
      total += count;
    });
    return total;
  }

  getShareOnFacebookLink() {
    return "http://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(document.URL);
  }
  
  getParameterByName(name) {
    var match = RegExp('[?&#]' + name + '=([^&]*)').exec(window.location.hash);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }
  
  calculateInitialBuildingsFromQueryString() {
    var geoJSON = new ol.format.GeoJSON();
    var initialBuildings = {};
    ['flats', 'terraced', 'semi-detached', 'detached'].forEach(function(buildType) {
      var data = this.getParameterByName(buildType);
      if(data) {
        initialBuildings[buildType] = geoJSON.readFeatures(data);
      }
    }, this);
    return immutable.Map(initialBuildings);
  }

  createHomesBuiltQueryString(buildFeatures) {
    var params = {};
    for(var buildType in buildFeatures) {
      var geoJSON = new ol.format.GeoJSON();
      var featuresArray = buildFeatures[buildType].getFeatures().getArray();
      // geoJSON doesn't seem to like feature collections
      params[buildType] = geoJSON.writeFeatures(featuresArray);
    }
    return jquery.param(params);
  }
  
  storeHomesBuiltInQueryString(buildFeatures) {
    window.location.hash = this.createHomesBuiltQueryString(buildFeatures);
  }
  
  calculateHomesBuilt(buildFeatures) {
    var _this = this;
    var total = {'flats': 0,
                 'terraced': 0,
                 'semi-detached': 0,
                 'detached': 0};
    
    for(var buildType in buildFeatures) {
      buildFeatures[buildType].getFeatures().forEach(function(feature) {
        total[buildType] += _this.calculateHomesBuiltInFeature(feature, buildType);
      }, this);
    }
    return immutable.Map(total);
  }
  
  calculateHomesBuiltInFeature(feature, buildType) {
    var housingSize = {
      'flats': 50 / 4,
      'terraced': 50,
      'semi-detached': 100,
      'detached': 200
    };
    var units_per_m2 = 5;
    
    if(typeof(feature.getGeometry().getArea) == "function") {
      var area = feature.getGeometry().getArea();
      var aream2 = area / units_per_m2;
      return Math.round(aream2 / housingSize[buildType]);
    } else {
      return 0;
    }
  }
  
  onClearAll() {
    window.location = "/";
  }
  
  onBuildTypeChanged(control_mode) {
    this.data = this.data.set('build_type', control_mode);
    this.trigger(this.data);
  }
  
  onBuildFeaturesChanged(building_features) {
    this.data = this.data.set('homes_built', this.calculateHomesBuilt(building_features));
    this.storeHomesBuiltInQueryString(building_features);
    this.trigger(this.data);
  }
};
