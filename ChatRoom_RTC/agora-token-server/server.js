require('dotenv').config(); // Tải biến môi trường từ file .env
const express = require('express');
const path = require('path');
const cors = require('cors'); // ✅ BỔ SUNG: Cần dùng để fix lỗi fetch

// Đảm bảo import cả RtcTokenBuilder, RtcRole VÀ RtmTokenBuilder, RtmRole
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } = require('agora-access-token');

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ THÊM cors middleware
app.use(cors());

// Giữ nguyên middleware gốc của bạn
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Kiểm tra xem App ID và App Certificate có tồn tại không
const appId = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_APP_CERTIFICATE;

if (!appId || !appCertificate) {
    console.error("Lỗi: AGORA_APP_ID hoặc AGORA_APP_CERTIFICATE không được đặt trong file .env");
    console.error("Vui lòng đảm bảo file .env có chứa AGORA_APP_ID và AGORA_APP_CERTIFICATE.");
    process.exit(1);
}

// --- PHỤC VỤ FILE FRONTEND ---
// ✅ Giữ nguyên phần phục vụ frontend
app.use(express.static(path.join(__dirname, '../Starter Template')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Starter Template/lobby.html'));
});

// ✅ Vẫn giữ middleware xử lý CORS thủ công của bạn nếu muốn
// (dù đã có cors ở trên, cái này có thể giữ lại không sao)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ✅ Endpoint RTC Token
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

// ✅ Endpoint RTM Token
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

// ✅ Giữ nguyên server listen
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    console.log(`Mở trình duyệt trên máy khác trong cùng mạng và truy cập vào IP của máy này.`);
    console.log(`Ví dụ: http://192.168.1.10:${PORT}`);
});
