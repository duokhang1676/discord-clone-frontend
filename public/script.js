// Socket.io connection - connect to Railway server
const storedUsername = localStorage.getItem('username');
const SOCKET_SERVER = 'https://discord-clone-frontend-production.up.railway.app';
const socket = io(SOCKET_SERVER, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
  query: {
    username: storedUsername || 'Guest'
  }
});

// Socket connection events
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
  console.log('Connected to:', SOCKET_SERVER);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
  console.error('Trying to connect to:', SOCKET_SERVER);
  yourName.textContent = 'Connection Error - Check Console (F12)';
});

socket.on('disconnect', (reason) => {
  console.log('❌ Socket disconnected:', reason);
  yourName.textContent = 'Disconnected - Reconnecting...';
  
  // End call if disconnected
  if (peerConnection) {
    endCall();
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
  yourName.textContent = storedUsername || 'Guest';
  
  // Request updated user list
  socket.emit('user-list');
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('🔄 Reconnection attempt', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('❌ Reconnection error:', error);
});

socket.on('reconnect_failed', () => {
  console.error('❌ Reconnection failed completely');
  yourName.textContent = 'Connection Failed - Please Refresh';
});

// WebRTC configuration
const configuration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Public TURN servers (fallback for restricted networks)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  // Improve ICE gathering
  iceCandidatePoolSize: 10,
  // Use unified plan (modern standard)
  sdpSemantics: 'unified-plan'
};

// Global variables
let localStream = null;
let peerConnection = null;
let currentUserId = null;
let connectedToUserId = null;
let isMicMuted = false;
let isSpeakerMuted = false;

// DOM elements
const userList = document.getElementById('user-list');
const yourName = document.getElementById('your-name');
const connectionStatus = document.getElementById('connection-status');
const micBtn = document.getElementById('mic-btn');
const speakerBtn = document.getElementById('speaker-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const remoteAudio = document.getElementById('remote-audio');
const localAudioBars = document.querySelector('.audio-bars:not(.remote)');
const remoteAudioBars = document.querySelector('.audio-bars.remote');

// Socket event listeners
socket.on('user-info', async (user) => {
  currentUserId = user.id;
  
  // Display username from server
  yourName.textContent = user.name;
  console.log('Connected as:', user.name);
  
  // Initialize chat elements after DOM is ready
  if (initializeChatElements()) {
    // Load chat history
    await loadMessageHistory();
  } else {
    console.error('⚠️ Chat initialization failed - chat features may not work');
  }
  
  // Initialize local stream when connected
  await initializeLocalStream();
});

socket.on('user-list', (users) => {
  updateUserList(users);
});

// Handle when another user disconnects
socket.on('user-disconnected', (userId) => {
  console.log('🚪 User disconnected:', userId);
  
  // If we were connected to this user, cleanup the peer connection
  if (connectedToUserId === userId) {
    console.log('⚠️ Cleaning up connection to disconnected user');
    endCall();
    
    // Show notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ed4245;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = '🚪 User disconnected from call';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // Request updated user list
  socket.emit('get-user-list');
});

socket.on('offer', async (data) => {
  console.log('Received offer from:', data.from);
  
  // Cleanup existing connection before accepting new offer
  if (peerConnection) {
    console.log('⚠️ Cleaning up existing connection before accepting new offer');
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
    peerConnection = null;
  }
  
  if (!localStream) {
    await initializeLocalStream();
  }

  connectedToUserId = data.from;
  await createPeerConnection(data.from);
  
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('answer', {
      answer: answer,
      to: data.from
    });
    
    updateConnectionStatus(true);
  } catch (error) {
    console.error('Error handling offer:', error);
  }
});

socket.on('answer', async (data) => {
  console.log('Received answer from:', data.from);
  
  try {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      updateConnectionStatus(true);
    }
  } catch (error) {
    console.error('Error handling answer:', error);
  }
});

socket.on('ice-candidate', async (data) => {
  console.log('Received ICE candidate from:', data.from);
  
  if (peerConnection && data.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }
});

// UI functions
function updateUserList(users) {
  userList.innerHTML = '';
  
  users.forEach(user => {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    
    if (user.id === currentUserId) {
      userItem.classList.add('self');
      userItem.innerHTML = `<span>👤</span> ${user.name} (You)`;
    } else {
      userItem.innerHTML = `<span>👤</span> ${user.name}`;
      
      if (connectedToUserId === user.id) {
        userItem.classList.add('calling');
      }
      
      // Add click event to start call
      userItem.addEventListener('click', () => startCall(user.id));
    }
    
    userList.appendChild(userItem);
  });
}

function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.className = 'status-connected';
    connectionStatus.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-text">Connected</span>
    `;
    disconnectBtn.disabled = false;
  } else {
    connectionStatus.className = 'status-disconnected';
    connectionStatus.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-text">Ready</span>
    `;
    disconnectBtn.disabled = true;
  }
}

