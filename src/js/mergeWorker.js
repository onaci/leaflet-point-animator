
onmessage = function(e) {
  const keyframeArray = e.data.keyframeArray;
  const keyframes = {};
  keyframeArray.forEach(k => {
    const times = Object.keys(k);
    times.forEach(time => {
      if(!keyframes[time]) {
        keyframes[time] = k[time];
      } else {
        keyframes[time] = keyframes[time].concat(k[time]);
      }
    })
  });

  postMessage({ keyframes });
}

