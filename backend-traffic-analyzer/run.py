from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 Traffic Analyzer Backend - Démarrage")
    print("=" * 70)
    print("📊 Utilise les modèles générés par stage.py")
    print("🌐 API REST     : http://localhost:5000")
    print("🔌 WebSocket    : ws://localhost:5000")
    print("📖 Health Check : http://localhost:5000/health")
    print("=" * 70)
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )