/**
 * Tranform an array of point into an 
 * object of keyframes grouped by uniq times
 */
let running = 0;
let keyframeArray = [];

onmessage = function (e) {
  const job = e.data.job;
  const timeKey = e.data.timeKey;
  const features = e.data.features;
  const numWorkers = e.data.numWorkers;

  if (job === 'MAIN') {
    // split features into chunks for worker
    const featureChunks = chunkArray(features, numWorkers);

    for (let i = 0; i < numWorkers; i += 1) {
      running += 1;
      const worker = new Worker('web-worker-0.js');
      worker.onmessage = workerDone;
      worker.postMessage({
        job: 'TRANSFORM',
        features: featureChunks[i],
        timeKey
      });
    }
  } else if (job === 'TRANSFORM') {
    transformFeatures(features, timeKey);
  } else {
    console.warn('KeyframeWorker called with invalid job', e.data);
  }
};

function transformFeatures(features, timeKey) {
  // get sorted list of dates
  const dates = features.map(f => new Date(f.properties[timeKey])).sort((a, b) => a - b); // uniq list of ISO strings

  times = [...new Set(dates.map(d => d.toISOString()))];
  const keyframes = {};
  times.forEach(time => {
    const slicedFeatures = features.filter(f => f.properties[timeKey] === time);
    keyframes[time] = slicedFeatures;
  });
  postMessage({
    keyframes
  });
}

function mergeKeyframes(keyframeArray) {
  const keyframes = {};
  keyframeArray.forEach(k => {
    const times = Object.keys(k);
    times.forEach(time => {
      if (!keyframes[time]) {
        keyframes[time] = k[time];
      } else {
        keyframes[time] = keyframes[time].concat(k[time]);
      }
    });
  });
  return keyframes;
}

function workerDone(e) {
  running -= 1;
  keyframeArray.push(e.data.keyframes);

  if (running < 1) {
    const keyframes = mergeKeyframes(keyframeArray);
    postMessage({
      keyframes
    });
  }
}

function chunkArray(array, parts) {
  let result = [];

  for (let i = parts; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }

  return result;
}
//# sourceMappingURL=web-worker-0.js.map
