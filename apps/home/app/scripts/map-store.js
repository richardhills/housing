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
    this.listenTo(this.map_actions.showWolfsonPrizePlan,
                  this.onShowWolfsonPrizePlan);
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
    window.location = "#fb=1289&tb=13165&sb=37013&db=17191&datav1=ACwBACSeCcgTT85KM5IJyIFNzkoUAArI00vOSoUhCsj0Tc5KJJ4JyBNPzkoALAEAdK8EyGopzkpTTATIfyrOSmJABMjZJ85Ki3IEyJQmzkp0rwTIainOSgBcAQCgtgnI2ybOSuuiCcgyJc5Kl2kJyEgkzkqfYwnIriXOSgETCcgWJc5KxBoJyJcjzkon5wjI3SLOSnz1CMjqJs5KyTQJyMQmzkr2YwnIbyfOSqC2CcjbJs5KADQCADvXCciBSc5K7pcJyEBKzkpTbwnIQkbOSm2tCcgZRc5KyrUJyERHzko71wnIgUnOSgB8AgCvdAnIojnOSgomCsi9Ns5K%2Bt4JyDM2zkoM0AnIUjXOShUdCsiRM85KqiAKyEoxzkonDgrInC%2FOSkOjCchjL85KUZcJyC0uzkoIVQnIkS7OSjNcCcgDMc5K7pQJyJEzzkqUtAnIuTTOSgxSCcjfNs5Kr3QJyKI5zkoAlAIAYSUHyHYlzkpWhQbIGifOSp9JBsgpJc5K%2BKsFyMokzkrfFwXIbibOSjilBMjGIs5KM1EFyBIezkp%2FlATIMBrOSseDBMiAF85Kmf0EyJcUzkqhiwXI6RLOSr0GBsh0Ec5KHLUGyLUQzkpG5wbIPxPOSuLkBsiTF85KtwgHyGYdzkr%2FzAbI7B3OSmElB8h2Jc5KAGQCAPt4B8itDM5K3pAHyNQRzkox9QfIThHOSgKaCMgpIM5KqGIJyLMizkrSaQnIwiDOSp3CCMj%2BGM5KV6gIyE4WzkoDbwjIvQ%2FOSlv8B8jyDc5KI9YHyI8Lzkr7eAfIrQzOSgBsAgBOwQXIEv%2FNSn2aBchd%2FM1Kjw0FyG%2F5zUoG1gTItvvNSnyeBMgS%2Bs1KFMoEyNf4zUoEgwTId%2FjNSuT0A8gI%2Bs1Kb38EyLD%2FzUqXXgTIKQHOSg%2F4BMjMAc5KDiMFyHYBzkpOwQXIEv%2FNSgBMAgDDJgrINinOSke3CshAKc5KoRULyLYrzkrRQQvIOCrOSuSwC8iXKs5KQLkLyIgnzkrWlQrI0ibOSuAOCsh3I85KwyYKyDYpzkoAbAMA6R8LyOlbzko%2BLgvI%2FWDOSr4YC8gYZc5KedMKyD5lzkrryQrIWWTOSuBUCsjyZM5KCzEKyMdizkrFFgrIgmHOSkirCcjiYc5KyJUJyFFgzkrYXgnIUWDOSvVGCcjDW85K6R8LyOlbzkoARAMARQEKyN5azkr%2F5gnISVfOSlafCcjWUc5KSYAJyEBOzkpqvAjIylDOSj0LCcisWc5Kg1AJyARbzkpFAQrI3lrOSgBsAwBAkwrI9UXOSmxvCsgAQs5KyiEKyGBCzkqACgrIrj7OSogYCsjHO85KWiMKyBk6zkqjJgrIJDfOSvIPCsgkN85Kq3cJyNQ5zkoYjQnIVDzOSgacCciFP85K4eQJyLhIzkpAkwrI9UXOSgCEAwAPlgbIewHOSirUBsj1Bc5KSJEGyP4OzkqDNgbIVhDOSsCFBchtEs5KCHUFyBURzkrv4ATIAhHOSo2zBMimEs5K4sEEyJ4Tzkou2gPIBhjOSis4AsjYE85K%2BwcDyM8Fzkp2yQPImgLOSkMaBcj5As5KkSoGyAT%2FzUoPlgbIewHOSgEMAwBu9gTIkS7OSpunBMjnKc5KHjwEyDUrzkq2vgPIRirOSoy3A8giJs5KqnQDyD4mzkqxbgPIOiTOStVQA8ijJM5KKzQDyIsmzkpXEAPInibOSog8A8iFI85KAS0DyPUizko4fgPIYB%2FOSjooA8jeG85KLQkDyIIdzkpDzALIuBvOSkIpA8iHFs5KnTUCyFQUzkraDQLIVhrOSiL9AcinIc5KEIoCyHUgzkr6mwLI6iHOSqWNAsgBJM5KVP4ByMokzkrG9AHI%2FivOShouAshbK85KJ00CyNkszkrMGQLIPzDOSg3kAciLMM5K%2F%2B8ByLczzkr2IALIfDfOSoKnA8jBM85KbvYEyJEuzkoA7AMA0BoGyCcuzkrAUQbILzLOSln7BsjrNc5KFWAGyJs9zkro2QbIlzvOSjs%2BB8jFP85KHysHyMFCzkp4jQbIp0POShSLBsghSM5K5wQHyM5NzkoTtgbI%2F07OSsdMBsjOTM5KWaoFyBJJzkokVAbIV0bOSnCXBcghQ85KDWoFyHlEzkrm4QTI7ETOSusKBMiqQM5KonEEyD8%2FzkqX0QPIozzOSm90A8g7Pc5KN04DyPc7zkpJwQLIlzvOSj5MAsjMOc5KBiYCyCg4zkr4EQPIqjbOStp3Bch7Lc5KvY8FyMAuzkrQGgbIJy7OSgBEAwBY8AHIOTfOSsu7Ach2L85KInQByEwtzkpcRAHIkC7OShf%2FAMh9Ls5K%2B%2BsAyMY2zkp4VwHIxjbOSljwAcg5N85KAEwDADBKAMhZPM5KnD0AyN44zkp4VwHIHjjOSm4FA8ikPc5K7u8CyGtCzkp3ggHIgj%2FOShf%2FAMh7QM5KwvAAyIY8zkowSgDIWTzOSgB0AwBA1wLIZwPOSpe2A8iH%2B81KyowDyBL6zUo1XgPImPrNSpsKA8gj9M1KUXUCyAHxzUojyAHIlPPNSvVFAcgj9M1KICIByBL6zUp%2B1ADIUv3NSiccAch0AM5KjsQByEEDzkrU3gHIEwTOSkDXAshnA85KAOQDAIRbDsglKs5KK6sMyOQqzkr9AQvIfBzOSjUoC8jQG85KfugLyLIfzkr%2F%2BQzIVhzOSsjPDci%2FHM5KTQoOyDsYzkqr4w7IbBTOSrPdDshAEc5KuQIPyMQQzkpNMQ%2FILxLOSmCgD8gFEM5KEbcPyDYRzkr4SRDIyw%2FOSqM7EMicFM5KdLkPyK0TzkpgoA%2FIJBbOSvL9DsgYFc5KMR4PyC8czkrs2A7Irh3OSoqADshpHM5KZ3MOyBcezkr59w7I6x%2FOSlQrD8imHs5KKU8PyLIfzkqABw%2FIVCXOSoRbDsglKs5KAEwDACCiDMh4Wc5KuE8MyBFazkrxSgzIuVjOSsAeDMivWM5KMhUMyMRUzkrQ4wzIHlLOSkLaDMi9Vc5KL5YMyLNVzkogogzIeFnOSgBMBAD4EwvI3lrOSholCsjxWs5KG%2FoJyMpVzko5twnIPVHOSuSoCciYT85KKBkKyFNOzkrtcwrIAFTOSjO5CshjVs5K%2BBMLyN5azkoArAQAba0JyJREzkrShAnIHz7OSngmCcjBPs5KvxUJyM47zkrvbAnIkzrOShNPCciEN85KefsIyCY4zkpi9gjIzzfOSsDqCMgHN85KqFYIyH45zkp8egjInzvOSnSrCMg0P85KNmAIyP5AzkqRkwjIgUTOSiByCMgtRc5KtXUIyKFGzkrW2AjI4kXOSpH%2FCMhPSM5KFmUJyGBHzkpPYAnIxUXOSm2tCciURM5KADwEAFxCC8iY%2FM1K92oLyOD1zUpGLQrIFv7NSojQCMj0%2F81K9xwJyIkIzkoYqwnIYQLOSlxCC8iY%2FM1KAEQEAMMxC8igWs5KR5cLyA1YzkpeWgvI3VLOSosLC8irUc5KNv0KyOhTzkoclArIOVHOSl1eCshyUc5KwzELyKBazkoALAQAUgYGyE%2F5zUptRAbIFPjNSmj0Bciu9M1K3JQFyLr1zUpSBgbIT%2FnNSgBEBABkxwfISATOSnYPB8iX981KXKYGyJ7nzUqQeAfIh%2BrNSvD7B8iE8s1KK8wHyK75zUoZWQjIdf7NSmTHB8hIBM5KAGwEAAxRDchzl85KfxwNyIKLzkpIywzIu4bOSr4VDMjNgc5Khu8LyIx4zkpwBQvIp3fOSuPQCshxec5KVpwKyA6BzkpZGwrIRInOSm8wC8gTks5K4vsKyBuWzkrd0gvIuJPOSgxRDchzl85KAEQEAB%2B8Dshtcs5KV%2BIOyPd%2Bzkp2dA7IvoPOSuzpDchEf85KzVcOyG58zkrvaA3IhHTOSgj9Dcg7cc5KH7wOyG1yzkoAfAQAFGcLyDTSzUq72QvIi8nNSgu%2FDMgnx81KCEANyLS8zUp5YQ3IfrTNSujYDcjpsM1KslwNyCmmzUq%2BgwvIB6PNSmigC8h2sM1KiAcLyJW2zUrP0wjITb3NSnxvCMjfyM1KAqYJyFbQzUrfvwrIEdTNShRnC8g00s1KADwEAOoEAMglGM5KbJD%2Bx9EdzkrCc%2F7HRBnOSpWf%2FMe2Gc5KCGv8x%2BwXzkptZf7HcRPOSuoEAMglGM5KAFwEAPep%2Bsf%2FHM5KVTX5x68fzkoC0fjHUyHOSs%2F%2B98dAIc5KPnb4x5Aezko43PTHiRrOSlaZ9MfZIc5KQfX3xx4ozkpaifjH0iLOSgy%2F%2B8ctIc5K96n6x%2F8czkoAVAUAt%2FcJyH1LzkpebgnI103OSq1XCcjwS85KPDYJyFlMzkqhDQnIB0nOSh55CcivR85K7pcJyEBKzkqWlAnIvkrOSmrjCcjPSc5Kt%2FcJyH1LzkoBRAUA3k0JyLQ2zkrAkAnI3jPOStNWCcguMc5K3k0JyGsuzkrqlwnI%2FS3OSmRdCci7K85KgsMJyGwqzkqX3AnIVCzOSiQRCsj0K85K5PAJyMQmzkqfYwnIrifOStI5Ccj4Js5KXvAIyCgnzkqD7wjI7SbOSg3fCMiCIs5K%2B4wIyIEhzkq8bAjIaiTOSjcyCMjwJM5KDCsIyEgmzkp50QfI%2FSbOSlbEB8jRKM5KGHkHyPYnzkoKWgfIAyrOSjK3B8i7K85KTsoHyI0szkoIsAfIOy7OStktB8jZLM5K4ScHyMMvzkpSSQfI%2FC%2FOSlJJB8j%2BMM5KH3MHyOswzkq5xgfIbzDOSpzeB8h8Ms5K%2BbsHyLUyzkodyQfIfjPOSiPuB8hFM85KmwkIyEc0zkqlqQjI1DPOSqP%2FCMisN85K3k0JyLQ2zkoALAUAUEQEyKUqzkrKNATIKCLOSvS9A8iTIc5KhcQDyB8qzkpQRATIpSrOSgA0BQCh%2FgTIdC7OSrcTBsgkKs5K8eMFyEgpzkoG1gTIUinOSpixBMjdKc5Kof4EyHQuzkoANAUAkMsKyKcmzkog%2FQrIJSPOSs5tCshUIM5KxM0JyHMhzkpjnArInibOSpDLCsinJs5KAGQFABb5AcguGM5KtZwCyJYJzkpsAwPI4gTOSt%2FOAsjgA85KmmIByGgFzkri5%2F%2FHrwzOSvZDAMitEM5KgPkAyFENzkrMOAHI9g7OSm6GAch3Dc5KybkByMQXzkoW%2BQHILhjOSgA8BQDknwXI%2F%2FvNSsbiBcgh%2Bs1KIe8EyDXxzUoD%2BgPI4vbNSgFQBMiG%2BM1K4OgEyGD4zUrknwXI%2F%2FvNSg%3D%3D";
    window.location.reload();
  }
  
  onShowWolfsonPrizePlan() {
    window.location = "#fb=1289&tb=13165&sb=37013&db=17191&datav1=ACwBACSeCcgTT85KM5IJyIFNzkoUAArI00vOSoUhCsj0Tc5KJJ4JyBNPzkoALAEAdK8EyGopzkpTTATIfyrOSmJABMjZJ85Ki3IEyJQmzkp0rwTIainOSgBcAQCgtgnI2ybOSuuiCcgyJc5Kl2kJyEgkzkqfYwnIriXOSgETCcgWJc5KxBoJyJcjzkon5wjI3SLOSnz1CMjqJs5KyTQJyMQmzkr2YwnIbyfOSqC2CcjbJs5KADQCADvXCciBSc5K7pcJyEBKzkpTbwnIQkbOSm2tCcgZRc5KyrUJyERHzko71wnIgUnOSgB8AgCvdAnIojnOSgomCsi9Ns5K%2Bt4JyDM2zkoM0AnIUjXOShUdCsiRM85KqiAKyEoxzkonDgrInC%2FOSkOjCchjL85KUZcJyC0uzkoIVQnIkS7OSjNcCcgDMc5K7pQJyJEzzkqUtAnIuTTOSgxSCcjfNs5Kr3QJyKI5zkoAlAIAYSUHyHYlzkpWhQbIGifOSp9JBsgpJc5K%2BKsFyMokzkrfFwXIbibOSjilBMjGIs5KM1EFyBIezkp%2FlATIMBrOSseDBMiAF85Kmf0EyJcUzkqhiwXI6RLOSr0GBsh0Ec5KHLUGyLUQzkpG5wbIPxPOSuLkBsiTF85KtwgHyGYdzkr%2FzAbI7B3OSmElB8h2Jc5KAGQCAPt4B8itDM5K3pAHyNQRzkox9QfIThHOSgKaCMgpIM5KqGIJyLMizkrSaQnIwiDOSp3CCMj%2BGM5KV6gIyE4WzkoDbwjIvQ%2FOSlv8B8jyDc5KI9YHyI8Lzkr7eAfIrQzOSgBsAgBOwQXIEv%2FNSn2aBchd%2FM1Kjw0FyG%2F5zUoG1gTItvvNSnyeBMgS%2Bs1KFMoEyNf4zUoEgwTId%2FjNSuT0A8gI%2Bs1Kb38EyLD%2FzUqXXgTIKQHOSg%2F4BMjMAc5KDiMFyHYBzkpOwQXIEv%2FNSgBMAgDDJgrINinOSke3CshAKc5KoRULyLYrzkrRQQvIOCrOSuSwC8iXKs5KQLkLyIgnzkrWlQrI0ibOSuAOCsh3I85KwyYKyDYpzkoAbAMA6R8LyOlbzko%2BLgvI%2FWDOSr4YC8gYZc5KedMKyD5lzkrryQrIWWTOSuBUCsjyZM5KCzEKyMdizkrFFgrIgmHOSkirCcjiYc5KyJUJyFFgzkrYXgnIUWDOSvVGCcjDW85K6R8LyOlbzkoARAMARQEKyN5azkr%2F5gnISVfOSlafCcjWUc5KSYAJyEBOzkpqvAjIylDOSj0LCcisWc5Kg1AJyARbzkpFAQrI3lrOSgBsAwBAkwrI9UXOSmxvCsgAQs5KyiEKyGBCzkqACgrIrj7OSogYCsjHO85KWiMKyBk6zkqjJgrIJDfOSvIPCsgkN85Kq3cJyNQ5zkoYjQnIVDzOSgacCciFP85K4eQJyLhIzkpAkwrI9UXOSgCEAwAPlgbIewHOSirUBsj1Bc5KSJEGyP4OzkqDNgbIVhDOSsCFBchtEs5KCHUFyBURzkrv4ATIAhHOSo2zBMimEs5K4sEEyJ4Tzkou2gPIBhjOSis4AsjYE85K%2BwcDyM8Fzkp2yQPImgLOSkMaBcj5As5KkSoGyAT%2FzUoPlgbIewHOSgEMAwBu9gTIkS7OSpunBMjnKc5KHjwEyDUrzkq2vgPIRirOSoy3A8giJs5KqnQDyD4mzkqxbgPIOiTOStVQA8ijJM5KKzQDyIsmzkpXEAPInibOSog8A8iFI85KAS0DyPUizko4fgPIYB%2FOSjooA8jeG85KLQkDyIIdzkpDzALIuBvOSkIpA8iHFs5KnTUCyFQUzkraDQLIVhrOSiL9AcinIc5KEIoCyHUgzkr6mwLI6iHOSqWNAsgBJM5KVP4ByMokzkrG9AHI%2FivOShouAshbK85KJ00CyNkszkrMGQLIPzDOSg3kAciLMM5K%2F%2B8ByLczzkr2IALIfDfOSoKnA8jBM85KbvYEyJEuzkoA7AMA0BoGyCcuzkrAUQbILzLOSln7BsjrNc5KFWAGyJs9zkro2QbIlzvOSjs%2BB8jFP85KHysHyMFCzkp4jQbIp0POShSLBsghSM5K5wQHyM5NzkoTtgbI%2F07OSsdMBsjOTM5KWaoFyBJJzkokVAbIV0bOSnCXBcghQ85KDWoFyHlEzkrm4QTI7ETOSusKBMiqQM5KonEEyD8%2FzkqX0QPIozzOSm90A8g7Pc5KN04DyPc7zkpJwQLIlzvOSj5MAsjMOc5KBiYCyCg4zkr4EQPIqjbOStp3Bch7Lc5KvY8FyMAuzkrQGgbIJy7OSgBEAwBY8AHIOTfOSsu7Ach2L85KInQByEwtzkpcRAHIkC7OShf%2FAMh9Ls5K%2B%2BsAyMY2zkp4VwHIxjbOSljwAcg5N85KAEwDADBKAMhZPM5KnD0AyN44zkp4VwHIHjjOSm4FA8ikPc5K7u8CyGtCzkp3ggHIgj%2FOShf%2FAMh7QM5KwvAAyIY8zkowSgDIWTzOSgB0AwBA1wLIZwPOSpe2A8iH%2B81KyowDyBL6zUo1XgPImPrNSpsKA8gj9M1KUXUCyAHxzUojyAHIlPPNSvVFAcgj9M1KICIByBL6zUp%2B1ADIUv3NSiccAch0AM5KjsQByEEDzkrU3gHIEwTOSkDXAshnA85KAOQDAIRbDsglKs5KK6sMyOQqzkr9AQvIfBzOSjUoC8jQG85KfugLyLIfzkr%2F%2BQzIVhzOSsjPDci%2FHM5KTQoOyDsYzkqr4w7IbBTOSrPdDshAEc5KuQIPyMQQzkpNMQ%2FILxLOSmCgD8gFEM5KEbcPyDYRzkr4SRDIyw%2FOSqM7EMicFM5KdLkPyK0TzkpgoA%2FIJBbOSvL9DsgYFc5KMR4PyC8czkrs2A7Irh3OSoqADshpHM5KZ3MOyBcezkr59w7I6x%2FOSlQrD8imHs5KKU8PyLIfzkqABw%2FIVCXOSoRbDsglKs5KAEwDACCiDMh4Wc5KuE8MyBFazkrxSgzIuVjOSsAeDMivWM5KMhUMyMRUzkrQ4wzIHlLOSkLaDMi9Vc5KL5YMyLNVzkogogzIeFnOSgBEAwCQ%2FA7Iy37OSiaaD8jBes5K7MkPyP5yzkqZxw%2FI5G7OSr9XDsgdas5K3ukNyHZwzkouzw7I9HHOSpD8DsjLfs5KAKwDAJHRDsgbgc5KOUQPyHeJzkoqLQ3IvIrOSoHlDMhVhs5K9y8MyFSBzkrbHAzIrHjOSuIaC8gPds5KAa0KyIl6zkqxxwnIHIvOSnp2Ccjbi85KXY4JyG%2BFzkohFArIsHrOSgGtCsg5c85K3psLyPdpzkoV7QvI7GjOSpNYDMiMbc5KcEcNyGN1zkqHMQ7IZ3zOSm3IDcgXf85KaXQOyOqEzkqR0Q7IG4HOSgA8AwAjvgnICHzOSrYbCcjwb85KKrwIyPNizkpCUAnINGLOSpMKCsh9Zc5KyYYKyCJxzkojvgnICHzOSgA8AwBMPgzIbV3OSh3ACsh9b85KdU0KyKNlzkrFMgvIVmXOSqhKC8gVXM5Kl6wLyLlYzkpMPgzIbV3OSgDcAwByZQXIg0rOSgWYBMjuUM5KxDwEyJ1ZzkojnQLIH1jOSkysAMioUM5KN7L%2BxwtJzkqcO%2FzHSz7OSma%2F%2B8eAMs5K9nL7x5YqzkqX5vvHWiLOSmDB%2FMflHc5KUBr%2Bx0cdzkpQGv7Hqh%2FOSrwS%2F8c0Is5KShz%2Fx1YlzkrmlADIqynOSvupAcheKc5KbMsByPMszko5zgDIsy3OSjnOAMhbNs5Kdx0AyLM3zkqTMADIrD3OSlQMAchzQs5KUY0ByGdBzkq6BgPIikTOSptJA8i3Ps5KcmUFyINKzkoAfAMARnsCyGjvzUqkMQHIsfLNSv2TAMgk%2Fc1KaYwByNwDzkqQ2f%2FH4ArOSl%2Bx%2FsfU%2F81KJeH%2Bx%2FL7zUoTIP3H0PjNSn1u%2FsdF7M1KcF8AyATjzUq5RgLIb9%2FNSpPhA8hr4s1KG8IEyOrtzUp5eAPIVfTNSkZ7Asho781KAFQDADmMDchU4M1KyT8NyL3IzUrPPQzIusvNSgu4C8gW1M1K2o8KyF%2FXzUqxDwjI78nNSkfBBsgx081K7zMHyNnbzUrAJgrI%2FejNSjmMDchU4M1KAEwEAPgTC8jeWs5KGiUKyPFazkob%2BgnIylXOSjm3Ccg9Uc5K5KgJyJhPzkooGQrIU07OSu1zCsgAVM5KM7kKyGNWzkr4EwvI3lrOSgCsBABtrQnIlETOStKECcgfPs5KeCYJyME%2Bzkq%2FFQnIzjvOSu9sCciTOs5KE08JyIQ3zkp5%2BwjIJjjOSmL2CMjPN85KwOoIyAc3zkqoVgjIfjnOSnx6CMifO85KdKsIyDQ%2Fzko2YAjI%2FkDOSpGTCMiBRM5KIHIIyC1Fzkq1dQjIoUbOStbYCMjiRc5Kkf8IyE9IzkoWZQnIYEfOSk9gCcjFRc5Kba0JyJREzkoAPAQAXEILyJj8zUr3agvI4PXNSkYtCsgW%2Fs1KiNAIyPT%2FzUr3HAnIiQjOShirCchhAs5KXEILyJj8zUoARAQAwzELyKBazkpHlwvIDVjOSl5aC8jdUs5KiwsLyKtRzko2%2FQrI6FPOShyUCsg5Uc5KXV4KyHJRzkrDMQvIoFrOSgAsBABSBgbIT%2FnNSm1EBsgU%2BM1KaPQFyK70zUrclAXIuvXNSlIGBshP%2Bc1KAEQEAGTHB8hIBM5Kdg8HyJf3zUpcpgbInufNSpB4B8iH6s1K8PsHyITyzUorzAfIrvnNShlZCMh1%2Fs1KZMcHyEgEzkoAbAQADFENyHOXzkp%2FHA3IgovOSkjLDMi7hs5KvhUMyM2BzkqG7wvIjHjOSnAFC8ind85K49AKyHF5zkpWnArIDoHOSlkbCshEic5KbzALyBOSzkri%2BwrIG5bOSt3SC8i4k85KDFENyHOXzkoATAQAH7wOyG1yzkpX4g7I937OSnZ0Dsi%2Bg85K7OkNyER%2FzkrNVw7IbnzOSmpGDsjbe85K72gNyIR0zkoI%2FQ3IO3HOSh%2B8Dshtcs5KAIQEABRnC8g00s1Ku9kLyIvJzUoLvwzIJ8fNSghADci0vM1KeWENyH60zUro2A3I6bDNSrJcDcgpps1KvoMLyAejzUpooAvIdrDNSogHC8iVts1Kz9MIyE29zUqTtwjIj8DNSj1vCMi9yM1KAqYJyFbQzUrfvwrIEdTNShRnC8g00s1KADwEAOoEAMglGM5KbJD%2Bx9EdzkrCc%2F7HRBnOSpWf%2FMe2Gc5KCGv8x%2BwXzkptZf7HcRPOSuoEAMglGM5KAFwEAPep%2Bsf%2FHM5KVTX5x68fzkoC0fjHUyHOSs%2F%2B98dAIc5KPnb4x5Aezko43PTHiRrOSlaZ9MfZIc5KQfX3xx4ozkpaifjH0iLOSgy%2F%2B8ctIc5K96n6x%2F8czkoAVAUAt%2FcJyH1LzkpebgnI103OSq1XCcjwS85KPDYJyFlMzkqhDQnIB0nOSh55CcivR85K7pcJyEBKzkqWlAnIvkrOSmrjCcjPSc5Kt%2FcJyH1LzkoBRAUA3k0JyLQ2zkrAkAnI3jPOStNWCcguMc5K3k0JyGsuzkrqlwnI%2FS3OSmRdCci7K85KgsMJyGwqzkqX3AnIVCzOSiQRCsj0K85K5PAJyMQmzkqfYwnIrifOStI5Ccj4Js5KXvAIyCgnzkqD7wjI7SbOSg3fCMiCIs5K%2B4wIyIEhzkq8bAjIaiTOSjcyCMjwJM5KDCsIyEgmzkp50QfI%2FSbOSlbEB8jRKM5KGHkHyPYnzkoKWgfIAyrOSjK3B8i7K85KTsoHyI0szkoIsAfIOy7OStktB8jZLM5K4ScHyMMvzkpSSQfI%2FC%2FOSlJJB8j%2BMM5KH3MHyOswzkq5xgfIbzDOSpzeB8h8Ms5K%2BbsHyLUyzkodyQfIfjPOSiPuB8hFM85KmwkIyEc0zkqlqQjI1DPOSqP%2FCMisN85K3k0JyLQ2zkoALAUAUEQEyKUqzkrKNATIKCLOSvS9A8iTIc5KhcQDyB8qzkpQRATIpSrOSgA0BQCh%2FgTIdC7OSrcTBsgkKs5K8eMFyEgpzkoG1gTIUinOSpixBMjdKc5Kof4EyHQuzkoANAUAkMsKyKcmzkog%2FQrIJSPOSs5tCshUIM5KxM0JyHMhzkpjnArInibOSpDLCsinJs5KAGQFABb5AcguGM5KtZwCyJYJzkpsAwPI4gTOSt%2FOAsjgA85KmmIByGgFzkri5%2F%2FHrwzOSvZDAMitEM5KgPkAyFENzkrMOAHI9g7OSm6GAch3Dc5KybkByMQXzkoW%2BQHILhjOSgA8BQDknwXI%2F%2FvNSsbiBcgh%2Bs1KIe8EyDXxzUoD%2BgPI4vbNSgFQBMiG%2BM1K4OgEyGD4zUrknwXI%2F%2FvNSg%3D%3D";
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
