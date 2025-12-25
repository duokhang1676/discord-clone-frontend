# 💬 Backend Setup for Chat Feature

## Overview
Frontend đã implement chat UI và Socket.io integration. Backend cần thêm 3 API endpoints để lưu và quản lý messages.

## 📝 Files cần tạo/sửa trong `discord-clone-backend`

### 1. Tạo file `routes/messages.py`

```python
from flask import Blueprint, request, jsonify, session
from datetime import datetime
from bson import ObjectId

messages_bp = Blueprint('messages', __name__)

# Inject db from app.py
db = None

def init_messages_routes(database):
    global db
    db = database

@messages_bp.route('/api/messages', methods=['GET'])
def get_messages():
    """Get message history (last 100 messages)"""
    try:
        # Check authentication (session or token)
        if 'user_id' not in session:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({
                    'success': False, 
                    'message': 'Unauthorized'
                }), 401
            
            # Verify token if provided
            token = auth_header.replace('Bearer ', '')
            if session.get('token') != token:
                return jsonify({
                    'success': False,
                    'message': 'Invalid token'
                }), 401
        
        # Get last 100 messages, sorted by timestamp
        messages = list(db.messages.find()
            .sort('timestamp', -1)
            .limit(100))
        
        # Reverse to show oldest first
        messages.reverse()
        
        # Convert ObjectId to string for JSON serialization
        for msg in messages:
            msg['_id'] = str(msg['_id'])
        
        return jsonify({
            'success': True,
            'messages': messages
        })
        
    except Exception as e:
        print(f"Error getting messages: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@messages_bp.route('/api/messages', methods=['POST'])
def save_message():
    """Save new message from voice server"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('message') or not data.get('username'):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        message_doc = {
            'user_id': data.get('user_id'),
            'username': data.get('username'),
            'message': data.get('message'),
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
            'created_at': datetime.utcnow()
        }
        
        result = db.messages.insert_one(message_doc)
        
        return jsonify({
            'success': True,
            'message_id': str(result.inserted_id)
        })
        
    except Exception as e:
        print(f"Error saving message: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@messages_bp.route('/api/messages/clear', methods=['DELETE'])
def clear_messages():
    """Clear all messages (authenticated users only)"""
    try:
        # Check authentication
        if 'user_id' not in session:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({
                    'success': False,
                    'message': 'Unauthorized'
                }), 401
        
        result = db.messages.delete_many({})
        
        return jsonify({
            'success': True,
            'deleted_count': result.deleted_count
        })
        
    except Exception as e:
        print(f"Error clearing messages: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
```

### 2. Update `app.py`

```python
from flask import Flask, session
from flask_cors import CORS
from pymongo import MongoClient
import os

# Import routes
from routes.users import users_bp
from routes.messages import messages_bp, init_messages_routes

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# CORS configuration
CORS(app, 
     supports_credentials=True,
     origins=[
         "https://your-app.vercel.app",
         "https://*.vercel.app",
         "http://localhost:3000",
         "https://discord-clone-frontend-production.up.railway.app"  # Add Railway
     ],
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'DELETE', 'OPTIONS']
)

# MongoDB connection
client = MongoClient(os.environ.get('MONGO_URI'))
db = client['discord_clone']

# Register blueprints
app.register_blueprint(users_bp)

# Initialize messages routes with database
init_messages_routes(db)
app.register_blueprint(messages_bp)

# Create indexes for better performance
try:
    db.messages.create_index([('timestamp', -1)])
    db.messages.create_index([('created_at', -1)])
    db.messages.create_index([('username', 1)])
    print("✅ Database indexes created")
except Exception as e:
    print(f"⚠️ Index creation warning: {str(e)}")

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    return {'status': 'ok', 'service': 'discord-clone-backend'}, 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
```

### 3. Update `requirements.txt` (if not already included)

```txt
Flask==3.0.0
Flask-CORS==4.0.0
pymongo==4.6.0
python-dotenv==1.0.0
Werkzeug==3.0.1
gunicorn==21.2.0
```

## 🗄️ MongoDB Schema

### Collection: `messages`

```javascript
{
  _id: ObjectId("..."),
  user_id: "socket_id_xyz",        // Socket.io connection ID
  username: "Dương Khang",          // Display name
  message: "Hello everyone!",       // Message content (max 500 chars)
  timestamp: "2025-12-25T10:30:00.000Z",  // ISO timestamp
  created_at: ISODate("2025-12-25T10:30:00.000Z")  // MongoDB date
}
```

