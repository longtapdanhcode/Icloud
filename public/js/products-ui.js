/**
 * Cloud Inventory - Products UI Management
 * Phụ trách: Nguyễn Thị Huyền (Người 1 - Product & Category Management)
 * Kết nối: Express REST API & MySQL
 * Endpoints:
 *   - GET    /api/products (page, limit, search, category_id, sort, order)
 *   - GET    /api/products/:id
 *   - POST   /api/products
 *   - PUT    /api/products/:id
 *   - DELETE /api/products/:id
 *   - GET    /api/categories
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

const ProductApi = {
  baseUrl: '/api/products',

  /**
   * Lấy danh sách sản phẩm có tìm kiếm, lọc, sắp xếp, phân trang
   * Hỗ trợ AbortSignal để hủy request cũ khi tìm kiếm liên tục (chống race conditions)
   */
  async list({ page = 1, limit = 10, search = '', category_id = '', sort = 'created_at', order = 'desc' } = {}, signal = null) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (search && search.trim()) params.set('search', search.trim());
    if (category_id && String(category_id).trim()) params.set('category_id', String(category_id).trim());
    if (sort) params.set('sort', sort);
    if (order) params.set('order', order);

    const url = `${this.baseUrl}?${params.toString()}`;
    const options = {
      method: 'GET',
      headers: getApiHeaders(),
    };
    if (signal) options.signal = signal;

    const res = await fetch(url, options);
    const result = await res.json();

    if (!res.ok) {
      const err = new Error(result?.error?.message || 'Không thể tải danh sách sản phẩm');
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }

    return {
      items: Array.isArray(result.data) ? result.data : [],
      meta: result.meta || { page, limit, total: 0, totalPages: 1 },
    };
  },

  /**
   * Lấy chi tiết một sản phẩm theo ID
   */
  async getById(id) {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getApiHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result?.error?.message || `Không thể tải thông tin sản phẩm #${id}`);
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },

  /**
   * Thêm sản phẩm mới (quantity tự động đặt là 0)
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
      const err = new Error(result?.error?.message || 'Không thể tạo sản phẩm');
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },

  /**
   * Cập nhật thông tin sản phẩm (không gửi quantity)
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
      const err = new Error(result?.error?.message || `Không thể cập nhật sản phẩm #${id}`);
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },

  /**
   * Xóa sản phẩm theo ID (chặn xóa nếu đã có phát sinh giao dịch kho)
   */
  async delete(id) {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getApiHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result?.error?.message || `Không thể xóa sản phẩm #${id}`);
      err.status = res.status;
      err.code = result?.error?.code;
      throw err;
    }
    return result.data;
  },
};

