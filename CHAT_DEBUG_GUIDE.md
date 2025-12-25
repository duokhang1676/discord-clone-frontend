# 🔍 Chat Feature Debug Guide

## Current Issue
Chat feature không hoạt động - cần debug từng phần.

## 🧪 Debug Checklist

### 1️⃣ **Frontend - Check DOM Elements**

Mở browser Console (F12) và chạy:

```javascript
// Check if chat elements exist
console.log('Chat Messages:', document.getElementById('chat-messages'));
console.log('Chat Input:', document.getElementById('chat-input'));
console.log('Send Button:', document.getElementById('send-btn'));
console.log('Clear Chat Button:', document.getElementById('clear-chat-btn'));

// If any returns null, DOM not loaded yet
```

**Expected:** All should return HTML elements, not `null`.

**If null:** DOM loaded before script runs - timing issue.

---

### 2️⃣ **Frontend - Check Socket Connection**

```javascript
// In browser console
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);

// Try sending test message
socket.emit('chat-message', {
  message: 'Test from console',
  username: 'Debug User',
  timestamp: new Date().toISOString()
});
```

**Expected:** 
- `socket.connected` = true
- Console shows: `💬 Received message: {...}`

---

### 3️⃣ **Frontend - Check Message History Loading**

```javascript
// Check if loadMessageHistory is called
// Look for these logs in console:
// ✅ "Loaded X messages from backend"
// ❌ "Failed to load messages: ..."

// Manually call it
loadMessageHistory();
```

**Expected:** Messages appear in chat panel or "No messages yet" message.

---

### 4️⃣ **Voice Server (Railway) - Check Logs**

Go to Railway Dashboard → Your Project → Deployments → Logs

Search for:
```
💬 Chat message from [username]: [message]
✅ Message saved to database
```

**If not found:** Voice server not receiving messages from frontend.

---

### 5️⃣ **Backend (Render) - Check API**

Test in browser console or terminal:

```javascript
// Test GET messages
fetch('https://discord-clone-mp22.onrender.com/api/messages', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Messages:', data))
.catch(err => console.error('Error:', err));

// Test POST message (will fail auth but shows if endpoint exists)
fetch('https://discord-clone-mp22.onrender.com/api/messages', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    user_id: 'test123',
    username: 'Test',
    message: 'Hello',
    timestamp: new Date().toISOString()
  })
})
.then(r => r.json())
.then(data => console.log('Save result:', data))
.catch(err => console.error('Error:', err));
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Chat elements return `null`

**Problem:** Script runs before DOM loaded.

**Fix:** Move chat element definitions inside DOMContentLoaded or after DOM ready.

**Quick Fix:**
```javascript
// Add at start of chat section in script.js
if (!document.getElementById('chat-messages')) {
  console.error('❌ Chat elements not found! DOM not ready.');
}
```

---

### Issue 2: Socket not receiving messages

**Problem:** Socket.io connection issue or wrong event name.

**Check:**
```javascript
// In browser console
socket.on('chat-message', (data) => {
  console.log('🔔 Chat message received:', data);
});

// Send test
socket.emit('chat-message', {
  message: 'test',
  username: 'test',
  timestamp: new Date().toISOString()
});
```

---

### Issue 3: Backend API returns 404

**Problem:** Backend hasn't been updated with messages routes.

**Fix:** Follow `BACKEND_CHAT_SETUP.md` to add message endpoints.

**Verify:**
```bash
curl https://discord-clone-mp22.onrender.com/api/messages
```

Should return: `{"success": true, "messages": [...]}`
NOT: `404 Not Found`

---

### Issue 4: Messages not saving to DB

**Problem:** Backend API exists but not connected to MongoDB.

**Check Render logs:**
```
✅ Database indexes created
```

**If missing:** MongoDB connection failed or indexes not created.

---

## 🔧 Quick Fixes

### Fix 1: Ensure DOM is ready before accessing elements

```javascript
// Replace chat elements definition with:
let chatMessages, chatInput, sendBtn, clearChatBtn;

