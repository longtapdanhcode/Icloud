# Runbook vận hành

Hướng dẫn xử lý các việc vận hành thường gặp với bản production. Cấu hình ban đầu xem [RENDER_SETUP.md](RENDER_SETUP.md), sao lưu xem [BACKUP_RESTORE.md](BACKUP_RESTORE.md), giới hạn gói Free xem [LIMITS.md](LIMITS.md).

| Thành phần | Ở đâu |
|---|---|
| Web app | Render, service `cloud-inventory`, https://cloud-inventory-ruyb.onrender.com |
| Database | Aiven MySQL 8, service `mysql-icloud-icloud`, database `defaultdb` |
| Code, CI, smoke test | GitHub `longtapdanhcode/Icloud`, tab **Actions** |
| Secret | Render → Environment (`DATABASE_URL`, `DB_CA_CERT`, `JWT_SECRET`), GitHub → Settings → Secrets (`SMOKE_EMAIL`, `SMOKE_PASSWORD`) |

Người phụ trách: Long (Người 4). Quyền admin trên Render, Aiven và GitHub hiện chỉ có Long.

## Kiểm tra nhanh hệ thống

```bash
curl https://cloud-inventory-ruyb.onrender.com/health
```

Kết quả bình thường: `{"status":"ok","db":"up","version":"<7 ký tự commit>",...}`.

- `version` cho biết commit đang chạy. So với commit mới nhất trên `main` để biết bản mới đã lên chưa.
- `uptime` nhỏ (vài giây) nghĩa là app vừa khởi động lại, thường do Render đánh thức app sau khi tắt vì không có request.
- Request đầu tiên sau khi app tắt có thể mất 1–3 phút. Đây là giới hạn của gói Free, không phải lỗi.

Kiểm tra đầy đủ hơn: GitHub → Actions → **Smoke test (production)** → **Run workflow**. Kết quả đúng là `13/13 passed`.

## Deploy

Deploy diễn ra tự động, không cần thao tác trên Render:

1. Mở PR vào `main`. CI chạy `test` (với MySQL thật) và `secrets` (gitleaks).
2. CI xanh, có 1 người duyệt, thì merge.
3. CI chạy lại trên `main`. Khi xanh, Render build (`npm ci`) và chạy `npm run db:migrate && npm start`.
4. Render gọi `/health`. Đạt thì chuyển traffic sang bản mới. Không đạt thì bản cũ vẫn chạy.
5. Khoảng 2 phút sau khi merge, kiểm tra `version` ở `/health`, rồi chạy smoke test với ô `expect_version` là 7 ký tự đầu của commit merge.

Deploy tay (khi cần chạy lại cùng commit): Render → service → **Manual Deploy → Deploy latest commit**.

**Deploy có migration:** backup trước khi merge (`npm run db:backup`, xem [BACKUP_RESTORE.md](BACKUP_RESTORE.md)). Migration chạy tự động lúc khởi động. Nếu migration lỗi, app không khởi động, health check không đạt và bản cũ tiếp tục chạy. Xem lỗi trong Render → Logs, dòng `[migrate]`.

## Rollback

Dùng khi bản mới lên production bị lỗi mà chưa sửa nhanh được.

1. Render → service → **Events**, tìm lần deploy gần nhất còn chạy tốt → **Rollback**. Render dùng lại bản build cũ nên chạy nhanh, không build lại.
2. Kiểm tra `/health`: `version` phải là commit cũ.
3. **Rollback trên dashboard tự tắt auto-deploy.** Sau khi sửa lỗi bằng PR mới và merge, vào **Settings → Auto-Deploy** bật lại "After CI Checks Pass", nếu không bản sửa sẽ không lên.
4. Ghi lại vào nhóm: commit lỗi, thời điểm rollback, người xử lý.

Cách khác: revert PR lỗi trên GitHub (nút **Revert** trong PR đã merge), duyệt và merge PR revert. Cách này giữ lịch sử rõ ràng và không tắt auto-deploy, nhưng chậm hơn vì phải chờ CI.

**Lưu ý về database:** rollback chỉ đưa code về bản cũ, không đưa schema về bản cũ. Migration ở dự án này chỉ thêm bảng/cột nên code cũ vẫn chạy được với schema mới. Nếu một migration xóa hoặc đổi tên cột, phải khôi phục từ backup (xem phần "Khôi phục production" trong [BACKUP_RESTORE.md](BACKUP_RESTORE.md)).

## Xem log

Render → service → **Logs**. Ở production mỗi request là một dòng JSON:

```json
{"level":"warn","type":"request","requestId":"3bdbf1a2-...","method":"POST","path":"/api/auth/login","status":401,"durationMs":53.4,"userId":1}
```

| Muốn tìm | Gõ vào ô lọc |
|---|---|
| Mọi lỗi | `"level":"error"` |
| Lỗi 5xx | `"status":5` |
| Lỗi có stack trace | `"type":"exception"` |
| Một request cụ thể | mã `requestId` |
| Lần khởi động, migration | `[migrate]` hoặc `listening` |

