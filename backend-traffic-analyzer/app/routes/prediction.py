from flask import Blueprint, request, jsonify
from app.services import prediction_service
import logging

bp = Blueprint('prediction', __name__)
logger = logging.getLogger(__name__)


def validate_csv_file(file):
    """Validation du fichier CSV"""
    if not file or file.filename == '':
        return False, "Aucun fichier fourni"
    
    if not file.filename.lower().endswith('.csv'):
        return False, "Le fichier doit être un CSV"
    
    return True, None


@bp.route('/predict', methods=['POST'])
def predict():
    """
    Endpoint de prédiction sur fichier CSV
    
    POST /predict
    Content-Type: multipart/form-data
    Body: file (CSV avec colonnes de trafic réseau)
    
    Returns:
        JSON avec prédictions, statistiques et résumé
    """
    try:
        # Vérifier présence du fichier
        if 'file' not in request.files:
            return jsonify({
                'error': 'Aucun fichier fourni',
                'help': 'Envoyez un fichier CSV via form-data'
            }), 400
        
        file = request.files['file']
        
        # Validation
        is_valid, error_msg = validate_csv_file(file)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        logger.info(f"📤 Fichier reçu: {file.filename}")
        
        # Prédiction
        result = prediction_service.predict_from_file(file)
        
        logger.info(f"✅ Prédiction réussie")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Erreur /predict: {e}")
        return jsonify({
            'error': str(e),
            'help': 'Vérifiez le format du CSV'
        }), 500

