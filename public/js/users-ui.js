/* Cloud Inventory - Staff Management UI. Common Api/Layout are intentionally untouched. */
(() => {
  "use strict";
  const BASE = "/api/users";
  const state = {
    page: 1,
    limit: 10,
    search: "",
    status: "",
    total: 0,
    totalPages: 1,
    editingId: null,
    passwordId: null,
    timer: null,
  };
  const $ = (id) => document.getElementById(id);
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c],
    );
  const dataOf = (r) => r?.data ?? r ?? {};
  const request = (path, options) => window.Api.request(path, options);

  function toast(message, ok = true) {
    const el = $("appToast");
    if (!el) return alert(message);
    el.className = `toast align-items-center ${ok ? "text-bg-success" : "text-bg-danger"} border-0`;
    $("appToastBody").textContent = message;
    bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
  }
  function dateText(v) {
    if (!v) return "--";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleString("vi-VN");
  }
  function statusBadge(s) {
    return s === "LOCKED"
      ? '<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">Đã khóa</span>'
      : '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">Đang hoạt động</span>';
  }
  function view(name) {
    ["loading", "error", "empty", "table"].forEach((v) => {
      const el = $(`users${v[0].toUpperCase()}${v.slice(1)}`);
      if (el) el.classList.toggle("d-none", v !== name);
    });
    $("paginationNav")
      .closest("nav")
      .classList.toggle("d-none", name !== "table");
  }
  async function loadStats() {
    try {
      const d = dataOf(await request(`${BASE}/statistics`));
      $("staffTotal").textContent = Number(
        d.total_staff ?? d.total ?? 0,
      ).toLocaleString("vi-VN");
      $("staffActive").textContent = Number(
        d.active_staff ?? d.active ?? 0,
      ).toLocaleString("vi-VN");
      $("staffLocked").textContent = Number(
        d.locked_staff ?? d.locked ?? 0,
      ).toLocaleString("vi-VN");
      $("staffNewThisMonth").textContent = Number(
        d.new_staff_this_month ?? d.new_this_month ?? 0,
      ).toLocaleString("vi-VN");
    } catch (e) {
      console.warn("Statistics API:", e);
      ["staffTotal", "staffActive", "staffLocked", "staffNewThisMonth"].forEach(
        (id) => ($(id).textContent = "--"),
      );
    }
  }
  function normalizeList(r) {
    const d = dataOf(r),
      rows = Array.isArray(d) ? d : d.users || d.items || d.rows || [];
    const m = r?.meta || d.meta || d.pagination || {};
    const total = Number(m.total ?? d.total ?? rows.length);
    return {
      rows,
      total,
      page: Number(m.page ?? d.page ?? state.page),
      limit: Number(m.limit ?? d.limit ?? state.limit),
      pages: Number(
        m.totalPages ??
          m.total_pages ??
          d.totalPages ??
          d.total_pages ??
          Math.max(1, Math.ceil(total / state.limit)),
      ),
    };
  }
  function pagination() {
    const nav = $("paginationNav");
    nav.innerHTML = "";
    const item = (label, page, disabled, active = false, aria = label) => {
      const li = document.createElement("li");
      li.className = `page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`;
      li.innerHTML = `<button class="page-link" type="button" aria-label="${esc(aria)}" ${disabled ? "disabled" : ""}>${label}</button>`;
      if (!disabled && !active)
        li.querySelector("button").addEventListener("click", () => {
          state.page = page;
          loadUsers();
        });
      nav.appendChild(li);
    };
    item("&laquo;", state.page - 1, state.page <= 1, false, "Trang trước");
    for (
      let p = Math.max(1, state.page - 2);
      p <= Math.min(state.totalPages, state.page + 2);
      p++
    )
      item(String(p), p, false, p === state.page);
    item(
      "&raquo;",
      state.page + 1,
      state.page >= state.totalPages,
      false,
      "Trang sau",
    );
  }
  function render(rows) {
    $("usersTableBody").innerHTML = rows
      .map((u, i) => {
        const id = Number(u.id),
          status = u.status || "ACTIVE",
          name = esc(u.full_name),
          email = esc(u.email);
        return `<tr><td class="text-muted">${(state.page - 1) * state.limit + i + 1}</td>
      <td><div class="d-flex align-items-center gap-2"><span class="user-avatar" aria-hidden="true">${esc((u.full_name || "N").trim().charAt(0).toUpperCase())}</span><span class="fw-semibold">${name}</span></div></td>
      <td>${email}</td><td><span class="badge bg-info-subtle text-info-emphasis border border-info-subtle">${esc(u.role || "STAFF")}</span></td>
      <td>${statusBadge(status)}</td><td class="small text-muted">${dateText(u.created_at)}</td>
      <td><div class="d-flex justify-content-end gap-1 flex-wrap">
      <button type="button" class="btn btn-sm btn-outline-secondary" data-action="detail" data-id="${id}" title="Xem" aria-label="Xem thông tin ${name}"><i class="bi bi-eye" aria-hidden="true"></i></button>
      <button type="button" class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${id}" title="Sửa" aria-label="Chỉnh sửa ${name}"><i class="bi bi-pencil" aria-hidden="true"></i></button>
      <button type="button" class="btn btn-sm btn-outline-warning" data-action="password" data-id="${id}" data-name="${name}" data-email="${email}" title="Đặt lại mật khẩu" aria-label="Đặt lại mật khẩu ${name}"><i class="bi bi-key" aria-hidden="true"></i></button>
      <button type="button" class="btn btn-sm ${status === "LOCKED" ? "btn-outline-success" : "btn-outline-danger"}" data-action="status" data-id="${id}" data-status="${status}" data-name="${name}" title="${status === "LOCKED" ? "Mở khóa" : "Khóa"}" aria-label="${status === "LOCKED" ? "Mở khóa" : "Khóa"} tài khoản ${name}"><i class="bi ${status === "LOCKED" ? "bi-unlock" : "bi-lock"}" aria-hidden="true"></i></button>
      </div></td></tr>`;
      })
      .join("");
  }
  async function loadUsers() {
    view("loading");
    $("usersAlertContainer").innerHTML = "";
    const q = new URLSearchParams({
      page: state.page,
      limit: state.limit,
      sortBy: "created_at",
      sortOrder: "DESC",
    });
    if (state.search) q.set("search", state.search);
    if (state.status) q.set("status", state.status);
    try {
      const result = normalizeList(await request(`${BASE}?${q}`));
      state.page = result.page;
      state.limit = result.limit;
      state.total = result.total;
      state.totalPages = Math.max(1, result.pages);
      if (!result.rows.length) {
        $("usersTableBody").innerHTML = "";
        $("paginationSummary").textContent = "Không có dữ liệu";
        view("empty");
        return;
      }
      render(result.rows);
      const from = (state.page - 1) * state.limit + 1,
        to = Math.min(
          from + result.rows.length - 1,
          state.total || from + result.rows.length - 1,
        );
      $("paginationSummary").textContent =
        `Hiển thị ${from} - ${to} trong ${state.total} nhân viên`;
      pagination();
      view("table");
    } catch (e) {
      $("usersErrorMessage").textContent =
        e.message || "Không thể tải danh sách.";
      view("error");
    }
  }
  function openCreate() {
    state.editingId = null;
    $("staffForm").reset();
    $("staffForm").classList.remove("was-validated");
    $("staffModalTitle").textContent = "Tạo tài khoản nhân viên";
    $("staffFormSubmitText").textContent = "Tạo tài khoản";
    $("staffPasswordGroup").classList.remove("d-none");
    $("staffPassword").required = true;
    $("staffFormHint").textContent =
      "Tài khoản được tạo với vai trò STAFF. Mật khẩu tối thiểu 8 ký tự.";
    $("staffFormAlert").classList.add("d-none");
  }
  async function openEdit(id) {
    try {
      const d = dataOf(await request(`${BASE}/${id}`)),
        u = d.user || d;
      state.editingId = id;
      $("staffForm").reset();
      $("staffForm").classList.remove("was-validated");
      $("staffModalTitle").textContent = "Chỉnh sửa nhân viên";
      $("staffFormSubmitText").textContent = "Lưu thay đổi";
      $("staffFullName").value = u.full_name || "";
      $("staffEmail").value = u.email || "";
      $("staffPasswordGroup").classList.add("d-none");
      $("staffPassword").required = false;
      $("staffFormHint").textContent =
        "Cập nhật họ tên và email. Vai trò STAFF do backend quản lý.";
      $("staffFormAlert").classList.add("d-none");
      bootstrap.Modal.getOrCreateInstance($("staffModal")).show();
    } catch (e) {
      toast(e.message || "Không tải được thông tin.", false);
    }
  }
  function validateStaff() {
    const n = $("staffFullName"),
      e = $("staffEmail"),
      p = $("staffPassword");
    n.value = n.value.trim();
    e.value = e.value.trim().toLowerCase();
    n.setCustomValidity(
      n.value.length > 0 && n.value.length <= 100 ? "" : "Tên không hợp lệ",
    );
    e.setCustomValidity(
      e.validity.typeMismatch || !e.value ? "Email không hợp lệ" : "",
    );
    p.setCustomValidity(
      state.editingId || p.value.length >= 8
        ? ""
        : "Mật khẩu phải có ít nhất 8 ký tự",
    );
    $("staffForm").classList.add("was-validated");
    return $("staffForm").checkValidity();
  }
  async function submitStaff(ev) {
    ev.preventDefault();
    if (!validateStaff()) return;
    const payload = {
      full_name: $("staffFullName").value,
      email: $("staffEmail").value,
    };
    if (!state.editingId) payload.password = $("staffPassword").value;
    const id = state.editingId,
      btn = $("staffFormSubmit");
    btn.disabled = true;
    $("staffFormSpinner").classList.remove("d-none");
    $("staffFormAlert").classList.add("d-none");
    try {
      await request(id ? `${BASE}/${id}` : BASE, {
        method: id ? "PUT" : "POST",
        body: payload,
      });
      bootstrap.Modal.getOrCreateInstance($("staffModal")).hide();
      toast(
        id ? "Cập nhật nhân viên thành công." : "Tạo nhân viên thành công.",
      );
      await Promise.all([loadUsers(), loadStats()]);
    } catch (e) {
      $("staffFormAlert").textContent = e.message || "Không thể lưu tài khoản.";
      $("staffFormAlert").classList.remove("d-none");
    } finally {
      btn.disabled = false;
      $("staffFormSpinner").classList.add("d-none");
    }
  }
  async function detail(id) {
    try {
      const d = dataOf(await request(`${BASE}/${id}`)),
        u = d.user || d;
      $("userDetailBody").innerHTML =
        `<div class="d-flex align-items-center gap-3 mb-3"><span class="user-avatar user-avatar-lg">${esc((u.full_name || "N").trim().charAt(0).toUpperCase())}</span><div><div class="fw-bold">${esc(u.full_name)}</div><div class="small text-muted">${esc(u.email)}</div></div></div>
      <dl class="row small mb-0"><dt class="col-4">Mã nhân viên</dt><dd class="col-8">${esc(u.id)}</dd><dt class="col-4">Vai trò</dt><dd class="col-8">${esc(u.role || "STAFF")}</dd><dt class="col-4">Trạng thái</dt><dd class="col-8">${statusBadge(u.status || "ACTIVE")}</dd><dt class="col-4">Ngày tạo</dt><dd class="col-8">${dateText(u.created_at)}</dd><dt class="col-4">Cập nhật</dt><dd class="col-8">${dateText(u.updated_at)}</dd></dl>`;
      bootstrap.Modal.getOrCreateInstance($("userDetailModal")).show();
    } catch (e) {
      toast(e.message || "Không tải được chi tiết.", false);
    }
  }
  function openPassword(id, name, email) {
    state.passwordId = id;
    $("resetPasswordForm").reset();
    $("resetPasswordForm").classList.remove("was-validated");
    $("resetPasswordUser").textContent = `${name} (${email})`;
    $("resetPasswordAlert").classList.add("d-none");
    bootstrap.Modal.getOrCreateInstance($("resetPasswordModal")).show();
  }
  async function resetPassword(ev) {
    ev.preventDefault();
    const p = $("newStaffPassword");
    p.setCustomValidity(
      p.value.length >= 8 ? "" : "Mật khẩu phải có ít nhất 8 ký tự",
    );
    $("resetPasswordForm").classList.add("was-validated");
    if (!$("resetPasswordForm").checkValidity()) return;
    const btn = $("resetPasswordSubmit");
    btn.disabled = true;
    try {
      await request(`${BASE}/${state.passwordId}/password`, {
        method: "PATCH",
        body: { password: p.value },
      });
      bootstrap.Modal.getOrCreateInstance($("resetPasswordModal")).hide();
      toast("Đặt lại mật khẩu thành công.");
    } catch (e) {
      $("resetPasswordAlert").textContent =
        e.message || "Không thể đặt lại mật khẩu.";
      $("resetPasswordAlert").classList.remove("d-none");
    } finally {
      btn.disabled = false;
    }
  }
  async function changeStatus(id, status, name) {
    const next = status === "LOCKED" ? "ACTIVE" : "LOCKED",
      verb = next === "LOCKED" ? "khóa" : "mở khóa";
    if (!confirm(`Bạn có chắc chắn muốn ${verb} tài khoản "${name}"?`)) return;
    try {
      await request(`${BASE}/${id}/status`, {
        method: "PATCH",
        body: { status: next },
      });
      toast(next === "LOCKED" ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
      await Promise.all([loadUsers(), loadStats()]);
    } catch (e) {
      toast(e.message || `Không thể ${verb} tài khoản.`, false);
    }
  }
  function bind() {
    $("openCreateStaffBtn").addEventListener("click", openCreate);
    $("staffForm").addEventListener("submit", submitStaff);
    $("resetPasswordForm").addEventListener("submit", resetPassword);
    $("retryUsersBtn").addEventListener("click", loadUsers);
    $("refreshUsersBtn").addEventListener("click", () =>
      Promise.all([loadUsers(), loadStats()]),
    );
    $("userStatusFilter").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadUsers();
    });
    $("userLimit").addEventListener("change", (e) => {
      state.limit = Number(e.target.value);
      state.page = 1;
      loadUsers();
    });
    $("userSearch").addEventListener("input", (e) => {
      clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        loadUsers();
      }, 350);
    });
    $("clearSearchBtn").addEventListener("click", () => {
      $("userSearch").value = "";
      state.search = "";
      state.page = 1;
      loadUsers();
    });
    $("usersTableBody").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-action]");
      if (!b) return;
      const d = b.dataset;
      if (d.action === "detail") detail(d.id);
      if (d.action === "edit") openEdit(d.id);
      if (d.action === "password") openPassword(d.id, d.name, d.email);
      if (d.action === "status") changeStatus(d.id, d.status, d.name);
    });
    $("staffModal").addEventListener("hidden.bs.modal", () => {
      $("staffForm").reset();
      $("staffForm").classList.remove("was-validated");
      $("staffFormAlert").classList.add("d-none");
      state.editingId = null;
      $("staffPasswordGroup").classList.remove("d-none");
      $("staffPassword").required = true;
    });
  }
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!window.Api?.requireLogin)
        throw new Error("Không tìm thấy module xác thực.");
      const user = await window.Api.requireLogin({ roles: ["ADMIN"] });
      if (window.Layout) window.Layout.render({ active: "users", user });
      bind();
      await Promise.all([loadUsers(), loadStats()]);
    } catch (e) {
      console.error("Không khởi tạo trang nhân viên:", e);
    }
  });
})();
