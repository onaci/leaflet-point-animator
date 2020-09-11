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

  function decodeBase64(base64, enableUnicode) {
      return Buffer.from(base64, 'base64').toString(enableUnicode ? 'utf16' : 'utf8');
  }

  function createBase64WorkerFactory(base64, sourcemapArg, enableUnicodeArg) {
      var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
      var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
      var source = decodeBase64(base64, enableUnicode);
      var start = source.indexOf('\n', 10) + 1;
      var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
      return function WorkerFactory(options) {
          return new WorkerClass(body, Object.assign({}, options, { eval: true }));
      };
  }

  function decodeBase64$1(base64, enableUnicode) {
      var binaryString = atob(base64);
      if (enableUnicode) {
          var binaryView = new Uint8Array(binaryString.length);
          for (var i = 0, n = binaryString.length; i < n; ++i) {
              binaryView[i] = binaryString.charCodeAt(i);
          }
          return String.fromCharCode.apply(null, new Uint16Array(binaryView.buffer));
      }
      return binaryString;
  }

  function createURL(base64, sourcemapArg, enableUnicodeArg) {
      var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
      var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
      var source = decodeBase64$1(base64, enableUnicode);
      var start = source.indexOf('\n', 10) + 1;
      var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
      var blob = new Blob([body], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
  }

  function createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg) {
      var url;
      return function WorkerFactory(options) {
          url = url || createURL(base64, sourcemapArg, enableUnicodeArg);
          return new Worker(url, options);
      };
  }

  var kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';

  function isNodeJS() {
      return kIsNodeJS;
  }

  function createBase64WorkerFactory$2(base64, sourcemapArg, enableUnicodeArg) {
      if (isNodeJS()) {
          return createBase64WorkerFactory(base64, sourcemapArg, enableUnicodeArg);
      }
      return createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg);
  }

  var WorkerFactory = createBase64WorkerFactory$2('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwovKioKICogVHJhbmZvcm0gYW4gYXJyYXkgb2YgcG9pbnRzIGludG8gYW4gCiAqIG9iamVjdCBvZiBrZXlmcmFtZXMgZ3JvdXBlZCBieSB1bmlxIHRpbWVzCiAqLwoKb25tZXNzYWdlID0gZnVuY3Rpb24gKGUpIHsKICBjb25zdCB0aW1lS2V5ID0gZS5kYXRhLnRpbWVLZXk7CiAgY29uc3QgZmVhdHVyZXMgPSBlLmRhdGEuZmVhdHVyZXM7IC8vIGdldCBzb3J0ZWQgbGlzdCBvZiBkYXRlcwoKICBjb25zdCBkYXRlcyA9IGZlYXR1cmVzLm1hcChmID0+IG5ldyBEYXRlKGYucHJvcGVydGllc1t0aW1lS2V5XSkpLnNvcnQoKGEsIGIpID0+IGEgLSBiKTsgLy8gdW5pcSBsaXN0IG9mIElTTyBzdHJpbmdzCgogIHRpbWVzID0gWy4uLm5ldyBTZXQoZGF0ZXMubWFwKGQgPT4gZC50b0lTT1N0cmluZygpKSldOwogIGNvbnN0IGtleWZyYW1lcyA9IHt9OwogIHRpbWVzLmZvckVhY2godGltZSA9PiB7CiAgICBjb25zdCBzbGljZWRGZWF0dXJlcyA9IGZlYXR1cmVzLmZpbHRlcihmID0+IGYucHJvcGVydGllc1t0aW1lS2V5XSA9PT0gdGltZSk7CiAgICBrZXlmcmFtZXNbdGltZV0gPSBzbGljZWRGZWF0dXJlczsKICB9KTsKICBwb3N0TWVzc2FnZSh7CiAgICBrZXlmcmFtZXMKICB9KTsKfTsKCg==', 'data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtV29ya2VyLmpzIiwic291cmNlcyI6WyJ3b3JrZXI6Ly93ZWItd29ya2VyL3RyYW5zZm9ybVdvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qKlxuICogVHJhbmZvcm0gYW4gYXJyYXkgb2YgcG9pbnRzIGludG8gYW4gXG4gKiBvYmplY3Qgb2Yga2V5ZnJhbWVzIGdyb3VwZWQgYnkgdW5pcSB0aW1lc1xuICovXG5cbmxldCBydW5uaW5nID0gMDtcbmxldCBrZXlmcmFtZUFycmF5ID0gW107XG5cbm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcblxuICBjb25zdCB0aW1lS2V5ID0gZS5kYXRhLnRpbWVLZXk7XG4gIGNvbnN0IGZlYXR1cmVzID0gZS5kYXRhLmZlYXR1cmVzO1xuXG4gIC8vIGdldCBzb3J0ZWQgbGlzdCBvZiBkYXRlc1xuICBjb25zdCBkYXRlcyA9IGZlYXR1cmVzLm1hcChmID0+IG5ldyBEYXRlKGYucHJvcGVydGllc1t0aW1lS2V5XSkpLnNvcnQoKGEsYikgPT4gYSAtIGIgKTtcblx0XHRcbiAgLy8gdW5pcSBsaXN0IG9mIElTTyBzdHJpbmdzXG4gIHRpbWVzID0gWy4uLm5ldyBTZXQoZGF0ZXMubWFwKGQgPT4gZC50b0lTT1N0cmluZygpKSldOyBcblxuICBjb25zdCBrZXlmcmFtZXMgPSB7fTtcbiAgdGltZXMuZm9yRWFjaCh0aW1lID0+IHtcbiAgICBjb25zdCBzbGljZWRGZWF0dXJlcyA9IGZlYXR1cmVzLmZpbHRlcihmID0+IGYucHJvcGVydGllc1t0aW1lS2V5XSA9PT0gdGltZSk7XG4gICAga2V5ZnJhbWVzW3RpbWVdID0gc2xpY2VkRmVhdHVyZXM7XG4gIH0pO1xuICBcbiAgcG9zdE1lc3NhZ2UoeyBrZXlmcmFtZXMgfSk7XG59XG5cbiJdLCJuYW1lcyI6WyJvbm1lc3NhZ2UiLCJlIiwidGltZUtleSIsImRhdGEiLCJmZWF0dXJlcyIsImRhdGVzIiwibWFwIiwiZiIsIkRhdGUiLCJwcm9wZXJ0aWVzIiwic29ydCIsImEiLCJiIiwidGltZXMiLCJTZXQiLCJkIiwidG9JU09TdHJpbmciLCJrZXlmcmFtZXMiLCJmb3JFYWNoIiwidGltZSIsInNsaWNlZEZlYXR1cmVzIiwiZmlsdGVyIiwicG9zdE1lc3NhZ2UiXSwibWFwcGluZ3MiOiJBQUNBOzs7OztBQVFBQSxTQUFTLEdBQUcsVUFBU0MsQ0FBVCxFQUFZO0FBRXRCLFFBQU1DLE9BQU8sR0FBR0QsQ0FBQyxDQUFDRSxJQUFGLENBQU9ELE9BQXZCO0FBQ0EsUUFBTUUsUUFBUSxHQUFHSCxDQUFDLENBQUNFLElBQUYsQ0FBT0MsUUFBeEIsQ0FIc0I7O0FBTXRCLFFBQU1DLEtBQUssR0FBR0QsUUFBUSxDQUFDRSxHQUFULENBQWFDLENBQUMsSUFBSSxJQUFJQyxJQUFKLENBQVNELENBQUMsQ0FBQ0UsVUFBRixDQUFhUCxPQUFiLENBQVQsQ0FBbEIsRUFBbURRLElBQW5ELENBQXdELENBQUNDLENBQUQsRUFBR0MsQ0FBSCxLQUFTRCxDQUFDLEdBQUdDLENBQXJFLENBQWQsQ0FOc0I7O0FBU3RCQyxFQUFBQSxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUlDLEdBQUosQ0FBUVQsS0FBSyxDQUFDQyxHQUFOLENBQVVTLENBQUMsSUFBSUEsQ0FBQyxDQUFDQyxXQUFGLEVBQWYsQ0FBUixDQUFKLENBQVI7QUFFQSxRQUFNQyxTQUFTLEdBQUcsRUFBbEI7QUFDQUosRUFBQUEsS0FBSyxDQUFDSyxPQUFOLENBQWNDLElBQUksSUFBSTtBQUNwQixVQUFNQyxjQUFjLEdBQUdoQixRQUFRLENBQUNpQixNQUFULENBQWdCZCxDQUFDLElBQUlBLENBQUMsQ0FBQ0UsVUFBRixDQUFhUCxPQUFiLE1BQTBCaUIsSUFBL0MsQ0FBdkI7QUFDQUYsSUFBQUEsU0FBUyxDQUFDRSxJQUFELENBQVQsR0FBa0JDLGNBQWxCO0FBQ0QsR0FIRDtBQUtBRSxFQUFBQSxXQUFXLENBQUM7QUFBRUwsSUFBQUE7QUFBRixHQUFELENBQVg7QUFDRCxDQWxCRCJ9', false);
  /* eslint-enable */

  var WorkerFactory$1 = createBase64WorkerFactory$2('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwpvbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZSkgewogIGNvbnN0IGtleWZyYW1lQXJyYXkgPSBlLmRhdGEua2V5ZnJhbWVBcnJheTsKICBjb25zdCBrZXlmcmFtZXMgPSB7fTsKICBrZXlmcmFtZUFycmF5LmZvckVhY2goayA9PiB7CiAgICBjb25zdCB0aW1lcyA9IE9iamVjdC5rZXlzKGspOwogICAgdGltZXMuZm9yRWFjaCh0aW1lID0+IHsKICAgICAgaWYgKCFrZXlmcmFtZXNbdGltZV0pIHsKICAgICAgICBrZXlmcmFtZXNbdGltZV0gPSBrW3RpbWVdOwogICAgICB9IGVsc2UgewogICAgICAgIGtleWZyYW1lc1t0aW1lXSA9IGtleWZyYW1lc1t0aW1lXS5jb25jYXQoa1t0aW1lXSk7CiAgICAgIH0KICAgIH0pOwogIH0pOwogIHBvc3RNZXNzYWdlKHsKICAgIGtleWZyYW1lcwogIH0pOwp9OwoK', 'data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VXb3JrZXIuanMiLCJzb3VyY2VzIjpbIndvcmtlcjovL3dlYi13b3JrZXIvbWVyZ2VXb3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG4gIGNvbnN0IGtleWZyYW1lQXJyYXkgPSBlLmRhdGEua2V5ZnJhbWVBcnJheTtcbiAgY29uc3Qga2V5ZnJhbWVzID0ge307XG4gIGtleWZyYW1lQXJyYXkuZm9yRWFjaChrID0+IHtcbiAgICBjb25zdCB0aW1lcyA9IE9iamVjdC5rZXlzKGspO1xuICAgIHRpbWVzLmZvckVhY2godGltZSA9PiB7XG4gICAgICBpZigha2V5ZnJhbWVzW3RpbWVdKSB7XG4gICAgICAgIGtleWZyYW1lc1t0aW1lXSA9IGtbdGltZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrZXlmcmFtZXNbdGltZV0gPSBrZXlmcmFtZXNbdGltZV0uY29uY2F0KGtbdGltZV0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuXG4gIHBvc3RNZXNzYWdlKHsga2V5ZnJhbWVzIH0pO1xufVxuXG4iXSwibmFtZXMiOlsib25tZXNzYWdlIiwiZSIsImtleWZyYW1lQXJyYXkiLCJkYXRhIiwia2V5ZnJhbWVzIiwiZm9yRWFjaCIsImsiLCJ0aW1lcyIsIk9iamVjdCIsImtleXMiLCJ0aW1lIiwiY29uY2F0IiwicG9zdE1lc3NhZ2UiXSwibWFwcGluZ3MiOiJBQUNBQSxTQUFTLEdBQUcsVUFBU0MsQ0FBVCxFQUFZO0FBQ3RCLFFBQU1DLGFBQWEsR0FBR0QsQ0FBQyxDQUFDRSxJQUFGLENBQU9ELGFBQTdCO0FBQ0EsUUFBTUUsU0FBUyxHQUFHLEVBQWxCO0FBQ0FGLEVBQUFBLGFBQWEsQ0FBQ0csT0FBZCxDQUFzQkMsQ0FBQyxJQUFJO0FBQ3pCLFVBQU1DLEtBQUssR0FBR0MsTUFBTSxDQUFDQyxJQUFQLENBQVlILENBQVosQ0FBZDtBQUNBQyxJQUFBQSxLQUFLLENBQUNGLE9BQU4sQ0FBY0ssSUFBSSxJQUFJO0FBQ3BCLFVBQUcsQ0FBQ04sU0FBUyxDQUFDTSxJQUFELENBQWIsRUFBcUI7QUFDbkJOLFFBQUFBLFNBQVMsQ0FBQ00sSUFBRCxDQUFULEdBQWtCSixDQUFDLENBQUNJLElBQUQsQ0FBbkI7QUFDRCxPQUZELE1BRU87QUFDTE4sUUFBQUEsU0FBUyxDQUFDTSxJQUFELENBQVQsR0FBa0JOLFNBQVMsQ0FBQ00sSUFBRCxDQUFULENBQWdCQyxNQUFoQixDQUF1QkwsQ0FBQyxDQUFDSSxJQUFELENBQXhCLENBQWxCO0FBQ0Q7QUFDRixLQU5EO0FBT0QsR0FURDtBQVdBRSxFQUFBQSxXQUFXLENBQUM7QUFBRVIsSUFBQUE7QUFBRixHQUFELENBQVg7QUFDRCxDQWZEIn0=', false);
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

      this._canvas = this._canvasLayer._canvas; // callback

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
      if (!this._frameKey || !this._keyframes) return false; // get features for keyframe

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
      if (!this.isActive() || !this._keyframes) return; // set new if we have target

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
      const numWorkers = this.options.numWorkers || window.navigator.hardwareConcurrency; // split features into chunks for worker

      const featureChunks = this._chunkArray(this.options.features, numWorkers);

      let running = 0;
      const keyframeArray = [];

      const workerDone = e => {
        running -= 1;
        keyframeArray.push(e.data.keyframes);

        if (running < 1) {
          const mWorker = new WorkerFactory$1();
          mWorker.postMessage({
            keyframeArray
          });

          mWorker.onmessage = e => {
            this._keyframes = e.data.keyframes;
            console.log('this._keyframes', this._keyframes);
            this._times = Object.keys(this._keyframes);

            if (this.options.onKeyframesReady) {
              this.options.onKeyframesReady();
            }
          };
        }
      };

      for (let i = 0; i < numWorkers; i += 1) {
        running += 1;
        const tWorker = new WorkerFactory();
        tWorker.onmessage = workerDone;
        tWorker.postMessage({
          features: featureChunks[i],
          timeKey: this._timeKey
        });
      }
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
    },

    /**
     * Divide an array into n chunks
     * @param {array} array 
     * @param {number} parts 
     */
    _chunkArray(array, parts) {
      let result = [];

      for (let i = parts; i > 0; i--) {
        result.push(array.splice(0, Math.ceil(array.length / i)));
      }

      return result;
    }

  });

  L.pointAnimatorLayer = function (options) {
    return new PointAnimatorLayer(options);
  };

  var L_PointAnimatorLayer = L.pointAnimatorLayer;

  return L_PointAnimatorLayer;

})));
//# sourceMappingURL=leaflet-point-animator.js.map
