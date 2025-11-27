from app import socketio
import logging

logger = logging.getLogger(__name__)


@socketio.on('connect')
def handle_connect():
    """Client WebSocket connecté"""
    logger.info("🔌 Client WebSocket connecté")


@socketio.on('disconnect')
def handle_disconnect():
    """Client WebSocket déconnecté"""
    logger.info("🔌 Client WebSocket déconnecté")


@socketio.on('ping')
def handle_ping(data):
    """Test de connexion WebSocket"""
    logger.info(f"📡 Ping reçu: {data}")
    socketio.emit('pong', {'message': 'Pong!', 'timestamp': data.get('timestamp')})

