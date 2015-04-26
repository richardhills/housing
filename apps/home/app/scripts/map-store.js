var immutable = require('immutable');
var ol = require('openlayers');
var jquery = require('jquery');
var base64 = require('base64-arraybuffer')

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
                               'homes_built': this.calculateHomesBuilt({}),
                               'extra_homes_build': {},
                               'initial_buildings': this.calculateInitialBuildingsFromQueryString(),
                               'baseline': this.getBaselineFromQueryString()});
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
  
  getBaseline() {
    return this.data.get('baseline');
  }

  getTotalHomesBuilt() {
    var built = this.getHomesBuilt();
    var total = 0;
    built.forEach(function(count) {
      total += count;
    });
    return total;
  }

  getTotalExtraHomesBuilt() {
    var built = this.getHomesBuilt();
    var baseline = this.getBaseline();
    var total = 0;
    built.forEach(function(count) {
      total += count;
    });
    baseline.forEach(function(count) {
      total -= count;
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
  
  getBaselineFromQueryString() {
    var _this = this;
    var getBaseline = function(param) {
      var stringValue = _this.getParameterByName(param);
      if(stringValue) {
        return parseInt(stringValue);
      } else {
        return 0;
      }
    };
    
    var baseline = {
        'flats': getBaseline('fb'),
        'terraced': getBaseline('tb'),
        'semi-detached': getBaseline('sb'),
        'detached': getBaseline('db'),
    }
    return immutable.Map(baseline);
  }
  
  calculateInitialBuildingsFromQueryString() {
    var data = this.getParameterByName('datav1');
    var initialBuildings = {'flats': [],
                            'terraced': [],
                            'semi-detached': [],
                            'detached': [],
                            'other': []};
    if(data) {
      var buffer = base64.decode(data);

      var bufferView = new Uint8Array(buffer);
      
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
    var base64Data = base64.encode(buffer);
    
    var params = {'fb': this.getBaseline().get('flats'),
                  'tb': this.getBaseline().get('terraced'),
                  'sb': this.getBaseline().get('semi-detached'),
                  'db': this.getBaseline().get('detached'),
                  'datav1': base64Data
                  };
    
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
      'flats': 50 / 2,
      'terraced': 50,
      'semi-detached': 80,
      'detached': 150
    };
    var units_per_m2 = 15;
    
    if(buildType != 'other' & typeof(feature.getGeometry().getArea) == "function") {
      var area = feature.getGeometry().getArea();
      var aream2 = area / units_per_m2;
      return Math.round(aream2 / housingSize[buildType]);
    } else {
      return 0;
    }
  }
  
  onClearAll() {
    window.location = "/#fb=1289&tb=13165&sb=36869&db=3546&datav1=ACwBACSeCcgTT85KM5IJyIFNzkoUAArI00vOSoUhCsj0Tc5KJJ4JyBNPzkoALAEAdK8EyGopzkpTTATIfyrOSmJABMjZJ85Ki3IEyJQmzkp0rwTIainOSgBcAQCgtgnI2ybOSuuiCcgyJc5Kl2kJyEgkzkqfYwnIriXOSgETCcgWJc5KxBoJyJcjzkon5wjI3SLOSnz1CMjqJs5KyTQJyMQmzkr2YwnIbyfOSqC2CcjbJs5KADQCADvXCciBSc5K7pcJyEBKzkpTbwnIQkbOSm2tCcgZRc5KyrUJyERHzko71wnIgUnOSgB8AgCvdAnIojnOSgomCsi9Ns5K%2Bt4JyDM2zkoM0AnIUjXOShUdCsiRM85KqiAKyEoxzkonDgrInC%2FOSkOjCchjL85KUZcJyC0uzkoIVQnIkS7OSjNcCcgDMc5K7pQJyJEzzkqUtAnIuTTOSgxSCcjfNs5Kr3QJyKI5zkoAlAIAYSUHyHYlzkpWhQbIGifOSp9JBsgpJc5K%2BKsFyMokzkrfFwXIbibOSjilBMjGIs5KM1EFyBIezkp%2FlATIMBrOSseDBMiAF85Kmf0EyJcUzkqhiwXI6RLOSr0GBsh0Ec5KHLUGyLUQzkpG5wbIPxPOSuLkBsiTF85KtwgHyGYdzkr%2FzAbI7B3OSmElB8h2Jc5KAGQCAPt4B8itDM5K3pAHyNQRzkox9QfIThHOSgKaCMgpIM5KqGIJyLMizkrSaQnIwiDOSp3CCMj%2BGM5KV6gIyE4WzkoDbwjIvQ%2FOSlv8B8jyDc5KI9YHyI8Lzkr7eAfIrQzOSgBsAgBOwQXIEv%2FNSn2aBchd%2FM1Kjw0FyG%2F5zUoG1gTItvvNSnyeBMgS%2Bs1KFMoEyNf4zUoEgwTId%2FjNSuT0A8gI%2Bs1Kb38EyLD%2FzUqXXgTIKQHOSg%2F4BMjMAc5KDiMFyHYBzkpOwQXIEv%2FNSgBMAgDDJgrINinOSke3CshAKc5KoRULyLYrzkrRQQvIOCrOSuSwC8iXKs5KQLkLyIgnzkrWlQrI0ibOSuAOCsh3I85KwyYKyDYpzkoAbAMA6R8LyOlbzko%2BLgvI%2FWDOSr4YC8gYZc5KedMKyD5lzkrryQrIWWTOSuBUCsjyZM5KCzEKyMdizkrFFgrIgmHOSkirCcjiYc5KyJUJyFFgzkrYXgnIUWDOSvVGCcjDW85K6R8LyOlbzkoARAMARQEKyN5azkr%2F5gnISVfOSlafCcjWUc5KSYAJyEBOzkpqvAjIylDOSj0LCcisWc5Kg1AJyARbzkpFAQrI3lrOSgBsAwBAkwrI9UXOSmxvCsgAQs5KyiEKyGBCzkqACgrIrj7OSogYCsjHO85KWiMKyBk6zkqjJgrIJDfOSvIPCsgkN85Kq3cJyNQ5zkoYjQnIVDzOSgacCciFP85K4eQJyLhIzkpAkwrI9UXOSgCEAwAPlgbIewHOSirUBsj1Bc5KSJEGyP4OzkqDNgbIVhDOSsCFBchtEs5KCHUFyBURzkrv4ATIAhHOSo2zBMimEs5K4sEEyJ4Tzkou2gPIBhjOSis4AsjYE85K%2BwcDyM8Fzkp2yQPImgLOSkMaBcj5As5KkSoGyAT%2FzUoPlgbIewHOSgEMAwBu9gTIkS7OSpunBMjnKc5KHjwEyDUrzkq2vgPIRirOSoy3A8giJs5KqnQDyD4mzkqxbgPIOiTOStVQA8ijJM5KKzQDyIsmzkpXEAPInibOSog8A8iFI85KAS0DyPUizko4fgPIYB%2FOSjooA8jeG85KLQkDyIIdzkpDzALIuBvOSkIpA8iHFs5KnTUCyFQUzkraDQLIVhrOSiL9AcinIc5KEIoCyHUgzkr6mwLI6iHOSqWNAsgBJM5KVP4ByMokzkrG9AHI%2FivOShouAshbK85KJ00CyNkszkrMGQLIPzDOSg3kAciLMM5K%2F%2B8ByLczzkr2IALIfDfOSoKnA8jBM85KbvYEyJEuzkoA7AMA0BoGyCcuzkrAUQbILzLOSln7BsjrNc5KFWAGyJs9zkro2QbIlzvOSjs%2BB8jFP85KHysHyMFCzkp4jQbIp0POShSLBsghSM5K5wQHyM5NzkoTtgbI%2F07OSpZKBsjVTM5KCRYGyNlJzkokVAbIV0bOSnCXBcghQ85KDWoFyHlEzkrm4QTI7ETOSusKBMiqQM5KonEEyD8%2FzkqX0QPIozzOSm90A8g7Pc5KN04DyPc7zkpJwQLIlzvOSj5MAsjMOc5KBiYCyCg4zkr4EQPIqjbOStp3Bch7Lc5KvY8FyMAuzkrQGgbIJy7OSgBEAwBY8AHIOTfOSsu7Ach2L85KInQByEwtzkpcRAHIkC7OShf%2FAMh9Ls5K%2B%2BsAyMY2zkp4VwHIxjbOSljwAcg5N85KAEwDAP8%2FAMg5PM5KnD0AyN44zkp4VwHIHjjOSm4FA8ikPc5K7u8CyGtCzkp3ggHIgj%2FOShf%2FAMh7QM5KwvAAyIY8zkr%2FPwDIOTzOSgB0AwBA1wLIZwPOSpe2A8iH%2B81KyowDyBL6zUo1XgPImPrNSpsKA8gj9M1KUXUCyAHxzUojyAHIlPPNSvVFAcgj9M1KICIByBL6zUp%2B1ADIUv3NSiccAch0AM5KjsQByEEDzkrU3gHIEwTOSkDXAshnA85KAOQDAIRbDsglKs5KK6sMyOQqzkr9AQvIfBzOSjUoC8jQG85KfugLyLIfzkr%2F%2BQzIVhzOSsjPDci%2FHM5KTQoOyDsYzkqr4w7IbBTOSrPdDshAEc5KuQIPyMQQzkpNMQ%2FILxLOSmCgD8gFEM5KEbcPyDYRzkr4SRDIyw%2FOSqM7EMicFM5KdLkPyK0TzkpgoA%2FIJBbOSvL9DsgYFc5KMR4PyC8czkrs2A7Irh3OSoqADshpHM5KZ3MOyBcezkr59w7I6x%2FOSlQrD8imHs5KKU8PyLIfzkqABw%2FIVCXOSoRbDsglKs5KAEwDACCiDMh4Wc5KuE8MyBFazkrxSgzIuVjOSsAeDMivWM5KMhUMyMRUzkrQ4wzIHlLOSkLaDMi9Vc5KL5YMyLNVzkogogzIeFnOSgBMBAD4EwvI3lrOSholCsjxWs5KG%2FoJyMpVzko5twnIPVHOSuSoCciYT85KKBkKyFNOzkrtcwrIAFTOSjO5CshjVs5K%2BBMLyN5azkoArAQAba0JyJREzkrShAnIHz7OSngmCcjBPs5KvxUJyM47zkrvbAnIkzrOShNPCciEN85KefsIyCY4zkpi9gjIzzfOSsDqCMgHN85KqFYIyH45zkp8egjInzvOSnSrCMg0P85KNmAIyP5AzkqRkwjIgUTOSiByCMgtRc5KtXUIyKFGzkrW2AjI4kXOSpH%2FCMhPSM5KFmUJyGBHzkpPYAnIxUXOSm2tCciURM5KADwEAFxCC8iY%2FM1K92oLyOD1zUpGLQrIFv7NSojQCMj0%2F81K9xwJyIkIzkoYqwnIYQLOSlxCC8iY%2FM1KAEQEAMMxC8igWs5KR5cLyA1YzkpeWgvI3VLOSosLC8irUc5KNv0KyOhTzkoclArIOVHOSl1eCshyUc5KwzELyKBazkoALAQAUgYGyE%2F5zUptRAbIFPjNSmj0Bciu9M1K3JQFyLr1zUpSBgbIT%2FnNSgBEBABkxwfISATOSnYPB8iX981KXKYGyJ7nzUqQeAfIh%2BrNSvD7B8iE8s1KK8wHyK75zUoZWQjIdf7NSmTHB8hIBM5KAFQFALf3Cch9S85KXm4JyNdNzkqtVwnI8EvOSjw2CchZTM5KoQ0JyAdJzkoeeQnIr0fOSu6XCchASs5KlpQJyL5Kzkpq4wnIz0nOSrf3Cch9S85KAUQFAN5NCci0Ns5KwJAJyN4zzkrTVgnILjHOSt5NCchrLs5K6pcJyP0tzkpkXQnIuyvOSoLDCchsKs5Kl9wJyFQszkokEQrI9CvOSuTwCcjEJs5Kn2MJyK4nzkrSOQnI%2BCbOSl7wCMgoJ85Kg%2B8IyO0mzkoN3wjIgiLOSvuMCMiBIc5KvGwIyGokzko3MgjI8CTOSgwrCMhIJs5KedEHyP0mzkpWxAfI0SjOShh5B8j2J85KCloHyAMqzkoytwfIuyvOSk7KB8iNLM5KCLAHyDsuzkrZLQfI2SzOSuEnB8jDL85KUkkHyPwvzkpSSQfI%2FjDOSh9zB8jrMM5KucYHyG8wzkqc3gfIfDLOSvm7B8i1Ms5KHckHyH4zzkoj7gfIRTPOSpsJCMhHNM5KpakIyNQzzkqj%2FwjIrDfOSt5NCci0Ns5KACwFAFBEBMilKs5KyjQEyCgizkr0vQPIkyHOSoXEA8gfKs5KUEQEyKUqzkoANAUAof4EyHQuzkq3EwbIJCrOSvHjBchIKc5KBtYEyFIpzkqYsQTI3SnOSqH%2BBMh0Ls5KADQFAJDLCsinJs5KIP0KyCUjzkrObQrIVCDOSsTNCchzIc5KY5wKyJ4mzkqQywrIpybOSgBkBQAW%2BQHILhjOSrWcAsiWCc5KbAMDyOIEzkrfzgLI4APOSppiAchoBc5K4uf%2Fx68Mzkr2QwDIrRDOSoD5AMhRDc5KzDgByPYOzkpuhgHIdw3OSsm5AcjEF85KFvkByC4YzkoAPAUA5J8FyP%2F7zUrG4gXIIfrNSiHvBMg18c1KA%2FoDyOL2zUoBUATIhvjNSuDoBMhg%2BM1K5J8FyP%2F7zUo%3D";
    window.location.reload();
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
