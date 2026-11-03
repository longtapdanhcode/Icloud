process.env.NODE_ENV = "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");

const app = require("../src/app");
const db = require("../src/config/db");
const env = require("../src/config/env");

const request = supertest(app);
const testPassword = "Staff-Test-123";
const suffix = `${Date.now()}-${process.pid}`;
const lockedEmail = `locked-${suffix}@example.test`;
const createdEmail = `created-${suffix}@example.test`;

let adminToken;
let staffToken;
let lockedToken;
let lockedUserId;
let createdUserId;

// Tạo dữ liệu kiểm thử riêng, không sử dụng hoặc khóa tài khoản seed trên production.
before(async () => {
  assert.ok(env.JWT_SECRET, "Cần cấu hình JWT_SECRET để chạy test users");

  const admins = await db.query(
    "SELECT id, email FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' ORDER BY id LIMIT 1",
  );
  assert.ok(
    admins.length,
    "Cần có ít nhất một tài khoản ADMIN ACTIVE trong database test",
  );

  adminToken = jwt.sign(
    { id: Number(admins[0].id), email: admins[0].email, role: "ADMIN" },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  const passwordHash = await bcrypt.hash(testPassword, 10);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, 'STAFF', 'ACTIVE')`,
    ["Nhân viên kiểm thử", `staff-${suffix}@example.test`, passwordHash],
  );
  const staffId = Number(result.insertId);
  staffToken = jwt.sign(
    { id: staffId, email: `staff-${suffix}@example.test`, role: "STAFF" },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  const lockedResult = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, 'STAFF', 'LOCKED')`,
    ["Nhân viên bị khóa kiểm thử", lockedEmail, passwordHash],
  );
  lockedUserId = Number(lockedResult.insertId);
  lockedToken = jwt.sign(
    { id: lockedUserId, email: lockedEmail, role: "STAFF" },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );
});

after(async () => {
  // Chỉ xóa các tài khoản do test này tạo ra.
  const ids = [lockedUserId, createdUserId].filter(Boolean);
  if (ids.length) {
    await db.query("DELETE FROM users WHERE id IN (?)", [ids]);
  }
  if (staffToken) {
    await db.query("DELETE FROM users WHERE email = ?", [
      `staff-${suffix}@example.test`,
    ]);
  }
  await db.close();
});

test("GET /api/users - không có token trả 401", async () => {
  const res = await request.get("/api/users");
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("GET /api/users - STAFF gọi API quản lý nhân viên trả 403", async () => {
  const res = await request
    .get("/api/users")
    .set("Authorization", `Bearer ${staffToken}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test("POST /api/users - thiếu họ tên trả 400", async () => {
  const res = await request
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ email: createdEmail, password: testPassword });
  assert.equal(res.status, 400);
});

test("POST /api/users - mật khẩu ngắn trả 400", async () => {
  const res = await request
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      full_name: "Nhân viên test",
      email: createdEmail,
      password: "1234567",
    });
  assert.equal(res.status, 400);
});

test("POST /api/users - ADMIN tạo nhân viên thành công và email trùng trả 409", async () => {
  const payload = {
    full_name: "Nhân viên được tạo bởi test",
    email: createdEmail,
    password: testPassword,
  };

  const created = await request
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(payload);

  assert.equal(created.status, 201);
  assert.equal(created.body.success, true);
  assert.equal(created.body.data.email, createdEmail);
  createdUserId = Number(created.body.data.id);

  const duplicate = await request
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(payload);
  assert.equal(duplicate.status, 409);
});

test("POST /api/auth/login - tài khoản LOCKED nhập sai mật khẩu trả 401", async () => {
  const res = await request
    .post("/api/auth/login")
    .send({ email: lockedEmail, password: "Wrong-Password-123" });
  assert.equal(res.status, 401);
  assert.match(res.body.error.message, /không đúng/i);
});

test("POST /api/auth/login - tài khoản LOCKED nhập đúng mật khẩu trả 403", async () => {
  const res = await request
    .post("/api/auth/login")
    .send({ email: lockedEmail, password: testPassword });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.message, "Tài khoản đã bị khóa");
});

test("GET /api/auth/me - token cũ của tài khoản đang LOCKED trả 403", async () => {
  const res = await request
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${lockedToken}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.error.message, "Tài khoản đã bị khóa");
});
