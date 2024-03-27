# Web Audio Processor

## Description

This project is a web-based audio processing application that allows users to upload audio files, apply various effects like compression, EQ (Equalizer), and reverb, and then download the processed audio. It utilizes the Web Audio API for non-real-time audio processing in a browser environment. The application is designed to work entirely on the client side, making it a serverless solution that can be easily deployed and used anywhere.

## Features

- **Upload Audio**: Users can upload their audio files for processing.
- **Compression**: Apply heavy or natural compression to reduce dynamic range or gently even out audio levels.
- **Equalizer (EQ)**: Boost or cut high and low frequencies for tone adjustment.
- **Reverb**: Add spatial effects with options for different room sizes (Hall, Chamber, Room).
- **Dry/Wet Mix**: Control the balance between the original (dry) and processed (wet) signals.
- **Download**: Users can download the processed audio file.

## How to Use

1. **Open the Application**: Load the application in a web browser.
2. **Upload an Audio File**: Click the "Upload audio file" button and select an audio file from your computer.
3. **Select Effects**:
    - Choose the desired compression setting from the dropdown.
    - Select an EQ option to adjust the tone.
    - Choose a reverb setting to simulate different acoustic spaces.
4. **Process**: Click the "Process" button to apply the selected effects.
5. **Play and Download**: Use the play button to preview the processed audio. Click the "Download" button to save the processed file to your device.

## Setup

To set up this project locally:

1. Clone the repository to your local machine.
    ```
    git clone https://github.com/yourusername/web-audio-processor.git
    ```
2. Open the `index.html` file in a modern web browser.

3. Follow the "How to Use" instructions above to start processing audio.

## Acknowledgments

- Web Audio API documentation and community for providing invaluable resources.
- Sample audio files and impulse responses used for testing and demonstration.

## License

This project is open-source and available under the MIT License. See the LICENSE file for more details.
