/**
 * Cloud Inventory - Categories UI Management
 * Phụ trách: Nguyễn Thị Huyền (Người 1 - Product & Category Management)
 * Kết nối: Express REST API & MySQL
 * Endpoints:
 *   - GET    /api/categories
 *   - GET    /api/categories/:id
 *   - POST   /api/categories
 *   - PUT    /api/categories/:id
 *   - DELETE /api/categories/:id
 */

// =============================================================================
// 1. API SERVICE LAYER
// =============================================================================
function getApiHeaders(customHeaders = {}) {
  if (typeof window !== 'undefined' && window.AdminAuth && typeof window.AdminAuth.getHeaders === 'function') {
    return window.AdminAuth.getHeaders(customHeaders);
  }
  return { 'Accept': 'application/json', ...customHeaders };
}

const CategoryApi = {
  baseUrl: '/api/categories',

  /**
   * Lấy danh sách toàn bộ danh mục kèm số lượng sản phẩm liên kết
   */
  async list() {
    const res = await fetch(this.baseUrl, {
      method: 'GET',
      headers: getApiHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result?.error?.message || 'Không thể tải danh sách danh mục');
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data || [];
  },

  /**
   * Lấy chi tiết một danh mục theo ID
   */
  async getById(id) {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getApiHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result?.error?.message || `Không thể tải danh mục #${id}`);
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },

  /**
   * Tạo danh mục mới
   */
  async create(payload) {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: getApiHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result?.error?.message || 'Không thể tạo danh mục');
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },

  /**
   * Cập nhật danh mục theo ID
   */
  async update(id, payload) {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getApiHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result?.error?.message || `Không thể cập nhật danh mục #${id}`);
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },

  /**
   * Xóa danh mục theo ID
   */
  async delete(id) {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getApiHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result?.error?.message || `Không thể xóa danh mục #${id}`);
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },
};

// =============================================================================
// 2. HELPER UTILITIES
// =============================================================================

/**
 * Xử lý an toàn chuỗi văn bản tránh lỗi XSS injection
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Loại bỏ dấu tiếng Việt để hỗ trợ tìm kiếm không dấu lẫn có dấu
 */
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Hiển thị Toast thông báo trạng thái
 */
function showToast(message, isSuccess = true) {
  const toastEl = document.getElementById('appToast');
  const toastBody = document.getElementById('appToastBody');
  const toastMessage = document.getElementById('appToastMessage');

  if (!toastEl) {
    alert(message);
    return;
  }

  if (toastMessage) toastMessage.textContent = message;

  if (isSuccess) {
    toastEl.className = 'toast align-items-center text-bg-success border-0';
    if (toastBody) {
      toastBody.innerHTML = `<i class="bi bi-check-circle-fill fs-5"></i><span>${escapeHtml(message)}</span>`;
    }
  } else {
    toastEl.className = 'toast align-items-center text-bg-danger border-0';
    if (toastBody) {
      toastBody.innerHTML = `<i class="bi bi-exclamation-triangle-fill fs-5"></i><span>${escapeHtml(message)}</span>`;
    }
  }

  if (window.bootstrap && bootstrap.Toast) {
    const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 });
    toast.show();
  }
}

/**
 * Kiểm tra quyền hạn hiện tại (tương thích phân quyền Người 3 khi tích hợp Auth)
 * Mặc định 'ADMIN' trong môi trường dev local để kiểm thử đầy đủ CRUD
 */
function getCurrentUserRole() {
  const storedUser = localStorage.getItem('auth_user');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.role) return parsed.role.toUpperCase();
    } catch {
      // Bỏ qua lỗi parse JSON
    }
  }
  const storedRole = localStorage.getItem('user_role');
  if (storedRole) return storedRole.toUpperCase();
  return 'ADMIN';
}

