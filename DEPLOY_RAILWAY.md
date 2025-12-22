# Railway/Render Configuration

## Deploy Voice Server lên Railway

Railway hỗ trợ WebSocket tốt hơn Vercel cho Socket.io.

### Bước 1: Tạo tài khoản Railway
1. Truy cập [railway.app](https://railway.app)
2. Đăng nhập bằng GitHub

### Bước 2: Deploy

#### Option A: Deploy từ GitHub (Khuyến nghị)
1. Click "New Project"
2. Chọn "Deploy from GitHub repo"
3. Chọn repository của bạn
4. Railway tự động detect và deploy

#### Option B: Deploy từ Docker
Railway sẽ tự động detect Dockerfile và build

### Bước 3: Cấu hình

1. **Environment Variables**: Railway tự động set PORT
2. **Domain**: Railway cung cấp domain miễn phí: `your-app.railway.app`

### Bước 4: Cập nhật Frontend

Sau khi có Railway URL, cập nhật trong `public/script.js`:

```javascript
const socket = io('https://your-app.railway.app', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling']
});
```

## Deploy lên Render (Alternative)

### Bước 1: Tạo tài khoản
Truy cập [render.com](https://render.com)

### Bước 2: New Web Service
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Cấu hình:
   - **Name**: discord-voice-server
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

### Bước 3: Deploy
Render tự động deploy khi push code

## Architecture hiện tại

```
┌──────────────────────────────────────────┐
│          VERCEL (Frontend)               │
│   https://your-app.vercel.app            │
│   - Serve HTML/CSS/JS                    │
└──────────────────────────────────────────┘
                   │
                   ├─────────────────────────┐
                   │                         │
           ┌───────▼────────┐    ┌──────────▼──────────┐
           │   RAILWAY      │    │   RENDER (Auth)     │
           │ Voice Server   │    │   Flask Backend     │
           │   Socket.io    │    │   /api/login        │
           │   WebRTC       │    │   /api/register     │
           └────────────────┘    └─────────────────────┘
```

## Files đã tạo

- ✅ `Dockerfile` - Để deploy lên Railway/Render
- ✅ `vercel.json` - Cấu hình Vercel (static only)
- ✅ `.vercelignore` - Ignore unnecessary files

## Next Steps

1. **Push changes:**
```bash
git add .
git commit -m "Add Railway config"
git push
```

2. **Deploy Voice Server:**
   - Option 1: Railway (Khuyến nghị)
   - Option 2: Render

3. **Cập nhật Socket.io URL** trong frontend sau khi có Railway domain

4. **Redeploy Vercel** với config mới:
```bash
vercel --prod
```

## Lưu ý

- Vercel → Static files only
- Railway/Render → Socket.io + WebRTC
- Render (existing) → Authentication API
