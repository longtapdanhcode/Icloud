/**
 * Cloud Inventory - Staff Management UI
 * API: GET /api/users, POST /api/users
 * Chỉ ADMIN được phép truy cập; backend vẫn là nơi xác thực quyền cuối cùng.
 */

const UsersApi = {
  baseUrl: "/api/users",

  async list() {
    const result = await window.Api.request(this.baseUrl);
    return Array.isArray(result.data) ? result.data : [];
  },

  async create(payload) {
    const result = await window.Api.request(this.baseUrl, {
      method: "POST",
      body: payload,
    });
    return result.data;
  },
};

function escapeUserHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatUserDate(value) {
  if (!value) return '<span class="text-muted">--</span>';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeUserHtml(value);
  return date.toLocaleString("vi-VN");
}

function showUsersToast(message, success = true) {
  const toastEl = document.getElementById("appToast");
  const toastBody = document.getElementById("appToastBody");
  if (!toastEl) {
    alert(message);
    return;
  }
  toastEl.className = `toast align-items-center ${success ? "text-bg-success" : "text-bg-danger"} border-0`;
  toastBody.innerHTML = `<i class="bi ${success ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} fs-5"></i><span>${escapeUserHtml(message)}</span>`;
  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 }).show();
}

function setUsersView(view) {
  document
    .getElementById("usersLoading")
    .classList.toggle("d-none", view !== "loading");
  document
    .getElementById("usersError")
    .classList.toggle("d-none", view !== "error");
  document
    .getElementById("usersEmpty")
    .classList.toggle("d-none", view !== "empty");
  document
    .getElementById("usersTableContainer")
    .classList.toggle("d-none", view !== "table");
}

function renderUsers(users) {
  const body = document.getElementById("usersTableBody");
  body.innerHTML = users
    .map(
      (user, index) => `
    <tr>
      <td class="text-muted">${index + 1}</td>
      <td><div class="fw-semibold">${escapeUserHtml(user.full_name)}</div></td>
      <td>${escapeUserHtml(user.email)}</td>
      <td><span class="badge bg-info-subtle text-info border border-info-subtle">${escapeUserHtml(user.role || "STAFF")}</span></td>
      <td class="small text-muted">${formatUserDate(user.created_at)}</td>
    </tr>
  `,
    )
    .join("");
  document.getElementById("staffTotal").textContent =
    users.length.toLocaleString("vi-VN");
  setUsersView(users.length ? "table" : "empty");
}

async function loadUsers() {
  setUsersView("loading");
  document.getElementById("usersAlertContainer").innerHTML = "";
  try {
    const users = await UsersApi.list();
    renderUsers(users);
  } catch (error) {
    setUsersView("error");
    document.getElementById("usersErrorMessage").textContent =
      error.message || "Không thể tải danh sách nhân viên.";
    document.getElementById("staffTotal").textContent = "--";
  }
}

function validateStaffForm() {
  const form = document.getElementById("createStaffForm");
  const fullName = document.getElementById("staffFullName");
  const email = document.getElementById("staffEmail");
  const password = document.getElementById("staffPassword");

  fullName.value = fullName.value.trim();
  email.value = email.value.trim().toLowerCase();

  fullName.setCustomValidity(
    fullName.value.length > 0 && fullName.value.length <= 100
      ? ""
      : "Tên không hợp lệ",
  );
  email.setCustomValidity(
    email.validity.typeMismatch || !email.value ? "Email không hợp lệ" : "",
  );
  password.setCustomValidity(
    password.value.length >= 6 ? "" : "Mật khẩu quá ngắn",
  );

  form.classList.add("was-validated");
  return form.checkValidity();
}

function setCreateLoading(loading) {
  document.getElementById("createStaffSubmit").disabled = loading;
  document
    .getElementById("createStaffSpinner")
    .classList.toggle("d-none", !loading);
  document
    .getElementById("createStaffIcon")
    .classList.toggle("d-none", loading);
  document.getElementById("createStaffSubmitText").textContent = loading
    ? "Đang tạo..."
    : "Tạo tài khoản";
}

async function handleCreateStaff(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const alertBox = document.getElementById("createStaffAlert");
  alertBox.classList.add("d-none");
  alertBox.textContent = "";
  if (!validateStaffForm()) return;

  const payload = {
    full_name: document.getElementById("staffFullName").value.trim(),
    email: document.getElementById("staffEmail").value.trim().toLowerCase(),
    password: document.getElementById("staffPassword").value,
  };

  setCreateLoading(true);
  try {
    await UsersApi.create(payload);
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("createStaffModal"),
    ).hide();
    form.reset();
    form.classList.remove("was-validated");
    showUsersToast("Tạo tài khoản nhân viên thành công.");
    await loadUsers();
  } catch (error) {
    alertBox.textContent =
      error.message || "Không thể tạo tài khoản nhân viên.";
    alertBox.classList.remove("d-none");
  } finally {
    setCreateLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  let currentUser;
  try {
    if (!window.Api || typeof window.Api.requireLogin !== "function") {
      throw new Error("Không tìm thấy module xác thực.");
    }
    currentUser = await window.Api.requireLogin({ roles: ["ADMIN"] });
  } catch {
    return; // requireLogin tự điều hướng nếu chưa đăng nhập hoặc không đủ quyền.
  }

  if (window.Layout)
    window.Layout.render({ active: "users", user: currentUser });

  document.getElementById("retryUsersBtn").addEventListener("click", loadUsers);
  document
    .getElementById("createStaffForm")
    .addEventListener("submit", handleCreateStaff);
  document
    .getElementById("createStaffModal")
    .addEventListener("hidden.bs.modal", () => {
      const form = document.getElementById("createStaffForm");
      form.reset();
      form.classList.remove("was-validated");
      document.getElementById("createStaffAlert").classList.add("d-none");
    });

  await loadUsers();
});