// WebRTC functions
async function initializeLocalStream() {
  if (localStream) return;
  
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    // Enable audio by default
    localStream.getAudioTracks().forEach(track => {
      track.enabled = true;
      console.log('🎤 Local audio track enabled:', track.label);
    });
    
    // Update UI
    isMicMuted = false;
    micBtn.classList.add('active');
    micBtn.innerHTML = `
      <span class="icon">🎤</span>
      <span class="btn-text">Microphone On</span>
    `;
    
    // Animate local audio bars
    if (localAudioBars) {
      localAudioBars.classList.add('active');
    }
    
    updateConnectionStatus(false);
    
    console.log('✅ Local stream initialized');
  } catch (error) {
    console.error('Error accessing microphone:', error);
    
    let errorMessage = 'Không thể truy cập microphone.\n\n';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage += '❌ Bạn đã từ chối quyền truy cập microphone.\n\n';
      errorMessage += '✅ Giải pháp:\n';
      errorMessage += '1. Click vào biểu tượng khóa/camera bên trái thanh địa chỉ\n';
      errorMessage += '2. Cho phép quyền Microphone\n';
      errorMessage += '3. Refresh lại trang và thử lại';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage += '❌ Không tìm thấy microphone.\n\n';
      errorMessage += '✅ Giải pháp:\n';
      errorMessage += '1. Kiểm tra microphone đã kết nối chưa\n';
      errorMessage += '2. Kiểm tra trong Settings > Sound\n';
      errorMessage += '3. Thử lại sau khi kết nối microphone';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage += '❌ Microphone đang được sử dụng bởi ứng dụng khác.\n\n';
      errorMessage += '✅ Giải pháp:\n';
      errorMessage += '1. Đóng các ứng dụng đang dùng microphone\n';
      errorMessage += '2. Refresh lại trang và thử lại';
    } else {
      errorMessage += '❌ Lỗi: ' + error.message;
    }
    
    alert(errorMessage);
  }
}

async function startCall(userId) {
  if (peerConnection) {
    console.log('Disconnecting previous call...');
    endCall();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!localStream) {
    alert('Vui lòng cho phép quyền Microphone trước!');
    await initializeLocalStream();
    return;
  }

  console.log('Starting call with:', userId);
  connectedToUserId = userId;
  
  await createPeerConnection(userId);
  
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('offer', {
      offer: offer,
      to: userId
    });
    
    socket.emit('user-list');
  } catch (error) {
    console.error('Error starting call:', error);
  }
}

async function createPeerConnection(userId) {
  peerConnection = new RTCPeerConnection(configuration);
  
  // Add local stream to peer connection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log('Added track to peer connection:', track.kind);
    });
    console.log('✅ Added local stream to peer connection');
  }

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    console.log('🔊 Received remote track:', event.track.kind);
    console.log('Remote stream:', event.streams[0]);
    
    if (event.streams && event.streams[0]) {
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.volume = isSpeakerMuted ? 0 : 1.0;
      
      // Ensure audio plays
      remoteAudio.play().then(() => {
        console.log('✅ Remote audio is playing');
      }).catch(e => {
        console.error('❌ Error playing remote audio:', e);
      });
      
      // Check audio tracks
      const audioTracks = event.streams[0].getAudioTracks();
      console.log('Audio tracks:', audioTracks.length);
      audioTracks.forEach(track => {
        console.log('Track enabled:', track.enabled, 'muted:', track.muted);
      });
      
      // Animate remote audio bars
      if (remoteAudioBars) {
        remoteAudioBars.classList.add('active');
      }
    }
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        candidate: event.candidate,
        to: userId
      });
    }
  };

  // Handle ICE connection state changes (more reliable than connectionState)
  peerConnection.oniceconnectionstatechange = () => {
    console.log('🧊 ICE Connection State:', peerConnection.iceConnectionState);
    
    const state = peerConnection.iceConnectionState;
    
    if (state === 'failed') {
      console.error('❌ ICE connection failed - attempting to reconnect...');
      // Try to restart ICE
      attemptReconnect();
    } else if (state === 'disconnected') {
      console.warn('⚠️ ICE disconnected - waiting for recovery...');
      // Wait a bit before ending call (might recover)
      setTimeout(() => {
        if (peerConnection && peerConnection.iceConnectionState === 'disconnected') {
          console.error('❌ ICE still disconnected after 10s - ending call');
          endCall();
        }
      }, 10000); // Wait 10 seconds for recovery
    } else if (state === 'connected' || state === 'completed') {
      console.log('✅ ICE connection established!');
    } else if (state === 'closed') {
      endCall();
    }
  };

  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log('📡 Connection state:', peerConnection.connectionState);
    
    if (peerConnection.connectionState === 'failed') {
      console.error('❌ Connection failed');
      attemptReconnect();
    } else if (peerConnection.connectionState === 'closed') {
      endCall();
    }
  };
}

