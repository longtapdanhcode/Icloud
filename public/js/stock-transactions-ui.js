
(() => {
    'use strict';
  
    const API = window.Api;
  
    const state = {
      user: null,
      products: [],
      suppliers: [],
      transactions: [],
      page: 1,
      limit: 10,
      total: 0,
      loading: false,
    };
  
    const $ = (id) => document.getElementById(id);
  
    const transactionModal = () =>
      bootstrap.Modal.getOrCreateInstance($('transaction-modal'));
  
    const detailModal = () =>
      bootstrap.Modal.getOrCreateInstance($('detail-modal'));
  
    // =========================
    // UTILITIES
    // =========================
  
    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char]);
    }
  
    function formatMoney(value) {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(Number(value) || 0);
    }
  
    function formatDate(value) {
      if (!value) return '--';
  
      const date = new Date(value);
  
      if (Number.isNaN(date.getTime())) return '--';
  
      return date.toLocaleString('vi-VN');
    }
  
    function showToast(message, type = 'success') {
      const oldToast = $('app-toast');
      if (oldToast) oldToast.remove();
  
      const color = type === 'success' ? 'success' : 'danger';
  
      const wrapper = document.createElement('div');
      wrapper.id = 'app-toast';
      wrapper.className = `alert alert-${color} shadow position-fixed top-0 end-0 m-3`;
      wrapper.style.zIndex = '2000';
      wrapper.textContent = message;
  
      document.body.appendChild(wrapper);
  
      setTimeout(() => wrapper.remove(), 3500);
    }
  
    function getData(result) {
      return Array.isArray(result?.data) ? result.data : [];
    }
  
    function getErrorMessage(error) {
      return error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  
    // =========================
    // LOAD PRODUCTS & SUPPLIERS
    // =========================
  
    async function loadProducts() {
      const result = await API.request('/api/products?page=1&limit=100');
  
      state.products = getData(result);
  
      $('filter-product').innerHTML =
        '<option value="">Tất cả sản phẩm</option>' +
        state.products.map((product) => `
          <option value="${product.id}">
            ${escapeHtml(product.name)} (${escapeHtml(product.sku)})
          </option>
        `).join('');
    }
  
    async function loadSuppliers() {
      const result = await API.request('/api/suppliers?page=1&limit=100');
  
      state.suppliers = getData(result);
  
      $('transaction-supplier').innerHTML =
        '<option value="">Chọn nhà cung cấp</option>' +
        state.suppliers.map((supplier) => `
          <option value="${supplier.id}">
            ${escapeHtml(supplier.name)}
          </option>
        `).join('');
    }
  
    // =========================
    // TRANSACTION HISTORY
    // =========================
  
    async function loadTransactions() {
      if (state.loading) return;
  
      state.loading = true;
  
      const tbody = $('transaction-table-body');
  
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary"></div>
            Đang tải dữ liệu...
          </td>
        </tr>
      `;
  
      try {
        const params = new URLSearchParams({
          page: String(state.page),
          limit: String(state.limit),
        });
  
        const type = $('filter-type').value;
        const productId = $('filter-product').value;
        const from = $('filter-from').value;
        const to = $('filter-to').value;
  
        if (type) params.set('type', type);
        if (productId) params.set('product_id', productId);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
  
        const result = await API.request(
          `/api/stock-transactions?${params.toString()}`
        );
  
        state.transactions = getData(result);
        state.total = Number(result.meta?.total || 0);
  
        renderTransactions();
        renderStatistics();
  
        const totalPages = Number(result.meta?.totalPages || 0);
  
        $('pagination-info').textContent =
          state.total > 0
            ? `Trang ${state.page}/${totalPages} · Tổng ${state.total} giao dịch`
            : 'Không có giao dịch nào';
  
        $('btn-prev').disabled = state.page <= 1;
        $('btn-next').disabled =
          totalPages === 0 || state.page >= totalPages;
  
      } catch (error) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-danger py-4">
              ${escapeHtml(getErrorMessage(error))}
            </td>
          </tr>
        `;
  
        showToast(getErrorMessage(error), 'error');
      } finally {
        state.loading = false;
      }
    }
  
    function renderTransactions() {
      const tbody = $('transaction-table-body');
  
      if (!state.transactions.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-muted py-4">
              Chưa có giao dịch kho nào.
            </td>
          </tr>
        `;
        return;
      }
  
      tbody.innerHTML = state.transactions.map((item) => {
        const isIn = item.type === 'IN';
  
        return `
          <tr>
            <td class="fw-bold">#${item.id}</td>
  
            <td>
              <span class="badge ${isIn ? 'bg-success' : 'bg-primary'}">
                ${isIn ? 'Nhập kho' : 'Xuất kho'}
              </span>
            </td>
  
            <td>
              ${isIn
                ? escapeHtml(item.supplier_name || 'Không xác định')
                : '<span class="text-muted">Không áp dụng</span>'}
            </td>
  
            <td>${escapeHtml(item.created_by_name || `#${item.created_by}`)}</td>
  
            <td>${escapeHtml(formatDate(item.created_at))}</td>
  
            <td>${escapeHtml(item.note || '--')}</td>
  
            <td class="text-center">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary btn-detail"
                data-id="${item.id}"
                title="Xem chi tiết"
                aria-label="Xem chi tiết phiếu #${item.id}"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  
    function renderStatistics() {
      $('stat-total').textContent = state.total;
  
      const inCount = state.transactions.filter(
        (item) => item.type === 'IN'
      ).length;
  
      const outCount = state.transactions.filter(
        (item) => item.type === 'OUT'
      ).length;
  
      $('stat-in').textContent = inCount;
      $('stat-out').textContent = outCount;
    }
  
    // =========================
    // CREATE TRANSACTION
    // =========================
  
    function openTransactionModal(type) {
      $('transaction-form').reset();
  
      $('transaction-type').value = type;
  
      const isIn = type === 'IN';
  
      $('transaction-modal-title').textContent =
        isIn ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho';
  
      $('supplier-field').classList.toggle('d-none', !isIn);
  
      $('transaction-hint').textContent = isIn
        ? 'Phiếu nhập sẽ làm tăng số lượng tồn kho.'
        : 'Phiếu xuất sẽ làm giảm số lượng tồn kho. Không thể xuất vượt quá số lượng hiện có.';
  
      $('transaction-items-body').innerHTML = '';
  
      addTransactionItem();
  
      updateTransactionTotal();
  
      transactionModal().show();
    }
  
    function addTransactionItem() {
      const tbody = $('transaction-items-body');
  
      const row = document.createElement('tr');
  
      const options = state.products.map((product) => `
        <option value="${product.id}">
          ${escapeHtml(product.name)}
          (${escapeHtml(product.sku)})
          - Tồn: ${Number(product.quantity || 0)}
        </option>
      `).join('');
  
      row.innerHTML = `
        <td>
          <select class="form-select item-product" required>
            <option value="">Chọn sản phẩm</option>
            ${options}
          </select>
        </td>
  
        <td>
          <input
            type="number"
            class="form-control item-quantity"
            min="1"
            step="1"
            value="1"
            required
          >
        </td>
  
        <td>
          <input
            type="number"
            class="form-control item-price"
            min="0"
            step="1"
            value="0"
            required
          >
        </td>
  
        <td class="item-subtotal fw-semibold">0 ₫</td>
  
        <td class="text-center">
          <button
            type="button"
            class="btn btn-outline-danger btn-sm btn-remove-item"
            title="Xóa sản phẩm"
          >
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
  
      tbody.appendChild(row);
  
      row.querySelectorAll('input, select').forEach((input) => {
        input.addEventListener('input', updateTransactionTotal);
        input.addEventListener('change', updateTransactionTotal);
      });
  
      row.querySelector('.btn-remove-item').addEventListener('click', () => {
        if (tbody.children.length <= 1) {
          showToast('Phiếu phải có ít nhất một sản phẩm.', 'error');
          return;
        }
  
        row.remove();
        updateTransactionTotal();
      });
    }
  
    function updateTransactionTotal() {
      let total = 0;
  
      document.querySelectorAll('#transaction-items-body tr').forEach((row) => {
        const quantity = Number(
          row.querySelector('.item-quantity').value
        ) || 0;
  
        const price = Number(
          row.querySelector('.item-price').value
        ) || 0;
  
        const subtotal = quantity * price;
  
        row.querySelector('.item-subtotal').textContent =
          formatMoney(subtotal);
  
        total += subtotal;
      });
  
      $('transaction-total').textContent = formatMoney(total);
    }
  
    function collectTransactionPayload() {
      const type = $('transaction-type').value;
  
      const items = [];
  
      document.querySelectorAll('#transaction-items-body tr').forEach((row) => {
        items.push({
          product_id: Number(row.querySelector('.item-product').value),
          quantity: Number(row.querySelector('.item-quantity').value),
          unit_price: Number(row.querySelector('.item-price').value),
        });
      });
  
      if (!items.length) {
        throw new Error('Vui lòng thêm ít nhất một sản phẩm.');
      }
  
      const productIds = items.map((item) => item.product_id);
  
      if (items.some((item) => !Number.isInteger(item.product_id) || item.product_id <= 0)) {
        throw new Error('Vui lòng chọn đầy đủ sản phẩm.');
      }
  
      if (new Set(productIds).size !== productIds.length) {
        throw new Error('Không được chọn trùng sản phẩm trong cùng một phiếu.');
      }
  
      if (items.some((item) =>
        !Number.isInteger(item.quantity) || item.quantity <= 0
      )) {
        throw new Error('Số lượng phải là số nguyên lớn hơn 0.');
      }
  
      if (items.some((item) =>
        !Number.isFinite(item.unit_price) || item.unit_price < 0
      )) {
        throw new Error('Đơn giá không hợp lệ.');
      }
  
      const payload = {
        type,
        note: $('transaction-note').value.trim(),
        items,
      };
  
      if (type === 'IN') {
        const supplierId = Number($('transaction-supplier').value);
  
        if (!Number.isInteger(supplierId) || supplierId <= 0) {
          throw new Error('Vui lòng chọn nhà cung cấp.');
        }
  
        payload.supplier_id = supplierId;
      }
  
      return payload;
    }
  
    async function submitTransaction() {
      const button = $('btn-submit-transaction');
  
      try {
        const payload = collectTransactionPayload();
  
        button.disabled = true;
        button.innerHTML = `
          <span class="spinner-border spinner-border-sm me-1"></span>
          Đang lưu...
        `;
  
        await API.request('/api/stock-transactions', {
          method: 'POST',
          body: payload,
        });
  
        transactionModal().hide();
  
        showToast(
          payload.type === 'IN'
            ? 'Tạo phiếu nhập kho thành công!'
            : 'Tạo phiếu xuất kho thành công!'
        );
  
        // Tải lại sản phẩm để cập nhật số lượng tồn kho hiển thị.
        await loadProducts();
  
        state.page = 1;
        await loadTransactions();
  
      } catch (error) {
        showToast(getErrorMessage(error), 'error');
      } finally {
        button.disabled = false;
        button.innerHTML = `
          <i class="bi bi-check-circle me-1"></i>
          Lưu phiếu
        `;
      }
    }
  
    // =========================
    // TRANSACTION DETAIL
    // =========================
  
    async function showTransactionDetail(id) {
      $('transaction-detail-body').innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary"></div>
          <p class="mt-2">Đang tải chi tiết...</p>
        </div>
      `;
  
      detailModal().show();
  
      // Danh sách hiện tại đã chứa items từ API.
      const transaction = state.transactions.find(
        (item) => Number(item.id) === Number(id)
      );
  
      if (!transaction) {
        $('transaction-detail-body').innerHTML =
          '<div class="alert alert-warning">Không tìm thấy phiếu kho.</div>';
        return;
      }
  
      const isIn = transaction.type === 'IN';
  
      const itemsHtml = (transaction.items || []).map((item) => `
        <tr>
          <td>${escapeHtml(item.product_name || `#${item.product_id}`)}</td>
          <td class="text-center">${Number(item.quantity)}</td>
          <td class="text-end">${formatMoney(item.unit_price)}</td>
          <td class="text-end">
            ${formatMoney(Number(item.quantity) * Number(item.unit_price))}
          </td>
        </tr>
      `).join('');
  
      const total = (transaction.items || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity) * Number(item.unit_price),
        0
      );
  
      $('transaction-detail-body').innerHTML = `
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="text-muted small">Mã phiếu</div>
            <div class="fw-bold">#${transaction.id}</div>
          </div>
  
          <div class="col-md-6">
            <div class="text-muted small">Loại giao dịch</div>
            <span class="badge ${isIn ? 'bg-success' : 'bg-primary'}">
              ${isIn ? 'Nhập kho' : 'Xuất kho'}
            </span>
          </div>
  
          <div class="col-md-6">
            <div class="text-muted small">Nhà cung cấp</div>
            <div>${isIn
              ? escapeHtml(transaction.supplier_name || '--')
              : 'Không áp dụng'}</div>
          </div>
  
          <div class="col-md-6">
            <div class="text-muted small">Người tạo</div>
            <div>${escapeHtml(transaction.created_by_name || `#${transaction.created_by}`)}</div>
          </div>
  
          <div class="col-md-6">
            <div class="text-muted small">Ngày tạo</div>
            <div>${escapeHtml(formatDate(transaction.created_at))}</div>
          </div>
  
          <div class="col-md-6">
            <div class="text-muted small">Ghi chú</div>
            <div>${escapeHtml(transaction.note || '--')}</div>
          </div>
        </div>
  
        <h6 class="fw-bold mb-3">Sản phẩm trong phiếu</h6>
  
        <div class="table-responsive">
          <table class="table table-bordered align-middle">
            <thead class="table-light">
              <tr>
                <th>Sản phẩm</th>
                <th class="text-center">Số lượng</th>
                <th class="text-end">Đơn giá</th>
                <th class="text-end">Thành tiền</th>
              </tr>
            </thead>
  
            <tbody>
              ${itemsHtml || `
                <tr>
                  <td colspan="4" class="text-center text-muted">
                    Không có sản phẩm.
                  </td>
                </tr>
              `}
            </tbody>
  
            <tfoot>
              <tr>
                <th colspan="3" class="text-end">Tổng tiền</th>
                <th class="text-end text-primary">${formatMoney(total)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }
  
    // =========================
    // EVENTS
    // =========================
  
    function bindEvents() {
      $('btn-create-in').addEventListener('click', () => {
        openTransactionModal('IN');
      });
  
      $('btn-create-out').addEventListener('click', () => {
        openTransactionModal('OUT');
      });
  
      $('btn-add-item').addEventListener('click', addTransactionItem);
  
      $('btn-submit-transaction').addEventListener(
        'click',
        submitTransaction
      );
  
      $('btn-refresh').addEventListener('click', async () => {
        state.page = 1;
        await loadTransactions();
      });
  
      $('btn-filter').addEventListener('click', async () => {
        const from = $('filter-from').value;
        const to = $('filter-to').value;
  
        if (from && to && from > to) {
          showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc.', 'error');
          return;
        }
  
        state.page = 1;
        await loadTransactions();
      });
  
      $('btn-prev').addEventListener('click', async () => {
        if (state.page <= 1) return;
  
        state.page--;
        await loadTransactions();
      });
  
      $('btn-next').addEventListener('click', async () => {
        const totalPages = Math.ceil(state.total / state.limit);
  
        if (state.page >= totalPages) return;
  
        state.page++;
        await loadTransactions();
      });
  
      $('transaction-table-body').addEventListener('click', (event) => {
        const button = event.target.closest('.btn-detail');
  
        if (button) {
          showTransactionDetail(Number(button.dataset.id));
        }
      });
    }
  
    // =========================
    // INITIALIZATION
    // =========================
  
    async function init() {
      try {
        state.user = await API.requireLogin({
          roles: ['ADMIN', 'STAFF'],
        });
      } catch {
        return; // Tự động chuyển hướng về trang đăng nhập
      }

      try {
        Layout.render({
          active: 'stock-transactions',
          user: state.user,
        });
  
        bindEvents();
  
        await Promise.all([
          loadProducts(),
          loadSuppliers(),
        ]);
  
        await loadTransactions();
  
      } catch (error) {
        console.error('[StockTransactions]', error);
        showToast(getErrorMessage(error), 'error');
      }
    }
  
    document.addEventListener('DOMContentLoaded', init);
  })();
  