# Hand Tracking Voxel AR Application

## Project Structure
```
hand_tracking_voxel/
├── app/
│   ├── index.html          # Main web interface
│   ├── styles.css          # Styling for AR overlay
│   ├── app.js              # Three.js + MediaPipe integration
│   ├── hand_tracker.js     # MediaPipe hand tracking module
│   └── voxel_manager.js    # Voxel creation and physics
├── server/
│   └── app.py              # Flask WebSocket server
└── requirements.txt        # Python dependencies
```

## Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **3D Rendering**: Three.js
- **Hand Tracking**: MediaPipe Hands (JavaScript)
- **Backend**: Flask + Flask-SocketIO

## Installation

### 1. Python Backend
```bash
cd hand_tracking_voxel
pip install -r requirements.txt
python server/app.py
```

### 2. Frontend
Simply open `app/index.html` in a modern browser (Chrome recommended).

## Features
- Real-time hand tracking via webcam
- 21 hand landmarks detection
- Pinch gesture recognition
- 3D voxel placement in AR space
- Drag and drop voxels
- Live camera feed overlay

## Usage
1. Allow webcam access when prompted
2. Show your hand to the camera
3. Perform a pinch gesture (thumb + index finger) to create a voxel
4. Move your hand while pinching to position the voxel
5. Release the pinch to place the voxel in space
