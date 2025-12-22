# Discord Voice Clone

Ứng dụng chat voice real-time đơn giản cho 2 user sử dụng WebRTC và Socket.io.

## Tính năng

- ✅ Chat voice real-time giữa 2 người dùng
- ✅ WebRTC để streaming audio chất lượng cao
- ✅ Giao diện tương tự Discord
- ✅ Bật/tắt microphone
- ✅ Hiển thị trạng thái kết nối
- ✅ Tự động phát hiện người dùng online

## Yêu cầu

- Node.js 14+ 
- Trình duyệt hiện đại (Chrome, Firefox, Edge, Safari)

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy server:
```bash
npm start
```

3. Mở trình duyệt và truy cập:
```
http://localhost:3000
```

4. Mở tab mới (hoặc trình duyệt khác) và truy cập cùng URL để tạo user thứ 2

## Hướng dẫn sử dụng

1. Mở 2 tab/cửa sổ trình duyệt với URL `http://localhost:3000`
2. Đợi cả 2 user kết nối
3. Ở một tab, click vào tên user khác để bắt đầu cuộc gọi
4. Cho phép truy cập microphone khi được hỏi
5. Click nút "Microphone Off" để bật mic và bắt đầu nói chuyện
6. Click "Disconnect" để kết thúc cuộc gọi

## Công nghệ sử dụng

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML5, CSS3, JavaScript
- **WebRTC**: Để streaming audio peer-to-peer
- **Socket.io**: Để signaling và quản lý user

## Deploy lên Render

### Cách 1: Qua GitHub (Khuyến nghị)

1. **Push code lên GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

2. **Deploy trên Render:**
   - Vào [render.com](https://render.com) và đăng nhập
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Render tự động detect và deploy
   - ✅ HTTPS tự động được cấu hình!

3. **Truy cập app:**
   - Render sẽ cung cấp URL: `https://your-app.onrender.com`
   - ✅ Không còn cảnh báo bảo mật
   - ✅ SSL certificate hợp lệ từ Let's Encrypt

### Cách 2: Manual Deploy

```bash
# Render tự động chạy:
npm install
npm start
```

## Lưu ý

- Ứng dụng hỗ trợ nhiều user (peer-to-peer)
- Render cung cấp HTTPS miễn phí (WebRTC yêu cầu)
- Free tier của Render có thể sleep sau 15 phút không hoạt động

## License

MIT
