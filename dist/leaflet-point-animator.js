(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['leaflet-point-animator'] = factory());
}(this, (function () { 'use strict';

  /*
   Generic  Canvas Layer for leaflet 0.7 and 1.0-rc,
   copyright Stanislav Sumbera,  2016 , sumbera.com , license MIT
   originally created and motivated by L.CanvasOverlay  available here: https://gist.github.com/Sumbera/11114288

   */
  // -- L.DomUtil.setTransform from leaflet 1.0.0 to work on 0.0.7
  //------------------------------------------------------------------------------
  if (!L.DomUtil.setTransform) {
    L.DomUtil.setTransform = function (el, offset, scale) {
      var pos = offset || new L.Point(0, 0);
      el.style[L.DomUtil.TRANSFORM] = (L.Browser.ie3d ? "translate(" + pos.x + "px," + pos.y + "px)" : "translate3d(" + pos.x + "px," + pos.y + "px,0)") + (scale ? " scale(" + scale + ")" : "");
    };
  } // -- support for both  0.0.7 and 1.0.0 rc2 leaflet


  L.CanvasLayer = (L.Layer ? L.Layer : L.Class).extend({
    // -- initialized is called on prototype
    initialize: function (options) {
      this._map = null;
      this._canvas = null;
      this._frame = null;
      this._delegate = null;
      L.setOptions(this, options);
    },
    delegate: function (del) {
      this._delegate = del;
      return this;
    },
    needRedraw: function () {
      if (!this._frame) {
        this._frame = L.Util.requestAnimFrame(this.drawLayer, this);
      }

      return this;
    },
    //-------------------------------------------------------------
    _onLayerDidResize: function (resizeEvent) {
      this._canvas.width = resizeEvent.newSize.x;
      this._canvas.height = resizeEvent.newSize.y;
    },
    //-------------------------------------------------------------
    _onLayerDidMove: function () {
      var topLeft = this._map.containerPointToLayerPoint([0, 0]);

      L.DomUtil.setPosition(this._canvas, topLeft);
      this.drawLayer();
    },
    //-------------------------------------------------------------
    getEvents: function () {
      var events = {
        resize: this._onLayerDidResize,
        moveend: this._onLayerDidMove
      };

      if (this._map.options.zoomAnimation && L.Browser.any3d) {
        events.zoomanim = this._animateZoom;
      }

      return events;
    },
    //-------------------------------------------------------------
    onAdd: function (map) {
      this._map = map;
      this._canvas = L.DomUtil.create("canvas", "leaflet-layer");
      this.tiles = {};

      var size = this._map.getSize();

      this._canvas.width = size.x;
      this._canvas.height = size.y;
      var animated = this._map.options.zoomAnimation && L.Browser.any3d;
      L.DomUtil.addClass(this._canvas, "leaflet-zoom-" + (animated ? "animated" : "hide"));
      this.options.pane.appendChild(this._canvas);
      map.on(this.getEvents(), this);
      var del = this._delegate || this;
      del.onLayerDidMount && del.onLayerDidMount(); // -- callback

      this.needRedraw();
      var self = this;
      setTimeout(function () {
        self._onLayerDidMove();
      }, 0);
    },
    //-------------------------------------------------------------
    onRemove: function (map) {
      var del = this._delegate || this;
      del.onLayerWillUnmount && del.onLayerWillUnmount(); // -- callback

      this.options.pane.removeChild(this._canvas);
      map.off(this.getEvents(), this);
      this._canvas = null;
    },
    //------------------------------------------------------------
    addTo: function (map) {
      map.addLayer(this);
      return this;
    },
    //------------------------------------------------------------------------------
    drawLayer: function () {
      // -- todo make the viewInfo properties  flat objects.
      var size = this._map.getSize();

      var bounds = this._map.getBounds();

      var zoom = this._map.getZoom();

      var center = this._map.options.crs.project(this._map.getCenter());

      var corner = this._map.options.crs.project(this._map.containerPointToLatLng(this._map.getSize()));

      var del = this._delegate || this;
      del.onDrawLayer && del.onDrawLayer({
        layer: this,
        canvas: this._canvas,
        bounds: bounds,
        size: size,
        zoom: zoom,
        center: center,
        corner: corner
      });
      this._frame = null;
    },
    // -- L.DomUtil.setTransform from leaflet 1.0.0 to work on 0.0.7
    //------------------------------------------------------------------------------
    _setTransform: function (el, offset, scale) {
      var pos = offset || new L.Point(0, 0);
      el.style[L.DomUtil.TRANSFORM] = (L.Browser.ie3d ? "translate(" + pos.x + "px," + pos.y + "px)" : "translate3d(" + pos.x + "px," + pos.y + "px,0)") + (scale ? " scale(" + scale + ")" : "");
    },
    //------------------------------------------------------------------------------
    _animateZoom: function (e) {
      var scale = this._map.getZoomScale(e.zoom); // -- different calc of offset in leaflet 1.0.0 and 0.0.7 thanks for 1.0.0-rc2 calc @jduggan1


      var offset = L.Layer ? this._map._latLngToNewLayerPoint(this._map.getBounds().getNorthWest(), e.zoom, e.center) : this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
      L.DomUtil.setTransform(this._canvas, offset, scale);
    }
  });

  L.canvasLayer = function (pane) {
    return new L.CanvasLayer(pane);
  };

  var WorkerClass = null;

  try {
      var WorkerThreads =
          typeof module !== 'undefined' && typeof module.require === 'function' && module.require('worker_threads') ||
          typeof __non_webpack_require__ === 'function' && __non_webpack_require__('worker_threads') ||
          typeof require === 'function' && require('worker_threads');
      WorkerClass = WorkerThreads.Worker;
  } catch(e) {} // eslint-disable-line

  function createURLWorkerFactory(url) {
      return function WorkerFactory(options) {
          return new WorkerClass(url, options);
      };
  }

  function createURLWorkerFactory$1(url) {
      return function WorkerFactory(options) {
          return new Worker(url, options);
      };
  }

  var kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';

  function isNodeJS() {
      return kIsNodeJS;
  }

  function createURLWorkerFactory$2(url) {
      if (isNodeJS()) {
          return createURLWorkerFactory(url);
      }
      return createURLWorkerFactory$1(url);
  }

  var WorkerFactory = createURLWorkerFactory$2('/dist/web-worker-0.js');
  /* eslint-enable */

  const PointAnimatorLayer = L.Layer.extend({
    /*------------------------------------ LEAFLET SPECIFIC ------------------------------------------*/
    _active: false,
    _map: null,
    _renderer: null,
    // the DOM leaflet-pane that contains our layer
    _pane: null,
    _paneName: 'overlayPane',
    // must be set explicitly by user
    _frameKey: null,
    // user options
    options: {
      features: []
    },
    initialize: function (options) {
      L.setOptions(this, options);
    },

    /**
     * @param map {Object} Leaflet map
     */
    onAdd: function (map) {
      this._active = true;
      this._map = map;
      this._timeKey = this.options.timeKey || 'time';

      if (!this.options.keyframes && this.options.features) {
        this._computeKeyframes();
      } else if (this.options.keyframes) {
        this._keyframes = this.options.keyframes;
        this._times = Object.keys(this._keyframes);
        if (this.options.onKeyframesReady) this.options.onKeyframesReady();
      } else {
        console.error('No features or keyframes provided.');
      }

      this._setPane(); // create canvas, add to map pane	


      this._canvasLayer = L.canvasLayer({
        pane: this._pane
      }).delegate(this);

      this._canvasLayer.addTo(map);

      this._canvas = this._canvasLayer._canvas; // this._context = this._canvas.getContext("2d");
      // callback

      if (this.options.onAdd) this.options.onAdd();
    },

    /**
     * Remove the pane from DOM, and void pane when layer removed from map
     */
    onRemove() {
      console.log('onRemove', this.options);
      this._active = false;

      this._map.removeLayer(this._canvasLayer);

      if (this.options.onRemove) this.options.onRemove();
    },

    /**
     * See: https://github.com/Sumbera/gLayers.Leaflet
     * @param {object} info 
     * @param {object} info.bounds
     * @param {object} info.canvas
     * @param {object} info.center
     * @param {object} info.corner
     * @param {object} info.layer
     * @param {object} info.size
     * @param {number} info.zoom
     */
    onDrawLayer(info) {
      var ctx = info.canvas.getContext('2d'); // clear entire canvas

      ctx.clearRect(0, 0, info.canvas.width, info.canvas.height);
      if (!this._frameKey) return false; // get features for keyframe

      const frameFeatures = this._keyframes[this._frameKey];
      let radius = 5; // draw each point on canvas

      for (var i = 0; i < frameFeatures.length; i++) {
        var feature = frameFeatures[i];
        const coords = feature.geometry.coordinates;

        if (info.bounds.contains([coords[1], coords[0]])) {
          // TODO - more styles
          if (this.options.style) {
            const style = this.options.style(feature);
            if (style.fillColor) ctx.fillStyle = style.fillColor;
            if (style.color) ctx.strokeStyle = style.color;
            if (style.radius) radius = style.radius;
          }

          const dot = info.layer._map.latLngToContainerPoint([coords[1], coords[0]]);

          ctx.beginPath();
          ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.closePath();
        }
      }
    },

    /*------------------------------------ PUBLIC ------------------------------------------*/

    /**
     * check if the particle layer is currently active on the map
     * @returns {boolean}
     */
    isActive() {
      return this._active;
    },

    /**
     * Get ascending array of available frame keys
     * @returns {array} the keyframe time ISO strings
     */
    getFrameKeys() {
      return this._times.slice();
    },

    /**
     * Display the frame at the given frame key
     * @param key {string} the keyframe time
     */
    setFrame(key) {
      if (!this.isActive()) return; // set new if we have target

      this._frameKey = key;
      const nextFrame = this._keyframes[this._frameKey]; // inf invalid, clear the canvas without redraw

      if (!nextFrame) {
        this.clearCanvas();
        return false;
      }

      this.redraw();
    },

    /**
     * Wipe the canvas clean
     */
    clearCanvas() {
      if (this._canvas) {
        const ctx = this._canvas.getContext('2d');

        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      }
    },

    /**
     * Trigger a redraw of the canvas layer
     */
    redraw() {
      if (this.isActive() && this._canvasLayer) this._canvasLayer.needRedraw();
    },

    /*------------------------------------ PRIVATE ------------------------------------------*/

    /**
     * Kick off worker job/s to compute keyframes from features.
     */
    _computeKeyframes() {
      const numWorkers = this.options.numWorkers || window.navigator.hardwareConcurrency; // TODO - will this	be portable??
      // let url = new URL("dist/L.KeyframeWorker.js", window.location.origin);
      // var worker = new Worker('/dist/L.KeyframeWorker.js');
      // var worker = new Worker(url);

      const worker = new WorkerFactory();
      worker.postMessage({
        job: 'MAIN',
        features: this.options.features,
        timeKey: this._timeKey,
        numWorkers
      });

      worker.onmessage = e => {
        this._keyframes = e.data.keyframes;
        console.log('this._keyframes', this._keyframes);
        this._times = Object.keys(this._keyframes);

        if (this.options.onKeyframesReady) {
          this.options.onKeyframesReady();
        }
      };
    },

    /**
     * Create custom pane if necessary
     * @private
     */
    _setPane() {
      // determine where to add the layer
      this._paneName = this.options.paneName || 'overlayPane'; // fall back to overlayPane for leaflet < 1

      let pane = this._map._panes.overlayPane;

      if (this._map.getPane) {
        // attempt to get pane first to preserve parent (createPane voids this)
        pane = this._map.getPane(this._paneName);

        if (!pane) {
          pane = this._map.createPane(this._paneName);
        }
      }

      this._pane = pane;
    }

  });

  L.pointAnimatorLayer = function (options) {
    return new PointAnimatorLayer(options);
  };

  var L_PointAnimatorLayer = L.pointAnimatorLayer;

  return L_PointAnimatorLayer;

})));
//# sourceMappingURL=leaflet-point-animator.js.map