const CategoryApi = {
  baseUrl: '/api/categories',

  /**
   * Lấy danh sách toàn bộ danh mục để hiển thị trong dropdown bộ lọc và form
   */
  async list() {
    const res = await fetch(this.baseUrl, {
      method: 'GET',
      headers: getApiHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result?.error?.message || 'Không thể tải danh mục');
    }
    return Array.isArray(result.data) ? result.data : [];
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
 * Định dạng tiền tệ theo chuẩn Việt Nam Đồng (VNĐ)
 */
function formatCurrency(num) {
  const value = Number(num) || 0;
  return value.toLocaleString('vi-VN') + ' ₫';
}

/**
 * Định dạng ngày giờ hiển thị
 */
function formatDate(dateStr) {
  if (!dateStr) return '<span class="text-muted">--</span>';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return escapeHtml(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} <span class="text-muted small">${hours}:${minutes}</span>`;
  } catch {
    return escapeHtml(dateStr);
  }
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
 * Lấy vai trò người dùng hiện tại (tương thích phân quyền Người 3 khi tích hợp Auth)
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

  // 3.2. Khởi tạo trang Danh sách Sản phẩm
  const productTableBody = document.getElementById('productTableBody');
  if (productTableBody) {
    initProductListPage();
  }

  // 3.3. Khởi tạo trang Form Thêm / Sửa Sản phẩm
  const productForm = document.getElementById('productForm');
  if (productForm) {
    initProductFormPage();
  }
});

// =============================================================================
// 4. PRODUCT LIST PAGE LOGIC (products.html)
// =============================================================================
function initProductListPage() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortSelect');
  const limitSelect = document.getElementById('limitSelect');
  const resultCount = document.getElementById('resultCount');
  const tableBody = document.getElementById('productTableBody');
  const tableContainer = document.getElementById('productTableContainer');
  const loadingState = document.getElementById('productLoadingState');
  const errorState = document.getElementById('productErrorState');
  const errorMessage = document.getElementById('productErrorMessage');
  const emptyState = document.getElementById('productEmptyState');
  const paginationContainer = document.getElementById('paginationContainer');
  const paginationSummary = document.getElementById('paginationSummary');
  const paginationNav = document.getElementById('paginationNav');
  const btnRetry = document.getElementById('btnRetryProductFetch');
  const btnResetFilters = document.getElementById('btnResetFilters');

  // KPI elements
  const statTotal = document.getElementById('statTotalProducts');
  const statCategoryCount = document.getElementById('statCategoryCount');
  const statLow = document.getElementById('statLowStock');
  const statOut = document.getElementById('statOutOfStock');
  const statValue = document.getElementById('statInventoryValue');

  // Delete modal elements
  const deleteModalEl = document.getElementById('deleteProductModal');
  const deleteModalAlert = document.getElementById('deleteProductModalAlert');
  const deleteTargetName = document.getElementById('deleteProductTargetName');
  const confirmDeleteBtn = document.getElementById('confirmDeleteProductBtn');
  const deleteSpinner = document.getElementById('deleteProductSpinner');
  const deleteIcon = document.getElementById('deleteProductIcon');
  const deleteBtnText = document.getElementById('deleteProductBtnText');
  const cancelDeleteBtn = document.getElementById('cancelDeleteProductBtn');
  const closeDeleteModalBtn = document.getElementById('closeDeleteProductModalBtn');

  // State Management
  let currentPage = 1;
  let currentLimit = 10;
  let currentSearch = '';
  let currentCategory = '';
  let currentSort = 'created_at';
  let currentOrder = 'desc';

  let activeAbortController = null;
  let searchDebounceTimer = null;
  let pendingDeleteProduct = null;
  const userRole = getCurrentUserRole();

  /**
   * Tải danh sách danh mục để đổ vào dropdown lọc
   */
  async function loadCategoriesFilter() {
    try {
      const categories = await CategoryApi.list();
      if (statCategoryCount) {
        statCategoryCount.textContent = categories.length;
      }
      if (categoryFilter) {
        let optionsHtml = '<option value="">-- Tất cả danh mục --</option>';
        categories.forEach(cat => {
          optionsHtml += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
        });
        categoryFilter.innerHTML = optionsHtml;
      }
    } catch (err) {
      console.warn('Không thể tải danh mục cho bộ lọc:', err);
      if (statCategoryCount) statCategoryCount.textContent = '4';
    }
  }

  /**
   * Gọi API GET /api/products có đầy đủ tìm kiếm, lọc, sắp xếp và phân trang
   */
  async function loadProducts() {
    // 1. Hủy request cũ nếu đang bay (chống race condition ghi đè kết quả tìm kiếm)
    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    // 2. Chuyển UI sang Loading state
    if (loadingState) loadingState.classList.remove('d-none');
    if (tableContainer) tableContainer.classList.add('d-none');
    if (errorState) errorState.classList.add('d-none');
    if (emptyState) emptyState.classList.add('d-none');
    if (paginationContainer) paginationContainer.classList.add('d-none');

    try {
      const { items, meta } = await ProductApi.list(
        {
          page: currentPage,
          limit: currentLimit,
          search: currentSearch,
          category_id: currentCategory,
          sort: currentSort,
          order: currentOrder,
        },
        activeAbortController.signal
      );

      // 3. Ẩn loading state
      if (loadingState) loadingState.classList.add('d-none');

      // Cập nhật thống kê kết quả
      if (resultCount) {
        resultCount.textContent = `${meta.total} sản phẩm`;
      }
      if (statTotal) {
        statTotal.textContent = meta.total;
      }

      // Tính thống kê dựa trên dữ liệu sản phẩm của trang hiện tại
      updatePageStats(items);

      // 4. Kiểm tra Empty state
      if (!items || items.length === 0) {
        if (emptyState) emptyState.classList.remove('d-none');
        return;
      }

      // 5. Render bảng và thanh phân trang
      renderTable(items);
      renderPagination(meta);
    } catch (err) {
      // Nếu bị abort do người dùng gõ phím tiếp thì bỏ qua, không báo lỗi
      if (err.name === 'AbortError') {
        return;
      }

      console.error('Lỗi khi tải danh sách sản phẩm:', err);
      if (loadingState) loadingState.classList.add('d-none');
      if (errorState) {
        errorState.classList.remove('d-none');
        if (errorMessage) {
          errorMessage.textContent = err.message || 'Không thể kết nối đến máy chủ MySQL qua Express API.';
        }
      }
      if (resultCount) resultCount.textContent = '0';
      if (statTotal) statTotal.textContent = '0';
      if (statLow) statLow.textContent = '0';
      if (statOut) statOut.textContent = '0';
      if (statValue) statValue.textContent = '0 ₫';
    }
  }

  /**
   * Tính toán và hiển thị thống kê cho các thẻ KPI trang
   */
  function updatePageStats(items) {
    if (!items || items.length === 0) {
      if (statLow) statLow.textContent = '0';
      if (statOut) statOut.textContent = '0';
      if (statValue) statValue.textContent = '0 ₫';
      return;
    }

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalPageValue = 0;

    items.forEach(p => {
      const qty = Number(p.quantity) || 0;
      const minStock = Number(p.min_stock) || 0;
      const price = Number(p.price) || 0;

      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= minStock) {
        lowStockCount++;
      }
      totalPageValue += qty * price;
    });

    if (statLow) statLow.textContent = lowStockCount;
    if (statOut) statOut.textContent = outOfStockCount;
    if (statValue) statValue.textContent = formatCurrency(totalPageValue);
  }

  /**
   * Render dữ liệu vào các hàng của bảng sản phẩm
   */
  function renderTable(items) {
    if (!tableBody) return;
    if (tableContainer) tableContainer.classList.remove('d-none');

    const startIndex = (currentPage - 1) * currentLimit;

    tableBody.innerHTML = items.map((p, idx) => {
      const qty = Number(p.quantity) || 0;
      const minStock = Number(p.min_stock) || 0;

      // Xác định badge trạng thái tồn kho
      let statusBadge = '';
      if (qty === 0) {
        statusBadge = '<span class="badge-stock-out"><i class="bi bi-x-circle-fill"></i> Hết hàng</span>';
      } else if (qty <= minStock) {
        statusBadge = `<span class="badge-stock-low" title="Tồn kho ≤ mức tối thiểu (${minStock})"><i class="bi bi-exclamation-triangle-fill"></i> Tồn thấp</span>`;
      } else {
        statusBadge = '<span class="badge-stock-ok"><i class="bi bi-check-circle-fill"></i> Đủ tồn</span>';
      }

      const escapedSku = escapeHtml(p.sku);
      const escapedName = escapeHtml(p.name);
      const escapedCat = p.category_name
        ? `<span class="badge-category">${escapeHtml(p.category_name)}</span>`
        : '<span class="text-muted small"><em>Chưa phân loại</em></span>';

      // Nút thao tác theo quyền
      let actionButtons = `
        <div class="btn-group btn-group-sm">
          <a href="/product-form.html?mode=edit&id=${p.id}" class="btn-action-icon" title="Chỉnh sửa sản phẩm">
            <i class="bi bi-pencil"></i>
          </a>
      `;

      if (userRole === 'ADMIN') {
        actionButtons += `
          <button type="button" class="btn-action-icon danger btn-delete-product" data-id="${p.id}" data-sku="${escapedSku}" data-name="${escapedName}" title="Xóa sản phẩm">
            <i class="bi bi-trash"></i>
          </button>
        `;
      }

      actionButtons += '</div>';

      return `
        <tr>
          <td class="text-secondary small fw-medium">${startIndex + idx + 1}</td>
          <td><span class="badge bg-light text-dark font-monospace border">${escapedSku}</span></td>
          <td>
            <div class="fw-semibold text-dark">${escapedName}</div>
            <div class="small text-muted d-block d-md-none">${p.category_name || 'Chưa phân loại'}</div>
          </td>
          <td>${escapedCat}</td>
          <td class="fw-bold text-end">${formatCurrency(p.price)}</td>
          <td class="text-center">
            <span class="fw-bold ${qty <= minStock ? 'text-danger' : 'text-dark'}">${qty.toLocaleString('vi-VN')}</span>
            <span class="text-muted small">/ min ${minStock}</span>
          </td>
          <td class="text-center">${statusBadge}</td>
          <td class="small text-secondary">${formatDate(p.created_at)}</td>
          <td class="text-end">${actionButtons}</td>
        </tr>
      `;
    }).join('');

    // Gán sự kiện click xóa cho các nút vừa render
    const deleteButtons = tableBody.querySelectorAll('.btn-delete-product');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const id = parseInt(this.getAttribute('data-id'), 10);
        const sku = this.getAttribute('data-sku');
        const name = this.getAttribute('data-name');
        openDeleteModal({ id, sku, name });
      });
    });
  }

  /**
   * Render thanh phân trang sản phẩm
   */
  function renderPagination(meta) {
    if (!paginationContainer || !paginationNav || !paginationSummary) return;

    if (meta.total === 0) {
      paginationContainer.classList.add('d-none');
      return;
    }

    paginationContainer.classList.remove('d-none');

    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);
    paginationSummary.innerHTML = `Đang hiển thị <strong>${start} - ${end}</strong> trên tổng số <strong>${meta.total}</strong> sản phẩm`;

    const totalPages = meta.totalPages || 1;
    let navHtml = '';

    // Nút Trang trước (Previous)
    navHtml += `
      <li class="page-item ${meta.page <= 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${meta.page - 1}" aria-label="Previous">&laquo;</a>
      </li>
    `;

    // Render số trang
    let startPage = Math.max(1, meta.page - 2);
    let endPage = Math.min(totalPages, meta.page + 2);

    if (startPage > 1) {
      navHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
      if (startPage > 2) {
        navHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      navHtml += `
        <li class="page-item ${p === meta.page ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${p}">${p}</a>
        </li>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        navHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
      navHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }

    // Nút Trang sau (Next)
    navHtml += `
      <li class="page-item ${meta.page >= totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${meta.page + 1}" aria-label="Next">&raquo;</a>
      </li>
    `;

    paginationNav.innerHTML = navHtml;

    // Gán sự kiện chuyển trang
    const pageLinks = paginationNav.querySelectorAll('a.page-link');
    pageLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetPage = parseInt(this.getAttribute('data-page'), 10);
        if (targetPage && targetPage !== currentPage && targetPage >= 1 && targetPage <= totalPages) {
          currentPage = targetPage;
          loadProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Mở modal xác nhận xóa sản phẩm
   */
  function openDeleteModal(product) {
    pendingDeleteProduct = product;

    if (deleteModalAlert) {
      deleteModalAlert.classList.add('d-none');
      deleteModalAlert.textContent = '';
    }

    if (deleteTargetName) {
      deleteTargetName.textContent = `[SKU: ${product.sku}] ${product.name}`;
    }

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
   * Thực hiện gọi API DELETE /api/products/:id
   */
  async function handleConfirmDelete() {
    if (!pendingDeleteProduct) return;
    setDeleteButtonLoading(true);

    if (deleteModalAlert) {
      deleteModalAlert.classList.add('d-none');
      deleteModalAlert.textContent = '';
    }

    try {
      await ProductApi.delete(pendingDeleteProduct.id);

      // Đóng modal
      if (deleteModalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(deleteModalEl);
        if (modal) modal.hide();
      }

      showToast(`Đã xóa sản phẩm "${pendingDeleteProduct.name}" (${pendingDeleteProduct.sku}) thành công!`, true);
      pendingDeleteProduct = null;

      // Tải lại danh sách
      await loadProducts();
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err);
      if (deleteModalAlert) {
        deleteModalAlert.classList.remove('d-none');
        deleteModalAlert.textContent = err.message || 'Không thể xóa sản phẩm. Vui lòng kiểm tra lại.';
      }
      setDeleteButtonLoading(false);
    }
  }

  // ===========================================================================
  // Event Listeners cho Tìm kiếm, Bộ lọc, Sắp xếp, Phân trang
  // ===========================================================================

  // Tìm kiếm với Debounce 300ms
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const val = this.value.trim();
      currentSearch = val;

      if (clearSearchBtn) {
        clearSearchBtn.style.display = val ? 'inline-block' : 'none';
      }

      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentPage = 1; // Reset về trang 1 khi tìm kiếm
        loadProducts();
      }, 300);
    });
  }

  // Xóa từ khóa tìm kiếm
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      currentSearch = '';
      this.style.display = 'none';
      currentPage = 1;
      loadProducts();
    });
  }

  // Lọc theo danh mục
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function () {
      currentCategory = this.value;
      currentPage = 1; // Reset về trang 1 khi đổi danh mục
      loadProducts();
    });
  }

  // Sắp xếp (tuân thủ whitelist Backend: name, price, quantity, created_at)
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      const val = this.value;
      switch (val) {
        case 'price_asc':
          currentSort = 'price'; currentOrder = 'asc'; break;
        case 'price_desc':
          currentSort = 'price'; currentOrder = 'desc'; break;
        case 'qty_asc':
          currentSort = 'quantity'; currentOrder = 'asc'; break;
        case 'qty_desc':
          currentSort = 'quantity'; currentOrder = 'desc'; break;
        case 'name_asc':
          currentSort = 'name'; currentOrder = 'asc'; break;
        case 'name_desc':
          currentSort = 'name'; currentOrder = 'desc'; break;
        case 'date_asc':
        case 'id_asc':
          currentSort = 'created_at'; currentOrder = 'asc'; break;
        case 'date_desc':
        case 'id_desc':
        default:
          currentSort = 'created_at'; currentOrder = 'desc'; break;
      }
      currentPage = 1;
      loadProducts();
    });
  }

  // Thay đổi số lượng sản phẩm mỗi trang (limit)
  if (limitSelect) {
    limitSelect.addEventListener('change', function () {
      currentLimit = parseInt(this.value, 10) || 10;
      currentPage = 1;
      loadProducts();
    });
  }

  // Nút xóa bộ lọc
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      if (categoryFilter) categoryFilter.value = '';
      if (sortSelect) sortSelect.value = 'date_desc';
      currentSearch = '';
      currentCategory = '';
      currentSort = 'created_at';
      currentOrder = 'desc';
      currentPage = 1;
      loadProducts();
    });
  }

  // Nút thử lại khi gặp lỗi
  if (btnRetry) {
    btnRetry.addEventListener('click', loadProducts);
  }

  // Xác nhận xóa trong modal
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }

  // Khởi động trang: Tải danh mục cho bộ lọc và tải danh sách sản phẩm
  loadCategoriesFilter();
  loadProducts();
}