// Attempt to reconnect when ICE fails
async function attemptReconnect() {
  if (!connectedToUserId || !peerConnection) {
    console.log('No active call to reconnect');
    return;
  }
  
  console.log('🔄 Attempting to restart ICE...');
  
  try {
    // Create a new offer with iceRestart
    const offer = await peerConnection.createOffer({ iceRestart: true });
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('offer', {
      offer: offer,
      to: connectedToUserId
    });
    
    console.log('✅ ICE restart offer sent');
  } catch (error) {
    console.error('❌ Failed to restart ICE:', error);
    endCall();
  }
}

function endCall() {
  console.log('Ending call');
  
  if (peerConnection) {
    // Close peer connection properly
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.onconnectionstatechange = null;
    
    peerConnection.close();
    peerConnection = null;
    console.log('✅ Peer connection closed and cleaned up');
  }
  
  connectedToUserId = null;
  
  // Stop remote audio
  remoteAudio.srcObject = null;
  
  // Stop audio bar animations
  if (remoteAudioBars) {
    remoteAudioBars.classList.remove('active');
  }
  
  updateConnectionStatus(false);
  
  // Refresh user list
  socket.emit('user-list');
}

// Button event listeners
micBtn.addEventListener('click', () => {
  if (!localStream) return;
  
  const audioTrack = localStream.getAudioTracks()[0];
  
  if (audioTrack) {
    isMicMuted = !isMicMuted;
    audioTrack.enabled = !isMicMuted;
    
    if (isMicMuted) {
      micBtn.classList.remove('active');
      micBtn.innerHTML = `🔇
        <span class="icon">🎤</span>
        <span class="btn-text">Microphone Off</span>
      `;
      if (localAudioBars) {
        localAudioBars.classList.remove('active');
      }
    } else {
      micBtn.classList.add('active');
      micBtn.innerHTML = `
        <span class="icon">🎤</span>
        <span class="btn-text">Microphone On</span>
      `;
      if (localAudioBars) {
        localAudioBars.classList.add('active');
      }
    }
    
    console.log('Microphone', isMicMuted ? 'muted' : 'unmuted');
  }
});

speakerBtn.addEventListener('click', () => {
  isSpeakerMuted = !isSpeakerMuted;
  
  // Update remote audio volume
  if (remoteAudio) {
    remoteAudio.volume = isSpeakerMuted ? 0 : 1.0;
  }
  
  if (isSpeakerMuted) {
    speakerBtn.classList.remove('active');
    speakerBtn.innerHTML = `
      <span class="icon">🔇</span>
      <span class="btn-text">Speaker Off</span>
    `;
    if (remoteAudioBars) {
      remoteAudioBars.classList.remove('active');
    }
  } else {
    speakerBtn.classList.add('active');
    speakerBtn.innerHTML = `
      <span class="icon">🔊</span>
      <span class="btn-text">Speaker On</span>
    `;
    if (remoteAudioBars && remoteAudio.srcObject) {
      remoteAudioBars.classList.add('active');
    }
  }
  
  console.log('Speaker', isSpeakerMuted ? 'muted' : 'unmuted');
});

disconnectBtn.addEventListener('click', () => {
  endCall();
});

// ==================== CHAT FUNCTIONALITY ====================

// Chat elements (initialized after DOM ready)
let chatMessages;
let chatInput;
let sendBtn;
let clearChatBtn;

// Initialize chat elements
function initializeChatElements() {
  chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  sendBtn = document.getElementById('send-btn');
  clearChatBtn = document.getElementById('clear-chat-btn');
  
  if (!chatMessages || !chatInput || !sendBtn) {
    console.error('❌ Chat elements not found in DOM!');
    console.log('chatMessages:', chatMessages);
    console.log('chatInput:', chatInput);
    console.log('sendBtn:', sendBtn);
    return false;
  }
  
  console.log('✅ Chat elements initialized successfully');
  
  // Add event listeners
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', clearChatHistory);
  }
  
  // Image upload event listeners
  const imageInput = document.getElementById('image-input');
  const imageBtn = document.getElementById('image-btn');
  
  if (imageBtn && imageInput) {
    imageBtn.addEventListener('click', () => {
      imageInput.click();
    });
    
    imageInput.addEventListener('change', handleImageUpload);
  }
  
  return true;
}

