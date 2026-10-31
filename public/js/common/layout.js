/**
 * Cloud Inventory - Common Layout Component
 * Tự động render Sidebar + Topbar vào <div id="app-layout">,
 * tô sáng mục đang mở, ẩn menu ADMIN nếu user là STAFF, gắn nút Đăng xuất.
 */

(function () {
  const Layout = {
    /**
     * Render layout hoàn chỉnh
     * @param {object} params
     * @param {'products'|'product-form'|'categories'|'category-form'|'dashboard'} params.active
     * @param {object} params.user
     */
    render({ active = 'dashboard', user = null } = {}) {
      const container = document.getElementById('app-layout');
      if (!container) return;

      const role = user?.role || 'STAFF';
      const fullName = user?.full_name || 'Người dùng';
      const email = user?.email || 'user@cloudinventory.vn';
      const avatarInitial = (fullName || 'U').trim().charAt(0).toUpperCase();

      const roleBadgeClass = role === 'ADMIN'
        ? 'badge bg-success-subtle text-success border border-success-subtle px-2 py-1'
        : 'badge bg-info-subtle text-info border border-info-subtle px-2 py-1';

      // 1. Sidebar HTML
      const sidebarHtml = `
        <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
        <aside class="admin-sidebar" id="adminSidebar">
          <a href="/index.html" class="sidebar-brand text-decoration-none">
            <div class="brand-icon">
              <i class="bi bi-boxes"></i>
            </div>
            <div>
              <div class="fw-bold text-white">Cloud Inventory</div>
              <div style="font-size: 0.7rem; font-weight: 400; color: #94a3b8;">Hệ thống Quản lý Kho</div>
            </div>
          </a>

          <ul class="sidebar-menu">
            <li class="menu-header">TỔNG QUAN</li>
            <li class="menu-item">
              <a href="/index.html" class="menu-link ${active === 'dashboard' ? 'active' : ''}">
                <i class="bi bi-speedometer2"></i>
                <span>Bảng điều khiển</span>
              </a>
            </li>

            <li class="menu-header">QUẢN LÝ KHO (NGƯỜI 1)</li>
            <li class="menu-item">
              <a href="/products.html" class="menu-link ${active === 'products' ? 'active' : ''}">
                <i class="bi bi-box-seam"></i>
                <span>Sản phẩm</span>
              </a>
            </li>
            <li class="menu-item">
              <a href="/product-form.html" class="menu-link ${active === 'product-form' ? 'active' : ''}">
                <i class="bi bi-plus-circle"></i>
                <span>Thêm sản phẩm</span>
              </a>
            </li>
            <li class="menu-item">
              <a href="/categories.html" class="menu-link ${active === 'categories' ? 'active' : ''}">
                <i class="bi bi-tags"></i>
                <span>Danh mục</span>
              </a>
            </li>
            <li class="menu-item">
              <a href="/category-form.html" class="menu-link ${active === 'category-form' ? 'active' : ''}">
                <i class="bi bi-folder-plus"></i>
                <span>Thêm danh mục</span>
              </a>
            </li>

            <li class="menu-header">HỆ THỐNG</li>
            <li class="menu-item">
              <a href="/health" target="_blank" class="menu-link">
                <i class="bi bi-activity"></i>
                <span>Kiểm tra Health</span>
              </a>
            </li>
          </ul>

          <div class="sidebar-footer">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <div class="d-flex align-items-center gap-2 text-truncate">
                <div class="avatar-badge bg-primary text-white">${avatarInitial}</div>
                <div class="text-truncate">
                  <div class="small fw-bold text-white text-truncate">${fullName}</div>
                  <div class="text-white-50 small text-truncate" style="font-size: 0.75rem;">${email}</div>
                </div>
              </div>
              <button id="btnSidebarLogout" class="btn btn-sm btn-outline-light border-0 text-white-50 p-1" title="Đăng xuất" type="button">
                <i class="bi bi-box-arrow-right fs-5"></i>
              </button>
            </div>
          </div>
        </aside>
      `;

      // 2. Navbar HTML
      const navbarHtml = `
        <header class="admin-navbar">
          <div class="d-flex align-items-center gap-3">
            <button class="btn btn-sm btn-outline-secondary d-lg-none" id="sidebarToggle" type="button" aria-label="Menu">
              <i class="bi bi-list fs-5"></i>
            </button>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb mb-0 small">
                <li class="breadcrumb-item"><a href="/index.html" class="text-decoration-none text-muted">Trang chủ</a></li>
                <li class="breadcrumb-item active text-dark fw-semibold" aria-current="page">${this.getPageTitle(active)}</li>
              </ol>
            </nav>
          </div>

          <div class="d-flex align-items-center gap-3">
            <span class="${roleBadgeClass}">
              <i class="bi bi-shield-check me-1"></i>${role}
            </span>
            <button id="btnNavbarLogout" class="btn btn-sm btn-outline-danger" type="button">
              <i class="bi bi-box-arrow-right me-1"></i>Đăng xuất
            </button>
          </div>
        </header>
      `;

      // Tìm thẻ main nội dung trang
      const mainEl = document.querySelector('main') || document.querySelector('.page-content');

      // Thiết lập wrapper flexbox
      container.className = 'admin-wrapper';
      container.innerHTML = `
        ${sidebarHtml}
        <div class="admin-main" id="adminMainContainer">
          ${navbarHtml}
        </div>
      `;

      // Đưa main nội dung vào trong .admin-main
      if (mainEl) {
        document.getElementById('adminMainContainer').appendChild(mainEl);
      }

      // Xử lý sự kiện đăng xuất
      const handleLogout = () => {
        if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
          if (window.Api) {
            window.Api.clearToken();
          } else {
            localStorage.removeItem('accessToken');
          }
          window.location.href = '/index.html';
        }
      };

      const btnSidebarLogout = document.getElementById('btnSidebarLogout');
      const btnNavbarLogout = document.getElementById('btnNavbarLogout');
      if (btnSidebarLogout) btnSidebarLogout.addEventListener('click', handleLogout);
      if (btnNavbarLogout) btnNavbarLogout.addEventListener('click', handleLogout);

      // Xử lý toggle sidebar trên thiết bị di động
      const toggleBtn = document.getElementById('sidebarToggle');
      const sidebar = document.getElementById('adminSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (toggleBtn && sidebar) {
        const toggleMenu = () => {
          sidebar.classList.toggle('show');
          if (backdrop) backdrop.classList.toggle('show');
        };
        toggleBtn.addEventListener('click', toggleMenu);
        if (backdrop) backdrop.addEventListener('click', toggleMenu);
      }
    },

    getPageTitle(active) {
      switch (active) {
        case 'products': return 'Danh sách sản phẩm';
        case 'product-form': return 'Thông tin sản phẩm';
        case 'categories': return 'Quản lý danh mục';
        case 'category-form': return 'Thông tin danh mục';
        case 'dashboard': return 'Bảng điều khiển';
        default: return 'Quản trị hệ thống';
      }
    },
  };

  window.Layout = Layout;
})();
