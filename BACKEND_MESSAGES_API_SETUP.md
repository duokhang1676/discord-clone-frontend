# 💬 Backend Messages API Setup Guide

## 📋 Mục đích
Tạo API endpoints trên backend (Render) để lưu và load tin nhắn chat (text + images) vào MongoDB Atlas.

## 🎯 Sau khi setup xong:
- ✅ Tin nhắn text được lưu vĩnh viễn
- ✅ Tin nhắn ảnh (Cloudinary URLs) được lưu vĩnh viễn
- ✅ Load lại lịch sử chat khi reload trang
- ✅ Clear chat history

---

## 📝 Bước 1: Tạo file routes/messages.py

### Cách 1: Qua Render Dashboard (Khuyến nghị)

1. Đi đến: https://dashboard.render.com
2. Chọn service **discord-clone-backend**
3. Click tab **Shell** (bên trái)
4. Chạy lệnh:

```bash
cd /opt/render/project/src
mkdir -p routes
cat > routes/messages.py << 'EOF'
from flask import Blueprint, request, jsonify, session
from pymongo import MongoClient, DESCENDING
from datetime import datetime
from functools import wraps
import os

messages_bp = Blueprint('messages', __name__)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['discord_clone']
messages_collection = db['messages']

# Create index for faster queries
try:
    messages_collection.create_index([('timestamp', DESCENDING)])
    print('✅ Messages collection index created')
except Exception as e:
    print(f'⚠️ Index creation warning: {e}')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@messages_bp.route('/api/messages', methods=['GET'])
def get_messages():
    """Get last 100 messages from database"""
    try:
        # Get last 100 messages, sorted by timestamp descending
        messages = list(messages_collection.find(
            {},
            {'_id': 0}  # Exclude MongoDB _id field
        ).sort('timestamp', DESCENDING).limit(100))
        
        # Reverse to show oldest first
        messages.reverse()
        
        print(f'📥 Retrieved {len(messages)} messages from database')
        
        return jsonify({
            'success': True,
            'messages': messages
        }), 200
        
    except Exception as e:
        print(f'❌ Error getting messages: {str(e)}')
        return jsonify({
            'success': False, 
            'message': str(e)
        }), 500

@messages_bp.route('/api/messages', methods=['POST'])
def save_message():
    """Save a new message to database"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('username') or not data.get('message'):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        message_doc = {
            'user_id': data.get('user_id'),
            'username': data.get('username'),
            'message': data.get('message'),
            'type': data.get('type', 'text'),  # 'text' or 'image'
            'imageUrl': data.get('imageUrl'),   # null for text messages
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat())
        }
        
        # Insert into MongoDB
        result = messages_collection.insert_one(message_doc)
        
        message_type = message_doc['type']
        log_msg = f"[{message_type.upper()}]" if message_type == 'image' else message_doc['message']
        print(f'💾 Saved message from {data.get("username")}: {log_msg}')
        
        return jsonify({
            'success': True,
            'message': 'Message saved',
            'id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f'❌ Error saving message: {str(e)}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@messages_bp.route('/api/messages', methods=['DELETE'])
@login_required
def clear_messages():
    """Clear all messages (requires authentication)"""
    try:
        result = messages_collection.delete_many({})
        
        print(f'🗑️ Cleared {result.deleted_count} messages by user {session.get("user_id")}')
        
        return jsonify({
            'success': True,
            'deleted_count': result.deleted_count
        }), 200
        
    except Exception as e:
        print(f'❌ Error clearing messages: {str(e)}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# Health check endpoint
@messages_bp.route('/api/messages/health', methods=['GET'])
def health_check():
    """Check if messages API is working"""
    try:
        count = messages_collection.count_documents({})
        return jsonify({
            'success': True,
            'status': 'healthy',
            'total_messages': count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500
EOF

echo "✅ routes/messages.py created successfully"
```

5. Kiểm tra file đã tạo:
```bash
cat routes/messages.py
```

