#!/usr/bin/env python3
import sys
import os

# Ajouter le répertoire parent au PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, socketio
import logging

logger = logging.getLogger(__name__)

def check_dependencies():
    """Vérifier que toutes les dépendances sont installées"""
    required = [
        'flask',
        'flask_cors',
        'flask_socketio',
        'pandas',
        'numpy',
        'sklearn',
        'tensorflow',
        'joblib'
    ]
    
    missing = []
    for module in required:
        try:
            __import__(module)
        except ImportError:
            missing.append(module)
    
    if missing:
        logger.error(f"❌ Dépendances manquantes: {', '.join(missing)}")
        logger.error("   SOLUTION: pip install -r requirements.txt")
        return False
    
    logger.info("✅ Toutes les dépendances sont installées")
    return True


def check_port(port=5000):
    """Vérifier si le port est disponible"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('0.0.0.0', port))
        sock.close()
        return True
    except OSError:
        logger.error(f"❌ Le port {port} est déjà utilisé")
        logger.error("   SOLUTION: Tuez le processus ou changez le port")
        return False


if __name__ == '__main__':
    
    
    # Vérifications préalables
    if not check_dependencies():
        sys.exit(1)
    
    if not check_port(5000):
        sys.exit(1)
    
    # Créer l'application
    try:
        app = create_app()
        
        print()
        
        # Démarrer le serveur
        socketio.run(
            app,
            host='0.0.0.0',  # Accepter connexions de toutes les interfaces
            port=5001,
            debug=True,
            use_reloader=True,
            log_output=True
        )
        
    except Exception as e:
        logger.error(f"❌ Erreur fatale au démarrage: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)