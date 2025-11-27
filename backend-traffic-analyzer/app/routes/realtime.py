from flask import Blueprint, jsonify, request
from app import socketio
from app.services.realtime_service import get_realtime_service
import logging

bp = Blueprint('realtime', __name__, url_prefix='/real-time')
logger = logging.getLogger(__name__)


@bp.route('/start', methods=['POST'])
def start_realtime():
    """
    Démarre la capture temps réel
    
    POST /real-time/start
    Body (optional): {"interval": 1.0}
    
    Returns:
        JSON avec status
    """
    try:
        data = request.get_json() or {}
        interval = data.get('interval', 1.0)
        
        service = get_realtime_service(socketio)
        success = service.start(interval)
        
        if success:
            return jsonify({
                'status': 'started',
                'interval': interval,
                'message': 'Capture temps réel démarrée'
            }), 200
        else:
            return jsonify({
                'status': 'already_running',
                'message': 'La capture est déjà active'
            }), 409
            
    except Exception as e:
        logger.error(f"❌ Erreur /real-time/start: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/stop', methods=['POST'])
def stop_realtime():
    """
    Arrête la capture temps réel
    
    POST /real-time/stop
    
    Returns:
        JSON avec status
    """
    try:
        service = get_realtime_service(socketio)
        success = service.stop()
        
        if success:
            return jsonify({
                'status': 'stopped',
                'message': 'Capture temps réel arrêtée'
            }), 200
        else:
            return jsonify({
                'status': 'not_running',
                'message': 'Aucune capture active'
            }), 404
            
    except Exception as e:
        logger.error(f"❌ Erreur /real-time/stop: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/stats', methods=['GET'])
def get_stats():
    """
    Récupère les statistiques temps réel
    
    GET /real-time/stats
    
    Returns:
        JSON avec statistiques
    """
    try:
        service = get_realtime_service(socketio)
        stats = service.get_stats()
        
        return jsonify({
            'status': 'running' if service.is_running else 'stopped',
            'stats': stats
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erreur /real-time/stats: {e}")
        return jsonify({'error': str(e)}), 500