### Cách 2: Qua GitHub (Nếu backend cũng trên GitHub)

1. Clone backend repo về local
2. Tạo file `routes/messages.py` với nội dung như trên
3. Commit và push:
```bash
git add routes/messages.py
git commit -m "Add messages API endpoints"
git push origin main
```

---

## 📝 Bước 2: Update app.py

Cần import và register blueprint messages.

### Qua Render Shell:

```bash
cd /opt/render/project/src

# Backup file gốc
cp app.py app.py.backup

# Tìm dòng cần thêm (sau các import routes khác)
# Thêm import
cat > temp_import.txt << 'EOF'
from routes.messages import messages_bp
EOF

# Thêm register blueprint (tìm đoạn có app.register_blueprint)
cat > temp_register.txt << 'EOF'
app.register_blueprint(messages_bp)
EOF
```

**Hoặc edit thủ công app.py:**

```bash
nano app.py
```

Thêm vào phần imports (gần đầu file):
```python
from routes.messages import messages_bp
```

Thêm vào phần register blueprints (sau các blueprint khác):
```python
# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(messages_bp)  # ← THÊM DÒNG NÀY
```

Lưu file (Ctrl+O, Enter, Ctrl+X)

---

## 📝 Bước 3: Update CORS Settings

Cần cho phép Railway domain (voice server) gọi API.

Trong `app.py`, tìm phần CORS config:

```python
# Update CORS
CORS(app, 
     supports_credentials=True,
     origins=[
         'https://discord-clone-frontend.vercel.app',
         'https://*.vercel.app',
         'https://discord-voice-server-production.up.railway.app',  # ← THÊM
         'https://*.railway.app',  # ← THÊM (cho phép tất cả Railway domains)
         'http://localhost:3000',
         'http://localhost:5000'
     ],
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
)
```

---

## 📝 Bước 4: Kiểm tra MongoDB Atlas

### 1. Kiểm tra Connection String

Trong Render Dashboard:
1. Chọn service **discord-clone-backend**
2. Click **Environment** tab
3. Kiểm tra biến `MONGO_URI` có format:
```
mongodb+srv://username:password@cluster.mongodb.net/discord_clone?retryWrites=true&w=majority
```

### 2. Kiểm tra MongoDB Collection

1. Đi đến: https://cloud.mongodb.com
2. Login → Chọn cluster **discord_clone**
3. Click **Browse Collections**
4. Sẽ thấy collections:
   - `users` (đã có)
   - `messages` (sẽ tự tạo khi có message đầu tiên)

---

## 🚀 Bước 5: Deploy Changes

### Nếu dùng Render Shell (Cách 1):
Render sẽ tự động restart service khi detect file thay đổi.

### Nếu dùng GitHub (Cách 2):
1. Push code lên GitHub
2. Render sẽ auto deploy
3. Theo dõi logs trong **Logs** tab

---

## 🧪 Bước 6: Test API

### 1. Test Health Check

```bash
curl https://discord-clone-mp22.onrender.com/api/messages/health
```

Kết quả mong đợi:
```json
{
  "success": true,
  "status": "healthy",
  "total_messages": 0
}
```

### 2. Test Save Message (POST)

```bash
curl -X POST https://discord-clone-mp22.onrender.com/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test123",
    "username": "TestUser",
    "message": "Hello from API test",
    "type": "text",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
```

Kết quả mong đợi:
```json
{
  "success": true,
  "message": "Message saved",
  "id": "..."
}
```

### 3. Test Get Messages (GET)

```bash
curl https://discord-clone-mp22.onrender.com/api/messages
```

Kết quả mong đợi:
```json
{
  "success": true,
  "messages": [
    {
      "user_id": "test123",
      "username": "TestUser",
      "message": "Hello from API test",
      "type": "text",
      "imageUrl": null,
      "timestamp": "2025-12-25T..."
    }
  ]
}
```

### 4. Test Image Message