// =============================================================================
// 5. PRODUCT FORM PAGE LOGIC (product-form.html)
// =============================================================================
function initProductFormPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') === 'edit' ? 'edit' : 'create';
  const productId = urlParams.get('id');

  const form = document.getElementById('productForm');
  const skuInput = document.getElementById('productSku');
  const categorySelect = document.getElementById('productCategory');
  const nameInput = document.getElementById('productName');
  const priceInput = document.getElementById('productPrice');
  const qtyInput = document.getElementById('productQuantity');
  const minStockInput = document.getElementById('productMinStock');

  const skuError = document.getElementById('skuError');
  const categoryError = document.getElementById('categoryError');
  const nameError = document.getElementById('nameError');
  const priceError = document.getElementById('priceError');
  const minStockError = document.getElementById('minStockError');

  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const modeBadge = document.getElementById('modeBadge');
  const submitBtn = document.getElementById('submitBtn');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitIcon = document.getElementById('submitIcon');
  const submitText = document.getElementById('submitText');
  const resetBtn = document.getElementById('resetBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const formAlertContainer = document.getElementById('formAlertContainer');
  const formLoadingState = document.getElementById('formLoadingState');
  const formContentBody = document.getElementById('formContentBody');

  let initialData = null;

  /**
   * Hiển thị thông báo Alert chung cho trang form
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
   * Tải danh mục vào dropdown chọn danh mục
   */
  async function loadCategoriesIntoSelect() {
    if (!categorySelect) return;
    try {
      const categories = await CategoryApi.list();
      let html = '<option value="">-- Chọn danh mục sản phẩm (Tùy chọn) --</option>';
      categories.forEach(cat => {
        html += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
      });
      categorySelect.innerHTML = html;
    } catch (err) {
      console.warn('Không thể tải danh sách danh mục cho form:', err);
    }
  }

  /**
   * Thiết lập giao diện theo chế độ Thêm mới hoặc Chỉnh sửa
   */
  async function setupFormMode() {
    await loadCategoriesIntoSelect();

    if (mode === 'edit') {
      if (!productId || !/^[1-9]\d*$/.test(productId)) {
        if (formLoadingState) formLoadingState.classList.add('d-none');
        if (formContentBody) formContentBody.classList.add('d-none');
        showFormAlert('danger', 'ID sản phẩm không hợp lệ hoặc thiếu tham số trên URL.');
        return;
      }

      // Đặt tiêu đề
      if (formTitle) formTitle.textContent = 'Chỉnh sửa sản phẩm';
      if (formSubtitle) formSubtitle.textContent = `Đang tải thông tin sản phẩm #${productId}...`;
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Chỉnh sửa sản phẩm';
      if (modeBadge) {
        modeBadge.className = 'badge bg-warning text-dark border border-warning-subtle d-none d-md-inline-block';
        modeBadge.textContent = 'Chế độ Chỉnh sửa';
      }
      if (submitText) submitText.textContent = 'Cập nhật sản phẩm';
      if (submitIcon) submitIcon.className = 'bi bi-check-lg me-1';

      // Chuyển sang loading state
      if (formLoadingState) formLoadingState.classList.remove('d-none');
      if (formContentBody) formContentBody.classList.add('d-none');

      try {
        const prod = await ProductApi.getById(productId);
        initialData = prod;

        // Điền dữ liệu thật
        if (skuInput) skuInput.value = prod.sku || '';
        if (nameInput) nameInput.value = prod.name || '';
        if (categorySelect) categorySelect.value = prod.category_id || '';
        if (priceInput) priceInput.value = prod.price !== undefined ? prod.price : 0;
        if (minStockInput) minStockInput.value = prod.min_stock !== undefined ? prod.min_stock : 10;
        if (qtyInput) qtyInput.value = prod.quantity !== undefined ? prod.quantity : 0;

        if (formTitle) formTitle.textContent = `Chỉnh sửa sản phẩm: ${prod.name}`;
        if (formSubtitle) {
          formSubtitle.textContent = `Mã SKU: ${prod.sku} • Tồn kho hiện tại: ${prod.quantity} (${prod.category_name || 'Chưa phân loại'})`;
        }

        if (formLoadingState) formLoadingState.classList.add('d-none');
        if (formContentBody) formContentBody.classList.remove('d-none');
      } catch (err) {
        console.error('Lỗi khi tải thông tin sản phẩm:', err);
        if (formLoadingState) formLoadingState.classList.add('d-none');
        showFormAlert('danger', err.message || `Không tìm thấy sản phẩm với ID #${productId}.`);
        if (formContentBody) formContentBody.classList.add('d-none');
      }
    } else {
      // Chế độ Create
      if (formTitle) formTitle.textContent = 'Thêm sản phẩm mới';
      if (formSubtitle) formSubtitle.textContent = 'Điền các thông tin chi tiết dưới đây để thêm mặt hàng vào hệ thống kho';
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Thêm sản phẩm mới';
      if (modeBadge) {
        modeBadge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-none d-md-inline-block';
        modeBadge.textContent = 'Chế độ Thêm mới';
      }
      if (submitText) submitText.textContent = 'Lưu sản phẩm';
      if (submitIcon) submitIcon.className = 'bi bi-floppy me-1';
      if (qtyInput) qtyInput.value = 0; // Tồn kho ban đầu luôn là 0

      if (formLoadingState) formLoadingState.classList.add('d-none');
      if (formContentBody) formContentBody.classList.remove('d-none');
    }
  }

  // Xóa class is-invalid khi người dùng nhập dữ liệu
  [skuInput, nameInput, priceInput, minStockInput].forEach(input => {
    if (input) {
      input.addEventListener('input', function () {
        if (this.classList.contains('is-invalid')) {
          this.classList.remove('is-invalid');
        }
      });
    }
  });

  // Reset Form
  if (resetBtn) {
    resetBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (mode === 'edit' && initialData) {
        if (skuInput) skuInput.value = initialData.sku || '';
        if (nameInput) nameInput.value = initialData.name || '';
        if (categorySelect) categorySelect.value = initialData.category_id || '';
        if (priceInput) priceInput.value = initialData.price !== undefined ? initialData.price : 0;
        if (minStockInput) minStockInput.value = initialData.min_stock !== undefined ? initialData.min_stock : 10;
        if (qtyInput) qtyInput.value = initialData.quantity !== undefined ? initialData.quantity : 0;
      } else {
        if (skuInput) skuInput.value = '';
        if (nameInput) nameInput.value = '';
        if (categorySelect) categorySelect.value = '';
        if (priceInput) priceInput.value = '';
        if (minStockInput) minStockInput.value = '10';
        if (qtyInput) qtyInput.value = '0';
      }
      [skuInput, nameInput, categorySelect, priceInput, minStockInput].forEach(inp => {
        if (inp) inp.classList.remove('is-invalid');
      });
      if (formAlertContainer) formAlertContainer.innerHTML = '';
    });
  }

  /**
   * Đặt trạng thái đang submit form (chống click đúp và hiển thị spinner)
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
      if (submitText) submitText.textContent = mode === 'edit' ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm';
    }
  }

  // Submit Handler
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Xóa lỗi cũ
      [skuInput, nameInput, categorySelect, priceInput, minStockInput].forEach(inp => {
        if (inp) inp.classList.remove('is-invalid');
      });
      if (formAlertContainer) formAlertContainer.innerHTML = '';

      const skuVal = skuInput ? skuInput.value.trim() : '';
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const catVal = categorySelect && categorySelect.value ? parseInt(categorySelect.value, 10) : null;
      const priceRaw = priceInput ? priceInput.value.trim() : '';
      const minStockRaw = minStockInput ? minStockInput.value.trim() : '';

      // Validate Client-Side
      let hasError = false;

      // 1. Validate SKU
      if (!skuVal) {
        if (skuInput) skuInput.classList.add('is-invalid');
        if (skuError) skuError.textContent = 'Mã SKU là bắt buộc và không được để trống.';
        hasError = true;
      } else if (skuVal.length > 50) {
        if (skuInput) skuInput.classList.add('is-invalid');
        if (skuError) skuError.textContent = 'Mã SKU không được vượt quá 50 ký tự.';
        hasError = true;
      }

      // 2. Validate Name
      if (!nameVal) {
        if (nameInput) nameInput.classList.add('is-invalid');
        if (nameError) nameError.textContent = 'Tên sản phẩm là bắt buộc và không được để trống.';
        hasError = true;
      } else if (nameVal.length > 150) {
        if (nameInput) nameInput.classList.add('is-invalid');
        if (nameError) nameError.textContent = 'Tên sản phẩm không được vượt quá 150 ký tự.';
        hasError = true;
      }

      // 3. Validate Price
      const priceVal = Number(priceRaw);
      if (priceRaw === '' || isNaN(priceVal) || priceVal < 0) {
        if (priceInput) priceInput.classList.add('is-invalid');
        if (priceError) priceError.textContent = 'Giá sản phẩm phải là số hợp lệ không âm (≥ 0).';
        hasError = true;
      }

      // 4. Validate Min Stock
      const minStockVal = Number(minStockRaw);
      if (minStockRaw === '' || isNaN(minStockVal) || !Number.isInteger(minStockVal) || minStockVal < 0) {
        if (minStockInput) minStockInput.classList.add('is-invalid');
        if (minStockError) minStockError.textContent = 'Mức tồn tối thiểu phải là số nguyên không âm (≥ 0).';
        hasError = true;
      }

      if (hasError) {
        // Focus vào ô lỗi đầu tiên
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Chuẩn bị payload (TUYỆT ĐỐI KHÔNG GỬI quantity để bảo toàn kiến trúc Inventory)
      const payload = {
        sku: skuVal,
        name: nameVal,
        category_id: catVal,
        price: priceVal,
        min_stock: minStockVal,
      };

      setSubmittingState(true);

      try {
        if (mode === 'edit') {
          await ProductApi.update(productId, payload);
          showToast(`Cập nhật sản phẩm "${nameVal}" (${skuVal}) thành công!`, true);
          showFormAlert('success', `Cập nhật sản phẩm "${nameVal}" thành công! Đang chuyển hướng về danh sách...`);
        } else {
          await ProductApi.create(payload);
          showToast(`Thêm mới sản phẩm "${nameVal}" (${skuVal}) thành công!`, true);
          showFormAlert('success', `Tạo sản phẩm "${nameVal}" thành công! Đang chuyển hướng về danh sách...`);
        }

        // Chuyển hướng sau 1.2s
        setTimeout(() => {
          window.location.href = '/products.html';
        }, 1200);
      } catch (err) {
        console.error('Lỗi khi lưu sản phẩm:', err);
        setSubmittingState(false);

        // Xử lý lỗi 409 Trùng SKU
        if (err.status === 409 || err.code === 'DUPLICATE_ENTRY') {
          if (skuInput) skuInput.classList.add('is-invalid');
          if (skuError) skuError.textContent = err.message || `Mã SKU '${skuVal}' đã tồn tại trong hệ thống.`;
          showFormAlert('danger', err.message || `Mã SKU '${skuVal}' đã tồn tại. Vui lòng chọn mã SKU khác.`);
          if (skuInput) skuInput.focus();
          return;
        }

        // Xử lý lỗi 404 Không tìm thấy danh mục
        if (err.status === 404) {
          if (err.message && err.message.toLowerCase().includes('danh mục')) {
            if (categorySelect) categorySelect.classList.add('is-invalid');
            if (categoryError) categoryError.textContent = err.message;
          }
          showFormAlert('danger', err.message || 'Không tìm thấy dữ liệu tham chiếu.');
          return;
        }

        // Xử lý lỗi 400 Bad Request
        if (err.status === 400) {
          showFormAlert('danger', err.message || 'Dữ liệu sản phẩm không hợp lệ. Vui lòng kiểm tra lại.');
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
