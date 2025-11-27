from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
import logging
import os

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Instance SocketIO globale
socketio = SocketIO()


def create_app():
    """
    Factory pour créer l'application Flask
    Utilise les modèles générés par stage.py
    """
    app = Flask(__name__)
    
    # ==================== Configuration ====================
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max pour uploads
    
    # Chemins des modèles générés par stage.py
    app.config['MODEL_PATH'] = 'model/traffic_classifier_model.h5'
    app.config['SCALER_PATH'] = 'model/scaler.pkl'
    app.config['ENCODER_PATH'] = 'model/label_encoder.pkl'
    
    # Configuration temps réel
    app.config['REALTIME_INTERVAL'] = 1.0  # secondes entre prédictions
    
    # ==================== Extensions ====================
    # CORS - Permettre les requêtes depuis le frontend
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    })
    
    # Socket.IO - WebSocket pour temps réel
    socketio.init_app(app, 
                     cors_allowed_origins="*",
                     async_mode='eventlet')
    
    # ==================== Blueprints (Routes) ====================
    from app.routes import health, prediction, realtime
    
    app.register_blueprint(health.bp)
    app.register_blueprint(prediction.bp)
    app.register_blueprint(realtime.bp)
    
    logger.info("✅ Routes enregistrées")
    
    # ==================== Initialisation Modèles ====================
    with app.app_context():
        from app.services import prediction_service
        
        try:
            # Vérifier que les modèles existent
            if not os.path.exists(app.config['MODEL_PATH']):
                logger.error("❌ Modèle introuvable. Exécutez d'abord stage.py !")
                logger.error(f"   Attendu: {app.config['MODEL_PATH']}")
            else:
                # Charger les modèles
                prediction_service.initialize(
                    app.config['MODEL_PATH'],
                    app.config['SCALER_PATH'],
                    app.config['ENCODER_PATH']
                )
                logger.info("✅ Modèles de stage.py chargés avec succès")
                
        except Exception as e:
            logger.error(f"❌ Erreur chargement modèles: {e}")
            logger.error("   Assurez-vous d'avoir exécuté stage.py avant !")
    
    # ==================== Socket.IO Events ====================
    from app.sockets import events
    
    # ==================== Gestionnaire d'erreurs ====================
    @app.errorhandler(404)
    def not_found(e):
        return {'error': 'Route non trouvée'}, 404
    
    @app.errorhandler(500)
    def internal_error(e):
        return {'error': 'Erreur serveur interne'}, 500
    
    return app
