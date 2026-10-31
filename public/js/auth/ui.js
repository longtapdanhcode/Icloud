import { loginView, appView } from "./dom.js";

import { currentUser, setCurrentUser } from "./state.js";

// Hiển thị thông báo
export function showMessage(element, message, type = "danger") {
  element.textContent = message;
  element.className = `alert alert-${type}`;
}

// Hiển thị màn hình đăng nhập
export function showLogin() {
  appView.classList.add("d-none");
  loginView.classList.remove("d-none");
}

// Hiển thị giao diện ứng dụng
export function showApp(user) {
  setCurrentUser(user);

  document.getElementById("userName").textContent =
    user.full_name || "Chưa cập nhật";

  document.getElementById("userEmail").textContent = user.email || "";
  document.getElementById("userRole").textContent = user.role || "";

  document.getElementById("dashboardName").textContent =
    user.full_name || "Chưa cập nhật";

  document.getElementById("dashboardEmail").textContent = user.email || "";
  document.getElementById("dashboardRole").textContent = user.role || "";

  // Chỉ ADMIN được nhìn thấy menu quản lý tài khoản
  const adminMenu = document.getElementById("adminMenu");
  adminMenu.classList.toggle("d-none", user.role !== "ADMIN");

  loginView.classList.add("d-none");
  appView.classList.remove("d-none");

  // Mặc định hiển thị Dashboard
  showPage("dashboard");
}

// Điều hướng giữa các trang
export function showPage(page) {
  // Không cho STAFF truy cập trang quản lý tài khoản
  if (page === "users" && currentUser?.role !== "ADMIN") {
    showPage("dashboard");
    return;
  }

  const dashboardPage = document.getElementById("dashboardPage");
  const usersPage = document.getElementById("usersPage");
  const placeholderPage = document.getElementById("placeholderPage");

  dashboardPage.classList.add("d-none");
  usersPage.classList.add("d-none");
  placeholderPage.classList.add("d-none");

  if (page === "dashboard") {
    dashboardPage.classList.remove("d-none");
  } else if (page === "users") {
    usersPage.classList.remove("d-none");
  } else {
    const pageNames = {
      products: "Quản lý sản phẩm",
      categories: "Quản lý danh mục",
      suppliers: "Quản lý nhà cung cấp",
      inventory: "Quản lý nhập / xuất kho",
    };

    document.getElementById("placeholderTitle").textContent =
      pageNames[page] || "Chức năng";

    placeholderPage.classList.remove("d-none");
  }

  // Đánh dấu menu đang được chọn
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

// Khởi tạo sự kiện click menu sidebar
export function initNavigation() {
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      const page = this.dataset.page;
      showPage(page);
    });
  });
}
