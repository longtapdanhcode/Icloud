/**
 * Cloud Inventory - Products UI Interactive Handlers
 * Phạm vi: Người 1 (Products)
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

  // --- PRODUCT LIST PAGE LOGIC ---
  const productTableBody = document.getElementById('productTableBody');
  if (productTableBody) {
    initProductListPage(mock);
  }

  // --- PRODUCT FORM PAGE LOGIC ---
  const productForm = document.getElementById('productForm');
  if (productForm) {
    initProductFormPage(mock);
  }
});

function initProductListPage(mock) {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const stockFilter = document.getElementById('stockFilter');
  const sortSelect = document.getElementById('sortSelect');
  const resultCount = document.getElementById('resultCount');

  // Update Stats
  const stats = mock.getStats();
  const elTotal = document.getElementById('statTotalProducts');
  const elLow = document.getElementById('statLowStock');
  const elOut = document.getElementById('statOutOfStock');
  const elValue = document.getElementById('statInventoryValue');

  if (elTotal) elTotal.textContent = stats.totalProducts;
  if (elLow) elLow.textContent = stats.lowStockCount;
  if (elOut) elOut.textContent = stats.outOfStockCount;
  if (elValue) elValue.textContent = mock.formatCurrency(stats.totalInventoryValue);

  // Populate Category Filter
  if (categoryFilter) {
    categoryFilter.innerHTML = '<option value="">-- Tất cả danh mục --</option>';
    mock.categories.forEach(cat => {
      categoryFilter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  }

  function renderTable() {
    const tableBody = document.getElementById('productTableBody');
    if (!tableBody) return;

    let items = [...mock.products];

    // Filter by search
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
      items = items.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    }

    // Filter by category
    const selectedCat = categoryFilter ? categoryFilter.value : '';
    if (selectedCat) {
      items = items.filter(p => String(p.category_id) === String(selectedCat));
    }

    // Filter by stock
    const selectedStock = stockFilter ? stockFilter.value : '';
    if (selectedStock === 'LOW') {
      items = items.filter(p => p.quantity > 0 && p.quantity <= p.min_stock);
    } else if (selectedStock === 'OUT') {
      items = items.filter(p => p.quantity === 0);
    } else if (selectedStock === 'OK') {
      items = items.filter(p => p.quantity > p.min_stock);
    }

    // Sort
    const sortVal = sortSelect ? sortSelect.value : 'id_desc';
    if (sortVal === 'price_asc') items.sort((a, b) => a.price - b.price);
    if (sortVal === 'price_desc') items.sort((a, b) => b.price - a.price);
    if (sortVal === 'qty_asc') items.sort((a, b) => a.quantity - b.quantity);
    if (sortVal === 'qty_desc') items.sort((a, b) => b.quantity - a.quantity);
    if (sortVal === 'name_asc') items.sort((a, b) => a.name.localeCompare(b.name));

    if (resultCount) resultCount.textContent = items.length;

    if (items.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-secondary">
            <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
            Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = items.map((p, idx) => {
      let statusBadge = '';
      if (p.quantity === 0) {
        statusBadge = '<span class="badge-stock-out"><i class="bi bi-x-circle-fill"></i> Hết hàng</span>';
      } else if (p.quantity <= p.min_stock) {
        statusBadge = `<span class="badge-stock-low" title="Tồn kho ≤ mức tối thiểu (${p.min_stock})"><i class="bi bi-exclamation-triangle-fill"></i> Tồn thấp</span>`;
      } else {
        statusBadge = '<span class="badge-stock-ok"><i class="bi bi-check-circle-fill"></i> Đủ tồn</span>';
      }

      return `
        <tr>
          <td class="text-secondary small">${idx + 1}</td>
          <td><span class="badge bg-light text-dark font-monospace border">${p.sku}</span></td>
          <td>
            <div class="fw-semibold text-dark">${p.name}</div>
            <div class="small text-muted d-block d-md-none">${p.category_name}</div>
          </td>
          <td><span class="badge-category">${p.category_name}</span></td>
          <td class="fw-bold text-end">${mock.formatCurrency(p.price)}</td>
          <td class="text-center">
            <span class="fw-bold ${p.quantity <= p.min_stock ? 'text-danger' : 'text-dark'}">${mock.formatNumber(p.quantity)}</span>
            <span class="text-muted small">/ min ${p.min_stock}</span>
          </td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <a href="product-form.html?mode=edit&id=${p.id}" class="btn-action-icon" title="Chỉnh sửa sản phẩm (mẫu)">
                <i class="bi bi-pencil"></i>
              </a>
              <button type="button" class="btn-action-icon danger" onclick="showDemoDeleteModal('${p.sku}', '${p.name}')" title="Xóa sản phẩm (mẫu)">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (searchInput) searchInput.addEventListener('input', renderTable);
  if (categoryFilter) categoryFilter.addEventListener('change', renderTable);
  if (stockFilter) stockFilter.addEventListener('change', renderTable);
  if (sortSelect) sortSelect.addEventListener('change', renderTable);

  renderTable();
}

function initProductFormPage(mock) {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create';
  const productId = parseInt(urlParams.get('id') || '1', 10);

  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const submitBtn = document.getElementById('submitBtn');
  const categorySelect = document.getElementById('productCategory');
  const modeBadge = document.getElementById('modeBadge');

  // Populate categories in select
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">-- Chọn danh mục sản phẩm --</option>';
    mock.categories.forEach(cat => {
      categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  }

  // Handle Edit mode
  if (mode === 'edit') {
    const product = mock.products.find(p => p.id === productId) || mock.products[0];
    if (formTitle) formTitle.textContent = `Chỉnh sửa sản phẩm: ${product.name}`;
    if (formSubtitle) formSubtitle.textContent = `Mã SKU: ${product.sku} (Dữ liệu mẫu demo giao diện)`;
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Chỉnh sửa sản phẩm';
    if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Cập nhật sản phẩm (Demo)';
    if (modeBadge) {
      modeBadge.className = 'badge bg-warning text-dark';
      modeBadge.textContent = 'Chế độ Chỉnh sửa (Demo)';
    }

    // Fill form fields
    const skuInput = document.getElementById('productSku');
    const nameInput = document.getElementById('productName');
    const priceInput = document.getElementById('productPrice');
    const qtyInput = document.getElementById('productQuantity');
    const minStockInput = document.getElementById('productMinStock');
    const descInput = document.getElementById('productDesc');

    if (skuInput) skuInput.value = product.sku;
    if (nameInput) nameInput.value = product.name;
    if (categorySelect) categorySelect.value = product.category_id;
    if (priceInput) priceInput.value = product.price;
    if (qtyInput) qtyInput.value = product.quantity;
    if (minStockInput) minStockInput.value = product.min_stock;
    if (descInput) descInput.value = `Mô tả mẫu cho sản phẩm ${product.name}. Định vị trong kho theo danh mục ${product.category_name}.`;
  }

  // Demo submit handler
  const form = document.getElementById('productForm');
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

// Global modal trigger helper
window.showDemoDeleteModal = function (sku, name) {
  const modalEl = document.getElementById('deleteDemoModal');
  const targetName = document.getElementById('deleteTargetName');
  if (targetName) targetName.textContent = `${sku} - ${name}`;
  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
};
