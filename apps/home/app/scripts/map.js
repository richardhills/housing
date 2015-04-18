var React = require('react');
var ol = require('openlayers');
var Reflux = require('reflux');
var _ = require('lodash');
var dialog = require('vex-js/js/vex.dialog.js');

var Messages = require('./messages');

var latlng = 'EPSG:4326'; //WGS 1984 projection
var mercantor = 'EPSG:3857'; 
var ordinance = 'EPSG:27700';

module.exports = React.createClass({
  initializeMap: function(target) {
    var osm = new ol.layer.Tile({
      source: new ol.source.OSM()
    });
    
    var oxford = [-1.2578, 51.7519];
    
    this.map = new ol.Map({
      target: target,
      layers: [
        osm
      ],
      view: new ol.View({
        center: ol.proj.transform(oxford, latlng, mercantor),
        zoom: 12
      })
    });
  },
  
  populateBuildingOverlay: function(featureOverlay, buildType) {
    var initialBuildingFeatures = this.props.map_store.getInitialBuildings();
    var features = initialBuildingFeatures.get(buildType);
    if(features) {
      features.forEach(function(feature) {
        featureOverlay.addFeature(feature);
        feature.on('change', this.onBuildingChanged);
      }, this);
    }
  },
  
  initializeBuildingOverlay: function(style, buildType) {
    var featureOverlay = new ol.FeatureOverlay({
      style: style
    });
    featureOverlay.setMap(this.map);
    
    this.populateBuildingOverlay(featureOverlay, buildType);
    
    featureOverlay.getFeatures().on('add', this.onBuildingAdded);
    featureOverlay.getFeatures().on('remove', this.onBuildingDestroyed);
    return featureOverlay;
  },
  
  onBuildingAdded: function(event) {
    event.element.on('change', this.onBuildingChanged);
    this.popupOverFeature(event.element);
    this.props.map_actions.build_features_changed(this.buildingOverlays);
  },
  
  onBuildingChanged: _.debounce(function() {
    this.props.map_actions.build_features_changed(this.buildingOverlays);
  }, 10),
  
  onBuildingDestroyed: function(event) {
    event.element.un('add', this.onBuildingChanged);
    this.props.map_actions.build_features_changed(this.buildingOverlays);
  },
  
  initializeBuildingInteraction: function(feature_overlay) {
    var _this = this;

    var draw = new ol.interaction.Draw({
      features: feature_overlay.getFeatures(),
      type: 'Polygon'
    });

    draw.on('drawstart', function() {
      if(_this.showHelpPopup) {
        dialog.alert(Messages.onStartFirstBuilding);
        _this.showHelpPopup = false;
      }
      
      _this.inDrawMode = true;
    });
    
    draw.on('drawend', function() {
      _this.inDrawMode = false;
    });

    var modify = new ol.interaction.Modify({
      features: feature_overlay.getFeatures(),
      // the SHIFT key must be pressed to delete vertices, so
      // that new vertices can be drawn at the same position
      // of existing vertices
      deleteCondition: function(event) {
        return ol.events.condition.shiftKeyOnly(event) &&
            ol.events.condition.singleClick(event);
      }
    });
    
    return {'draw': draw,
            'modify': modify}
  },

  initializeSelectionInteraction: function() {
    var _this = this;
    this.selectInteraction = new ol.interaction.Select({
      condition: ol.events.condition.click
    });
    
    this.selectInteraction.getFeatures().on('add', function(event) {
      var feature = event.element;
      _this.popupOverFeature(feature);
    });
  },
  
  getBuildTypeOfFeature(feature) {
    var _this = this;
    var buildTypeOfNewFeature;
    for(var buildingType in _this.buildingOverlays) {
      if(_this.buildingOverlays[buildingType].getFeatures().getArray().indexOf(this.selectedFeature) != -1) {
        buildTypeOfNewFeature = buildingType;
      }
    }
    return buildTypeOfNewFeature;
  },
  
  moveFeaturePopup() {
    if(typeof(this.popupOverlay) == 'undefined') {
      return;
    }

    if(typeof(this.selectedFeature) == 'undefined') {
      this.popupOverlay.setPosition(undefined);
      return;
    }
    var extent = this.selectedFeature.getGeometry().getExtent();
    var center = [(extent[0] + extent[2]) / 2,
                  (extent[1] + extent[3]) / 2];
    var content = document.getElementById('popup-content');

    var buildTypeOfNewFeature = this.getBuildTypeOfFeature(this.selectedFeature);
    
    if(typeof(buildTypeOfNewFeature) == 'undefined') {
      this.popupOverlay.setPosition(undefined);
      return;
    }

    var newHomes = this.props.map_store.calculateHomesBuiltInFeature(this.selectedFeature, buildTypeOfNewFeature);

    if(typeof(newHomes) == 'undefined') {
      this.popupOverlay.setPosition(undefined);
      return;
    }

    var selectedFeatureMessage = "" + newHomes + ' ' + buildTypeOfNewFeature;

    this.popupContent.innerHTML = selectedFeatureMessage;
    this.popupOverlay.setPosition(center);
  },

  popupOverFeature(feature) {
    this.selectedFeature = feature;
    this.moveFeaturePopup();
  },

  initializePopupOverlay: function() {
    var _this = this;
    var container = document.getElementById('popup');
    this.popupContent = document.getElementById('popup-content');
    var closer = document.getElementById('popup-closer');

    closer.onclick = function() {
      _this.popupOverlay.setPosition(undefined);
      closer.blur();
      return false;
    };

    this.popupOverlay = new ol.Overlay({
      element: container,
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });
    
    this.popupOverlay.setMap(this.map);
  },

  buildingStyles: {
    'flats': new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(246, 150, 121, 0.8)'
      }),
      stroke: new ol.style.Stroke({
        color: '#000000',
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    }),
    'terraced': new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 247, 153, 0.8)'
      }),
      stroke: new ol.style.Stroke({
        color: '#000000',
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    }),
    'semi-detached': new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(130, 202, 156, 0.8)'
      }),
      stroke: new ol.style.Stroke({
        color: '#000000',
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    }),
    'detached': new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(131, 147, 202, 0.8)'
      }),
      stroke: new ol.style.Stroke({
        color: '#000000',
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    }),
  },

  onMouseMove: function(event) {
    var _this = this;
    
    if (event.dragging) {
      return;
    }
    var pixel = this.map.getEventPixel(event.originalEvent);
    
    var feature = this.map.forEachFeatureAtPixel(pixel, function(feature, layer) {
      for(var overlayName in _this.buildingOverlays) {
        var overlay = _this.buildingOverlays[overlayName];
        if(overlay.getFeatures().getArray().indexOf(feature) != -1) {
          return feature;
        }
      }
    });
    
    var featureFound = typeof(feature) == "undefined";
    
    this.setInteractions(featureFound | this.inDrawMode);
  },

  componentDidMount: function() {
    this.showHelpPopup = true;
    this.inDrawMode = false;

    this.initializeMap('map');
    this.buildingInteractions = {};
    this.buildingOverlays = {};
    for(var buildingType in this.buildingStyles) {
      var buildingOverlay = this.initializeBuildingOverlay(this.buildingStyles[buildingType],
                                                           buildingType);
      this.buildingOverlays[buildingType] = buildingOverlay;
      var buildingInteraction = this.initializeBuildingInteraction(buildingOverlay);
      this.buildingInteractions[buildingType] = buildingInteraction;
    }
    this.props.map_actions.build_features_changed(this.buildingOverlays);
    this.initializeSelectionInteraction();
    this.initializePopupOverlay();
    this.setInteractions(true);
    
    this.map.on('pointermove', this.onMouseMove);
  },
  
  componentWillUpdate: function() {
    this.setInteractions(true);
  },
  
  setInteractions: function(buildingMode) {
    for(var buildingType in this.buildingInteractions) {
      var modifyInteraction = this.buildingInteractions[buildingType]['modify'];
      if(buildingMode) {
        if(this.map.getInteractions().getArray().indexOf(modifyInteraction) == -1) {
          this.map.addInteraction(modifyInteraction);
        }
      } else {
        this.map.removeInteraction(modifyInteraction);
      }

      var drawInteraction = this.buildingInteractions[buildingType]['draw'];
      if(buildingMode & this.props.map_store.getBuildType() == buildingType) {
        if(this.map.getInteractions().getArray().indexOf(drawInteraction) == -1) {
          this.map.addInteraction(drawInteraction);
        }
      } else {
        this.map.removeInteraction(drawInteraction);
      }
    }
    
    if(buildingMode) {
      this.map.removeInteraction(this.selectInteraction);
    } else {
      this.map.addInteraction(this.selectInteraction);
    }
  },

  render: function() {
    this.moveFeaturePopup();
    return (
      <div className="home-map" id="map">
        <div id="popup" className="home-map__ol-popup">
          <a href="#" id="popup-closer" className="home-map__ol-popup-closer"></a>
          <div id="popup-content"></div>
        </div>
      </div>
    );
  }
});
