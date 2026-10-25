/**
 * Cloud Inventory - Categories UI Interactive Handlers
 * Phạm vi: Người 1 (Categories)
 */

document.addEventListener('DOMContentLoaded', function () {
  const mock = window.CloudInventoryMock;
  if (!mock) return;

  // Initialize mobile sidebar toggle
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

  // --- CATEGORY LIST PAGE LOGIC ---
  const categoryTableBody = document.getElementById('categoryTableBody');
  if (categoryTableBody) {
    initCategoryListPage(mock);
  }

  // --- CATEGORY FORM PAGE LOGIC ---
  const categoryForm = document.getElementById('categoryForm');
  if (categoryForm) {
    initCategoryFormPage(mock);
  }
});

function initCategoryListPage(mock) {
  const searchInput = document.getElementById('categorySearchInput');
  const resultCount = document.getElementById('categoryResultCount');

  // Stats
  const elTotalCat = document.getElementById('statTotalCategories');
  const elTotalProd = document.getElementById('statTotalCatProducts');
  if (elTotalCat) elTotalCat.textContent = mock.categories.length;
  if (elTotalProd) elTotalProd.textContent = mock.products.length;

  function renderTable() {
    const tableBody = document.getElementById('categoryTableBody');
    if (!tableBody) return;

    let items = [...mock.categories];
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
      items = items.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
      );
    }

    if (resultCount) resultCount.textContent = items.length;

    if (items.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-secondary">
            <i class="bi bi-folder-x fs-2 d-block mb-2 text-muted"></i>
            Không tìm thấy danh mục nào phù hợp.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = items.map((cat, idx) => {
      return `
        <tr>
          <td class="text-secondary small">${idx + 1}</td>
          <td><span class="badge bg-light text-dark font-monospace border">CAT-${String(cat.id).padStart(3, '0')}</span></td>
          <td>
            <div class="fw-bold text-dark fs-6">${cat.name}</div>
          </td>
          <td>
            <span class="text-secondary small">${cat.description || '<em class="text-muted">Chưa có mô tả</em>'}</span>
          </td>
          <td class="text-center">
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-semibold">
              <i class="bi bi-box-seam me-1"></i>${cat.product_count} sản phẩm
            </span>
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <a href="category-form.html?mode=edit&id=${cat.id}" class="btn-action-icon" title="Chỉnh sửa danh mục (mẫu)">
                <i class="bi bi-pencil"></i>
              </a>
              <button type="button" class="btn-action-icon danger" onclick="showDemoDeleteCatModal('${cat.name}', ${cat.product_count})" title="Xóa danh mục (mẫu)">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (searchInput) searchInput.addEventListener('input', renderTable);
  renderTable();
}

function initCategoryFormPage(mock) {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create';
  const categoryId = parseInt(urlParams.get('id') || '1', 10);

  const formTitle = document.getElementById('catFormTitle');
  const formSubtitle = document.getElementById('catFormSubtitle');
  const breadcrumbCurrent = document.getElementById('catBreadcrumbCurrent');
  const submitBtn = document.getElementById('catSubmitBtn');
  const modeBadge = document.getElementById('catModeBadge');

  if (mode === 'edit') {
    const category = mock.categories.find(c => c.id === categoryId) || mock.categories[0];
    if (formTitle) formTitle.textContent = `Chỉnh sửa danh mục: ${category.name}`;
    if (formSubtitle) formSubtitle.textContent = `Mã danh mục: CAT-${String(category.id).padStart(3, '0')} (Dữ liệu mẫu demo giao diện)`;
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Chỉnh sửa danh mục';
    if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Cập nhật danh mục (Demo)';
    if (modeBadge) {
      modeBadge.className = 'badge bg-warning text-dark';
      modeBadge.textContent = 'Chế độ Chỉnh sửa (Demo)';
    }

    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    if (nameInput) nameInput.value = category.name;
    if (descInput) descInput.value = category.description;
  }

  const form = document.getElementById('categoryForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const toastEl = document.getElementById('demoToast');
      if (toastEl && window.bootstrap) {
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
      } else {
        alert('Thông báo: Đây là giao diện mẫu Người 1. API CRUD sẽ được hoàn thiện ở bước tiếp theo!');
      }
    });
  }
}

// Global modal trigger helper for category
window.showDemoDeleteCatModal = function (name, productCount) {
  const modalEl = document.getElementById('deleteDemoCatModal');
  const targetName = document.getElementById('deleteCatTargetName');
  const warningText = document.getElementById('deleteCatWarningText');

  if (targetName) targetName.textContent = name;
  if (warningText) {
    if (productCount > 0) {
      warningText.innerHTML = `<span class="text-danger fw-semibold"><i class="bi bi-exclamation-octagon me-1"></i> Lưu ý: Danh mục này đang có ${productCount} sản phẩm liên kết (khóa ngoại FK). Khi triển khai API thật, hệ thống sẽ chặn xóa để bảo toàn dữ liệu.</span>`;
    } else {
      warningText.innerHTML = '<span class="text-muted">Danh mục này hiện chưa có sản phẩm liên kết nào.</span>';
    }
  }

  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
};
