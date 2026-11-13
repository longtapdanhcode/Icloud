
/**
 * Cloud Inventory - Suppliers UI
 * Quản lý nhà cung cấp: tìm kiếm, phân trang, CRUD và phân quyền.
 */

const SupplierApi = {
    async list({ page = 1, limit = 10, search = '' } = {}, signal = null) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });
  
      return window.Api.request(`/api/suppliers?${params.toString()}`, { signal });
    },
  
    async create(data) {
      return window.Api.request('/api/suppliers', {
        method: 'POST',
        body: data,
      });
    },
  
    async update(id, data) {
      return window.Api.request(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
  
    async delete(id) {
      return window.Api.request(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });
    },
  };
  
  // Escape dữ liệu trước khi đưa vào HTML.
  function escapeSupplierHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }
  
  function showSupplierToast(message, type = 'success') {
    const toastEl = document.getElementById('appToast');
    const messageEl = document.getElementById('appToastMessage');
    const bodyEl = document.getElementById('appToastBody');
  
    if (!toastEl || !messageEl || !bodyEl) return;
  
    const isSuccess = type === 'success';
  
    toastEl.className = `toast align-items-center text-bg-${isSuccess ? 'success' : 'danger'} border-0`;
    bodyEl.innerHTML = `
      <i class="bi ${isSuccess ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'} me-2"></i>
      <span id="appToastMessage">${escapeSupplierHtml(message)}</span>
    `;
  
    bootstrap.Toast.getOrCreateInstance(toastEl, {
      delay: 3000,
    }).show();
  }
  
  document.addEventListener('DOMContentLoaded', async () => {
    let currentUser;
  
    // 1. Xác thực người dùng.
    try {
      currentUser = await window.Api.requireLogin({
        roles: ['ADMIN', 'STAFF'],
      });
    } catch (error) {
      console.error('Không thể xác thực:', error);
      return;
    }
  
    // 2. Render Sidebar và Navbar.
    window.Layout.render({
      active: 'suppliers',
      user: currentUser,
    });
  
    // 3. Khởi tạo trang.
    initSuppliersPage(currentUser);
  });
  
  function initSuppliersPage(currentUser) {
    const isAdmin = currentUser.role === 'ADMIN';
  
    // DOM elements
    const tableBody = document.getElementById('supplierTableBody');
    const tableContainer = document.getElementById('supplierTableContainer');
    const loadingState = document.getElementById('supplierLoadingState');
    const errorState = document.getElementById('supplierErrorState');
    const errorMessage = document.getElementById('supplierErrorMessage');
    const emptyState = document.getElementById('supplierEmptyState');
  
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const limitSelect = document.getElementById('limitSelect');
    const refreshBtn = document.getElementById('btnRefreshSuppliers');
  
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationSummary = document.getElementById('paginationSummary');
    const paginationNav = document.getElementById('paginationNav');
  
    const statTotal = document.getElementById('statTotalSuppliers');
    const statVisible = document.getElementById('statVisibleSuppliers');
    const roleLabel = document.getElementById('currentUserRole');
  
    // Modal elements
    const supplierModalEl = document.getElementById('supplierModal');
    const supplierModal = bootstrap.Modal.getOrCreateInstance(supplierModalEl);
  
    const deleteModalEl = document.getElementById('deleteSupplierModal');
    const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
  
    const supplierForm = document.getElementById('supplierForm');
    const supplierIdInput = document.getElementById('supplierId');
    const supplierNameInput = document.getElementById('supplierName');
    const supplierPhoneInput = document.getElementById('supplierPhone');
    const supplierEmailInput = document.getElementById('supplierEmail');
    const supplierAddressInput = document.getElementById('supplierAddress');
  
    const formError = document.getElementById('supplierFormError');
    const saveBtn = document.getElementById('btnSaveSupplier');
    const saveSpinner = document.getElementById('supplierSaveSpinner');
    const saveIcon = document.getElementById('supplierSaveIcon');
    const saveText = document.getElementById('supplierSaveText');
  
    const deleteTargetName = document.getElementById('deleteSupplierTargetName');
    const deleteError = document.getElementById('deleteSupplierError');
    const confirmDeleteBtn = document.getElementById('btnConfirmDeleteSupplier');
    const deleteSpinner = document.getElementById('deleteSupplierSpinner');
    const deleteIcon = document.getElementById('deleteSupplierIcon');
    const deleteBtnText = document.getElementById('deleteSupplierBtnText');
  
    // State
    let currentPage = 1;
    let currentLimit = Number(limitSelect.value) || 10;
    let currentSearch = '';
    let totalRecords = 0;
    let pendingDeleteSupplier = null;
    let searchTimer = null;
    let requestController = null;
  
    roleLabel.textContent = currentUser.role;
  
    // STAFF không được thao tác CRUD.
    if (!isAdmin) {
      document.getElementById('btnAddSupplier').classList.add('d-none');
      document.querySelector('#supplierTableContainer th:last-child').classList.add('d-none');
    }
  
    function setLoading(isLoading) {
      loadingState.classList.toggle('d-none', !isLoading);
      tableContainer.classList.toggle('d-none', isLoading);
      emptyState.classList.add('d-none');
      errorState.classList.add('d-none');
      paginationContainer.classList.toggle('d-none', isLoading);
    }
  
    function setFormError(message) {
      formError.textContent = message;
      formError.classList.remove('d-none');
    }
  
    function clearFormError() {
      formError.textContent = '';
      formError.classList.add('d-none');
    }
  
    function setSaveLoading(isLoading) {
      saveBtn.disabled = isLoading;
      saveSpinner.classList.toggle('d-none', !isLoading);
      saveIcon.classList.toggle('d-none', isLoading);
      saveText.textContent = isLoading ? 'Đang lưu...' : 'Lưu nhà cung cấp';
    }
  
    function setDeleteLoading(isLoading) {
      confirmDeleteBtn.disabled = isLoading;
      deleteSpinner.classList.toggle('d-none', !isLoading);
      deleteIcon.classList.toggle('d-none', isLoading);
      deleteBtnText.textContent = isLoading ? 'Đang xóa...' : 'Xác nhận xóa';
    }
  
    function getErrorMessage(error) {
      if (error.code === 'NETWORK_ERROR') {
        return 'Không thể kết nối máy chủ. Vui lòng kiểm tra Backend.';
      }
  
      if (error.status === 403) {
        return 'Bạn không có quyền thực hiện thao tác này.';
      }
  
      if (error.status === 404) {
        return 'Không tìm thấy nhà cung cấp.';
      }
  
      if (error.status === 409) {
        return error.message || 'Dữ liệu đang được sử dụng hoặc bị xung đột.';
      }
  
      return error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  
    // Render table
    function renderTable(suppliers) {
      if (!suppliers.length) {
        tableBody.innerHTML = '';
        tableContainer.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
      }
  
      tableContainer.classList.remove('d-none');
      emptyState.classList.add('d-none');
  
      tableBody.innerHTML = suppliers.map((supplier) => {
        const id = Number(supplier.id);
  
        return `
          <tr>
            <td class="text-muted">#${id}</td>
            <td>
              <div class="fw-semibold">
                ${escapeSupplierHtml(supplier.name)}
              </div>
            </td>
            <td>${escapeSupplierHtml(supplier.phone || '--')}</td>
            <td>${escapeSupplierHtml(supplier.email || '--')}</td>
            <td>
              <span class="text-muted">
                ${escapeSupplierHtml(supplier.address || '--')}
              </span>
            </td>
            ${isAdmin ? `
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <button
                    class="btn btn-outline-primary"
                    type="button"
                    data-action="edit"
                    data-id="${id}"
                    title="Chỉnh sửa"
                    aria-label="Chỉnh sửa nhà cung cấp ${escapeSupplierHtml(supplier.name)}"
                  >
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                  </button>
                  <button
                    class="btn btn-outline-danger"
                    type="button"
                    data-action="delete"
                    data-id="${id}"
                    title="Xóa"
                    aria-label="Xóa nhà cung cấp ${escapeSupplierHtml(supplier.name)}"
                  >
                    <i class="bi bi-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
            ` : ''}
          </tr>
        `;
      }).join('');
    }
  
    // Render pagination.
    function renderPagination(meta) {
      if (totalRecords === 0) {
        paginationSummary.textContent = '';
        paginationNav.innerHTML = '';
        paginationContainer.classList.add('d-none');
        return;
      }

      const totalPages = Math.max(1, Math.ceil(totalRecords / currentLimit));
  
      const start = (currentPage - 1) * currentLimit + 1;
  
      const end = Math.min(currentPage * currentLimit, totalRecords);
  
      paginationSummary.textContent =
        `Hiển thị ${start} - ${end} trong tổng số ${totalRecords} nhà cung cấp`;
  
      paginationNav.innerHTML = '';
      paginationContainer.classList.remove('d-none');
  
      if (totalPages <= 1) return;
  
      const addPage = (page, label, disabled = false, active = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
  
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'page-link';
        button.textContent = label;
        button.disabled = disabled;
  
        button.addEventListener('click', () => {
          if (page === currentPage || page < 1 || page > totalPages) return;
          currentPage = page;
          loadSuppliers();
        });
  
        li.appendChild(button);
        paginationNav.appendChild(li);
      };
  
      addPage(currentPage - 1, '‹', currentPage <= 1);
  
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);
  
      if (startPage > 1) {
        addPage(1, '1');
        if (startPage > 2) {
          const dots = document.createElement('li');
          dots.className = 'page-item disabled';
          dots.innerHTML = '<span class="page-link">...</span>';
          paginationNav.appendChild(dots);
        }
      }
  
      for (let page = startPage; page <= endPage; page++) {
        addPage(page, String(page), false, page === currentPage);
      }
  
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          const dots = document.createElement('li');
          dots.className = 'page-item disabled';
          dots.innerHTML = '<span class="page-link">...</span>';
          paginationNav.appendChild(dots);
        }
        addPage(totalPages, String(totalPages));
      }
  
      addPage(currentPage + 1, '›', currentPage >= totalPages);
    }
  
    // Load supplier list.
    async function loadSuppliers() {
      if (requestController) {
        requestController.abort();
      }
  
      requestController = new AbortController();
      setLoading(true);
  
      try {
        const result = await SupplierApi.list(
          {
            page: currentPage,
            limit: currentLimit,
            search: currentSearch,
          },
          requestController.signal
        );
  
        const suppliers = Array.isArray(result.data)
          ? result.data
          : [];
  
        const meta = result.meta || {};
  
        totalRecords = Number(meta.total ?? suppliers.length);
  
        // Nếu xóa bản ghi cuối cùng của trang, quay lại trang hợp lệ.
        const totalPages = Math.max(1, Math.ceil(totalRecords / currentLimit));
  
        if (currentPage > totalPages) {
          currentPage = totalPages;
          return loadSuppliers();
        }
  
        statTotal.textContent = totalRecords.toLocaleString('vi-VN');
        statVisible.textContent = suppliers.length.toLocaleString('vi-VN');
  
        renderTable(suppliers);
        renderPagination(meta);
  
        loadingState.classList.add('d-none');
        errorState.classList.add('d-none');
  
      } catch (error) {
        if (error.name === 'AbortError') return;
  
        console.error('Lỗi tải nhà cung cấp:', error);
  
        loadingState.classList.add('d-none');
        tableContainer.classList.add('d-none');
        emptyState.classList.add('d-none');
        paginationContainer.classList.add('d-none');
  
        errorMessage.textContent = getErrorMessage(error);
        errorState.classList.remove('d-none');
      }
    }
  
    // Reset form.
    function resetForm() {
      supplierForm.reset();
      supplierIdInput.value = '';
      clearFormError();
      setSaveLoading(false);
    }
  
    // Open add modal.
    function openCreateModal() {
      if (!isAdmin) return;
  
      resetForm();
      document.getElementById('supplierModalTitle').textContent = 'Thêm nhà cung cấp';
      supplierModal.show();
    }
  
    // Open edit modal.
    function openEditModal(supplier) {
      if (!isAdmin) return;
  
      resetForm();
  
      supplierIdInput.value = supplier.id;
      supplierNameInput.value = supplier.name || '';
      supplierPhoneInput.value = supplier.phone || '';
      supplierEmailInput.value = supplier.email || '';
      supplierAddressInput.value = supplier.address || '';
  
      document.getElementById('supplierModalTitle').textContent = 'Cập nhật nhà cung cấp';
      supplierModal.show();
    }
  
    // Save supplier.
    async function saveSupplier(event) {
      event.preventDefault();
  
      if (!isAdmin) return;
  
      clearFormError();
  
      const data = {
        name: supplierNameInput.value.trim(),
        phone: supplierPhoneInput.value.trim() || null,
        email: supplierEmailInput.value.trim() || null,
        address: supplierAddressInput.value.trim() || null,
      };
  
      if (!data.name) {
        setFormError('Tên nhà cung cấp không được để trống.');
        supplierNameInput.focus();
        return;
      }
  
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        setFormError('Email không đúng định dạng.');
        supplierEmailInput.focus();
        return;
      }
  
      const id = supplierIdInput.value;
      setSaveLoading(true);
  
      try {
        if (id) {
          await SupplierApi.update(id, data);
          showSupplierToast('Cập nhật nhà cung cấp thành công!');
        } else {
          await SupplierApi.create(data);
          showSupplierToast('Thêm nhà cung cấp thành công!');
          currentPage = 1;
        }
  
        supplierModal.hide();
        resetForm();
        await loadSuppliers();
  
      } catch (error) {
        console.error('Lỗi lưu nhà cung cấp:', error);
        setFormError(getErrorMessage(error));
      } finally {
        setSaveLoading(false);
      }
    }
  
    // Open delete modal.
    function openDeleteModal(supplier) {
      if (!isAdmin) return;
  
      pendingDeleteSupplier = supplier;
      deleteTargetName.textContent = supplier.name;
      deleteError.classList.add('d-none');
      deleteError.textContent = '';
      setDeleteLoading(false);
  
      deleteModal.show();
    }
  
    // Confirm delete.
    async function deleteSupplier() {
      if (!isAdmin || !pendingDeleteSupplier) return;
  
      setDeleteLoading(true);
      deleteError.classList.add('d-none');
  
      try {
        await SupplierApi.delete(pendingDeleteSupplier.id);
  
        deleteModal.hide();
        showSupplierToast('Xóa nhà cung cấp thành công!');
  
        pendingDeleteSupplier = null;
        await loadSuppliers();
  
      } catch (error) {
        console.error('Lỗi xóa nhà cung cấp:', error);
  
        deleteError.textContent = getErrorMessage(error);
        deleteError.classList.remove('d-none');
  
      } finally {
        setDeleteLoading(false);
      }
    }
  
    // Table action delegation.
    tableBody.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button || !isAdmin) return;
  
      const id = Number(button.dataset.id);
      const action = button.dataset.action;
  
      button.disabled = true;
  
      try {
        // Lấy thông tin chi tiết trước khi sửa.
        const result = await window.Api.request(`/api/suppliers/${id}`);
        const supplier = result.data;
  
        if (!supplier || Number(supplier.id) !== id) {
          throw new Error('Dữ liệu nhà cung cấp không hợp lệ.');
        }
  
        if (action === 'edit') {
          openEditModal(supplier);
        } else if (action === 'delete') {
          openDeleteModal(supplier);
        }
      } catch (error) {
        showSupplierToast(getErrorMessage(error), 'error');
      } finally {
        button.disabled = false;
      }
    });
  
    // Event listeners.
    document.getElementById('btnAddSupplier')
      .addEventListener('click', openCreateModal);
  
    supplierForm.addEventListener('submit', saveSupplier);
  
    confirmDeleteBtn.addEventListener('click', deleteSupplier);
  
    refreshBtn.addEventListener('click', () => {
      loadSuppliers();
    });
  
    document.getElementById('btnRetrySuppliers')
      .addEventListener('click', loadSuppliers);
  
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentSearch = '';
      currentPage = 1;
      loadSuppliers();
    });
  
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
  
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        currentPage = 1;
        loadSuppliers();
      }, 300);
    });
  
    limitSelect.addEventListener('change', () => {
      currentLimit = Number(limitSelect.value) || 10;
      currentPage = 1;
      loadSuppliers();
    });
  
    supplierModalEl.addEventListener('hidden.bs.modal', resetForm);
  
    deleteModalEl.addEventListener('hidden.bs.modal', () => {
      pendingDeleteSupplier = null;
      setDeleteLoading(false);
    });
  
    // Initial load.
    loadSuppliers();
  }
  