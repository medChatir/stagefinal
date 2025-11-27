from flask import Blueprint, jsonify
from app.services import prediction_service
import logging

bp = Blueprint('health', __name__)
logger = logging.getLogger(__name__)


@bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check - Vérifie que le backend fonctionne
    
    GET /health
    
    Returns:
        JSON avec status du serveur et des modèles
    """
    try:
        predictor = prediction_service.get_predictor()
        
        return jsonify({
            'status': 'OK',
            'message': 'Backend opérationnel',
            'model_loaded': predictor.is_loaded,
            'model_source': 'stage.py',
            'classes': list(predictor.label_encoder.classes_),
            'version': '1.0.0'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return jsonify({
            'status': 'ERROR',
            'message': str(e),
            'help': 'Exécutez stage.py pour générer les modèles'
        }), 500