// Load message history from backend
async function loadMessageHistory() {
  if (!chatMessages) {
    console.error('❌ Cannot load messages: chatMessages element is null');
    return;
  }
  
  console.log('📥 Loading message history...');
  
  try {
    const headers = {};
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    const response = await fetch('https://discord-clone-mp22.onrender.com/api/messages', {
      credentials: 'include',
      headers: headers
    });
    const data = await response.json();
    
    if (data.success) {
      chatMessages.innerHTML = '';
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          displayMessage(
            msg.username, 
            msg.message, 
            msg.timestamp, 
            msg.user_id === currentUserId,
            msg.type || 'text',
            msg.imageUrl || null
          );
        });
      } else {
        chatMessages.innerHTML = '<div class="loading-messages">No messages yet. Start the conversation!</div>';
      }
      scrollToBottom();
    }
  } catch (error) {
    console.error('Failed to load messages:', error);
    chatMessages.innerHTML = '<div class="error-message">Failed to load messages. Check your connection.</div>';
  }
}

// Send message
function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Disable send button temporarily
  sendBtn.disabled = true;
  
  socket.emit('chat-message', {
    message: message,
    username: yourName.textContent,
    timestamp: new Date().toISOString()
  });
  
  chatInput.value = '';
  
  // Re-enable after short delay
  setTimeout(() => {
    sendBtn.disabled = false;
    chatInput.focus();
  }, 500);
}

// Handle image upload to Cloudinary
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('⚠️ Please select an image file');
    return;
  }
  
  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    alert('⚠️ Image too large! Maximum size is 5MB');
    return;
  }
  
  console.log('📤 Uploading image to Cloudinary...');
  
  // Show uploading indicator
  const imageBtn = document.getElementById('image-btn');
  const originalContent = imageBtn.innerHTML;
  imageBtn.innerHTML = '<span>⏳</span>';
  imageBtn.disabled = true;
  
  try {
    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'parking-data');
    
    const response = await fetch('https://api.cloudinary.com/v1_1/dcs6zqppp/image/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    const imageUrl = data.secure_url;
    
    console.log('✅ Image uploaded:', imageUrl);
    
    // Send image message via socket
    socket.emit('chat-message', {
      type: 'image',
      imageUrl: imageUrl,
      message: '[Image]',
      username: yourName.textContent,
      timestamp: new Date().toISOString()
    });
    
    // Clear file input
    event.target.value = '';
    
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    alert('Failed to upload image. Please try again.');
  } finally {
    // Restore button
    imageBtn.innerHTML = originalContent;
    imageBtn.disabled = false;
  }
}

// Receive message from socket
socket.on('chat-message', (data) => {
  console.log('💬 Received message:', data);
  displayMessage(
    data.username, 
    data.message, 
    data.timestamp,
    data.user_id === currentUserId,
    data.type || 'text',
    data.imageUrl
  );
  scrollToBottom();
});

// Display message in UI
function displayMessage(username, message, timestamp, isSelf, type = 'text', imageUrl = null) {
  // Remove loading message if exists
  const loadingMsg = chatMessages.querySelector('.loading-messages');
  if (loadingMsg) {
    loadingMsg.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isSelf ? 'self' : ''}`;
  
  const time = new Date(timestamp).toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (type === 'image' && imageUrl) {
    messageDiv.innerHTML = `
      <span class="username">${escapeHtml(username)}</span>
      <div class="image-message">
        <img src="${escapeHtml(imageUrl)}" 
             alt="Shared image" 
             loading="lazy"
             onclick="window.open('${escapeHtml(imageUrl)}', '_blank')"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3E❌ Image failed%3C/text%3E%3C/svg%3E'">
      </div>
      <span class="timestamp">${time}</span>
    `;
  } else {
    messageDiv.innerHTML = `
      <span class="username">${escapeHtml(username)}</span>
      <span class="text">${escapeHtml(message)}</span>
      <span class="timestamp">${time}</span>
    `;
  }
  
  chatMessages.appendChild(messageDiv);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Scroll to bottom of chat
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Clear chat history
async function clearChatHistory() {
  if (!confirm('Are you sure you want to clear all messages?')) {
    return;
  }
  
  try {
    const headers = {};
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    const response = await fetch('https://discord-clone-mp22.onrender.com/api/messages/clear', {
      method: 'DELETE',
      credentials: 'include',
      headers: headers
    });
    
    const data = await response.json();
    
    if (data.success) {
      chatMessages.innerHTML = '<div class="loading-messages">Chat cleared. Start a new conversation!</div>';
      console.log(`✅ Cleared ${data.deleted_count} messages`);
    }
  } catch (error) {
    console.error('Failed to clear messages:', error);
    alert('Failed to clear messages. Please try again.');
  }
}

// Note: Event listeners are now attached in initializeChatElements() function
console.log('✅ Voice chat client loaded - waiting for user-info event to initialize chat');

