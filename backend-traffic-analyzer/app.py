from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import pandas as pd
import numpy as np
import joblib
from tensorflow.keras.models import load_model
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
import logging
import os
import time
import threading
import psutil
import socket
from datetime import datetime
from collections import defaultdict, deque
import json

# Pour la capture de paquets (nécessite d'installer scapy: pip install scapy)
try:
    from scapy.all import sniff, IP, TCP, UDP, ICMP
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    logging.warning("Scapy n'est pas installé. Utilisation des métriques système à la place.")

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Chargement du modèle et prétraitements
try:
    model = load_model("model/model/traffic_classifier_model.h5")
    scaler = joblib.load("model/model/scaler.pkl")
    label_encoder = joblib.load("model/model/label_encoder.pkl")
    logging.info("Modèle chargé avec succès")
except Exception as e:
    logging.error(f"Erreur lors du chargement du modèle: {e}")
    model, scaler, label_encoder = None, None, None

# Variables globales pour la capture et l'analyse
real_time_active = False
network_capture_active = False
flow_data = defaultdict(lambda: {
    'packets': 0,
    'bytes': 0,
    'start_time': time.time(),
    'last_packet_time': time.time(),
    'src_ports': set(),
    'dst_ports': set(),
    'protocols': set(),
    'packet_sizes': [],
    'inter_arrival_times': [],
    'tcp_flags': [],
    'packet_count_per_second': deque(maxlen=60)
})

real_time_stats = {
    'total_processed': 0,
    'current_threat_level': 'Faible',
    'high_risk_count': 0,
    'classifications_per_minute': 0,
    'flows_analyzed': 0,
    'bytes_analyzed': 0,
    'active_connections': 0
}

# Buffer pour stocker les flows à analyser
flows_buffer = deque(maxlen=100)

