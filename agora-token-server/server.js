require('dotenv').config(); // Tải biến môi trường từ file .env
const express = require('express');
// Đảm bảo import cả RtcTokenBuilder, RtcRole VÀ RtmTokenBuilder, RtmRole
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder , RtmRole } = require('agora-access-token');

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

app.use(express.json()); // Để phân tích cú pháp JSON từ body request
app.use(express.urlencoded({ extended: true })); // Để phân tích cú pháp URL-encoded data

// Middleware để xử lý CORS (quan trọng cho các yêu cầu từ frontend)
app.use((req, res, next) => {
    // Cho phép tất cả các nguồn (chỉ dùng cho phát triển, trong sản phẩm nên chỉ định rõ nguồn gốc)
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Endpoint để tạo token RTC (cho video/audio call)
app.get('/rtc_token', (req, res) => {
    // Lấy channelName và uid từ query parameters của request
    const channelName = req.query.channelName;
    const uid = req.query.uid;

    if (!channelName) {
        return res.status(400).json({ error: 'channelName là bắt buộc.' });
    }
    if (!uid) {
        return res.status(400).json({ error: 'uid là bắt buộc.' });
    }

    // Thời gian hết hạn của token và đặc quyền (đơn vị giây)
    const expirationTimeInSeconds = 3600; // 1 giờ
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Vai trò của người dùng (PUBLISHER cho người phát và SUBSCRIBE cho người xem)
    const role = RtcRole.PUBLISHER; // Hoặc RtcRole.SUBSCRIBER nếu chỉ xem

    try {
        // Tạo token RTC
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            parseInt(uid), // uid phải là kiểu số nguyên
            role,
            privilegeExpiredTs
        );
        
        // Trả về token cho client
        res.json({ rtcToken: token });
    } catch (error) {
        console.error("Lỗi khi tạo token RTC:", error);
        res.status(500).json({ error: 'Không thể tạo token RTC. Vui lòng kiểm tra App ID và App Certificate.' });
    }
});

// Endpoint mới để tạo token RTM (cho nhắn tin thời gian thực)
app.get('/rtm_token', (req, res) => {
    const userId = req.query.uid; // RTM dùng userId, nên dùng uid từ frontend

    if (!userId) {
        return res.status(400).json({ error: 'uid (userId) là bắt buộc cho RTM.' });
    }

    const expirationTimeInSeconds = 3600; // 1 giờ
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
        // Tạo token RTM
        const token = RtmTokenBuilder.buildToken(
            appId,
            appCertificate,
            userId, // UID là string cho RTM
            RtmRole.Rtm_User, // Vai trò cho RTM, luôn là Rtm_User
            privilegeExpiredTs
        );

        res.json({ rtmToken: token });
    } catch (error) {
        console.error("Lỗi khi tạo token RTM:", error);
        res.status(500).json({ error: 'Không thể tạo token RTM. Vui lòng kiểm tra App ID và App Certificate.' });
    }
});


// Khởi động máy chủ
app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    console.log(`Để tạo token RTC, truy cập: http://localhost:${PORT}/rtc_token?channelName=main&uid=1234`);
    console.log(`Để tạo token RTM, truy cập: http://localhost:${PORT}/rtm_token?uid=1234`);
});