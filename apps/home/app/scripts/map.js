var React = require('react');
var ol = require('openlayers');
var Reflux = require('reflux');
var _ = require('lodash');

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
    var draw = new ol.interaction.Draw({
      features: feature_overlay.getFeatures(),
      type: 'Polygon'
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

  buildingStyles: {
    'flats': new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(246, 150, 121, 0.5)'
      }),
      stroke: new ol.style.Stroke({
        color: '#F7977A',
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
        color: 'rgba(255, 247, 153, 0.5)'
      }),
      stroke: new ol.style.Stroke({
        color: '#FFF79A',
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
        color: 'rgba(130, 202, 156, 0.5)'
      }),
      stroke: new ol.style.Stroke({
        color: '#A2D39C',
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
        color: 'rgba(131, 147, 202, 0.5)'
      }),
      stroke: new ol.style.Stroke({
        color: '#8493CA',
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

  componentDidMount: function() {
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
    this.setInteractions();
  },
  
  componentWillUpdate: function() {
    this.setInteractions();
  },
  
  setInteractions: function() {
    for(var buildingType in this.buildingInteractions) {
      this.map.removeInteraction(this.buildingInteractions[buildingType]['draw']);
      this.map.addInteraction(this.buildingInteractions[buildingType]['modify']);

      if(this.props.map_store.getBuildType() == buildingType) {
        this.map.addInteraction(this.buildingInteractions[buildingType]['draw']);
      }
    }
  },

  render: function() {
    return (
      <div className="home-map" id="map">
      </div>
    );
  }
});
