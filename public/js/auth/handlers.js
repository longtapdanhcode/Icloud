import {
  loginForm,
  loginButton,
  loginMessage,
  createStaffForm,
  createStaffButton,
  userMessage,
  logoutButton,
} from "./dom.js";

import { setCurrentUser } from "./state.js";

import { showMessage, showLogin, showApp } from "./ui.js";

import { loadCurrentUser } from "./auth-api.js";

// Khởi tạo chức năng đăng nhập
export function initLogin() {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Đang đăng nhập...";
    loginMessage.classList.add("d-none");

    try {
      // Gửi thông tin đăng nhập đến backend
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            result.error?.message ||
            "Email hoặc mật khẩu không chính xác.",
        );
      }

      const data = result.data;

      if (!data?.token) {
        throw new Error("Backend không trả về JWT token.");
      }

      // Lưu JWT vào sessionStorage
      sessionStorage.setItem("accessToken", data.token);

      // Xác minh token và lấy thông tin tài khoản
      const user = await loadCurrentUser(data.token);

      // Hiển thị ứng dụng
      showApp(user);

      loginForm.reset();
    } catch (error) {
      sessionStorage.removeItem("accessToken");
      setCurrentUser(null);

      showLogin();

      showMessage(loginMessage, error.message || "Không thể kết nối máy chủ.");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Đăng nhập";
    }
  });
}

// Khởi tạo chức năng ADMIN tạo tài khoản Staff
export function initCreateStaff() {
  createStaffForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Kiểm tra quyền ở giao diện
    // Backend vẫn là nơi quyết định quyền thực tế
    const { currentUser } = await import("./state.js");

    if (currentUser?.role !== "ADMIN") {
      showMessage(userMessage, "Bạn không có quyền tạo tài khoản.", "danger");
      return;
    }

    const token = sessionStorage.getItem("accessToken");

    const full_name = document.getElementById("staffName").value.trim();
    const email = document.getElementById("staffEmail").value.trim();
    const password = document.getElementById("staffPassword").value;

    createStaffButton.disabled = true;
    createStaffButton.textContent = "Đang tạo tài khoản...";
    userMessage.classList.add("d-none");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name,
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            result.error?.message ||
            "Không thể tạo tài khoản Staff.",
        );
      }

      showMessage(
        userMessage,
        `Tạo tài khoản Staff thành công: ${result.data.email}`,
        "success",
      );

      createStaffForm.reset();
    } catch (error) {
      showMessage(
        userMessage,
        error.message || "Không thể kết nối máy chủ.",
        "danger",
      );
    } finally {
      createStaffButton.disabled = false;
      createStaffButton.textContent = "Tạo tài khoản Staff";
    }
  });
}

// Khởi tạo chức năng đăng xuất
export function initLogout() {
  logoutButton.addEventListener("click", function () {
    sessionStorage.removeItem("accessToken");

    setCurrentUser(null);

    loginForm.reset();
    createStaffForm.reset();

    loginMessage.classList.add("d-none");
    userMessage.classList.add("d-none");

    showLogin();
  });
}

// Khôi phục phiên đăng nhập khi tải lại trang
export async function initAuth() {
  const token = sessionStorage.getItem("accessToken");

  if (!token) {
    showLogin();
    return;
  }

  try {
    const user = await loadCurrentUser(token);
    showApp(user);
  } catch (error) {
    sessionStorage.removeItem("accessToken");
    setCurrentUser(null);
    showLogin();
  }
}
