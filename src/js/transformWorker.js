
/**
 * Tranform an array of points into an 
 * object of keyframes grouped by uniq times
 */

let running = 0;
let keyframeArray = [];

onmessage = function(e) {

  const timeKey = e.data.timeKey;
  const features = e.data.features;

  // get sorted list of dates
  const dates = features.map(f => new Date(f.properties[timeKey])).sort((a,b) => a - b );
		
  // uniq list of ISO strings
  times = [...new Set(dates.map(d => d.toISOString()))]; 

  const keyframes = {};
  times.forEach(time => {
    const slicedFeatures = features.filter(f => f.properties[timeKey] === time);
    keyframes[time] = slicedFeatures;
  });
  
  postMessage({ keyframes });
}

