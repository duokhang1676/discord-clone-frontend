// Socket.io connection - automatically use current host
const storedUsername = localStorage.getItem('username');
const socket = io(window.location.origin, {
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
  console.log('Connected to:', window.location.origin);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
  console.error('Trying to connect to:', window.location.origin);
  yourName.textContent = 'Connection Error - Check Console (F12)';
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  yourName.textContent = 'Disconnected';
});

// WebRTC configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
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
  
  // Initialize local stream when connected
  await initializeLocalStream();
});

socket.on('user-list', (users) => {
  updateUserList(users);
});

socket.on('offer', async (data) => {
  console.log('Received offer from:', data.from);
  
  if (peerConnection) {
    console.log('Already in a call');
    return;
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

  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    
    if (peerConnection.connectionState === 'disconnected' || 
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'closed') {
      endCall();
    }
  };
}

function endCall() {
  console.log('Ending call');
  
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
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

// Initialize
console.log('Voice chat client initialized');
