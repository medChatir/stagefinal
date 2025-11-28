// services/socket.js - Version robuste avec retry et fallback
import { io } from 'socket.io-client';

let socket = null;

// Configuration avec fallback
const POSSIBLE_SOCKET_URLS = [
  import.meta.env.VITE_SOCKET_URL,
  import.meta.env.VITE_API_URL,
  'http://localhost:5000',
  'http://127.0.0.1:5000'
].filter(Boolean); // Enlever les undefined/null

console.log('🔌 Socket URLs possibles:', POSSIBLE_SOCKET_URLS);

export function createSocket(preferredUrl = null, opts = {}) {
  if (socket?.connected) {
    console.log('🔌 Socket déjà connecté:', socket.id);
    return socket;
  }
  
  // Si un socket existe mais n'est pas connecté, le détruire
  if (socket) {
    console.log('🔌 Destruction de l\'ancien socket...');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  
  const socketUrls = preferredUrl ? [preferredUrl, ...POSSIBLE_SOCKET_URLS] : POSSIBLE_SOCKET_URLS;
  const baseUrl = socketUrls[0];
  
  console.log('🔌 Tentative de connexion Socket.IO à:', baseUrl);
  
  socket = io(baseUrl, {
    transports: ['websocket', 'polling'], // Essayer websocket d'abord
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    ...opts
  });

  // Events de debug détaillés
  socket.on('connect', () => {
    console.log('✅ Socket connecté:', socket.id);
    console.log('   Transport:', socket.io.engine.transport.name);
    console.log('   URL:', baseUrl);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket déconnecté:', reason);
    if (reason === 'io server disconnect') {
      // Le serveur a fermé la connexion, reconnecter manuellement
      console.log('🔄 Reconnexion manuelle...');
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    console.error('   Description:', error.description);
    console.error('   Type:', error.type);
    
    // Si échec sur cette URL, essayer la suivante
    const currentIndex = socketUrls.indexOf(baseUrl);
    if (currentIndex < socketUrls.length - 1) {
      const nextUrl = socketUrls[currentIndex + 1];
      console.log(`🔄 Essai URL suivante: ${nextUrl}`);
      // Recréer le socket avec la nouvelle URL
      setTimeout(() => {
        disconnectSocket();
        createSocket(nextUrl, opts);
      }, 2000);
    }
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconnecté après', attemptNumber, 'tentatives');
  });
  
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 Tentative de reconnexion', attemptNumber);
  });
  
  socket.on('reconnect_error', (error) => {
    console.error('❌ Erreur de reconnexion:', error.message);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('❌ Reconnexion échouée après toutes les tentatives');
  });

  // Événements personnalisés
  socket.on('real_time_prediction', (data) => {
    console.log('📊 Prédiction temps réel reçue:', data);
  });
  
  socket.on('network_packet', (data) => {
    console.log('📦 Paquet réseau reçu:', data);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log('🔌 Déconnexion du socket...');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

// Helper pour vérifier si connecté
export function isSocketConnected() {
  return socket?.connected ?? false;
}

// Helper pour reconnecter manuellement
export function reconnectSocket() {
  if (socket && !socket.connected) {
    console.log('🔄 Reconnexion manuelle du socket...');
    socket.connect();
  } else if (!socket) {
    console.log('🔄 Création d\'un nouveau socket...');
    createSocket();
  }
}