Khi người dùng báo lỗi 500: response lỗi có `error.requestId`, header `X-Request-Id` cũng có mã này. Xin mã đó rồi dán vào ô lọc để thấy đúng dòng lỗi.

Log MySQL và metrics DB: Aiven → service → **Logs** / **Metrics**.

## Backup và restore

Chi tiết từng bước trong [BACKUP_RESTORE.md](BACKUP_RESTORE.md). Tóm tắt:

| Việc | Lệnh |
|---|---|
| Backup production | `npm run db:backup` (đặt `BACKUP_DATABASE_URL` bằng `read -s`) |
| Khôi phục thử vào DB local | `npm run db:restore -- backups/<file>.sql.gz` |
| Đối chiếu với production | `npm run db:compare` |

Khi nào backup: trước demo, trước nghiệm thu, trước khi merge PR có migration, mỗi tuần một lần. File backup chỉ để ở máy cá nhân và Google Drive riêng, không đưa vào Git hay nhóm chat.

## Xử lý sự cố

### App không phản hồi, trình duyệt quay mãi

1. Chờ 3 phút: app có thể đang khởi động lại sau khi tắt vì không có request.
2. Vẫn không được: Render → **Events**. Nếu deploy gần nhất báo **failed**, xem Logs của lần deploy đó.
3. Render → **Logs**: có `listening` là app đã chạy. Không có thì xem dòng lỗi ngay trước đó.
4. Kiểm tra trang trạng thái Render: https://status.render.com.

### `/health` trả `"db":"down"` (HTTP 503)

1. Aiven → service: trạng thái phải là **Running**. Nếu **Powered off** (gói Free tự tắt khi lâu không dùng), bấm **Power on**, chờ 2–5 phút.
2. Đúng là Running mà vẫn down: kiểm tra `DATABASE_URL` trong Render → Environment có khớp **Service URI** trên Aiven không (Aiven đổi mật khẩu thì URI cũng đổi).
3. Log có `HANDSHAKE_SSL_ERROR`: `DB_CA_CERT` sai hoặc thiếu dòng `-----BEGIN/END CERTIFICATE-----`.

### Smoke test báo lỗi

Mở lần chạy lỗi trong GitHub → Actions, xem dòng ✖:

| Dòng lỗi | Nguyên nhân thường gặp | Xử lý |
|---|---|---|
| `App không phản hồi /health sau 3 phút` | App khởi động quá lâu hoặc Render gặp sự cố | Chạy lại workflow. Lỗi lặp lại thì làm theo mục "App không phản hồi" |
| `/health` có `db: down` | Aiven tắt | Mục "`/health` trả db down" |
| `POST /api/auth/login` | Mật khẩu STAFF đã bị đổi, hoặc tài khoản bị khóa | Đặt lại mật khẩu qua trang Nhân viên (ADMIN), rồi cập nhật secret `SMOKE_PASSWORD` |
| `429` | Quá 10 lần đăng nhập trong 15 phút từ cùng IP | Chờ 15 phút |

### Đăng nhập báo "Quá nhiều lần thử" (429)

Giới hạn 10 lần đăng nhập mỗi 15 phút cho một IP. Chờ hết 15 phút, hoặc redeploy (Manual Deploy) để xóa bộ đếm, vì bộ đếm nằm trong bộ nhớ app.

### Quên mật khẩu

- **STAFF:** ADMIN vào trang **Nhân viên** → đặt lại mật khẩu. Nếu đó là tài khoản smoke test thì cập nhật luôn `SMOKE_PASSWORD` (`gh secret set SMOKE_PASSWORD`).
- **ADMIN:** không có chức năng tự đặt lại. Người có Service URI của Aiven tạo mã băm bcrypt mới trên máy mình rồi cập nhật cột `password_hash` của tài khoản ADMIN. Không gửi mật khẩu hay URI qua chat.

### Lộ secret

1. Đổi ngay giá trị bị lộ:
   - Mật khẩu DB: Aiven → service → **Users** → reset mật khẩu `avnadmin`, rồi cập nhật `DATABASE_URL` trên Render.
   - `JWT_SECRET`: Render → Environment → tạo giá trị ngẫu nhiên mới. Mọi người dùng sẽ phải đăng nhập lại.
   - Mật khẩu tài khoản app: đặt lại qua trang Nhân viên.
2. Nếu secret đã bị commit: đổi giá trị là đủ, không cần viết lại lịch sử Git. Báo cả nhóm.

### Aiven thông báo sắp tắt service

Gói Free tự tắt service khi lâu không dùng và gửi email báo trước. Khi nhận email: chạy `npm run db:backup` ngay, sau đó mở web dùng thử vài thao tác để có hoạt động. Nếu service đã tắt, bật lại bằng **Power on**.

## Trước buổi demo hoặc nghiệm thu

Xem [DEMO.md](DEMO.md), mục "Chuẩn bị".
