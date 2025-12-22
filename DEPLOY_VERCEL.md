# Hướng dẫn Deploy lên Vercel

## Bước 1: Chuẩn bị

1. Tạo tài khoản miễn phí tại [vercel.com](https://vercel.com)
2. Cài đặt Vercel CLI (tùy chọn):
```bash
npm install -g vercel
```

## Bước 2: Cấu hình project

File `vercel.json` đã được tạo sẵn với cấu hình:
- Build Node.js server
- Routing cho Socket.io
- Serve static files từ thư mục public

## Bước 3: Deploy qua Vercel Dashboard (Khuyến nghị)

### 3.1. Push code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 3.2. Import project từ GitHub

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import repository từ GitHub
4. Vercel sẽ tự động phát hiện settings
5. Click **"Deploy"**

## Bước 4: Deploy qua Vercel CLI

```bash
# Đăng nhập
vercel login

# Deploy
vercel

# Deploy production
vercel --prod
```

## Lưu ý quan trọng ⚠️

### WebSocket & Socket.io trên Vercel

Vercel có giới hạn với WebSocket connections:
- **Serverless functions timeout**: 10 giây (Hobby plan), 60 giây (Pro plan)
- **WebSocket không được hỗ trợ đầy đủ** trên Vercel Serverless

### Giải pháp thay thế:

#### Option 1: Sử dụng Render cho backend (Khuyến nghị)
Bạn đã có backend trên Render: `https://discord-clone-mp22.onrender.com`

1. Deploy **chỉ frontend** (static files) lên Vercel
2. Giữ **Node.js server** (Socket.io) trên Render hoặc Railway

**Cấu hình cho static deployment:**

Tạo file `vercel.json` mới:
```json
{
  "version": 2,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

#### Option 2: Deploy full app lên Railway/Render

**Railway** hoặc **Render** hỗ trợ WebSocket tốt hơn Vercel:

- [Railway.app](https://railway.app) - Miễn phí $5/tháng credit
- [Render.com](https://render.com) - Miễn phí với hạn chế

#### Option 3: Hybrid Deployment (Tốt nhất)

1. **Frontend (Vercel)**: Deploy static files
2. **Voice Server (Railway/Render)**: Node.js + Socket.io
3. **Auth Backend (Render)**: Python Flask (đã có)

## Cấu hình cho Static Deployment trên Vercel

Nếu chỉ deploy frontend:

### 1. Cập nhật server.js URL trong frontend

Sửa `public/script.js`:
```javascript
const socket = io('https://your-railway-app.railway.app', {
  // ... config
});
```

### 2. Deploy

```bash
vercel --prod
```

## Environment Variables

Nếu cần thiết lập biến môi trường:

1. Vào **Project Settings** → **Environment Variables**
2. Thêm:
   - `BACKEND_URL`: https://discord-clone-mp22.onrender.com
   - Các biến khác nếu cần

## Checklist Deploy

- [ ] Code đã push lên GitHub
- [ ] File `vercel.json` đã cấu hình
- [ ] Environment variables đã thiết lập
- [ ] Test local trước khi deploy: `npm start`
- [ ] Deploy và kiểm tra logs nếu có lỗi

## Commands hữu ích

```bash
# Xem logs
vercel logs

# Xóa deployment
vercel rm [deployment-url]

# Xem danh sách deployments
vercel ls

# Mở project trong browser
vercel open
```

## Kết luận

**Khuyến nghị deployment strategy:**

```
┌─────────────────┐
│   Vercel        │  → Static Frontend (HTML/CSS/JS)
│   (Frontend)    │     https://your-app.vercel.app
└─────────────────┘

┌─────────────────┐
│   Railway       │  → Node.js + Socket.io
│   (Voice Server)│     wss://your-app.railway.app
└─────────────────┘

┌─────────────────┐
│   Render        │  → Flask Auth Backend
│   (Auth API)    │     https://discord-clone-mp22.onrender.com
└─────────────────┘
```

Với architecture này, bạn tận dụng được điểm mạnh của từng platform!
