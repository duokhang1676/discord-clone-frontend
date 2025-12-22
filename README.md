# Discord Voice Clone - Ứng dụng Voice Chat Real-time

Ứng dụng voice chat real-time với đầy đủ tính năng authentication, WebRTC peer-to-peer communication, và giao diện tương tự Discord.

![Architecture](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)
![Voice Server](https://img.shields.io/badge/Voice%20Server-Railway-purple?logo=railway)
![Auth Backend](https://img.shields.io/badge/Auth-Render-46E3B7?logo=render)

## 📋 Tổng quan

Dự án này là một ứng dụng voice chat được xây dựng với kiến trúc microservices, deploy trên 3 nền tảng cloud khác nhau để tối ưu hiệu suất và chi phí:

- **Frontend (Vercel)**: Static files - HTML, CSS, JavaScript
- **Voice Server (Railway)**: Node.js + Socket.io + WebRTC signaling
- **Auth Backend (Render)**: Flask (Python) + MongoDB Atlas

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────┐
│         VERCEL (Frontend)                   │
│  https://discord-clone-frontend-pi.vercel   │
│  ├─ HTML/CSS/JS (Static files)              │
│  ├─ User Interface                          │
│  └─ Client-side logic                       │
└─────────────────────────────────────────────┘
            │                    │
            │                    │
    ┌───────▼────────┐   ┌──────▼──────────────┐
    │   RAILWAY      │   │   RENDER (Auth)     │
    │ Voice Server   │   │   Flask Backend     │
    │ ┌────────────┐ │   │ ┌─────────────────┐ │
    │ │ Socket.io  │ │   │ │ /api/register   │ │
    │ │ WebRTC     │ │   │ │ /api/login      │ │
    │ │ Signaling  │ │   │ │ /api/logout     │ │
    │ └────────────┘ │   │ │ /api/check-auth │ │
    │                │   │ └─────────────────┘ │
    └────────────────┘   └─────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   MongoDB Atlas     │
                         │   User Database     │
                         └─────────────────────┘
```

## ✨ Tính năng

### Authentication
- ✅ Đăng ký tài khoản với username/password
- ✅ Đăng nhập với session persistence (7 ngày)
- ✅ Bảo mật với password hashing (Werkzeug)
- ✅ Auto-redirect khi chưa đăng nhập
- ✅ Logout an toàn

### Voice Chat
- ✅ WebRTC peer-to-peer voice communication
- ✅ Tự động bật mic/speaker khi vào room
- ✅ Click user để bắt đầu cuộc gọi
- ✅ Toggle bật/tắt microphone
- ✅ Toggle bật/tắt speaker
- ✅ Hiển thị danh sách users online real-time
- ✅ Audio indicators (animated bars)
- ✅ Connection status display
- ✅ Hỗ trợ nhiều users cùng lúc

### UI/UX
- ✅ Giao diện Discord-like
- ✅ Responsive design
- ✅ Dark theme
- ✅ Smooth animations
- ✅ User-friendly error messages

## 🔧 Yêu cầu

### Development
- Node.js 20.x+
- Python 3.9+
- Git

### Tài khoản Cloud (cho deployment)
- [Vercel](https://vercel.com) - Free tier (unlimited)
- [Railway](https://railway.app) - **$5 credit miễn phí/tháng** (đủ chạy 24/7 cả tháng cho 2-10 users)
- [Render](https://render.com) - Free tier (sleep sau 15 phút inactive)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Free tier 512MB

> **💡 Lưu ý về Railway Free Tier:**
> - Voice server sử dụng WebRTC **peer-to-peer** → audio stream trực tiếp giữa users, KHÔNG qua server
> - Server chỉ làm **signaling** (trao đổi connection info) → bandwidth cực thấp
> - $5 credit đủ chạy voice server 24/7 cho **2-50 users** cùng lúc trong 1 tháng
> - Mỗi cuộc gọi chỉ tốn ~5-10KB signaling data (SDP + ICE candidates)
> - Ước tính: **$0.10-0.50/tháng** cho 2 users thường xuyên = **10 tháng miễn phí**

## � Workflow Cập Nhật

### Khi nào cần update từng service?

#### ❌ KHÔNG cần update Voice Server khi:

**Frontend Changes:**
- ✅ Thay đổi UI/CSS
- ✅ Thêm/sửa trang HTML
- ✅ Cập nhật login/register form
- ✅ Thay đổi giao diện voice chat
- ✅ Fix bugs client-side

**Backend Changes:**
- ✅ Thêm/sửa auth routes
- ✅ Thay đổi database schema
- ✅ Cập nhật CORS settings
- ✅ Thay đổi password hashing

> **Voice Server chỉ xử lý WebRTC signaling, KHÔNG liên quan đến UI hay authentication!**

#### ✅ CẦN update Voice Server khi:

- Thay đổi Socket.io logic (signaling)
- Thêm/sửa WebRTC configuration
- Cập nhật STUN/TURN servers
- Thay đổi user management trong Socket.io
- Fix bugs trong server.js

### Deployment Workflow

#### Cập nhật Frontend (90% trường hợp)

```bash
# Trong discord-clone-frontend/
git add .
git commit -m "Update UI/features"
git push origin main

# ✅ Vercel tự động redeploy trong 1 phút
# ❌ Railway KHÔNG cần redeploy
# ❌ Render KHÔNG cần redeploy
```

**Kết quả:**
- Vercel: Deploy mới
- Railway: Không thay đổi
- Render: Không thay đổi

#### Cập nhật Backend (5% trường hợp)

```bash
# Trong discord-clone-backend/
git add .
git commit -m "Update auth API"
git push origin main

# ❌ Vercel KHÔNG cần redeploy
# ❌ Railway KHÔNG cần redeploy  
# ✅ Render tự động redeploy trong 2-3 phút
```

**Kết quả:**
- Vercel: Không thay đổi
- Railway: Không thay đổi
- Render: Deploy mới

#### Cập nhật Voice Server (5% trường hợp)

```bash
# Trong discord-clone-frontend/ (server.js)
git add server.js
git commit -m "Update Socket.io logic"
git push origin main

# ❌ Vercel có thể redeploy nhưng KHÔNG ảnh hưởng (chỉ static files)
# ✅ Railway tự động redeploy trong 2-3 phút
# ❌ Render KHÔNG cần redeploy
```

**Kết quả:**
- Vercel: Có thể deploy nhưng không quan trọng
- Railway: Deploy mới
- Render: Không thay đổi

### Kiến trúc Microservices - Độc lập hoàn toàn

```
Frontend (Vercel)     Voice Server (Railway)     Auth Backend (Render)
      │                        │                          │
      ├─ HTML/CSS/JS           ├─ Socket.io              ├─ Flask routes
      ├─ UI Components         ├─ WebRTC signaling       ├─ Database logic
      └─ Client logic          └─ User connections       └─ Password hashing
      
      ↓ Update độc lập         ↓ Update độc lập          ↓ Update độc lập
```

### Best Practices

#### 1. Phát triển tính năng mới

**Frontend-only changes (90%)**
```bash
# Chỉ cần push frontend
cd discord-clone-frontend
git push origin main
# Vercel auto-deploy ✅
```

**Backend-only changes (5%)**
```bash
# Chỉ cần push backend
cd discord-clone-backend
git push origin main
# Render auto-deploy ✅
```

**Full-stack changes (5%)**
```bash
# Push cả 2 repos nếu thay đổi cả frontend + backend
cd discord-clone-frontend && git push origin main
cd ../discord-clone-backend && git push origin main
# Cả 2 auto-deploy ✅
```

#### 2. Testing sau update

**Sau khi update Frontend:**
- ✅ Test UI changes
- ✅ Verify login/register vẫn hoạt động
- ❌ Voice chat vẫn hoạt động bình thường (không đổi)

**Sau khi update Backend:**
- ✅ Test auth API
- ✅ Verify database operations
- ❌ Voice chat vẫn hoạt động bình thường (không đổi)

**Sau khi update Voice Server:**
- ✅ Test Socket.io connection
- ✅ Verify WebRTC calls
- ❌ UI vẫn giữ nguyên (không đổi)

#### 3. Rollback nếu có lỗi

**Vercel (Frontend):**
```bash
# Vercel Dashboard → Deployments → Click deployment trước → "Promote to Production"
```

**Railway (Voice Server):**
```bash
# Railway Dashboard → Deployments → Click deployment trước → "Redeploy"
```

**Render (Backend):**
```bash
# Render Dashboard → Manual Deploy → Select previous commit
```

### Tóm tắt

| Thay đổi | Frontend | Voice Server | Backend |
|----------|----------|--------------|---------|
| **UI/CSS** | 🔄 Deploy | ⏸️ Không | ⏸️ Không |
| **Auth logic** | ⏸️ Không | ⏸️ Không | 🔄 Deploy |
| **Socket.io** | ⏸️ Không | 🔄 Deploy | ⏸️ Không |
| **WebRTC config** | ⏸️ Không | 🔄 Deploy | ⏸️ Không |
| **Database** | ⏸️ Không | ⏸️ Không | 🔄 Deploy |

> **💡 Lợi ích của Microservices:** Mỗi service độc lập → Update một service không ảnh hưởng đến các service khác!

## �🚀 Cài đặt Local Development

### 1. Clone repository

```bash
git clone https://github.com/your-username/discord-clone-frontend.git
cd discord-clone-frontend
```

### 2. Cài đặt Voice Server (Node.js)

```bash
# Cài đặt dependencies
npm install

# Tạo SSL certificate cho local (HTTPS required cho microphone)
node generate-cert.js

# Chạy server
npm start
```

Server sẽ chạy tại `https://localhost:3000`

### 3. Cài đặt Auth Backend (Python Flask)

```bash
# Clone backend repository
cd ..
git clone https://github.com/your-username/discord-clone-backend.git
cd discord-clone-backend

# Tạo virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Chạy server
python app.py
```

Backend sẽ chạy tại `http://localhost:5000`

### 4. Cấu hình MongoDB

Tạo file `.env` trong thư mục backend:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
SECRET_KEY=your-secret-key-here
PORT=5000
HOST=0.0.0.0
```

### 5. Truy cập ứng dụng

1. Mở trình duyệt: `https://localhost:3000`
2. Chấp nhận cảnh báo SSL (self-signed certificate)
3. Đăng ký tài khoản mới
4. Đăng nhập và bắt đầu sử dụng!

## ☁️ Deploy lên Production

### 📘 1. Deploy Frontend lên Vercel

#### Bước 1: Push code lên GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Bước 2: Deploy trên Vercel

1. Đăng nhập [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import repository từ GitHub
4. Vercel tự động detect settings
5. Click **"Deploy"**

**Vercel URL**: `https://your-app.vercel.app`

#### Cấu hình (vercel.json)

```json
{
  "version": 2,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

### 🚂 2. Deploy Voice Server lên Railway

Railway hỗ trợ WebSocket tốt hơn Vercel cho Socket.io.

#### Bước 1: Tạo tài khoản

1. Truy cập [Railway](https://railway.app)
2. Đăng nhập bằng GitHub

#### Bước 2: Deploy

1. Click **"New Project"**
2. Chọn **"Deploy from GitHub repo"**
3. Chọn repository `discord-clone-frontend`
4. Railway tự động detect Dockerfile và build
5. Đợi deploy hoàn tất

#### Bước 3: Lấy Railway URL

1. Vào project → **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Copy domain (ví dụ: `discord-clone-frontend-production.up.railway.app`)

#### Bước 4: Cập nhật Frontend

Sửa `script.js` và `public/script.js`:

```javascript
const SOCKET_SERVER = 'https://your-app.railway.app';
```

Push lại lên GitHub để Vercel tự động redeploy.

**Railway URL**: `https://your-app.railway.app`

### 🟢 3. Deploy Auth Backend lên Render

#### Bước 1: Push backend lên GitHub

```bash
cd discord-clone-backend
git add .
git commit -m "Initial commit"
git push origin main
```

#### Bước 2: Deploy trên Render

1. Đăng nhập [Render Dashboard](https://render.com/dashboard)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository (backend)
4. Cấu hình:
   - **Name**: `discord-clone-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Plan**: Free

#### Bước 3: Thêm Environment Variables

Trong Render Dashboard → **Environment**:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
SECRET_KEY=your-secret-key-here
PORT=5000
HOST=0.0.0.0
```

#### Bước 4: Cập nhật CORS

Trong `app.py`, thêm Vercel domain:

```python
CORS(app, 
     supports_credentials=True, 
     origins=[
         "https://your-app.vercel.app",
         "https://*.vercel.app",
         "http://localhost:3000"
     ])
```

**Render URL**: `https://your-backend.onrender.com`

## 🔐 Environment Variables

### Frontend (.env) - Không bắt buộc cho production

```env
BACKEND_URL=https://your-backend.onrender.com
```

### Backend (.env) - BẮT BUỘC

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/discord
SECRET_KEY=your-long-random-secret-key
PORT=5000
HOST=0.0.0.0
```

### Tạo MongoDB Atlas Database

1. Tạo tài khoản tại [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo cluster miễn phí (M0)
3. Tạo database user với username/password
4. Whitelist IP: `0.0.0.0/0` (cho phép mọi IP)
5. Lấy connection string và thay vào `MONGO_URI`

## 📁 Cấu trúc thư mục

### Frontend
```
discord-clone-frontend/
├── public/              # Static files phục vụ bởi Vercel
│   ├── index.html      # Main voice chat page
│   ├── login.html      # Login page
│   ├── register.html   # Register page
│   ├── script.js       # WebRTC + Socket.io client
│   ├── style.css       # Main styles
│   └── auth-style.css  # Auth pages styles
├── cert/               # SSL certificates (local only)
├── server.js           # Node.js + Socket.io server (Railway)
├── generate-cert.js    # SSL cert generator
├── Dockerfile          # Railway deployment config
├── vercel.json         # Vercel config
├── package.json        # Node dependencies
└── README.md           # This file
```

### Backend
```
discord-clone-backend/
├── routes/
│   └── users.py        # Auth routes (register, login, logout)
├── app.py              # Flask main app
├── requirements.txt    # Python dependencies
└── .env                # Environment variables
```

## 🛠️ Công nghệ sử dụng

### Frontend
- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling với Discord-like theme
- **JavaScript (ES6+)**: Client logic
- **Socket.io Client**: WebSocket communication
- **WebRTC API**: Peer-to-peer voice streaming

### Voice Server
- **Node.js**: Runtime environment
- **Express**: Web framework
- **Socket.io**: Real-time bidirectional communication
- **HTTPS/SSL**: Secure connections (required for WebRTC)

### Auth Backend
- **Python 3.9+**: Programming language
- **Flask**: Micro web framework
- **Flask-CORS**: Cross-origin resource sharing
- **pymongo**: MongoDB driver
- **Werkzeug**: Password hashing
- **python-dotenv**: Environment variables

### Database
- **MongoDB Atlas**: Cloud NoSQL database

### DevOps
- **Git**: Version control
- **GitHub**: Code hosting
- **Vercel**: Frontend hosting
- **Railway**: WebSocket server hosting
- **Render**: Backend API hosting
- **Docker**: Containerization (Railway)

## 🧪 Testing

### Test Local

1. Mở 2 tab trình duyệt tại `https://localhost:3000`
2. Đăng ký 2 tài khoản khác nhau
3. Đăng nhập ở mỗi tab
4. Click vào tên user khác để bắt đầu gọi
5. Kiểm tra mic/speaker toggle

### Test Production

1. Truy cập Vercel URL
2. Đăng ký/đăng nhập
3. Mở incognito window với tài khoản khác
4. Test voice chat giữa 2 users

## 🐛 Troubleshooting

### Microphone không hoạt động

**Nguyên nhân**: Browser chặn quyền microphone

**Giải pháp**:
1. Click icon khóa/camera bên trái address bar
2. Allow microphone permission
3. Refresh trang

### Socket.io connection failed

**Nguyên nhân**: Railway server chưa ready hoặc URL sai

**Giải pháp**:
1. Kiểm tra Railway deployment đã hoàn tất
2. Verify SOCKET_SERVER URL trong script.js
3. Check Railway logs: `railway logs`

### CORS error khi login

**Nguyên nhân**: Vercel domain chưa được thêm vào CORS

**Giải pháp**:
1. Mở backend `app.py`
2. Thêm Vercel domain vào `origins` list
3. Push và redeploy backend

### Railway "Stopping Container"

**Nguyên nhân**: Server crash hoặc PORT binding sai

**Giải pháp**:
1. Check Railway logs
2. Đảm bảo `server.js` bind đến `process.env.PORT`
3. Verify Dockerfile configuration

### MongoDB connection timeout

**Nguyên nhân**: IP chưa được whitelist hoặc credentials sai

**Giải pháp**:
1. MongoDB Atlas → Network Access → Add `0.0.0.0/0`
2. Kiểm tra MONGO_URI trong .env
3. Test connection string locally

## 📊 Performance & Cost

### Railway Free Tier cho Voice Server

**Câu hỏi: $5 credit miễn phí có đủ cho 2 users không?**

**Trả lời: Có! Và còn thừa rất nhiều.**

#### WebRTC Peer-to-Peer Architecture

Voice server sử dụng **WebRTC P2P** (peer-to-peer):
```
User A ←──────────────────────────────────→ User B
       (Audio stream trực tiếp, không qua server)

              ↓ Chỉ lúc bắt đầu ↓
         
              Railway Server
         (Signaling only: ~5KB)
```

#### Chi phí thực tế

| Thành phần | Bandwidth/Request | Chi phí ước tính |
|-----------|------------------|------------------|
| **Signaling mỗi cuộc gọi** | ~5-10KB | $0.000001 |
| **Kết nối WebSocket** | ~1KB/phút | $0.00001/phút |
| **Server running 24/7** | RAM: ~50MB | ~$0.50/tháng |

**Tổng kết:**
- **2 users gọi 8 giờ/ngày**: ~$0.10-0.30/tháng
- **10 users online cùng lúc**: ~$0.50-1.00/tháng  
- **$5 credit = 5-10 tháng sử dụng** cho 2-10 users

#### So sánh với các platform khác

| Platform | Free Tier | Hạn chế | Phù hợp cho |
|----------|-----------|---------|-------------|
| **Railway** | $5 credit/tháng | Không sleep | ✅ Production (2-50 users) |
| **Render** | Free | Sleep sau 15 phút | ⚠️ Demo only |
| **Heroku** | $5/tháng | Cần credit card | Tương tự Railway |

### Performance Metrics

- **WebRTC**: Peer-to-peer = **latency < 100ms**
- **Socket.io**: Auto reconnection & fallback transports
- **Railway**: Always-on server (no cold starts)
- **Vercel**: Global CDN cho static files
- **Render**: Free tier có sleep sau 15 phút inactive

### Scalability

- **2-10 users**: Railway free tier (~$0.50/tháng)
- **10-50 users**: Railway Hobby plan ($5/tháng)  
- **50+ users**: Railway Pro hoặc dedicated server

> **💰 Tiết kiệm chi phí:** WebRTC P2P giúp server chỉ xử lý signaling → chi phí bandwidth cực thấp!

## 🔒 Security

- ✅ Password hashing với Werkzeug
- ✅ HTTPS everywhere (Vercel + Railway + Render auto SSL)
- ✅ CORS protection với whitelist domains
- ✅ Session-based authentication
- ✅ Secure cookies (httpOnly, Secure, SameSite)
- ✅ Environment variables cho secrets

## 📝 Changelog

### v1.0.0 (Dec 2025)
- ✅ Initial release
- ✅ Complete authentication system
- ✅ WebRTC voice chat
- ✅ Multi-platform deployment
- ✅ Discord-like UI

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Dương Khang**

## 🔗 Links

- **Live Demo**: https://discord-clone-frontend-pi.vercel.app
- **Voice Server**: https://discord-clone-frontend-production.up.railway.app
- **Auth API**: https://discord-clone-mp22.onrender.com

## 🙏 Acknowledgments

- Discord for UI/UX inspiration
- WebRTC for P2P technology
- Socket.io for real-time communication
- MongoDB Atlas for database hosting

---

**Made with ❤️ by Dương Khang**