### Indexes

```javascript
db.messages.createIndex({ timestamp: -1 })     // For sorting by time
db.messages.createIndex({ created_at: -1 })    // For cleanup/archiving
db.messages.createIndex({ username: 1 })       // For user-specific queries (future)
```

## 🧪 Testing

### 1. Test GET messages (empty at first)

```bash
curl https://discord-clone-mp22.onrender.com/api/messages \
  -H "Cookie: session=your-session-cookie"
```

Expected response:
```json
{
  "success": true,
  "messages": []
}
```

### 2. Test POST message (from voice server)

```bash
curl -X POST https://discord-clone-mp22.onrender.com/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test123",
    "username": "Test User",
    "message": "Hello World",
    "timestamp": "2025-12-25T10:30:00.000Z"
  }'
```

Expected response:
```json
{
  "success": true,
  "message_id": "676b8f1e2a3c4d5e6f7a8b9c"
}
```

### 3. Test DELETE messages

```bash
curl -X DELETE https://discord-clone-mp22.onrender.com/api/messages/clear \
  -H "Cookie: session=your-session-cookie"
```

Expected response:
```json
{
  "success": true,
  "deleted_count": 5
}
```

## 🔒 Security Considerations

### 1. Authentication
- GET messages: Requires valid session OR Bearer token
- POST messages: No auth (called from voice server)
- DELETE messages: Requires valid session OR Bearer token

### 2. Input Validation
- Message max length: 500 characters (enforced in frontend)
- Required fields: username, message
- XSS prevention: Handled by frontend `escapeHtml()`

### 3. Rate Limiting (Optional)
Add to prevent spam:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app=app,
    key_func=lambda: request.remote_addr
)

@messages_bp.route('/api/messages', methods=['POST'])
@limiter.limit("10 per minute")
def save_message():
    # ... existing code
```

## 📊 Database Maintenance

### Auto-delete old messages (optional)

Create a cleanup script or add TTL index:

```python
# In app.py after creating indexes
db.messages.create_index(
    "created_at", 
    expireAfterSeconds=2592000  # 30 days
)
```

Or manual cleanup endpoint:

```python
@messages_bp.route('/api/messages/cleanup', methods=['DELETE'])
def cleanup_old_messages():
    # Delete messages older than 30 days
    cutoff = datetime.utcnow() - timedelta(days=30)
    result = db.messages.delete_many({
        'created_at': {'$lt': cutoff}
    })
    return jsonify({
        'success': True,
        'deleted_count': result.deleted_count
    })
```

## 🚀 Deployment

### 1. Commit changes

```bash
cd discord-clone-backend
git add .
git commit -m "Add: Chat feature with message persistence"
git push origin main
```

### 2. Verify on Render

1. Go to [Render Dashboard](https://render.com/dashboard)
2. Check deployment logs
3. Look for "✅ Database indexes created"

### 3. Test integration

1. Open frontend: `https://your-app.vercel.app`
2. Login
3. Send a test message
4. Refresh page → messages should persist

## 📝 Environment Variables

Make sure these are set in Render:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/discord_clone
SECRET_KEY=your-long-random-secret-key
PORT=5000
HOST=0.0.0.0
```

## ✅ Checklist

Backend setup:
- [ ] Create `routes/messages.py`
- [ ] Update `app.py` with messages blueprint
- [ ] Add CORS for Railway domain
- [ ] Create database indexes
- [ ] Update `requirements.txt` (if needed)
- [ ] Set environment variables on Render
- [ ] Deploy to Render
- [ ] Test all 3 endpoints

Frontend (already done):
- [x] Chat UI added
- [x] Socket.io chat events
- [x] Message display with timestamps
- [x] Load message history on connect
- [x] Send/receive messages
- [x] Clear chat functionality

Voice Server (already done):
- [x] Chat message relay via Socket.io
- [x] POST to backend API to save messages
- [x] Axios dependency added

## 🎯 Expected Flow

```
User A types message in browser
    ↓
Frontend sends via Socket.io to Railway
    ↓
Voice Server receives message
    ↓
├─→ Broadcasts to all connected users (real-time)
│
└─→ POSTs to Render backend (persistence)
    ↓
Backend saves to MongoDB
    ↓
Message appears instantly for all users
    ↓
On refresh/reconnect → messages load from DB
```

---

**Questions?** Check logs:
- **Frontend**: Browser Console (F12)
- **Voice Server**: Railway logs
- **Backend**: Render logs