```bash
curl -X POST https://discord-clone-mp22.onrender.com/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test123",
    "username": "TestUser",
    "message": "[Image]",
    "type": "image",
    "imageUrl": "https://res.cloudinary.com/dcs6zqppp/image/upload/v1234567890/test.jpg",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
```

---

## 🔍 Debug & Troubleshooting

### Kiểm tra Render Logs

1. Đi đến Render Dashboard
2. Chọn **discord-clone-backend**
3. Click **Logs** tab
4. Gửi tin nhắn từ app, xem logs:

✅ **Success logs**:
```
✅ Messages collection index created
💾 Saved message from username: Hello world
📥 Retrieved 10 messages from database
```

❌ **Error logs**:
```
❌ Error saving message: ...
ModuleNotFoundError: No module named 'routes.messages'
```

### Common Issues

#### 1. ModuleNotFoundError
**Nguyên nhân**: File không đúng vị trí hoặc import sai

**Fix**:
```bash
# Kiểm tra cấu trúc thư mục
ls -la routes/
# Phải thấy: messages.py, __init__.py (nếu có)

# Kiểm tra import trong app.py
grep "messages_bp" app.py
```

#### 2. CORS Error trong browser console
**Nguyên nhân**: Railway domain chưa được thêm vào CORS

**Fix**: Xem lại Bước 3

#### 3. MongoDB Connection Error
**Nguyên nhân**: MONGO_URI sai hoặc IP chưa whitelist

**Fix**:
1. Kiểm tra MONGO_URI trong Environment tab
2. MongoDB Atlas → Network Access → Add IP: `0.0.0.0/0`

#### 4. 401 Unauthorized khi DELETE
**Nguyên nhân**: Endpoint yêu cầu login

**Fix**: POST/GET không cần auth, chỉ DELETE cần login

---

## ✅ Verification Checklist

Sau khi setup xong, kiểm tra:

- [ ] File `routes/messages.py` đã tạo
- [ ] `app.py` đã import và register blueprint
- [ ] CORS đã update với Railway domain
- [ ] Health check API trả về `{"success": true}`
- [ ] Gửi tin nhắn text → thấy trong MongoDB
- [ ] Gửi ảnh → thấy imageUrl trong MongoDB
- [ ] Reload trang → tin nhắn hiện lại
- [ ] Clear chat → xóa hết tin nhắn

---

## 🎯 Expected File Structure

```
discord-clone-backend/
├── app.py                 # ← UPDATE: Import + register messages_bp
├── requirements.txt
├── routes/
│   ├── __init__.py       # (có thể có hoặc không)
│   ├── auth.py
│   └── messages.py       # ← NEW FILE
└── ...
```

---

## 📊 Database Schema

Collection: `messages`

```javascript
{
  "user_id": "socket_id_xyz123",
  "username": "JohnDoe",
  "message": "Hello world",           // Text content hoặc "[Image]"
  "type": "text",                     // "text" hoặc "image"
  "imageUrl": null,                   // Cloudinary URL hoặc null
  "timestamp": "2025-12-25T10:30:00.000Z"
}
```

Indexes:
- `timestamp` (descending) - Để query nhanh hơn

---

## 🔗 Quick Links

- **Render Dashboard**: https://dashboard.render.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Backend Logs**: https://dashboard.render.com/web/srv-xxx/logs
- **API Base URL**: https://discord-clone-mp22.onrender.com

---

## 💡 Tips

1. **Test locally trước**: Setup backend local với MongoDB local
2. **Backup trước khi edit**: `cp app.py app.py.backup`
3. **Monitor logs**: Mở Logs tab khi test để debug real-time
4. **Test API riêng**: Dùng curl/Postman trước khi test từ frontend

---

## 🆘 Cần help?

Nếu gặp lỗi:
1. Copy full error message từ Render Logs
2. Kiểm tra file structure: `ls -la routes/`
3. Test health check endpoint
4. Verify MongoDB connection

Good luck! 🚀
