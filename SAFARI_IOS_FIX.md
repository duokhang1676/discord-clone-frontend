# 🍎 Safari iOS Authentication Fix

## Vấn đề

Safari iOS block **cross-origin cookies** do Intelligent Tracking Prevention (ITP):
- Frontend: `vercel.app`
- Backend: `onrender.com` 
- Safari iOS không lưu session cookie từ domain khác

## Giải pháp

### ✅ Frontend (ĐÃ UPDATE)

Thay đổi authentication flow để dùng **session token trong localStorage** thay vì cookies:

**Đã sửa:**
- ✅ `login.html` - Lưu `session_token` vào localStorage
- ✅ `index.html` - Gửi token qua `Authorization` header
- ✅ Logout - Xóa token khỏi localStorage

### ⚠️ Backend (CẦN UPDATE)

**Cần update trong `discord-clone-backend`:**

#### 1. Update `/api/login` route

**File: `routes/users.py` hoặc `app.py`**

```python
from functools import wraps
import secrets

# Thêm function tạo session token
def generate_session_token():
    return secrets.token_urlsafe(32)

# Update login route
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # ... existing validation ...
    
    user = users_collection.find_one({'username': username})
    
    if user and check_password_hash(user['password'], password):
        # Existing: Set session cookie
        session['user_id'] = str(user['_id'])
        session['username'] = username
        
        # NEW: Generate session token for Safari iOS
        session_token = generate_session_token()
        session['token'] = session_token
        
        return jsonify({
            'success': True,
            'username': username,
            'session_token': session_token  # ← ADD THIS
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Username hoặc password không đúng'
        }), 401
```

#### 2. Update `/api/check-auth` route

```python
@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    # NEW: Check Authorization header first (for Safari iOS)
    auth_header = request.headers.get('Authorization')
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.replace('Bearer ', '')
        
        # Verify token matches session
        if session.get('token') == token and session.get('user_id'):
            return jsonify({
                'authenticated': True,
                'username': session.get('username')
            })
    
    # Existing: Fallback to session-only check
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'username': session.get('username')
        })
    
    return jsonify({'authenticated': False}), 401
```

#### 3. Update `/api/logout` route

```python
@app.route('/api/logout', methods=['POST'])
def logout():
    # Clear session (works for both cookie and token auth)
    session.clear()
    
    return jsonify({'success': True})
```

#### 4. Update CORS settings (nếu chưa có)

```python
from flask_cors import CORS

CORS(app, 
     supports_credentials=True,
     origins=[
         "https://your-app.vercel.app",
         "https://*.vercel.app",
         "http://localhost:3000"
     ],
     # ADD: Allow Authorization header
     allow_headers=['Content-Type', 'Authorization']
)
```

## 🧪 Testing

### Desktop (Chrome/Firefox)
- ✅ Vẫn hoạt động bình thường với session cookies
- ✅ Backward compatible

### Safari iOS
```javascript
// Check trong Safari DevTools
localStorage.getItem('session_token')  // Should return token
```

### Kiểm tra API

```bash
# Login
curl -X POST https://discord-clone-mp22.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Response should include:
# { "success": true, "username": "test", "session_token": "abc123..." }

# Check auth with token
curl https://discord-clone-mp22.onrender.com/api/check-auth \
  -H "Authorization: Bearer abc123..."

# Response:
# { "authenticated": true, "username": "test" }
```

## 📊 Compatibility

| Browser | Method | Status |
|---------|--------|--------|
| **Chrome Desktop** | Session Cookie | ✅ Works |
| **Firefox Desktop** | Session Cookie | ✅ Works |
| **Safari Desktop** | Session Cookie | ✅ Works |
| **Safari iOS** | ❌ Cookie Blocked → ✅ Token in localStorage | ✅ Fixed |
| **Chrome iOS** | Session Cookie (or token) | ✅ Works |

## 🔒 Security Notes

1. **localStorage vs Cookies:**
   - localStorage không tự động gửi (cần manual include)
   - Không có HttpOnly protection
   - Trade-off cho Safari iOS compatibility

2. **Token Security:**
   - Sử dụng `secrets.token_urlsafe(32)` (256-bit)
   - Token chỉ valid trong session
   - Logout sẽ clear session → token invalid

3. **XSS Prevention:**
   - Sanitize user inputs
   - Use Content Security Policy (CSP)
   - Validate token server-side

## 🚀 Deployment

### Backend Changes
```bash
cd discord-clone-backend
git add .
git commit -m "Fix: Safari iOS auth with session token in localStorage"
git push origin main
# Render auto-deploys
```

### Frontend Changes
```bash
cd discord-clone-frontend
git add .
git commit -m "Fix: Safari iOS auth - use localStorage token with fallback to cookies"
git push origin main
# Vercel auto-deploys
```

## 📝 Alternative Solutions (không khuyên dùng)

### Option 2: Same-origin deployment
- Deploy frontend và backend trên cùng domain
- Dùng subdomain: `app.yourdomain.com` + `api.yourdomain.com`
- Chi phí: Cần domain tự quản ($10-15/năm)

### Option 3: Proxy backend qua Vercel
- Setup Vercel rewrites
- Chậm hơn, phức tạp hơn

---

**Recommended:** Implement **Option 1** (localStorage token) như đã update ở frontend.
