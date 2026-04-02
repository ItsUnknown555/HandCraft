from flask import Flask, render_template
from flask_socketio import SocketIO
import eventlet
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hand-tracking-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    return {'status': 'running', 'service': 'Hand Tracking Voxel Server'}

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    socketio.emit('server_status', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('hand_data')
def handle_hand_data(data):
    socketio.emit('hand_data', data)

@socketio.on('voxel_action')
def handle_voxel_action(data):
    socketio.emit('voxel_action', data)

@socketio.on('ping')
def handle_ping():
    socketio.emit('pong')

if __name__ == '__main__':
    print("Starting Hand Tracking Voxel Server...")
    print("Open http://localhost:5000 in your browser")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
