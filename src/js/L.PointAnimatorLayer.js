import './L.CanvasLayer';
import transformWorker from 'web-worker:./transformWorker';
import mergeWorker from 'web-worker:./mergeWorker';

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

		if(!this.options.keyframes && this.options.features) {
			this._computeKeyframes();
		} else if (this.options.keyframes) {
			this._keyframes = this.options.keyframes;
			this._times = Object.keys(this._keyframes);
			if (this.options.onKeyframesReady) this.options.onKeyframesReady();
		} else {
			console.error('No features or keyframes provided.')
		}

		this._setPane();

		// create canvas, add to map pane	
		this._canvasLayer = L.canvasLayer({ pane: this._pane }).delegate(this);
		this._canvasLayer.addTo(map);
		this._canvas = this._canvasLayer._canvas;
		
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
		
		var ctx = info.canvas.getContext('2d');

		// clear entire canvas
		ctx.clearRect(0, 0, info.canvas.width, info.canvas.height);
		
		if (!this._frameKey || !this._keyframes) return false;

		// get features for keyframe
		const frameFeatures = this._keyframes[this._frameKey];
		let radius = 5;

		// draw each point on canvas
		for (var i = 0; i < frameFeatures.length; i++) {
				var feature = frameFeatures[i];
				const coords = feature.geometry.coordinates;
				if (info.bounds.contains([coords[1], coords[0]])) {

						// TODO - more styles
						if(this.options.style) {
							const style = this.options.style(feature);
							if (style.fillColor) ctx.fillStyle = style.fillColor;
							if (style.color) ctx.strokeStyle = style.color;
							if (style.radius) radius = style.radius;
						} else {
							// TODO - default styles
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
		if (!this.isActive() || !this._keyframes) return;

		// set new if we have target
		this._frameKey = key;
		const nextFrame = this._keyframes[this._frameKey];
		
		// inf invalid, clear the canvas without redraw
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

		const numWorkers = this.options.numWorkers || window.navigator.hardwareConcurrency;
		
		// split features into chunks for worker
		const featureChunks = this._chunkArray(this.options.features, numWorkers);
		
		let running = 0;
		const keyframeArray = [];

		const workerDone = (e) => {
			running -= 1;
			keyframeArray.push(e.data.keyframes);
			if(running < 1) {
				const mWorker = new mergeWorker();
				mWorker.postMessage({ keyframeArray });
				mWorker.onmessage = (e) => {
						this._keyframes = e.data.keyframes;
						console.log('this._keyframes', this._keyframes);
					
						this._times = Object.keys(this._keyframes);
						if (this.options.onKeyframesReady) {
							this.options.onKeyframesReady();
						}
					}	
							
			}
		}

    for(let i = 0; i < numWorkers; i += 1) {
      running += 1;
      const tWorker = new transformWorker();
      tWorker.onmessage = workerDone;
      tWorker.postMessage({ features: featureChunks[i], timeKey: this._timeKey });
		}
		
		
		
		
	},

	/**
	 * Create custom pane if necessary
	 * @private
	 */
	_setPane() {
		// determine where to add the layer
		this._paneName = this.options.paneName || 'overlayPane';

		// fall back to overlayPane for leaflet < 1
		let pane = this._map._panes.overlayPane
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

export default L.pointAnimatorLayer;


