from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import logging
import os
import sys

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
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max pour uploads (augmenté)
    
    # Chemins des modèles générés par stage.py
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model')
    app.config['MODEL_PATH'] = os.path.join(model_dir, 'traffic_classifier_model.h5')
    app.config['SCALER_PATH'] = os.path.join(model_dir, 'scaler.pkl')
    app.config['ENCODER_PATH'] = os.path.join(model_dir, 'label_encoder.pkl')
    
    logger.info(f"📂 Répertoire des modèles: {model_dir}")
    
    # Configuration temps réel
    app.config['REALTIME_INTERVAL'] = 1.0  # secondes entre prédictions
    
    # ==================== Extensions ====================
    # CORS - Permettre les requêtes depuis le frontend
    CORS(app, 
         resources={r"/*": {
             "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type"],
             "supports_credentials": True
         }},
         expose_headers=["Content-Type"],
         send_wildcard=False)
    
    logger.info("✅ CORS configuré")
    
    # Socket.IO - WebSocket pour temps réel
    try:
        socketio.init_app(
            app,
            cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
            async_mode='threading',  # Changé de 'eventlet' à 'threading' pour compatibilité
            logger=True,
            engineio_logger=True,
            ping_timeout=60,
            ping_interval=25
        )
        logger.info("✅ Socket.IO initialisé (mode: threading)")
    except Exception as e:
        logger.error(f"❌ Erreur Socket.IO: {e}")
        # Continuer même si Socket.IO échoue
    
    # ==================== Blueprints (Routes) ====================
    try:
        from app.routes import health, prediction, realtime
        
        app.register_blueprint(health.bp)
        app.register_blueprint(prediction.bp)
        app.register_blueprint(realtime.bp)
        
        logger.info("✅ Routes enregistrées")
    except Exception as e:
        logger.error(f"❌ Erreur enregistrement routes: {e}")
        raise
    
    # ==================== Initialisation Modèles ====================
    with app.app_context():
        from app.services import prediction_service
        
        try:
            # Vérifier que les modèles existent
            model_exists = os.path.exists(app.config['MODEL_PATH'])
            scaler_exists = os.path.exists(app.config['SCALER_PATH'])
            encoder_exists = os.path.exists(app.config['ENCODER_PATH'])
            
            logger.info(f"🔍 Vérification des modèles:")
            logger.info(f"   Model: {model_exists} - {app.config['MODEL_PATH']}")
            logger.info(f"   Scaler: {scaler_exists} - {app.config['SCALER_PATH']}")
            logger.info(f"   Encoder: {encoder_exists} - {app.config['ENCODER_PATH']}")
            
            if not (model_exists and scaler_exists and encoder_exists):
                logger.error("❌ Modèles introuvables. Exécutez d'abord stage.py !")
                logger.error(f"   Répertoire attendu: {model_dir}")
                logger.error("   SOLUTION: cd backend-traffic-analyzer && python stage.py")
                # Ne pas crash, juste logger l'erreur
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
            logger.error("   Le backend démarrera SANS les modèles ML")
            logger.error("   SOLUTION: cd backend-traffic-analyzer && python stage.py")
    
    # ==================== Socket.IO Events ====================
    try:
        from app.sockets import events
        logger.info("✅ Socket.IO events chargés")
    except Exception as e:
        logger.error(f"❌ Erreur chargement socket events: {e}")
    
    # ==================== Gestionnaire d'erreurs ====================
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Route non trouvée', 'status': 404}), 404
    
    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Erreur 500: {e}")
        return jsonify({'error': 'Erreur serveur interne', 'status': 500}), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Exception non gérée: {e}")
        return jsonify({'error': str(e), 'status': 500}), 500
    
    # Route de test
    @app.route('/')
    def index():
        return jsonify({
            'message': 'Traffic Analyzer API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'health': '/health',
                'predict': '/predict',
                'realtime': '/real-time/*'
            }
        })
    
    logger.info("✅ Application Flask créée avec succès")
    
    return app