// Call after DOM loaded
socket.on('user-info', async (user) => {
  currentUserId = user.id;
  yourName.textContent = user.name;
  
  // Initialize chat elements HERE
  chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  sendBtn = document.getElementById('send-btn');
  clearChatBtn = document.getElementById('clear-chat-btn');
  
  if (!chatMessages) {
    console.error('❌ Chat panel not found in DOM!');
    return;
  }
  
  console.log('✅ Chat elements initialized');
  
  await initializeLocalStream();
  await loadMessageHistory();
});
```

---

### Fix 2: Add error handling to loadMessageHistory

```javascript
async function loadMessageHistory() {
  if (!chatMessages) {
    console.error('❌ chatMessages element is null');
    return;
  }
  
  try {
    console.log('📥 Loading message history...');
    // ... existing code ...
    console.log('✅ Loaded', data.messages.length, 'messages');
  } catch (error) {
    console.error('❌ Failed to load messages:', error);
    chatMessages.innerHTML = '<div class="error-message">Failed to load messages</div>';
  }
}
```

---

### Fix 3: Add logging to sendMessage

```javascript
function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) {
    console.log('⚠️ Empty message, not sending');
    return;
  }
  
  console.log('📤 Sending message:', message);
  
  socket.emit('chat-message', {
    message: message,
    username: yourName.textContent,
    timestamp: new Date().toISOString()
  });
  
  chatInput.value = '';
}
```

---

## 📊 Testing Flow

1. **Open app in browser**
2. **Open Console (F12)**
3. **Login**
4. **Check console logs:**

Expected flow:
```
✅ Socket connected: abc123
Connected to: https://discord-clone-frontend-production.up.railway.app
✅ Chat elements initialized
📥 Loading message history...
✅ Loaded 0 messages
```

5. **Type message and send**

Expected:
```
📤 Sending message: Hello
💬 Received message: {user_id: "abc", username: "User", message: "Hello", ...}
```

6. **Check Railway logs** - should see:
```
💬 Chat message from User: Hello
✅ Message saved to database
```

---

## 🚨 If Still Not Working

### Step 1: Check if backend API exists

```bash
curl https://discord-clone-mp22.onrender.com/api/messages
```

**If 404:** Backend not updated - see `BACKEND_CHAT_SETUP.md`

### Step 2: Check Socket.io connection

In browser console:
```javascript
socket.connected  // Should be true
```

**If false:** Railway server down or wrong URL

### Step 3: Check DOM structure

```javascript
document.querySelector('.chat-panel')  // Should exist
```

**If null:** HTML not updated with chat panel

### Step 4: Verify axios installed on Railway

Check `package.json`:
```json
"dependencies": {
  "axios": "^1.6.0"  // Must be present
}
```

---

## 📝 Manual Test

### Test 1: Send message via console

```javascript
// In browser console after login
socket.emit('chat-message', {
  message: 'Manual test message',
  username: localStorage.getItem('username') || 'Test User',
  timestamp: new Date().toISOString()
});

// Should see message appear in chat panel
```

### Test 2: Check if event listener attached

```javascript
// In browser console
sendBtn.onclick  // Should be a function
chatInput.onkeypress  // Should be a function
```

### Test 3: Direct displayMessage call

```javascript
displayMessage('Test User', 'Test message', new Date().toISOString(), false);
// Should see message appear in chat
```

---

## ✅ Success Indicators

When working correctly:

1. ✅ Console shows "Chat elements initialized"
2. ✅ "Loading messages..." appears briefly
3. ✅ Can type and send messages
4. ✅ Messages appear in chat panel
5. ✅ Railway logs show message saved
6. ✅ Refresh page - messages persist

---

## 🔗 Related Files

- `script.js` (lines 530-681) - Chat logic
- `server.js` (lines 116-145) - Socket.io chat handler
- `BACKEND_CHAT_SETUP.md` - Backend API setup
- `index.html` - Chat panel HTML

---

**Next Step:** Run checks 1-3 in browser console and report what you see!
