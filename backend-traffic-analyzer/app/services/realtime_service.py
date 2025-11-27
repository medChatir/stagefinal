import threading
import time
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from app.services import prediction_service

logger = logging.getLogger(__name__)


class RealtimeService:
    """Service de capture et prédiction en temps réel"""
    
    def __init__(self, socketio):
        self.socketio = socketio
        self.is_running = False
        self.thread = None
        self.interval = 1.0
        self.stats = {
            'packets_captured': 0,
            'predictions_made': 0,
            'start_time': None,
            'classifications_per_minute': 0
        }
    
    def start(self, interval=1.0):
        """Démarre la capture temps réel"""
        if self.is_running:
            logger.warning("⚠️  Service déjà actif")
            return False
        
        self.interval = interval
        self.is_running = True
        self.stats['start_time'] = datetime.now()
        self.stats['packets_captured'] = 0
        self.stats['predictions_made'] = 0
        
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        
        logger.info("✅ Service temps réel démarré")
        return True
    
    def stop(self):
        """Arrête la capture"""
        if not self.is_running:
            return False
        
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2)
        
        logger.info("🛑 Service temps réel arrêté")
        return True
    
    def get_stats(self):
        """Retourne les statistiques"""
        if self.stats['start_time']:
            elapsed = (datetime.now() - self.stats['start_time']).total_seconds()
            if elapsed > 0:
                self.stats['classifications_per_minute'] = round(
                    (self.stats['predictions_made'] / elapsed) * 60, 2
                )
        
        return self.stats
    
    def _capture_loop(self):
        """Boucle de capture (simule capture réseau)"""
        predictor = prediction_service.get_predictor()
        
        while self.is_running:
            try:
                # Simuler un paquet réseau
                packet_data = self._simulate_packet()
                
                # Créer DataFrame
                df = pd.DataFrame([packet_data])
                
                # Prédiction
                X = predictor.preprocess(df)
                labels, confidences = predictor.predict(X)
                
                # Résultat
                result = {
                    'flow_id': packet_data.get('Flow ID', f'flow_{int(time.time())}'),
                    'timestamp': datetime.now().isoformat(),
                    'prediction': str(labels[0]),
                    'confidence': float(confidences[0]),
                    'risk': predictor._calculate_risk(labels[0], confidences[0])
                }
                
                # Émettre via Socket.IO
                self.socketio.emit('real_time_prediction', {'prediction': result})
                
                # MAJ stats
                self.stats['packets_captured'] += 1
                self.stats['predictions_made'] += 1
                
                time.sleep(self.interval)
                
            except Exception as e:
                logger.error(f"❌ Erreur capture: {e}")
                time.sleep(1)
    
    def _simulate_packet(self):
        """Simule un paquet réseau réaliste"""
        return {
            'Flow ID': f'flow_{int(time.time() * 1000)}',
            'Src Port': np.random.randint(1024, 65535),
            'Dst Port': np.random.choice([80, 443, 22, 3389, 8080]),
            'Protocol': 6,  # TCP
            'Flow Duration': np.random.randint(100, 10000),
            'Tot Fwd Pkts': np.random.randint(1, 100),
            'Tot Bwd Pkts': np.random.randint(1, 100),
            'TotLen Fwd Pkts': np.random.randint(100, 50000),
            'TotLen Bwd Pkts': np.random.randint(100, 50000),
            # Ajouter autres colonnes avec valeurs aléatoires...
            'Flow Byts/s': np.random.uniform(1000, 1000000),
            'Flow Pkts/s': np.random.uniform(10, 10000),
        }


# Instance globale
_realtime_service = None


def get_realtime_service(socketio):
    """Récupère l'instance du service temps réel"""
    global _realtime_service
    if _realtime_service is None:
        _realtime_service = RealtimeService(socketio)
    return _realtime_service