// =============================================================================
// 3. MAIN INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', function () {
  // 3.1. Sidebar Toggle cho giao diện Mobile & Tablet
  const sidebar = document.getElementById('adminSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('show');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('show');
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', function () {
      sidebar.classList.remove('show');
      sidebarBackdrop.classList.remove('show');
    });
  }

  // Cập nhật nhãn quyền trong giao diện nếu có
  const authRoleIndicator = document.getElementById('authRoleIndicator');
  const currentRole = getCurrentUserRole();
  if (authRoleIndicator) {
    authRoleIndicator.textContent = currentRole === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Nhân viên (STAFF)';
  }

  // 3.2. Khởi tạo trang Danh sách Danh mục
  const categoryTableBody = document.getElementById('categoryTableBody');
  if (categoryTableBody) {
    initCategoryListPage();
  }

  // 3.3. Khởi tạo trang Form Thêm / Sửa Danh mục
  const categoryForm = document.getElementById('categoryForm');
  if (categoryForm) {
    initCategoryFormPage();
  }
});

// =============================================================================
// 4. CATEGORY LIST PAGE LOGIC (categories.html)
// =============================================================================
function initCategoryListPage() {
  const searchInput = document.getElementById('categorySearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const resultCount = document.getElementById('categoryResultCount');
  const statTotalCat = document.getElementById('statTotalCategories');
  const statTotalProd = document.getElementById('statTotalCatProducts');
  const tableBody = document.getElementById('categoryTableBody');
  const tableContainer = document.getElementById('categoryTableContainer');
  const loadingState = document.getElementById('categoryLoadingState');
  const errorState = document.getElementById('categoryErrorState');
  const errorMessage = document.getElementById('categoryErrorMessage');
  const emptyState = document.getElementById('categoryEmptyState');
  const emptyMessage = document.getElementById('categoryEmptyMessage');
  const btnRetry = document.getElementById('btnRetryFetch');
  const addNewBtn = document.getElementById('addNewCategoryBtn');

  // Delete modal elements
  const deleteModalEl = document.getElementById('deleteCatModal');
  const deleteModalAlert = document.getElementById('deleteModalAlert');
  const deleteCatTargetName = document.getElementById('deleteCatTargetName');
  const deleteCatWarningText = document.getElementById('deleteCatWarningText');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteSpinner = document.getElementById('deleteSpinner');
  const deleteIcon = document.getElementById('deleteIcon');
  const deleteBtnText = document.getElementById('deleteBtnText');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');

  let categoriesData = [];
  let pendingDeleteCategory = null;
  const userRole = getCurrentUserRole();

  // Kiểm soát hiển thị nút thêm theo role (STAFF không thêm được)
  if (userRole === 'STAFF' && addNewBtn) {
    addNewBtn.classList.add('disabled');
    addNewBtn.setAttribute('title', 'Tài khoản STAFF chỉ có quyền xem danh mục');
  }

  /**
   * Gọi API tải toàn bộ danh mục từ MySQL
   */
  async function loadCategories() {
    // Chuyển sang Loading state
    if (loadingState) loadingState.classList.remove('d-none');
    if (tableContainer) tableContainer.classList.add('d-none');
    if (errorState) errorState.classList.add('d-none');
    if (emptyState) emptyState.classList.add('d-none');

    try {
      const data = await CategoryApi.list();
      categoriesData = Array.isArray(data) ? data : [];

      // Cập nhật thống kê KPIs
      updateStats(categoriesData);

      // Ẩn loading state
      if (loadingState) loadingState.classList.add('d-none');

      if (categoriesData.length === 0) {
        if (emptyState) emptyState.classList.remove('d-none');
        if (resultCount) resultCount.textContent = '0';
        return;
      }

      // Render danh sách
      renderTable();
    } catch (err) {
      console.error('Lỗi khi tải danh sách danh mục:', err);
      if (loadingState) loadingState.classList.add('d-none');
      if (errorState) {
        errorState.classList.remove('d-none');
        if (errorMessage) {
          errorMessage.textContent = err.message || 'Không thể kết nối đến máy chủ MySQL qua Express API.';
        }
      }
      if (statTotalCat) statTotalCat.textContent = '0';
      if (statTotalProd) statTotalProd.textContent = '0';
      if (resultCount) resultCount.textContent = '0';
    }
  }

  /**
   * Tính toán và cập nhật số liệu thống kê
   */
  function updateStats(items) {
    if (statTotalCat) {
      statTotalCat.textContent = items.length;
    }
    if (statTotalProd) {
      const totalProducts = items.reduce((sum, item) => sum + (Number(item.product_count) || 0), 0);
      statTotalProd.textContent = totalProducts.toLocaleString('vi-VN');
    }
  }

  /**
   * Render dữ liệu vào bảng danh mục có hỗ trợ lọc tìm kiếm
   */
  function renderTable() {
    if (!tableBody) return;

    const rawQuery = searchInput ? searchInput.value.trim() : '';
    const query = rawQuery.toLowerCase();
    const queryNorm = removeVietnameseTones(query);
    let filtered = categoriesData;

    if (query) {
      filtered = categoriesData.filter(cat => {
        const name = cat.name ? cat.name.toLowerCase() : '';
        const nameNorm = removeVietnameseTones(name);
        const desc = cat.description ? cat.description.toLowerCase() : '';
        const descNorm = removeVietnameseTones(desc);
        const idMatch = String(cat.id).includes(query);

        return (
          name.includes(query) ||
          nameNorm.includes(queryNorm) ||
          desc.includes(query) ||
          descNorm.includes(queryNorm) ||
          idMatch
        );
      });
      if (clearSearchBtn) clearSearchBtn.style.display = 'inline-block';
    } else {
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    }

    if (resultCount) {
      resultCount.textContent = filtered.length;
    }

    if (filtered.length === 0) {
      if (tableContainer) tableContainer.classList.remove('d-none');
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5 text-secondary">
            <i class="bi bi-search fs-2 d-block mb-2 text-muted"></i>
            <div>Không tìm thấy danh mục nào phù hợp với từ khóa "<strong>${escapeHtml(query)}</strong>".</div>
            <button class="btn btn-sm btn-outline-secondary mt-2" id="btnResetSearch">
              <i class="bi bi-arrow-counterclockwise me-1"></i> Xóa tìm kiếm
            </button>
          </td>
        </tr>
      `;
      const btnResetSearch = document.getElementById('btnResetSearch');
      if (btnResetSearch) {
        btnResetSearch.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          renderTable();
        });
      }
      return;
    }

    if (tableContainer) tableContainer.classList.remove('d-none');

    tableBody.innerHTML = filtered.map((cat, idx) => {
      const formattedCode = `CAT-${String(cat.id).padStart(3, '0')}`;
      const escapedName = escapeHtml(cat.name);
      const escapedDesc = cat.description
        ? escapeHtml(cat.description)
        : '<em class="text-muted small">Chưa có mô tả</em>';
      const productCount = Number(cat.product_count) || 0;

      // Nút thao tác theo quyền
      let actionButtons = '';
      if (userRole === 'ADMIN') {
        actionButtons = `
          <div class="btn-group btn-group-sm">
            <a href="/category-form.html?mode=edit&id=${cat.id}" class="btn-action-icon" title="Chỉnh sửa danh mục">
              <i class="bi bi-pencil"></i>
            </a>
            <button type="button" class="btn-action-icon danger btn-delete-cat" data-id="${cat.id}" data-name="${escapedName}" data-count="${productCount}" title="Xóa danh mục">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `;
      } else {
        actionButtons = `
          <span class="badge bg-light text-secondary border" title="Tài khoản STAFF chỉ có quyền xem">
            <i class="bi bi-eye"></i> Chỉ xem
          </span>
        `;
      }

      return `
        <tr>
          <td class="text-secondary small fw-medium">${idx + 1}</td>
          <td>
            <span class="badge bg-light text-dark font-monospace border">${formattedCode}</span>
          </td>
          <td>
            <div class="fw-bold text-dark fs-6">${escapedName}</div>
          </td>
          <td>
            <div class="text-secondary text-truncate" style="max-width: 380px;">${escapedDesc}</div>
          </td>
          <td class="text-center">
            <span class="badge ${productCount > 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-secondary-subtle text-secondary border border-secondary-subtle'} px-2 py-1 rounded-pill fw-semibold">
              <i class="bi bi-box-seam me-1"></i>${productCount} sản phẩm
            </span>
          </td>
          <td class="text-end">
            ${actionButtons}
          </td>
        </tr>
      `;
    }).join('');

    // Gán sự kiện click xóa cho các nút vừa render
    const deleteButtons = tableBody.querySelectorAll('.btn-delete-cat');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const id = parseInt(this.getAttribute('data-id'), 10);
        const name = this.getAttribute('data-name');
        const count = parseInt(this.getAttribute('data-count'), 10);
        openDeleteModal({ id, name, product_count: count });
      });
    });
  }

  /**
   * Mở modal xác nhận xóa danh mục
   */
  function openDeleteModal(cat) {
    pendingDeleteCategory = cat;

    if (deleteModalAlert) {
      deleteModalAlert.classList.add('d-none');
      deleteModalAlert.textContent = '';
    }

    if (deleteCatTargetName) {
      deleteCatTargetName.textContent = `[ID: ${cat.id}] ${cat.name}`;
    }

    if (deleteCatWarningText) {
      if (cat.product_count > 0) {
        deleteCatWarningText.innerHTML = `
          <div class="alert alert-warning py-2 px-3 small mb-0 border-warning">
            <i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>
            <strong>Cảnh báo ràng buộc:</strong> Danh mục này hiện đang có <strong>${cat.product_count}</strong> sản phẩm liên kết (khóa ngoại <code>products.category_id</code>). Khi gửi yêu cầu xóa, máy chủ sẽ chặn thao tác (409 IN_USE) để bảo toàn dữ liệu.
          </div>
        `;
      } else {
        deleteCatWarningText.innerHTML = `
          <div class="text-muted small">
            <i class="bi bi-info-circle me-1"></i> Danh mục này hiện chưa có sản phẩm nào liên kết. Có thể xóa an toàn.
          </div>
        `;
      }
    }

    // Reset trạng thái nút xóa
    setDeleteButtonLoading(false);

    if (deleteModalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
      modal.show();
    }
  }

  /**
   * Cập nhật trạng thái loading cho nút xóa
   */
  function setDeleteButtonLoading(isLoading) {
    if (!confirmDeleteBtn) return;
    confirmDeleteBtn.disabled = isLoading;
    if (cancelDeleteBtn) cancelDeleteBtn.disabled = isLoading;
    if (closeDeleteModalBtn) closeDeleteModalBtn.disabled = isLoading;

    if (isLoading) {
      if (deleteSpinner) deleteSpinner.classList.remove('d-none');
      if (deleteIcon) deleteIcon.classList.add('d-none');
      if (deleteBtnText) deleteBtnText.textContent = 'Đang xóa...';
    } else {
      if (deleteSpinner) deleteSpinner.classList.add('d-none');
      if (deleteIcon) deleteIcon.classList.remove('d-none');
      if (deleteBtnText) deleteBtnText.textContent = 'Xác nhận xóa';
    }
  }

  /**
   * Thực hiện gọi API DELETE /api/categories/:id
   */
  async function handleConfirmDelete() {
    if (!pendingDeleteCategory) return;
    setDeleteButtonLoading(true);

    if (deleteModalAlert) {
      deleteModalAlert.classList.add('d-none');
      deleteModalAlert.textContent = '';
    }

    try {
      await CategoryApi.delete(pendingDeleteCategory.id);

      // Đóng modal
      if (deleteModalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(deleteModalEl);
        if (modal) modal.hide();
      }

      showToast(`Đã xóa danh mục "${pendingDeleteCategory.name}" thành công!`, true);
      pendingDeleteCategory = null;

      // Tải lại danh sách từ MySQL
      await loadCategories();
    } catch (err) {
      console.error('Lỗi khi xóa danh mục:', err);
      // Hiển thị lỗi ngay trong modal để người dùng biết
      if (deleteModalAlert) {
        deleteModalAlert.classList.remove('d-none');
        deleteModalAlert.textContent = err.message || 'Không thể xóa danh mục. Vui lòng thử lại.';
      }
      setDeleteButtonLoading(false);
    }
  }

  // Gán sự kiện
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderTable);
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      renderTable();
    });
  }

  if (btnRetry) {
    btnRetry.addEventListener('click', loadCategories);
  }

  // Tải danh mục ban đầu
  loadCategories();
}

// =============================================================================
// 5. CATEGORY FORM PAGE LOGIC (category-form.html)
// =============================================================================
function initCategoryFormPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') === 'edit' ? 'edit' : 'create';
  const categoryId = urlParams.get('id');

  const form = document.getElementById('categoryForm');
  const nameInput = document.getElementById('categoryName');
  const descInput = document.getElementById('categoryDescription');
  const nameError = document.getElementById('nameError');
  const descError = document.getElementById('descError');
  const descCharCount = document.getElementById('descCharCount');
  const formTitle = document.getElementById('catFormTitle');
  const formSubtitle = document.getElementById('catFormSubtitle');
  const breadcrumbCurrent = document.getElementById('catBreadcrumbCurrent');
  const modeBadge = document.getElementById('catModeBadge');
  const submitBtn = document.getElementById('catSubmitBtn');
  const submitSpinner = document.getElementById('catSubmitSpinner');
  const submitIcon = document.getElementById('catSubmitIcon');
  const submitText = document.getElementById('catSubmitText');
  const resetBtn = document.getElementById('catResetBtn');
  const cancelBtn = document.getElementById('catCancelBtn');
  const formAlertContainer = document.getElementById('formAlertContainer');
  const formLoadingState = document.getElementById('formLoadingState');
  const formContentBody = document.getElementById('formContentBody');

  const userRole = getCurrentUserRole();
  let initialData = null;

  // Kiểm tra quyền hạn (STAFF không có quyền thêm/sửa)
  if (userRole === 'STAFF') {
    if (formAlertContainer) {
      formAlertContainer.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center gap-2 mb-4">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <div><strong>Quyền hạn hạn chế:</strong> Bạn đang đăng nhập với vai trò <strong>STAFF</strong>. Chỉ Quản trị viên (ADMIN) mới có quyền tạo mới hoặc cập nhật danh mục.</div>
        </div>
      `;
    }
    if (submitBtn) submitBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
    if (nameInput) nameInput.disabled = true;
    if (descInput) descInput.disabled = true;
  }

  /**
   * Hiển thị thông báo tổng trong trang form
   */
  function showFormAlert(type, message) {
    if (!formAlertContainer) return;
    formAlertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4" role="alert">
        <i class="bi ${type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'} fs-5"></i>
        <div class="flex-grow-1">${escapeHtml(message)}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    formAlertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Đếm ký tự cho phần mô tả
   */
  function updateCharCount() {
    if (!descInput || !descCharCount) return;
    const len = descInput.value.length;
    descCharCount.textContent = `${len}/255`;
    if (len > 255) {
      descCharCount.classList.add('text-danger', 'fw-bold');
      descInput.classList.add('is-invalid');
      if (descError) descError.textContent = 'Mô tả không được vượt quá 255 ký tự.';
    } else {
      descCharCount.classList.remove('text-danger', 'fw-bold');
      if (descInput.classList.contains('is-invalid') && descError && descError.textContent.includes('255')) {
        descInput.classList.remove('is-invalid');
      }
    }
  }

  if (descInput) {
    descInput.addEventListener('input', updateCharCount);
  }

  if (nameInput) {
    nameInput.addEventListener('input', function () {
      if (nameInput.classList.contains('is-invalid')) {
        nameInput.classList.remove('is-invalid');
      }
    });
  }

  /**
   * Cài đặt giao diện theo chế độ (Create hoặc Edit)
   */
  async function setupFormMode() {
    if (mode === 'edit') {
      if (!categoryId || !/^[1-9]\d*$/.test(categoryId)) {
        if (formLoadingState) formLoadingState.classList.add('d-none');
        if (formContentBody) formContentBody.classList.add('d-none');
        showFormAlert('danger', 'ID danh mục không hợp lệ hoặc thiếu tham số trên URL.');
        return;
      }

      // Đặt tiêu đề tạm thời
      if (formTitle) formTitle.textContent = 'Chỉnh sửa danh mục';
      if (formSubtitle) formSubtitle.textContent = `Mã danh mục: CAT-${String(categoryId).padStart(3, '0')}`;
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Chỉnh sửa danh mục';
      if (modeBadge) {
        modeBadge.className = 'badge bg-warning text-dark border border-warning-subtle d-none d-md-inline-block';
        modeBadge.textContent = 'Chế độ Chỉnh sửa';
      }
      if (submitText) submitText.textContent = 'Cập nhật danh mục';
      if (submitIcon) submitIcon.className = 'bi bi-check-lg me-1';

      // Chuyển sang loading state
      if (formLoadingState) formLoadingState.classList.remove('d-none');
      if (formContentBody) formContentBody.classList.add('d-none');

      try {
        const cat = await CategoryApi.getById(categoryId);
        initialData = cat;

        // Điền dữ liệu thật
        if (nameInput) nameInput.value = cat.name || '';
        if (descInput) descInput.value = cat.description || '';
        updateCharCount();

        if (formTitle) formTitle.textContent = `Chỉnh sửa danh mục: ${cat.name}`;
        if (formSubtitle) {
          formSubtitle.textContent = `Mã danh mục: CAT-${String(cat.id).padStart(3, '0')} • Số sản phẩm liên kết: ${cat.product_count || 0}`;
        }

        if (formLoadingState) formLoadingState.classList.add('d-none');
        if (formContentBody) formContentBody.classList.remove('d-none');
      } catch (err) {
        console.error('Lỗi khi tải thông tin danh mục:', err);
        if (formLoadingState) formLoadingState.classList.add('d-none');
        showFormAlert('danger', err.message || `Không thể tìm thấy danh mục với ID #${categoryId}.`);
        if (formContentBody) formContentBody.classList.add('d-none');
      }
    } else {
      // Chế độ Create
      if (formTitle) formTitle.textContent = 'Thêm danh mục mới';
      if (formSubtitle) formSubtitle.textContent = 'Nhập tên và thông tin phân loại mặt hàng trong hệ thống kho';
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Thêm danh mục mới';
      if (modeBadge) {
        modeBadge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-none d-md-inline-block';
        modeBadge.textContent = 'Chế độ Thêm mới';
      }
      if (submitText) submitText.textContent = 'Lưu danh mục';
      if (submitIcon) submitIcon.className = 'bi bi-floppy me-1';
      if (formLoadingState) formLoadingState.classList.add('d-none');
      if (formContentBody) formContentBody.classList.remove('d-none');
      updateCharCount();
    }
  }

  /**
   * Reset form về giá trị ban đầu
   */
  if (resetBtn) {
    resetBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (mode === 'edit' && initialData) {
        if (nameInput) {
          nameInput.value = initialData.name || '';
          nameInput.classList.remove('is-invalid');
        }
        if (descInput) {
          descInput.value = initialData.description || '';
          descInput.classList.remove('is-invalid');
        }
      } else {
        if (nameInput) {
          nameInput.value = '';
          nameInput.classList.remove('is-invalid');
        }
        if (descInput) {
          descInput.value = '';
          descInput.classList.remove('is-invalid');
        }
      }
      updateCharCount();
      if (formAlertContainer) formAlertContainer.innerHTML = '';
    });
  }

  /**
   * Đặt trạng thái đang submit form
   */
  function setSubmittingState(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    if (resetBtn) resetBtn.disabled = isSubmitting;
    if (cancelBtn) cancelBtn.classList.toggle('disabled', isSubmitting);

    if (isSubmitting) {
      if (submitSpinner) submitSpinner.classList.remove('d-none');
      if (submitIcon) submitIcon.classList.add('d-none');
      if (submitText) submitText.textContent = mode === 'edit' ? 'Đang cập nhật...' : 'Đang lưu...';
    } else {
      if (submitSpinner) submitSpinner.classList.add('d-none');
      if (submitIcon) submitIcon.classList.remove('d-none');
      if (submitText) submitText.textContent = mode === 'edit' ? 'Cập nhật danh mục' : 'Lưu danh mục';
    }
  }

  /**
   * Xử lý Submit Form
   */
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Nếu role là STAFF thì chặn
      if (userRole === 'STAFF') {
        showFormAlert('warning', 'Tài khoản STAFF chỉ có quyền xem, không được thêm hoặc cập nhật danh mục.');
        return;
      }

      // Xóa lỗi cũ
      if (nameInput) nameInput.classList.remove('is-invalid');
      if (descInput) descInput.classList.remove('is-invalid');
      if (formAlertContainer) formAlertContainer.innerHTML = '';

      const nameVal = nameInput ? nameInput.value.trim() : '';
      const descVal = descInput ? descInput.value.trim() : '';

      // Validate Client-Side
      let hasError = false;

      if (!nameVal) {
        if (nameInput) nameInput.classList.add('is-invalid');
        if (nameError) nameError.textContent = 'Tên danh mục là bắt buộc và không được để trống.';
        hasError = true;
      } else if (nameVal.length > 100) {
        if (nameInput) nameInput.classList.add('is-invalid');
        if (nameError) nameError.textContent = 'Tên danh mục không được vượt quá 100 ký tự.';
        hasError = true;
      }

      if (descVal && descVal.length > 255) {
        if (descInput) descInput.classList.add('is-invalid');
        if (descError) descError.textContent = 'Mô tả danh mục không được vượt quá 255 ký tự.';
        hasError = true;
      }

      if (hasError) {
        if (nameInput && nameInput.classList.contains('is-invalid')) {
          nameInput.focus();
        } else if (descInput && descInput.classList.contains('is-invalid')) {
          descInput.focus();
        }
        return;
      }

      // Chuẩn bị payload
      const payload = {
        name: nameVal,
        description: descVal || null,
      };

      setSubmittingState(true);

      try {
        if (mode === 'edit') {
          await CategoryApi.update(categoryId, payload);
          showToast(`Cập nhật danh mục "${nameVal}" thành công!`, true);
          showFormAlert('success', `Cập nhật danh mục "${nameVal}" thành công! Đang chuyển hướng về trang danh sách...`);
        } else {
          await CategoryApi.create(payload);
          showToast(`Thêm mới danh mục "${nameVal}" thành công!`, true);
          showFormAlert('success', `Tạo danh mục "${nameVal}" thành công! Đang chuyển hướng về trang danh sách...`);
        }

        // Tự động chuyển hướng về trang categories.html sau 1.2s
        setTimeout(() => {
          window.location.href = '/categories.html';
        }, 1200);
      } catch (err) {
        console.error('Lỗi khi lưu danh mục:', err);
        setSubmittingState(false);

        // Xử lý lỗi 409 Trùng tên danh mục
        if (err.status === 409 || err.code === 'DUPLICATE_ENTRY') {
          if (nameInput) nameInput.classList.add('is-invalid');
          if (nameError) nameError.textContent = err.message || `Tên danh mục '${nameVal}' đã tồn tại trong hệ thống.`;
          showFormAlert('danger', err.message || `Tên danh mục '${nameVal}' đã tồn tại. Vui lòng chọn tên khác.`);
          if (nameInput) nameInput.focus();
          return;
        }

        // Xử lý lỗi 400 Bad Request
        if (err.status === 400) {
          showFormAlert('danger', err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.');
          return;
        }

        // Xử lý lỗi 404 Not Found
        if (err.status === 404) {
          showFormAlert('danger', err.message || 'Không tìm thấy danh mục để cập nhật.');
          return;
        }

        // Lỗi 500 hoặc mất kết nối mạng
        showFormAlert('danger', err.message || 'Lỗi hệ thống hoặc mất kết nối mạng đến máy chủ. Vui lòng thử lại sau.');
      }
    });
  }

  // Khởi động thiết lập form
  setupFormMode();
}
