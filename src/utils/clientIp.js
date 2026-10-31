const net = require('net');

// Chỉ tin CF-Connecting-IP khi chắc chắn mọi request đi qua Cloudflare (Render tự đặt RENDER=true).
// Ở nơi khác (local, test) client có thể tự gửi header này để giả IP.
const trustCloudflare = process.env.TRUST_CF_CONNECTING_IP === 'true'
  || (process.env.RENDER === 'true' && process.env.TRUST_CF_CONNECTING_IP !== 'false');

// IP thật của người dùng.
// Trên Render, request đi qua Cloudflare rồi tới proxy của Render, nên req.ip chỉ là IP của proxy
// (mỗi request có thể khác nhau). Cloudflare đặt IP thật vào CF-Connecting-IP và ghi đè giá trị
// client tự gửi.
function clientIp(req, { trustCf = trustCloudflare } = {}) {
  if (trustCf) {
    const cf = req.get('cf-connecting-ip')?.trim();
    if (cf && net.isIP(cf)) return cf;
  }
  return req.ip;
}

module.exports = { clientIp };
