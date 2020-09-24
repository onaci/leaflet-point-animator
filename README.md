# leaflet-point-animator [![NPM version][npm-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url]

**ALPHA** plugin to animate large number of GeoJSON points.


e.g. scrubbing through 60MB of GeoJSON:
![Screenshot](/screenshots/keyframes.gif?raw=true)


## install
```shell
npm install leaflet-point-animator --save
```

## use

Most importantly - point features can either be provided as:
1. Standard GeoJSON spec array of point features (slower)
  - this is slower as features must be reprocessed into keyframes; however
  - will use a web worker to avoid blocking main thread
2. Pre-formatted keyframes (faster)
  - an object where keys are ISO timestrings of the keyframes, and values are arrays of GeoJSON point features 
  - see [demo](https://onaci.github.io/leaflet-point-animator/) for concrete example

```javascript
const pointAnimatorLayer = L.pointAnimatorLayer({
  
  // Create keyframes from raw GeoJSON features
  features: [
    {} // flat array of GeoJSON features
  ],

  // OR -> pre-formatted keyframes
  keyframes: { 
    '<ISO_TIME>': [], // array of GeoJSON point features for this keyframe 
  },

  // which property to use for time (expects ISO 8601 string)
  timeKey: "time",
  
  style(feature) {
    return {
      // do custom styling things
      fillColor: color(feature.properties.age),
      stroke: false,
      radius: 5
    }
  },

  // OPTIONAL - supply the name of a custom pane,
  // will be created if doesn't exist, defaults to overlayPane
  // https://leafletjs.com/reference-1.6.0.html#map-pane
  paneName: 'myCustomPane',
  
  // OPTIONAL - callback to be notified when keyframes ready for use
  onKeyframesReady() {
    // DEMO - get a list of frame keys, and set first frame active
    const frameKeys = pointAnimatorLayer.getFrameKeys();
    pointAnimatorLayer.setFrame(frameKeys[0]);
  },

  // OPTIONAL - callbacks when layer is added/removed from map
  onAdd: function(){},
  onRemove: function(){},
});
```

## public methods

|method|params|description|
|---|---|---|
|`isActive`||check if the layer is currently active on the map|
|`getFrame`||Get the current frame time (-1 if not set)|
|`getFrameKeys`||Get an ascending array of all ISO times (can then be used to call `setFrame`)|
|`setFrame`|`time: {string}`|display the features at the given ISO time (if calling from something like a range slider, recommended to throttle - see demo). 
|`clearCanvas`||Clears canvas of any points|
|`redraw`||Trigger a redraw of the canvas|


## development
```shell
npm install 
npm run build
```

## thanks
- https://github.com/Sumbera/gLayers.Leaflet

[npm-image]: https://badge.fury.io/js/leaflet-point-animator.svg
[npm-url]: https://www.npmjs.com/package/leaflet-point-animator
[npm-downloads-image]: https://img.shields.io/npm/dt/leaflet-point-animator.svg