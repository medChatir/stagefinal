from flask import Blueprint, jsonify
from app.services import prediction_service
import logging
import sys

bp = Blueprint('health', __name__)
logger = logging.getLogger(__name__)


@bp.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """
    Health check - Vérifie que le backend fonctionne
    
    GET /health
    
    Returns:
        JSON avec status du serveur et des modèles
    """
    try:
        predictor = prediction_service.get_predictor()
        
        model_loaded = predictor.is_loaded if predictor else False
        classes = list(predictor.label_encoder.classes_) if model_loaded else []
        
        response = {
            'status': 'OK',
            'message': 'Backend opérationnel',
            'model_loaded': model_loaded,
            'model_source': 'stage.py',
            'classes': classes,
            'version': '1.0.0',
            'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            'timestamp': __import__('datetime').datetime.now().isoformat()
        }
        
        logger.info("✅ Health check OK")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return jsonify({
            'status': 'ERROR',
            'message': str(e),
            'model_loaded': False,
            'help': 'Exécutez stage.py pour générer les modèles',
            'version': '1.0.0',
            'timestamp': __import__('datetime').datetime.now().isoformat()
        }), 200  # Retourner 200 même en erreur pour que le frontend sache que le serveur est UP


@bp.route('/ping', methods=['GET'])
def ping():
    """Simple ping endpoint"""
    return jsonify({'status': 'pong'}), 200