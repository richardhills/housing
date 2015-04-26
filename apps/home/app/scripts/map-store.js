var immutable = require('immutable');
var ol = require('openlayers');
var jquery = require('jquery');
var base64 = require('js-base64').Base64;

var buildTypeCodes = {'flats': 1,
    'terraced': 2,
    'semi-detached': 3,
    'detached': 4,
    'other': 5};

var buildTypeCodesReverse = {};

(function(){
  for (var key in buildTypeCodes)
    buildTypeCodesReverse[buildTypeCodes[key]] = key
})();
  
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
    var data = this.getParameterByName('datav1');
    var initialBuildings = {'flats': [],
                            'terraced': [],
                            'semi-detached': [],
                            'detached': [],
                            'other': []};
    if(data) {
      var bufferAsString = base64.decode(data);
      
      var buffer = new ArrayBuffer(bufferAsString.length * 2);
      var bufferView = new Uint16Array(buffer);
      for (var i = 0, strLen = bufferAsString.length; i < strLen; i++) {
        bufferView[i] = bufferAsString.charCodeAt(i);
      }
      
      bufferView = new Uint8Array(buffer);
      
      var offset = 0;
      while(offset < bufferView.length) {
        var headerView = new DataView(buffer, offset);
        var frameLength = headerView.getUint16(0);
        var numberOfPoints = (frameLength - 4) / 4 / 2;
        var dataView = new Float32Array(buffer, offset + 4, numberOfPoints * 2);
        offset += frameLength;
        var buildTypeCode = headerView.getUint8(2);
        var buildType = buildTypeCodesReverse[buildTypeCode];
        
        var ring = [];
        
        for(var pointNumber = 0; pointNumber < numberOfPoints; pointNumber ++) {
          var x = dataView[pointNumber * 2];
          var y = dataView[pointNumber * 2 + 1];
          ring.push([x, y]);
        }
        
        var polygon = new ol.geom.Polygon([ring]);
        var feature = new ol.Feature(polygon);
        initialBuildings[buildType].push(feature);
      }
    }
    return immutable.Map(initialBuildings);
  }

  createHomesBuiltQueryString(buildFeatures) {
    var params = {};
    
    var buffer = new ArrayBuffer();
    var dataOffset = 0;
    
    for(var buildType in buildFeatures) {
      var featuresArray = buildFeatures[buildType].getFeatures().getArray();
      featuresArray.forEach(function(feature) {
        var pointsArray = feature.getGeometry().getCoordinates()[0].reduce(function(x, y) {
          return x.concat(y);
        });;
        var pointsAsFloat32Array = new Float32Array(pointsArray);
        var lengthOfFrame = (4 + pointsAsFloat32Array.length * 4);
        
        var newFrame = new ArrayBuffer(lengthOfFrame);
        var headerView = new DataView(newFrame, 0);
        var dataView = new Float32Array(newFrame, 4)
        headerView.setUint16(0, lengthOfFrame);
        headerView.setUint8(2, buildTypeCodes[buildType]);
        dataView.set(pointsAsFloat32Array);
        dataOffset += lengthOfFrame;
        
        var previousView = new Uint8Array(buffer);
        buffer = new ArrayBuffer(previousView.length + lengthOfFrame);
        var newView = new Uint8Array(buffer);
        var newFrameView = new Uint8Array(newFrame);
        newView.set(previousView);
        newView.set(newFrameView, previousView.length);
      });
    }
    var buffersAsString = String.fromCharCode.apply(null, new Uint16Array(buffer));
    var base64Data = base64.encodeURI(buffersAsString);
    
    return jquery.param({datav1: base64Data});
  }
  
  storeHomesBuiltInQueryString(buildFeatures) {
    window.location.hash = this.createHomesBuiltQueryString(buildFeatures);
  }
  
  calculateHomesBuilt(buildFeatures) {
    var _this = this;
    var total = {'flats': 0,
                 'terraced': 0,
                 'semi-detached': 0,
                 'detached': 0,
                 'other': 0};
    
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
    
    if(buildType != 'other' & typeof(feature.getGeometry().getArea) == "function") {
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
