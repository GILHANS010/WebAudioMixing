const audio = document.getElementById('audio');
const processButton = document.getElementById('process');
const playButton = document.getElementById('play');
const downloadButton = document.getElementById('download');
const fileInput = document.getElementById('file');
const compressorSelect = document.getElementById('compressor');
const reverbSelect = document.getElementById('reverb');

let audioContext;
let audioBuffer;

async function processAudio() {
  if (!audioContext) {
    audioContext = new(window.AudioContext || window.webkitAudioContext)();
  }

  const file = fileInput.files[0];
  if (!file) {
    return alert('Please upload an audio file');
  }

  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Calculate extra time for the reverb tail.
  const extraTime = 3; // seconds
  const extendedLength = audioBuffer.length + audioBuffer.sampleRate * extraTime;

  // Create an OfflineAudioContext with the extended length
  let offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    extendedLength,
    audioBuffer.sampleRate
  );

  // Recreate your audio processing graph in the offline context
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create a gain node for the overall signal
  const overallGain = offlineContext.createGain();
  overallGain.gain.value = 0.95; // Default gain to 0.95 for headroom

  // Create gain nodes for dry and wet signals
  const dryGain = offlineContext.createGain();
  const wetGain = offlineContext.createGain();

  // Set gains for 70% dry, 50% wet
  dryGain.gain.value = 0.7;
  wetGain.gain.value = 0.3;

  // EQ
  const eqOption = document.getElementById('eq').value;
  let eq;
  if (eqOption !== 'none') {
    eq = offlineContext.createBiquadFilter();
    switch (eqOption) {
      case 'boostHigh':
        eq.type = 'highshelf';
        eq.frequency.setValueAtTime(4000, offlineContext.currentTime);
        eq.gain.setValueAtTime(6, offlineContext.currentTime);
        break;
      case 'cutHigh':
        eq.type = 'highshelf';
        eq.frequency.setValueAtTime(4000, offlineContext.currentTime);
        eq.gain.setValueAtTime(-6, offlineContext.currentTime);
        break;
      case 'boostLow':
        eq.type = 'lowshelf';
        eq.frequency.setValueAtTime(250, offlineContext.currentTime);
        eq.gain.setValueAtTime(6, offlineContext.currentTime);
        break;
      case 'cutLow':
        eq.type = 'lowshelf';
        eq.frequency.setValueAtTime(250, offlineContext.currentTime);
        eq.gain.setValueAtTime(-6, offlineContext.currentTime);
        break;
    }
  }

  // Compressor
  const compressor = offlineContext.createDynamicsCompressor();
  adjustCompressorSettings(compressor);

  // Reverb
  const convolver = offlineContext.createConvolver();
  const reverbResponse = await fetch(`./ir/${reverbSelect.value}.wav`);
  const reverbArrayBuffer = await reverbResponse.arrayBuffer();
  convolver.buffer = await offlineContext.decodeAudioData(reverbArrayBuffer);

  // Limiter configuration
  const limiter = offlineContext.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-3, offlineContext.currentTime); // Threshold (-2 dB for a little headroom)
  limiter.knee.setValueAtTime(0, offlineContext.currentTime); // Knee (Hard knee)
  limiter.ratio.setValueAtTime(20, offlineContext.currentTime); // Ratio (High ratio for limiting)
  limiter.attack.setValueAtTime(0, offlineContext.currentTime); // Attack Time (Immediate attack)
  limiter.release.setValueAtTime(0.1, offlineContext.currentTime); // Release Time (Fast release)

  // Connect the nodes for processing
  source.connect(overallGain);

  if (eq) {
      overallGain.connect(eq);
      eq.connect(compressor);
  } else {
      overallGain.connect(compressor);
  }

  // Split signal into dry and wet paths after compression
  compressor.connect(dryGain);
  compressor.connect(wetGain);

  wetGain.connect(convolver); // Apply reverb only on the wet path

  // Combine signals back, then pass through the limiter
  dryGain.connect(limiter);
  convolver.connect(limiter);

  limiter.connect(offlineContext.destination);

  // Start processing
  source.start(0);

  // Render the audio, including the reverb tail
  audioBuffer = await offlineContext.startRendering();
  // Convert the processed buffer to a WAV Blob and set it as the source for the audio element
  const processedBlob = encodeWAV(audioBuffer);
  audio.src = URL.createObjectURL(processedBlob);
  playButton.disabled = false;
  downloadButton.disabled = false;
}

function adjustCompressorSettings(compressor) {
  if (compressorSelect.value === 'heavy') {
    compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
    compressor.knee.setValueAtTime(40, audioContext.currentTime);
    compressor.ratio.setValueAtTime(20, audioContext.currentTime);
    compressor.attack.setValueAtTime(0, audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, audioContext.currentTime);
  } else { // Natural compression
    compressor.threshold.setValueAtTime(-20, audioContext.currentTime);
    compressor.knee.setValueAtTime(30, audioContext.currentTime);
    compressor.ratio.setValueAtTime(12, audioContext.currentTime);
    compressor.attack.setValueAtTime(0, audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, audioContext.currentTime);
  }
}


playButton.addEventListener('click', () => {
  if (!audio.paused) {
    audio.pause();
  } else {
    audio.play();
  }
});

function encodeWAV(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bitsPerSample = 16;

  // WAV header structure (44 bytes)
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  writeString(view, 0, 'RIFF'); // RIFF chunk descriptor
  view.setUint32(4, 36 + length * numChannels * bitsPerSample / 8, true); // RIFF chunk size
  writeString(view, 8, 'WAVE'); // WAVE format
  writeString(view, 12, 'fmt '); // Format subchunk
  view.setUint32(16, 16, true); // Format subchunk size (16 for PCM)
  view.setUint16(20, 1, true); // Audio format (1 for PCM)
  view.setUint16(22, numChannels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // Byte rate
  view.setUint16(32, numChannels * bitsPerSample / 8, true); // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample
  writeString(view, 36, 'data'); // Data subchunk
  view.setUint32(40, length * numChannels * bitsPerSample / 8, true); // Data chunk size

  // Interleave audio data for each channel
  const data = new ArrayBuffer(length * numChannels * bitsPerSample / 8);
  const dataView = new DataView(data);
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      dataView.setInt16(i * numChannels * 2 + channel * 2, sample * 0x7FFF, true);
    }
  }

  const wav = new Blob([header, data], {
    type: 'audio/wav'
  });
  return wav;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}



downloadButton.addEventListener('click', () => {
  if (!audioBuffer) {
    console.error('No audio buffer to download');
    return;
  }

  const wavData = encodeWAV(audioBuffer);
  const blob = new Blob([wavData], {
    type: 'audio/wav'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'processed_audio.wav';
  document.body.appendChild(link); // Firefox requires the link to be in the body
  link.click();
  document.body.removeChild(link); // Cleanup
});


processButton.addEventListener('click', processAudio);