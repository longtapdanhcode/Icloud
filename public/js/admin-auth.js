/**
 * Cloud Inventory - Admin Authentication Helper
 * Tích hợp xác thực JWT (Token) từ sessionStorage của Người 3 vào giao diện Sản phẩm & Danh mục (Người 1)
 */

const AdminAuth = {
  /**
   * Lấy JWT token từ sessionStorage
   */
  getToken() {
    try {
      return sessionStorage.getItem('accessToken') || '';
    } catch {
      return '';
    }
  },

  /**
   * Sinh header HTTP bao gồm Bearer Token tự động nếu đã đăng nhập
   */
  getHeaders(customHeaders = {}) {
    const headers = {
      'Accept': 'application/json',
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  },

  /**
   * Lấy thông tin user hiện tại từ cache hoặc gọi /api/auth/me
   */
  async getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('currentUser');
        }
        return null;
      }

      const result = await res.json();
      const user = result.data?.user || result.data;
      if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      }
    } catch {
      // Nếu lỗi mạng hoặc offline, thử đọc từ cache
      try {
        const cached = sessionStorage.getItem('currentUser');
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    return null;
  },

  /**
   * Đăng xuất và điều hướng về trang đăng nhập
   */
  logout() {
    try {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('currentUser');
    } catch {}

    window.location.href = '/index.html';
  },

  /**
   * Khởi tạo và đồng bộ thông tin tài khoản lên thanh Navbar & Sidebar
   */
  async initUI() {
    const user = await this.getCurrentUser();

    // 1. Cập nhật Sidebar Footer
    const sidebarAvatar = document.querySelector('.sidebar-footer .avatar-badge');
    const sidebarName = document.querySelector('.sidebar-footer .text-truncate .fw-bold');
    const sidebarEmail = document.querySelector('.sidebar-footer .text-white-50');

    // 2. Cập nhật Topbar Navbar User
    const navbarUser = document.querySelector('.navbar-user');

    if (user) {
      const initial = (user.full_name || user.email || 'U').trim().charAt(0).toUpperCase();
      if (sidebarAvatar) sidebarAvatar.textContent = initial;
      if (sidebarName) sidebarName.textContent = user.full_name || 'Người dùng';
      if (sidebarEmail) sidebarEmail.textContent = user.email || '';

      if (navbarUser) {
        const role = user.role || 'STAFF';
        const roleBadge = navbarUser.querySelector('.badge');
        if (roleBadge) {
          roleBadge.className = role === 'ADMIN'
            ? 'badge bg-success-subtle text-success border border-success-subtle px-2 py-1'
            : 'badge bg-info-subtle text-info border border-info-subtle px-2 py-1';
          roleBadge.innerHTML = `<i class="bi bi-shield-check me-1"></i>${role}`;
        }

        // Thêm nút Đăng xuất nếu chưa có
        if (!document.getElementById('btnAdminLogout')) {
          const logoutBtn = document.createElement('button');
          logoutBtn.id = 'btnAdminLogout';
          logoutBtn.type = 'button';
          logoutBtn.className = 'btn btn-outline-danger btn-sm ms-1';
          logoutBtn.title = 'Đăng xuất khỏi hệ thống';
          logoutBtn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i><span class="d-none d-sm-inline">Đăng xuất</span>';
          logoutBtn.addEventListener('click', () => this.logout());
          navbarUser.appendChild(logoutBtn);
        }
      }
    } else {
      // Trường hợp chưa đăng nhập
      if (sidebarAvatar) sidebarAvatar.textContent = '?';
      if (sidebarName) sidebarName.textContent = 'Khách (Chưa đăng nhập)';
      if (sidebarEmail) sidebarEmail.textContent = 'Nhấn để đăng nhập';

      if (navbarUser) {
        const roleBadge = navbarUser.querySelector('.badge');
        if (roleBadge) {
          roleBadge.className = 'badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1';
          roleBadge.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>CHƯA ĐĂNG NHẬP';
        }

        // Thêm nút Đăng nhập nếu chưa có
        if (!document.getElementById('btnAdminLogin')) {
          const loginBtn = document.createElement('a');
          loginBtn.id = 'btnAdminLogin';
          loginBtn.href = '/index.html';
          loginBtn.className = 'btn btn-outline-primary btn-sm ms-1';
          loginBtn.title = 'Đi đến trang đăng nhập';
          loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i><span class="d-none d-sm-inline">Đăng nhập</span>';
          navbarUser.appendChild(loginBtn);
        }
      }
    }
  },
};

// Đảm bảo đối tượng được gắn vào window toàn cục
if (typeof window !== 'undefined') {
  window.AdminAuth = AdminAuth;
  document.addEventListener('DOMContentLoaded', () => {
    AdminAuth.initUI();
  });
}
