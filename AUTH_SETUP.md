# Hướng dẫn cài đặt Authentication System

## 1. Cài đặt Python packages

```bash
pip install -r requirements.txt
```

## 2. Khởi động Auth Server (Flask)

Mở terminal mới và chạy:

```bash
python auth-server.py
```

Server sẽ chạy trên: `https://localhost:5000`

## 3. Khởi động Voice Chat Server (Node.js)

Mở terminal khác và chạy:

```bash
npm start
```

Server sẽ chạy trên: `https://localhost:3000`

## 4. Truy cập ứng dụng

1. Mở trình duyệt và truy cập: `https://localhost:3000`
2. Bạn sẽ được chuyển hướng đến trang đăng nhập
3. Click "Đăng ký ngay" để tạo tài khoản mới
4. Sau khi đăng ký, đăng nhập với tài khoản vừa tạo
5. Bắt đầu sử dụng voice chat!

## Tính năng

✅ Đăng ký tài khoản mới
✅ Đăng nhập với username/password
✅ Session management
✅ Đăng xuất
✅ Bảo mật với password hashing
✅ MongoDB database
✅ CORS enabled
✅ HTTPS/SSL support

## Lưu ý

- Cần có Python 3.7+ và Node.js 14+ đã cài đặt
- MongoDB Atlas đã được cấu hình sẵn
- Chấp nhận cảnh báo SSL vì đang dùng self-signed certificate
- Đảm bảo cả 2 servers đang chạy để ứng dụng hoạt động
