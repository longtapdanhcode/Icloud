const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const logoutButton = document.getElementById("logoutButton");

// Hiển thị thông báo trên giao diện.
function showMessage(message, type = "danger") {
  loginMessage.textContent = message;
  loginMessage.className = `alert alert-${type}`;
}

// Chuyển sang giao diện đăng nhập.
function showLogin() {
  appView.classList.add("d-none");
  loginView.classList.remove("d-none");
}

// Hiển thị thông tin tài khoản đã xác thực.
function showApp(user) {
  document.getElementById("userName").textContent =
    user.full_name || "Chưa cập nhật";

  document.getElementById("userEmail").textContent = user.email || "";

  document.getElementById("userRole").textContent = user.role || "";

  loginView.classList.add("d-none");
  appView.classList.remove("d-none");
}

// Gọi GET /api/auth/me để xác minh token và lấy thông tin user.
async function loadCurrentUser(token) {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
        result.error?.message ||
        "Phiên đăng nhập không hợp lệ.",
    );
  }

  // Hỗ trợ response có dạng { success: true, data: {...} }.
  const user = result.data?.user || result.data;

  if (!user || !user.email) {
    throw new Error("Backend không trả về thông tin tài khoản hợp lệ.");
  }

  return user;
}

// Xử lý sự kiện nhấn nút Đăng nhập.
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  loginButton.disabled = true;
  loginButton.textContent = "Đang đăng nhập...";
  loginMessage.classList.add("d-none");

  try {
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

    // Backend trả token trong data.
    const data = result.data;

    if (!data?.token) {
      throw new Error("Backend không trả về JWT token.");
    }

    // Chỉ dùng sessionStorage cho bản demo/học tập.
    // Token sẽ bị xóa khi đóng phiên trình duyệt.
    sessionStorage.setItem("accessToken", data.token);

    // Gọi API /me để lấy thông tin người dùng từ Backend.
    const user = await loadCurrentUser(data.token);

    showApp(user);
  } catch (error) {
    sessionStorage.removeItem("accessToken");
    showLogin();
    showMessage(error.message || "Không thể kết nối máy chủ.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Đăng nhập";
  }
});

// Xử lý đăng xuất.
logoutButton.addEventListener("click", function () {
  sessionStorage.removeItem("accessToken");
  loginForm.reset();
  loginMessage.classList.add("d-none");
  showLogin();
});

// Khôi phục giao diện khi tải lại trang nếu token vẫn hợp lệ.
async function initAuth() {
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
    showLogin();
  }
}

initAuth();