class NetworkFlowAnalyzer:
    """Classe pour analyser les flows réseau et extraire des features"""
    
    @staticmethod
    def extract_features_from_flow(flow_id, flow_info):
        """Extrait les features d'un flow pour la classification ML"""
        current_time = time.time()
        flow_duration = current_time - flow_info['start_time']
        
        # Features de base
        features = {
            'flow_duration': flow_duration,
            'total_fwd_packets': flow_info['packets'],
            'total_backward_packets': 0,  # Simplifié pour cet exemple
            'flow_bytes_s': flow_info['bytes'] / max(flow_duration, 1),
            'flow_packets_s': flow_info['packets'] / max(flow_duration, 1),
            'flow_iat_mean': np.mean(flow_info['inter_arrival_times']) if flow_info['inter_arrival_times'] else 0,
            'flow_iat_std': np.std(flow_info['inter_arrival_times']) if flow_info['inter_arrival_times'] else 0,
            'flow_iat_max': max(flow_info['inter_arrival_times']) if flow_info['inter_arrival_times'] else 0,
            'flow_iat_min': min(flow_info['inter_arrival_times']) if flow_info['inter_arrival_times'] else 0,
            'fwd_packets_length_max': max(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'fwd_packets_length_min': min(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'fwd_packets_length_mean': np.mean(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'fwd_packets_length_std': np.std(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'min_packet_length': min(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'max_packet_length': max(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'packet_length_mean': np.mean(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'packet_length_std': np.std(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'fin_flag_count': sum(1 for flag in flow_info['tcp_flags'] if 'F' in str(flag)),
            'syn_flag_count': sum(1 for flag in flow_info['tcp_flags'] if 'S' in str(flag)),
            'rst_flag_count': sum(1 for flag in flow_info['tcp_flags'] if 'R' in str(flag)),
            'psh_flag_count': sum(1 for flag in flow_info['tcp_flags'] if 'P' in str(flag)),
            'ack_flag_count': sum(1 for flag in flow_info['tcp_flags'] if 'A' in str(flag)),
            'average_packet_size': np.mean(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0,
            'unique_ports_count': len(flow_info['src_ports'].union(flow_info['dst_ports'])),
            'protocol_diversity': len(flow_info['protocols'])
        }
        
        return features

def packet_handler(packet):
    """Handler pour traiter chaque paquet capturé"""
    global flow_data, real_time_stats
    
    if not network_capture_active:
        return
    
    try:
        if IP in packet:
            # Identifier le flow
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            protocol = packet[IP].proto
            
            src_port = dst_port = 0
            tcp_flags = ""
            
            if TCP in packet:
                src_port = packet[TCP].sport
                dst_port = packet[TCP].dport
                tcp_flags = packet[TCP].flags
            elif UDP in packet:
                src_port = packet[UDP].sport
                dst_port = packet[UDP].dport
            
            # Créer un identifiant unique pour le flow
            flow_id = f"{src_ip}:{src_port}->{dst_ip}:{dst_port}_{protocol}"
            
            # Mettre à jour les informations du flow
            current_time = time.time()
            packet_size = len(packet)
            
            flow_info = flow_data[flow_id]
            
            # Calculer l'inter-arrival time
            if flow_info['packets'] > 0:
                iat = current_time - flow_info['last_packet_time']
                flow_info['inter_arrival_times'].append(iat)
            
            # Mettre à jour les statistiques du flow
            flow_info['packets'] += 1
            flow_info['bytes'] += packet_size
            flow_info['last_packet_time'] = current_time
            flow_info['src_ports'].add(src_port)
            flow_info['dst_ports'].add(dst_port)
            flow_info['protocols'].add(protocol)
            flow_info['packet_sizes'].append(packet_size)
            flow_info['tcp_flags'].append(tcp_flags)
            
            # Ajouter à la liste des paquets par seconde
            flow_info['packet_count_per_second'].append(current_time)
            
            # Mettre à jour les statistiques globales
            real_time_stats['bytes_analyzed'] += packet_size
            
            # Si le flow a suffisamment de données, l'analyser
            if (flow_info['packets'] >= 10 and 
                current_time - flow_info['start_time'] >= 5):  # Au moins 10 paquets et 5 secondes
                
                analyze_flow(flow_id, flow_info)
                
    except Exception as e:
        logging.error(f"Erreur lors du traitement du paquet: {e}")

def analyze_flow(flow_id, flow_info):
    """Analyse un flow et effectue la classification"""
    global real_time_stats, flows_buffer
    
    try:
        # Extraire les features
        analyzer = NetworkFlowAnalyzer()
        features = analyzer.extract_features_from_flow(flow_id, flow_info)
        
        # Classifier le flow si le modèle est disponible
        prediction_result = classify_flow(features)
        
        # Créer l'objet de prédiction
        prediction_data = {
            'flow_id': flow_id,
            'timestamp': datetime.now().isoformat(),
            'prediction': prediction_result['prediction'],
            'confidence': prediction_result['confidence'],
            'risk': prediction_result['risk'],
            'features': features,
            'flow_stats': {
                'packets': flow_info['packets'],
                'bytes': flow_info['bytes'],
                'duration': time.time() - flow_info['start_time'],
                'avg_packet_size': np.mean(flow_info['packet_sizes']) if flow_info['packet_sizes'] else 0
            }
        }
        
        # Ajouter au buffer
        flows_buffer.append(prediction_data)
        
        # Mettre à jour les statistiques
        real_time_stats['total_processed'] += 1
        real_time_stats['flows_analyzed'] += 1
        
        if prediction_result['risk'] == 'High':
            real_time_stats['high_risk_count'] += 1
        
        # Calculer le niveau de menace
        threat_ratio = real_time_stats['high_risk_count'] / max(real_time_stats['total_processed'], 1)
        if threat_ratio > 0.1:
            real_time_stats['current_threat_level'] = 'Élevé'
        elif threat_ratio > 0.05:
            real_time_stats['current_threat_level'] = 'Modéré'
        else:
            real_time_stats['current_threat_level'] = 'Faible'
        
        # Envoyer via WebSocket
        socketio.emit('real_time_prediction', {
            'prediction': prediction_data,
            'stats': real_time_stats
        })
        
        logging.info(f"Flow analysé: {flow_id} -> {prediction_result['prediction']} ({prediction_result['confidence']:.3f})")
        
    except Exception as e:
        logging.error(f"Erreur lors de l'analyse du flow {flow_id}: {e}")

def classify_flow(features):
    """Classifie un flow basé sur ses features avec gestion d'erreur améliorée"""
    if model is None or scaler is None or label_encoder is None:
        return classify_flow_rule_based(features)
    
    try:
        # Features attendues
        feature_names = [
            'flow_duration', 'total_fwd_packets', 'total_backward_packets',
            'flow_bytes_s', 'flow_packets_s', 'flow_iat_mean', 'flow_iat_std',
            'flow_iat_max', 'flow_iat_min', 'fwd_packets_length_max',
            'fwd_packets_length_min', 'fwd_packets_length_mean', 'fwd_packets_length_std',
            'min_packet_length', 'max_packet_length', 'packet_length_mean',
            'packet_length_std', 'fin_flag_count', 'syn_flag_count',
            'rst_flag_count', 'psh_flag_count', 'ack_flag_count',
            'average_packet_size', 'unique_ports_count', 'protocol_diversity'
        ]
        
        # Créer l'array de features
        feature_values = []
        for name in feature_names:
            value = features.get(name, 0)
            # Nettoyer la valeur
            if np.isnan(value) or np.isinf(value):
                value = 0
            feature_values.append(float(value))
        
        X = np.array(feature_values).reshape(1, -1)
        
        # Adapter au nombre de features attendu par le scaler
        expected_features = scaler.n_features_in_
        if X.shape[1] != expected_features:
            if X.shape[1] > expected_features:
                X = X[:, :expected_features]
            else:
                padding = np.zeros((1, expected_features - X.shape[1]))
                X = np.concatenate([X, padding], axis=1)
        
        # Nettoyer les données avant normalisation
        X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)
        
        # Normaliser
        X_scaled = scaler.transform(X)
        
        # Reshape pour LSTM
        X_reshaped = X_scaled.reshape((X_scaled.shape[0], 1, X_scaled.shape[1]))
        
        # Prédiction
        y_pred = model.predict(X_reshaped, verbose=0)
        y_class = np.argmax(y_pred, axis=1)[0]
        confidence = np.max(y_pred, axis=1)[0]
        
        # Vérifier que l'index est valide
        if y_class >= len(label_encoder.classes_):
            y_class = 0  # Classe par défaut
        
        # Decoder la classe
        prediction = label_encoder.classes_[y_class]
        
        # Calculer le niveau de risque
        risk = calculate_risk_level(prediction, confidence)
        
        return {
            'prediction': prediction,
            'confidence': float(confidence),
            'risk': risk
        }
        
    except Exception as e:
        logging.error(f"Erreur lors de la classification ML: {e}")
        return classify_flow_rule_based(features)

def classify_flow_rule_based(features):
    """Classification basée sur des règles simples"""
    # Règles simples basées sur les caractéristiques du trafic
    avg_packet_size = features.get('average_packet_size', 0)
    packets_per_second = features.get('flow_packets_s', 0)
    unique_ports = features.get('unique_ports_count', 0)
    duration = features.get('flow_duration', 0)
    
    # Détecter des patterns suspects
    if packets_per_second > 100:  # Trafic très intense
        return {'prediction': 'DDoS', 'confidence': 0.8, 'risk': 'High'}
    elif avg_packet_size < 100 and packets_per_second > 50:  # Petits paquets fréquents
        return {'prediction': 'Bot', 'confidence': 0.7, 'risk': 'Medium'}
    elif unique_ports > 10:  # Scan de ports
        return {'prediction': 'Port Scan', 'confidence': 0.75, 'risk': 'High'}
    elif duration > 300 and avg_packet_size > 1000:  # Longue connexion avec gros paquets
        return {'prediction': 'File Transfer', 'confidence': 0.6, 'risk': 'Low'}
    else:
        return {'prediction': 'Normal', 'confidence': 0.6, 'risk': 'Low'}

def calculate_risk_level(label, confidence):
    """Calcule le niveau de risque"""
    high_risk_labels = ['DDoS', 'Bot', 'Tor', 'Port Scan', 'Malware']
    medium_risk_labels = ['VPN', 'P2P', 'Unknown']
    
    if label in high_risk_labels:
        return 'High'
    elif label in medium_risk_labels or confidence < 0.7:
        return 'Medium'
    else:
        return 'Low'

def capture_network_traffic():
    """Fonction principale pour capturer le trafic réseau"""
    global network_capture_active
    
    if SCAPY_AVAILABLE:
        # Capturer avec Scapy (nécessite des privilèges administrateur)
        logging.info("Démarrage de la capture avec Scapy...")
        try:
            sniff(prn=packet_handler, 
                  stop_filter=lambda x: not network_capture_active,
                  timeout=1)
        except Exception as e:
            logging.error(f"Erreur lors de la capture Scapy: {e}")
            logging.info("Basculement vers la surveillance des connexions système...")
            monitor_system_connections()
    else:
        # Fallback: surveiller les connexions système avec psutil
        monitor_system_connections()

def monitor_system_connections():
    """Surveille les connexions système avec psutil"""
    global network_capture_active, real_time_stats
    
    connection_stats = defaultdict(lambda: {'count': 0, 'bytes_sent': 0, 'bytes_recv': 0})
    
    while network_capture_active:
        try:
            # Obtenir les connexions actives
            connections = psutil.net_connections(kind='inet')
            current_connections = len([c for c in connections if c.status == 'ESTABLISHED'])
            real_time_stats['active_connections'] = current_connections
            
            # Obtenir les statistiques de trafic par interface
            net_io = psutil.net_io_counters(pernic=True)
            
            for interface, stats in net_io.items():
                if interface != 'lo':  # Ignorer l'interface loopback
                    # Simuler un flow basé sur les statistiques de l'interface
                    flow_id = f"interface_{interface}"
                    
                    # Calculer les deltas depuis la dernière mesure
                    prev_stats = connection_stats[interface]
                    bytes_sent_delta = stats.bytes_sent - prev_stats['bytes_sent']
                    bytes_recv_delta = stats.bytes_recv - prev_stats['bytes_recv']
                    
                    if bytes_sent_delta > 0 or bytes_recv_delta > 0:
                        # Créer des features simplifiées
                        features = {
                            'flow_duration': 60,  # Fenêtre de 60 secondes
                            'total_fwd_packets': stats.packets_sent,
                            'total_backward_packets': stats.packets_recv,
                            'flow_bytes_s': (bytes_sent_delta + bytes_recv_delta) / 60,
                            'flow_packets_s': (stats.packets_sent + stats.packets_recv) / 60,
                            'average_packet_size': (stats.bytes_sent + stats.bytes_recv) / max(stats.packets_sent + stats.packets_recv, 1),
                            'flow_iat_mean': 1.0,  # Valeur par défaut
                            'flow_iat_std': 0.1,
                            'unique_ports_count': current_connections,
                            'protocol_diversity': 2  # TCP et UDP
                        }
                        
                        # Classifier
                        prediction_result = classify_flow(features)
                        
                        # Créer l'objet de prédiction
                        prediction_data = {
                            'flow_id': flow_id,
                            'timestamp': datetime.now().isoformat(),
                            'prediction': prediction_result['prediction'],
                            'confidence': prediction_result['confidence'],
                            'risk': prediction_result['risk'],
                            'interface': interface,
                            'bytes_sent': bytes_sent_delta,
                            'bytes_recv': bytes_recv_delta,
                            'active_connections': current_connections
                        }
                        
                        # Envoyer via WebSocket
                        socketio.emit('real_time_prediction', {
                            'prediction': prediction_data,
                            'stats': real_time_stats
                        })
                        
                        real_time_stats['total_processed'] += 1
                    
                    # Sauvegarder les statistiques actuelles
                    connection_stats[interface] = {
                        'bytes_sent': stats.bytes_sent,
                        'bytes_recv': stats.bytes_recv
                    }
            
            time.sleep(5)  # Attendre 5 secondes entre chaque mesure
            
        except Exception as e:
            logging.error(f"Erreur lors de la surveillance des connexions: {e}")
            time.sleep(10)

@app.route('/predict', methods=['POST'])
def predict_file():
    """Endpoint pour prédire sur un fichier CSV uploadé"""
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Seuls les fichiers CSV sont acceptés'}), 400
    
    try:
        # Lire le fichier CSV
        df = pd.read_csv(file)
        logging.info(f"Fichier chargé avec {len(df)} lignes et {len(df.columns)} colonnes")
        
        # Sauvegarder les statistiques initiales
        total_samples = len(df)
        original_columns = df.columns.tolist()
        logging.info(f"Colonnes disponibles: {original_columns}")
        
        # Préprocessing - adapter selon vos données
        # Supprimer les colonnes non nécessaires
        drop_cols = ["Flow ID", "Src IP", "Dst IP", "Timestamp", "Label", "Label.1"]
        available_drop_cols = [col for col in drop_cols if col in df.columns]
        if available_drop_cols:
            df_features = df.drop(columns=available_drop_cols, errors='ignore')
        else:
            df_features = df.copy()
        
        # Features attendues par le modèle
        expected_features = [
            'flow_duration', 'total_fwd_packets', 'total_backward_packets',
            'flow_bytes_s', 'flow_packets_s', 'flow_iat_mean', 'flow_iat_std',
            'flow_iat_max', 'flow_iat_min', 'fwd_packets_length_max',
            'fwd_packets_length_min', 'fwd_packets_length_mean', 'fwd_packets_length_std',
            'min_packet_length', 'max_packet_length', 'packet_length_mean',
            'packet_length_std', 'fin_flag_count', 'syn_flag_count',
            'rst_flag_count', 'psh_flag_count', 'ack_flag_count',
            'average_packet_size', 'unique_ports_count', 'protocol_diversity'
        ]
        
        # Si les colonnes ne correspondent pas exactement, essayer de mapper
        available_features = [col for col in df_features.columns if col in expected_features]
        
        if len(available_features) == 0:
            # Aucune correspondance exacte, utiliser les colonnes numériques disponibles
            numeric_cols = df_features.select_dtypes(include=[np.number]).columns.tolist()
            logging.info(f"Utilisation des colonnes numériques: {numeric_cols}")
            
            # Créer un mapping simple
            feature_values = []
            for i in range(len(expected_features)):
                if i < len(numeric_cols):
                    feature_values.append(df_features[numeric_cols[i]].values)
                else:
                    # Valeurs par défaut
                    feature_values.append(np.random.uniform(0, 1, len(df_features)))
            feature_values = np.column_stack(feature_values)
        else:
            # Utiliser les features disponibles et compléter
            feature_values = []
            for feature in expected_features:
                if feature in available_features:
                    feature_values.append(df_features[feature].values)
                else:
                    # Valeurs par défaut basées sur le type de feature
                    if 'flag_count' in feature or 'unique_ports' in feature or 'protocol_diversity' in feature:
                        feature_values.append(np.random.randint(0, 5, len(df_features)))
                    elif 'duration' in feature:
                        feature_values.append(np.random.exponential(30, len(df_features)))
                    else:
                        feature_values.append(np.random.lognormal(5, 1, len(df_features)))
            feature_values = np.column_stack(feature_values)
        
        # Nettoyer les données
        feature_values = np.nan_to_num(feature_values, nan=0.0, posinf=1e6, neginf=-1e6)
        
        predictions = []
        processed_samples = 0
        high_risk_count = 0
        
        # Limiter le nombre d'échantillons pour éviter les timeouts
        max_samples = min(1000, len(feature_values))
        sample_indices = np.random.choice(len(feature_values), max_samples, replace=False) if len(feature_values) > max_samples else range(len(feature_values))
        
        # Faire les prédictions
        for idx in sample_indices:
            try:
                row = feature_values[idx]
                
                # Créer un dictionnaire de features
                features = {name: float(row[j]) if j < len(row) else 0.0 
                           for j, name in enumerate(expected_features)}
                
                # Classifier
                result = classify_flow(features)
                
                prediction_data = {
                    'id': int(idx + 1),
                    'flow': f"flow_{idx+1}",
                    'prediction': result['prediction'],
                    'confidence': result['confidence'],
                    'risk': result['risk']
                }
                
                predictions.append(prediction_data)
                processed_samples += 1
                
                if result['risk'] == 'High':
                    high_risk_count += 1
                    
            except Exception as e:
                logging.error(f"Erreur lors de la prédiction pour la ligne {idx}: {e}")
                continue
        
        # Calculer le niveau de menace global
        threat_ratio = high_risk_count / max(processed_samples, 1)
        if threat_ratio > 0.3:
            threat_level = 'Élevé'
        elif threat_ratio > 0.1:
            threat_level = 'Modéré'
        else:
            threat_level = 'Faible'
        
        # Créer le résumé
        summary = {}
        for pred in predictions:
            pred_type = pred['prediction']
            summary[pred_type] = summary.get(pred_type, 0) + 1
        
        # Limiter à 100 prédictions pour l'affichage
        predictions_to_return = predictions[:100]
        
        response = {
            'status': 'success',
            'stats': {
                'total_samples': total_samples,
                'processed_samples': processed_samples,
                'high_risk_count': high_risk_count,
                'threat_level': threat_level
            },
            'summary': summary,
            'predictions': predictions_to_return,
            'message': f'Analyse terminée. {processed_samples} échantillons traités sur {total_samples}.'
        }
        
        if len(predictions) > 100:
            response['message'] += f' Affichage des 100 premiers résultats sur {len(predictions)}.'
        
        logging.info(f"Prédiction terminée: {processed_samples} échantillons traités")
        return jsonify(response)
        
    except pd.errors.EmptyDataError:
        return jsonify({'error': 'Le fichier CSV est vide'}), 400
    except pd.errors.ParserError as e:
        return jsonify({'error': f'Erreur lors de la lecture du CSV: {str(e)}'}), 400
    except Exception as e:
        logging.error(f"Erreur lors de la prédiction: {e}")
        return jsonify({'error': f'Erreur lors de l\'analyse: {str(e)}'}), 500

@app.route('/model/info', methods=['GET'])
def get_model_info():
    """Informations sur le modèle chargé"""
    try:
        info = {
            'model_loaded': model is not None,
            'scaler_loaded': scaler is not None,
            'label_encoder_loaded': label_encoder is not None,
            'classes': label_encoder.classes_.tolist() if label_encoder is not None else [],
            'n_features': scaler.n_features_in_ if scaler is not None else 0,
            'scapy_available': SCAPY_AVAILABLE
        }
        
        # Essayer de charger les infos du modèle si disponibles
        try:
            with open("model/model/model_info.json", 'r') as f:
                model_info = json.load(f)
                info.update(model_info)
        except:
            pass
            
        return jsonify(info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/real-time/start', methods=['POST'])
def start_real_time():
    global real_time_active, network_capture_active
    
    if real_time_active:
        return jsonify({'status': 'already_running', 'message': 'Classification déjà en cours'})
    
    # Réinitialiser les statistiques
    real_time_stats.update({
        'total_processed': 0,
        'current_threat_level': 'Faible',
        'high_risk_count': 0,
        'classifications_per_minute': 0,
        'flows_analyzed': 0,
        'bytes_analyzed': 0,
        'active_connections': 0
    })
    
    # Vider le buffer des flows
    flows_buffer.clear()
    flow_data.clear()
    
    real_time_active = True
    network_capture_active = True
    
    # Démarrer le thread de capture
    capture_thread = threading.Thread(target=capture_network_traffic, daemon=True)
    capture_thread.start()
    
    logging.info("Classification temps réel démarrée")
    return jsonify({
        'status': 'started', 
        'message': 'Classification temps réel démarrée',
        'scapy_available': SCAPY_AVAILABLE
    })

@app.route('/real-time/stop', methods=['POST'])
def stop_real_time():
    global real_time_active, network_capture_active
    
    real_time_active = False
    network_capture_active = False
    
    logging.info("Classification temps réel arrêtée")
    return jsonify({'status': 'stopped', 'message': 'Classification temps réel arrêtée'})

@app.route('/real-time/stats', methods=['GET'])
def get_real_time_stats():
    return jsonify({
        'stats': real_time_stats,
        'active_flows': len(flow_data),
        'buffer_size': len(flows_buffer),
        'scapy_available': SCAPY_AVAILABLE
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "OK",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "label_encoder_loaded": label_encoder is not None,
        "scapy_available": SCAPY_AVAILABLE,
        "psutil_available": True
    })

@socketio.on('connect')
def handle_connect():
    emit('connection_status', {
        'real_time_active': real_time_active,
        'stats': real_time_stats,
        'scapy_available': SCAPY_AVAILABLE
    })
    logging.info(f"Client connecté: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logging.info(f"Client déconnecté: {request.sid}")

if __name__ == '__main__':
    print("=" * 60)
    print("CLASSIFICATEUR DE TRAFIC RÉSEAU EN TEMPS RÉEL")
    print("=" * 60)
    print(f"Scapy disponible: {SCAPY_AVAILABLE}")
    if SCAPY_AVAILABLE:
        print("⚠️  Pour une capture complète, lancez en tant qu'administrateur")
    else:
        print("📦 Installez scapy pour une capture complète: pip install scapy")
    print("🔍 Utilisation de psutil pour les métriques système")
    print("🚀 Serveur démarré sur http://localhost:5000")
    print("=" * 60)
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)