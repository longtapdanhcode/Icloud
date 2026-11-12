/**
 * Cloud Inventory - Common Layout Component
 * Tự động render Sidebar + Topbar vào `<div id="app-layout">`,
 * tô sáng mục đang mở, ẩn menu ADMIN nếu user là STAFF, gắn nút Đăng xuất.
 */

(function () {
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[char]);
  }

  const Layout = {
    /**
     * Render layout hoàn chỉnh
     * @param {object} params
     * @param {'products'|'product-form'|'categories'|'category-form'|'dashboard'|'users'|'suppliers'|'stock-transactions'} params.active
     * @param {object} params.user
     */
    render({ active = 'dashboard', user = null } = {}) {
      const container = document.getElementById('app-layout');
      if (!container) return;

      const role = String(user?.role || 'STAFF').toUpperCase();
      const fullName = user?.full_name || 'Người dùng';
      const email = user?.email || 'user@cloudinventory.vn';
      const avatarInitial = (fullName || 'U').trim().charAt(0).toUpperCase();

      const safeRole = escapeHtml(role);
      const safeFullName = escapeHtml(fullName);
      const safeEmail = escapeHtml(email);
      const safeInitial = escapeHtml(avatarInitial);

      const roleBadgeClass = role === 'ADMIN'
        ? 'badge bg-success-subtle text-success-emphasis border border-success-subtle px-2 py-1'
        : 'badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1';

      // 1. Sidebar HTML
      const sidebarHtml = `
        <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
        <aside class="admin-sidebar" id="adminSidebar" aria-label="Menu điều hướng chính">
          <a href="/dashboard.html" class="sidebar-brand text-decoration-none">
            <div class="brand-icon" aria-hidden="true">
              <i class="bi bi-boxes"></i>
            </div>
            <div>
              <div class="fw-bold text-white">Cloud Inventory</div>
              <div style="font-size: 0.7rem; font-weight: 400; color: #cbd5e1;">Hệ thống Quản lý Kho</div>
            </div>
          </a>

          <ul class="sidebar-menu">
            <li class="menu-header">TỔNG QUAN</li>
            <li class="menu-item">
              <a href="/dashboard.html" class="menu-link ${active === 'dashboard' ? 'active' : ''}">
                <i class="bi bi-speedometer2" aria-hidden="true"></i>
                <span>Bảng điều khiển</span>
              </a>
            </li>

            <li class="menu-header">QUẢN LÝ KHO</li>
            <li class="menu-item">
              <a href="/products.html" class="menu-link ${active === 'products' ? 'active' : ''}">
                <i class="bi bi-box-seam" aria-hidden="true"></i>
                <span>Sản phẩm</span>
              </a>
            </li>
            <li class="menu-item">
              <a href="/product-form.html" class="menu-link ${active === 'product-form' ? 'active' : ''}">
                <i class="bi bi-plus-circle" aria-hidden="true"></i>
                <span>Thêm sản phẩm</span>
              </a>
            </li>
            <li class="menu-item">
              <a href="/categories.html" class="menu-link ${active === 'categories' ? 'active' : ''}">
                <i class="bi bi-tags" aria-hidden="true"></i>
                <span>Danh mục</span>
              </a>
            </li>
            ${role === 'ADMIN'
          ? `
            <li class="menu-item">
              <a href="/category-form.html" class="menu-link ${active === 'category-form' ? 'active' : ''}">
                <i class="bi bi-folder-plus" aria-hidden="true"></i>
                <span>Thêm danh mục</span>
              </a>
            </li>
              `
          : ''
        }
            <li class="menu-header">QUẢN LÝ NHÀ CUNG CẤP & KHO</li>

            <li class="menu-item">
              <a href="/suppliers.html" class="menu-link ${active === 'suppliers' ? 'active' : ''}">
                <i class="bi bi-truck" aria-hidden="true"></i>
                <span>Nhà cung cấp</span>
              </a>
            </li>

            <li class="menu-item">
              <a href="/stock-transactions.html" class="menu-link ${active === 'stock-transactions' ? 'active' : ''}">
                <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
                <span>Nhập / Xuất kho</span>
              </a>
            </li>

            ${role === 'ADMIN'
          ? `
            <li class="menu-header">QUẢN TRỊ HỆ THỐNG</li>
            <li class="menu-item">
              <a href="/users.html" class="menu-link ${active === 'users' ? 'active' : ''}">
                <i class="bi bi-people" aria-hidden="true"></i>
                <span>Quản lý nhân viên</span>
              </a>
            </li>
              `
          : ''
        }

            <li class="menu-header">HỆ THỐNG</li>
            <li class="menu-item">
              <a href="/health" target="_blank" rel="noopener noreferrer" class="menu-link">
                <i class="bi bi-activity" aria-hidden="true"></i>
                <span>Kiểm tra Health</span>
              </a>
            </li>
          </ul>

          <div class="sidebar-footer">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <div class="d-flex align-items-center gap-2 text-truncate">
                <div class="avatar-badge bg-primary text-white" aria-hidden="true">${safeInitial}</div>
                <div class="text-truncate">
                  <div class="small fw-bold text-white text-truncate">${safeFullName}</div>
                  <div class="small text-truncate" style="font-size: 0.75rem; color: #cbd5e1;">${safeEmail}</div>
                </div>
              </div>
              <button id="btnSidebarLogout" class="btn btn-sm btn-outline-light border-0 p-1" style="color: #cbd5e1;" title="Đăng xuất" aria-label="Đăng xuất" type="button">
                <i class="bi bi-box-arrow-right fs-5" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </aside>
      `;

      // 2. Navbar HTML
      const navbarHtml = `
        <header class="admin-navbar">
          <div class="d-flex align-items-center gap-2 gap-sm-3 min-w-0">
            <button class="btn btn-sm btn-outline-secondary d-lg-none" id="sidebarToggle" type="button" aria-label="Mở menu điều hướng" aria-controls="adminSidebar" aria-expanded="false">
              <i class="bi bi-list fs-5" aria-hidden="true"></i>
            </button>
            <nav aria-label="breadcrumb" class="min-w-0">
              <ol class="breadcrumb mb-0 small flex-nowrap">
                <li class="breadcrumb-item d-none d-sm-inline-block"><a href="/dashboard.html" class="text-decoration-none text-muted">Trang chủ</a></li>
                <li class="breadcrumb-item active text-dark fw-semibold text-truncate" aria-current="page">${this.getPageTitle(active)}</li>
              </ol>
            </nav>
          </div>

          <div class="d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
            <span class="${roleBadgeClass}">
              <i class="bi bi-shield-check me-1" aria-hidden="true"></i>${safeRole}
            </span>
            <button id="btnNavbarLogout" class="btn btn-sm btn-outline-danger" type="button">
              <i class="bi bi-box-arrow-right me-1" aria-hidden="true"></i><span class="d-none d-sm-inline">Đăng xuất</span><span class="d-inline d-sm-none">Thoát</span>
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
        const setMenuOpen = (isOpen) => {
          sidebar.classList.toggle('show', isOpen);
          if (backdrop) backdrop.classList.toggle('show', isOpen);
          toggleBtn.setAttribute('aria-expanded', String(isOpen));
        };
        toggleBtn.addEventListener('click', () => {
          setMenuOpen(!sidebar.classList.contains('show'));
        });
        if (backdrop) {
          backdrop.addEventListener('click', () => setMenuOpen(false));
        }
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && sidebar.classList.contains('show')) {
            setMenuOpen(false);
            toggleBtn.focus();
          }
        });
      }
    },

    getPageTitle(active) {
      switch (active) {
        case 'products': return 'Danh sách sản phẩm';
        case 'product-form': return 'Thông tin sản phẩm';
        case 'categories': return 'Quản lý danh mục';
        case 'category-form': return 'Thông tin danh mục';
        case 'dashboard': return 'Bảng điều khiển';
        case 'users': return 'Quản lý nhân viên';
        case 'suppliers': return 'Quản lý nhà cung cấp';
        case 'stock-transactions': return 'Quản lý nhập / xuất kho';
        default: return 'Quản trị hệ thống';

      }
    },
  };

  window.Layout = Layout;
})();