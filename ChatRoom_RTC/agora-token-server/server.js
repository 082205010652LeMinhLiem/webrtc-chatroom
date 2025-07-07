require('dotenv').config(); // Tải biến môi trường từ file .env
const express = require('express');
const path = require('path'); // <-- THÊM DÒNG NÀY
// Đảm bảo import cả RtcTokenBuilder, RtcRole VÀ RtmTokenBuilder, RtmRole
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } = require('agora-access-token');

const app = express();
const PORT = process.env.PORT || 8080;

// Lấy App ID và App Certificate từ biến môi trường
const appId = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_APP_CERTIFICATE;

// Kiểm tra xem App ID và App Certificate có tồn tại không
if (!appId || !appCertificate) {
    console.error("Lỗi: AGORA_APP_ID hoặc AGORA_APP_CERTIFICATE không được đặt trong file .env");
    console.error("Vui lòng đảm bảo file .env có chứa AGORA_APP_ID và AGORA_APP_CERTIFICATE.");
    process.exit(1);
}

// --- PHỤC VỤ FILE FRONTEND ---
// Dòng này sẽ phục vụ tất cả các file (HTML, CSS, JS) trong thư mục 'Starter Template'
// __dirname trỏ đến thư mục hiện tại (agora-token-server)
// '../Starter Template' là đường dẫn tương đối đến thư mục frontend của bạn
app.use(express.static(path.join(__dirname, '../Starter Template')));

// Route mặc định để khi người dùng truy cập vào, họ sẽ nhận được lobby.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Starter Template/lobby.html'));
});
// -----------------------------


app.use(express.json()); // Để phân tích cú pháp JSON từ body request
app.use(express.urlencoded({ extended: true })); // Để phân tích cú pháp URL-encoded data

// Middleware để xử lý CORS (quan trọng cho các yêu cầu từ frontend)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Endpoint để tạo token RTC (cho video/audio call)
// ĐỔI TÊN ENDPOINT CHO RÕ RÀNG
app.get('/token/rtc', (req, res) => {
    const channelName = req.query.channelName;
    const uid = req.query.uid;

    if (!channelName) {
        return res.status(400).json({ error: 'channelName là bắt buộc.' });
    }
    if (!uid) {
        return res.status(400).json({ error: 'uid là bắt buộc.' });
    }

    const expirationTimeInSeconds = 3600; // 1 giờ
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    const role = RtcRole.PUBLISHER;

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            parseInt(uid),
            role,
            privilegeExpiredTs
        );
        res.json({ rtcToken: token });
    } catch (error) {
        console.error("Lỗi khi tạo token RTC:", error);
        res.status(500).json({ error: 'Không thể tạo token RTC.' });
    }
});

// Endpoint mới để tạo token RTM (cho nhắn tin thời gian thực)
// ĐỔI TÊN ENDPOINT CHO RÕ RÀNG
app.get('/token/rtm', (req, res) => {
    const userId = req.query.uid;

    if (!userId) {
        return res.status(400).json({ error: 'uid (userId) là bắt buộc cho RTM.' });
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
        const token = RtmTokenBuilder.buildToken(
            appId,
            appCertificate,
            userId,
            RtmRole.Rtm_User,
            privilegeExpiredTs
        );
        res.json({ rtmToken: token });
    } catch (error) {
        console.error("Lỗi khi tạo token RTM:", error);
        res.status(500).json({ error: 'Không thể tạo token RTM.' });
    }
});

// Khởi động máy chủ - SỬA LẠI DÒNG NÀY
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    console.log(`Mở trình duyệt trên máy khác trong cùng mạng và truy cập vào IP của máy này.`);
    console.log(`Ví dụ: http://192.168.1.10:${PORT}`);
});
