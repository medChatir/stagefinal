from app.models.predictor import TrafficPredictor
import pandas as pd
import logging

logger = logging.getLogger(__name__)

# Instance globale du prédicteur
_predictor = None


def initialize(model_path, scaler_path, encoder_path):
    """Initialise le prédicteur avec les modèles de stage.py"""
    global _predictor
    
    if _predictor is None:
        _predictor = TrafficPredictor()
        _predictor.load(model_path, scaler_path, encoder_path)


def get_predictor():
    """Récupère l'instance du prédicteur"""
    if _predictor is None:
        raise RuntimeError("Prédicteur non initialisé")
    return _predictor


def predict_from_file(file_storage):
    """
    Fait une prédiction à partir d'un fichier CSV
    
    Args:
        file_storage: Objet FileStorage de Flask
        
    Returns:
        Dict avec predictions, summary, stats
    """
    try:
        # Lire le CSV
        df = pd.read_csv(file_storage)
        logger.info(f"📊 CSV chargé: {len(df)} lignes, {len(df.columns)} colonnes")
        
        # Prédiction
        predictor = get_predictor()
        results = predictor.predict_batch(df)
        
        logger.info(f"✅ {len(results)} prédictions effectuées")
        
        # Statistiques
        stats = calculate_stats(results, len(df))
        summary = calculate_summary(results)
        
        return {
            'status': 'success',
            'predictions': results[:100],  # Limiter pour performance
            'summary': summary,
            'stats': stats
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur prédiction: {e}")
        raise


def calculate_stats(results, total_samples):
    """Calcule les statistiques globales"""
    high_risk = sum(1 for r in results if r['risk'] == 'High')
    medium_risk = sum(1 for r in results if r['risk'] == 'Medium')
    low_risk = sum(1 for r in results if r['risk'] == 'Low')
    
    # Niveau de menace global
    high_ratio = high_risk / len(results) if results else 0
    
    if high_ratio > 0.5:
        threat_level = 'Élevé'
    elif high_ratio > 0.2:
        threat_level = 'Modéré'
    else:
        threat_level = 'Faible'
    
    return {
        'total_samples': total_samples,
        'processed_samples': len(results),
        'high_risk_count': high_risk,
        'medium_risk_count': medium_risk,
        'low_risk_count': low_risk,
        'threat_level': threat_level
    }


def calculate_summary(results):
    """Résumé par classe de prédiction"""
    summary = {}
    for r in results:
        pred = r['prediction']
        summary[pred] = summary.get(pred, 0) + 1
    return summary
