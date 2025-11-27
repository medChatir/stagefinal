import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model
import logging

logger = logging.getLogger(__name__)


class TrafficPredictor:
    """
    Prédicteur de trafic réseau
    Utilise les modèles entraînés par stage.py:
    - traffic_classifier_model.h5 (LSTM)
    - scaler.pkl (MinMaxScaler)
    - label_encoder.pkl (LabelEncoder)
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.is_loaded = False
    
    def load(self, model_path, scaler_path, encoder_path):
        """
        Charge les modèles générés par stage.py
        
        Args:
            model_path: Chemin vers le modèle LSTM (.h5)
            scaler_path: Chemin vers le scaler (.pkl)
            encoder_path: Chemin vers le label encoder (.pkl)
        """
        try:
            logger.info("📦 Chargement des modèles...")
            
            # Modèle LSTM
            self.model = load_model(model_path)
            logger.info(f"   ✓ Modèle LSTM chargé: {model_path}")
            
            # Scaler MinMax
            self.scaler = joblib.load(scaler_path)
            logger.info(f"   ✓ Scaler chargé: {scaler_path}")
            
            # Label Encoder
            self.label_encoder = joblib.load(encoder_path)
            logger.info(f"   ✓ Label Encoder chargé: {encoder_path}")
            
            # Afficher les classes détectées
            classes = self.label_encoder.classes_
            logger.info(f"   ✓ Classes: {list(classes)}")
            
            self.is_loaded = True
            logger.info("✅ Tous les modèles chargés avec succès")
            
        except FileNotFoundError as e:
            logger.error(f"❌ Fichier introuvable: {e}")
            logger.error("   Exécutez stage.py pour générer les modèles")
            raise
        except Exception as e:
            logger.error(f"❌ Erreur chargement: {e}")
            raise
    
    def preprocess(self, df):
        """
        Prétraite les données EXACTEMENT comme dans stage.py
        
        Args:
            df: DataFrame avec colonnes de trafic réseau
            
        Returns:
            X reshaped pour LSTM [samples, timesteps, features]
        """
        # Copier pour ne pas modifier l'original
        df = df.copy()
        
        # Colonnes à supprimer (comme dans stage.py)
        drop_cols = ["Flow ID", "Src IP", "Dst IP", "Timestamp", "Label", "Label.1"]
        df.drop(columns=[c for c in drop_cols if c in df.columns], 
                errors="ignore", inplace=True)
        
        # Remplacer inf et NaN
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.fillna(0, inplace=True)
        
        # Encoder colonnes non-numériques
        for col in df.select_dtypes(include=['object']).columns:
            df[col] = df[col].astype('category').cat.codes
        
        # Normalisation MinMax
        X_scaled = self.scaler.transform(df)
        
        # Reshape pour LSTM [samples, timesteps=1, features]
        X_reshaped = X_scaled.reshape((X_scaled.shape[0], 1, X_scaled.shape[1]))
        
        return X_reshaped
    
    def predict(self, X):
        """
        Fait une prédiction
        
        Args:
            X: Données prétraitées [samples, timesteps, features]
            
        Returns:
            labels: Classes prédites (array)
            confidences: Scores de confiance (array)
        """
        if not self.is_loaded:
            raise RuntimeError("Modèle non chargé. Exécutez stage.py d'abord.")
        
        # Prédiction avec le modèle LSTM
        predictions = self.model.predict(X, verbose=0)
        
        # Classe avec probabilité max
        predicted_classes = np.argmax(predictions, axis=1)
        confidences = np.max(predictions, axis=1)
        
        # Décoder les labels
        labels = self.label_encoder.inverse_transform(predicted_classes)
        
        return labels, confidences
    
    def predict_batch(self, df, flow_id_col='Flow ID'):
        """
        Prédiction sur un DataFrame complet
        
        Args:
            df: DataFrame avec colonnes de trafic
            flow_id_col: Nom de la colonne Flow ID
            
        Returns:
            Liste de dictionnaires avec résultats
        """
        # Sauvegarder Flow IDs
        if flow_id_col in df.columns:
            flow_ids = df[flow_id_col].tolist()
        else:
            flow_ids = [f'flow_{i}' for i in range(len(df))]
        
        # Prétraitement
        X = self.preprocess(df)
        
        # Prédiction
        labels, confidences = self.predict(X)
        
        # Formater résultats
        results = []
        for i, (label, conf, flow_id) in enumerate(zip(labels, confidences, flow_ids)):
            results.append({
                'id': i + 1,
                'flow_id': str(flow_id),
                'prediction': str(label),
                'confidence': float(conf),
                'risk': self._calculate_risk(label, conf)
            })
        
        return results
    
    def _calculate_risk(self, label, confidence):
        """
        Calcule le niveau de risque
        
        Classes dangereuses:
        - DDoS, DoS: Déni de service
        - Infiltration: Intrusion
        - Bot: Botnet
        - PortScan: Scan de ports
        """
        high_risk_keywords = ['ddos', 'dos', 'infiltration', 'bot', 'portscan']
        
        label_lower = str(label).lower()
        is_dangerous = any(keyword in label_lower for keyword in high_risk_keywords)
        
        if is_dangerous:
            if confidence > 0.8:
                return 'High'
            elif confidence > 0.6:
                return 'Medium'
            else:
                return 'Low'
        else:
            return 'Low'
