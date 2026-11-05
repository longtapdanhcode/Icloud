/**
 * Dashboard - Cloud Inventory
 * Chỉ sử dụng các API helper và Layout component đã có.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let transactionChart = null;

  const numberFormat = new Intl.NumberFormat('vi-VN');
  const currencyFormat = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function showAlert(message, type = 'danger') {
    const alert = $('dashboardAlert');
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
  }

  function hideAlert() {
    const alert = $('dashboardAlert');
    alert.textContent = '';
    alert.className = 'alert d-none';
  }

  function normalizeData(response) {
    // API helper trả toàn bộ JSON response; controller chuẩn thường đặt payload trong data.
    return response?.data ?? response;
  }

  function renderSummary(summary) {
    $('totalProducts').textContent = numberFormat.format(toNumber(summary.total_products));
    $('totalQuantity').textContent = numberFormat.format(toNumber(summary.total_quantity));
    $('totalInventoryValue').textContent = currencyFormat.format(toNumber(summary.total_inventory_value));
    $('totalTransactions').textContent = numberFormat.format(toNumber(summary.total_transactions));
    $('inTransactions').textContent = numberFormat.format(toNumber(summary.in_transactions));
    $('outTransactions').textContent = numberFormat.format(toNumber(summary.out_transactions));
    $('lowStockCount').textContent = numberFormat.format(toNumber(summary.low_stock_count));

    renderTransactionChart(
      toNumber(summary.in_transactions),
      toNumber(summary.out_transactions)
    );
  }

  function renderTransactionChart(inCount, outCount) {
    const canvas = $('transactionChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (transactionChart) transactionChart.destroy();

    transactionChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Nhập kho', 'Xuất kho'],
        datasets: [{
          data: [inCount, outCount],
          backgroundColor: ['#16a34a', '#2563eb'],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${numberFormat.format(context.raw)}`;
              },
            },
          },
        },
      },
    });
  }

  function renderLowStock(products) {
    const tbody = $('lowStockTableBody');
    tbody.innerHTML = '';

    $('lowStockBadge').textContent = `${products.length} sản phẩm`;
    $('lowStockCount').textContent = numberFormat.format(products.length);

    if (products.length === 0) {
      $('lowStockEmpty').classList.remove('d-none');
      $('lowStockTableWrap').classList.add('d-none');
      return;
    }

    $('lowStockEmpty').classList.add('d-none');
    $('lowStockTableWrap').classList.remove('d-none');

    products.forEach((product) => {
      const quantity = toNumber(product.quantity);
      const minStock = toNumber(product.min_stock);
      const deficit = product.stock_deficit !== undefined
        ? toNumber(product.stock_deficit)
        : Math.max(0, minStock - quantity);

      const row = document.createElement('tr');
      const values = [
        product.name || product.product_name || 'Không rõ tên',
        product.category_name || 'Chưa phân loại',
        numberFormat.format(quantity),
        numberFormat.format(minStock),
        numberFormat.format(deficit),
      ];

      values.forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 0) cell.className = 'product-name';
        if (index >= 2) cell.classList.add('text-end');
        row.appendChild(cell);
      });

      const statusCell = document.createElement('td');
      statusCell.className = 'text-center';
      const badge = document.createElement('span');
      badge.className = quantity === 0
        ? 'badge text-bg-danger'
        : 'badge text-bg-warning';
      badge.textContent = quantity === 0 ? 'Hết hàng' : 'Tồn thấp';
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      tbody.appendChild(row);
    });
  }

  async function loadDashboard() {
    hideAlert();
    $('dashboardLoading').classList.remove('d-none');
    $('dashboardContent').classList.add('d-none');

    try {
      const [summaryResponse, lowStockResponse] = await Promise.all([
        Api.request('/api/dashboard/summary'),
        Api.request('/api/dashboard/low-stock'),
      ]);

      const summary = normalizeData(summaryResponse);
      const lowStockData = normalizeData(lowStockResponse);
      const products = Array.isArray(lowStockData)
        ? lowStockData
        : (lowStockData?.products || lowStockData?.items || []);

      if (!summary || typeof summary !== 'object') {
        throw new Error('API summary không trả về dữ liệu hợp lệ.');
      }

      renderSummary(summary);
      renderLowStock(products);
      $('lastUpdated').textContent = `Cập nhật lúc: ${new Date().toLocaleString('vi-VN')}`;
      $('dashboardContent').classList.remove('d-none');
    } catch (error) {
      console.error('Không thể tải Dashboard:', error);
      showAlert(error.message || 'Không thể tải dữ liệu Dashboard.');
    } finally {
      $('dashboardLoading').classList.add('d-none');
    }
  }

  async function initDashboard() {
    try {
      if (!window.Api || !window.Layout) {
        throw new Error('Thiếu Api hoặc Layout. Vui lòng kiểm tra các script dùng chung.');
      }

      const user = await Api.requireLogin({ roles: ['ADMIN', 'STAFF'] });
      Layout.render({ active: 'dashboard', user });
      $('btnRefreshDashboard').addEventListener('click', loadDashboard);
      await loadDashboard();
    } catch (error) {
      // requireLogin tự chuyển về trang đăng nhập nếu chưa có token/401.
      console.error('Khởi tạo Dashboard thất bại:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', initDashboard);
})();
