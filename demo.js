$(document).ready(function () {

	const map = L.map('map', { 
		renderer: L.canvas() 
	}).setView([-38.2, 227.5], 10);

	L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		})
		.addTo(map);

		$("#load-btn").click(() => {

			$('#load-btn').hide();
			$('#loading').show();

			// LOAD DATA
			$.getJSON("60mb-keyframes.json", function(keyframes, status){
				
				console.log('loaded keyframes:', keyframes);
			
				// OPTIONAL - simple example of dynamic styling with chromajs
				const min = 0; 
				const max = 2000;
				const color = chroma.scale(chroma.brewer.Viridis.reverse()).domain([min, max]);
				
				// OPTIONAL - custom pane
				const paneName = 'myCustom';
		
				// INIT 
				const pointAnimatorLayer = L.pointAnimatorLayer({

					// pre-formatted keyframes
					keyframes: keyframes,
					style(feature) {
						return {
							// do custom styling things
							fillColor: color(feature.properties.age),
							stroke: false,
							radius: 5
						}
					},
					paneName: paneName,
					timeKey: "time",
					onKeyframesReady() {
		
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
						
						// update UI
						$('#loading').hide();
						$('.slidecontainer').show();
					}
				});
		
				// GENERAL - layer stuff
				const layerControl = L.control.layers({}, { 'Demo': pointAnimatorLayer });
				layerControl.addTo(map);
				pointAnimatorLayer.addTo(map);
			});

		});

});