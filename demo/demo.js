
$(document).ready(function () {

	const map = L.map('map', { 
		// recommended for performance
		renderer: L.canvas() 
	}).setView([-43.51, 158], 5);

	L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		})
		.addTo(map);

	// OPTIONAL - simple example of dynamic styling with chromajs
	// const colorProp = data.features.map(f => +f.properties.age);
	const min = 0; //Math.min(...colorProp);
	const max = 700000; // Math.max(...colorProp);
	const color = chroma.scale(chroma.brewer.Viridis.reverse()).domain([min, max]);
	
	// OPTIONAL - custom pane
	const paneName = 'myCustom';

	console.time('keyframesReadyIn');

	// INIT
	const pointAnimatorLayer = L.pointAnimatorLayer({
		features: data.features,
		// keyframes: data,
		style(feature) {
			return {
				// do custom styling things
				fillColor: color(feature.properties.age),
				stroke: false,
				radius: 5
			}
		},
		// numWorkers: 1,
		paneName: paneName,
		timeKey: "time",
		onKeyframesReady() {
			console.timeEnd('keyframesReadyIn');

			// DEMO - get a list of frame keys, and set first frame active
			const frameKeys = pointAnimatorLayer.getFrameKeys();
			pointAnimatorLayer.setFrame(frameKeys[0]);
			
			// RECOMMENDED - throttle superfluous calls to setFrame
			const keyFrameHandler = function () {
				pointAnimatorLayer.setFrame(frameKeys[this.value]);
			};
			const throttledHandler = _.throttle(keyFrameHandler, 50, { leading: false });

			$('#keyFrameSlider').on('input', throttledHandler);
			$('#keyFrameSlider').prop('max', frameKeys.length - 1);
			
		}
	});

	// console.log(`parsing ${data.features.length} features into keyframes...`);
	

	// GENERAL - layer stuff
	const layerControl = L.control.layers({}, { 'Demo': pointAnimatorLayer });
	layerControl.addTo(map);
	pointAnimatorLayer.addTo(map);

});