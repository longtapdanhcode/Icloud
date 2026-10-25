/**
 * Cloud Inventory - Mock Data & Utilities for Product & Category Management
 * Phạm vi: Người 1 (Products & Categories)
 * Dữ liệu tĩnh phục vụ thiết kế giao diện (Mock Data - phân biệt rõ với dữ liệu thật từ DB)
 */

window.CloudInventoryMock = {
  isMockData: true,
  moduleAuthor: 'Người 1 (Phụ trách Sản phẩm & Danh mục)',
  noticeMessage: 'Dữ liệu mẫu tĩnh (Mock Data) - Chưa kết nối API CRUD thật',

  // Danh mục mẫu (khớp với seed.js và db/schema.sql)
  categories: [
    {
      id: 1,
      name: 'Đồ uống',
      description: 'Nước ngọt, nước suối, cà phê, trà đóng chai',
      product_count: 3,
      created_at: '2026-10-25 08:30:00'
    },
    {
      id: 2,
      name: 'Bánh kẹo',
      description: 'Bánh, kẹo, snack, đồ ăn vặt đóng gói',
      product_count: 2,
      created_at: '2026-10-25 08:35:00'
    },
    {
      id: 3,
      name: 'Gia vị',
      description: 'Muối, đường, nước mắm, dầu ăn, hạt nêm',
      product_count: 3,
      created_at: '2026-10-25 08:40:00'
    },
    {
      id: 4,
      name: 'Đồ gia dụng',
      description: 'Vật dụng sinh hoạt hằng ngày, chất tẩy rửa',
      product_count: 2,
      created_at: '2026-10-25 08:45:00'
    }
  ],

  // Sản phẩm mẫu (khớp với seed.js và db/schema.sql)
  products: [
    {
      id: 1,
      sku: 'DU-001',
      name: 'Nước suối 500ml',
      category_id: 1,
      category_name: 'Đồ uống',
      price: 5000,
      quantity: 30,
      min_stock: 50,
      status: 'LOW_STOCK', // 30 <= 50 (Cảnh báo tồn thấp)
      created_at: '2026-10-25 09:00:00'
    },
    {
      id: 2,
      sku: 'DU-002',
      name: 'Coca-Cola lon 330ml',
      category_id: 1,
      category_name: 'Đồ uống',
      price: 10000,
      quantity: 120,
      min_stock: 30,
      status: 'IN_STOCK', // 120 > 30 (Đủ tồn kho)
      created_at: '2026-10-25 09:05:00'
    },
    {
      id: 3,
      sku: 'DU-003',
      name: 'Cà phê hòa tan hộp 20 gói',
      category_id: 1,
      category_name: 'Đồ uống',
      price: 55000,
      quantity: 8,
      min_stock: 10,
      status: 'LOW_STOCK', // 8 <= 10 (Cảnh báo tồn thấp)
      created_at: '2026-10-25 09:10:00'
    },
    {
      id: 4,
      sku: 'BK-001',
      name: 'Bánh quy bơ 300g',
      category_id: 2,
      category_name: 'Bánh kẹo',
      price: 45000,
      quantity: 40,
      min_stock: 15,
      status: 'IN_STOCK',
      created_at: '2026-10-25 09:15:00'
    },
    {
      id: 5,
      sku: 'BK-002',
      name: 'Snack khoai tây 52g',
      category_id: 2,
      category_name: 'Bánh kẹo',
      price: 12000,
      quantity: 30,
      min_stock: 40,
      status: 'LOW_STOCK', // 30 <= 40
      created_at: '2026-10-25 09:20:00'
    },
    {
      id: 6,
      sku: 'GV-001',
      name: 'Nước mắm 500ml',
      category_id: 3,
      category_name: 'Gia vị',
      price: 38000,
      quantity: 60,
      min_stock: 20,
      status: 'IN_STOCK',
      created_at: '2026-10-25 09:25:00'
    },
    {
      id: 7,
      sku: 'GV-002',
      name: 'Dầu ăn 1L',
      category_id: 3,
      category_name: 'Gia vị',
      price: 52000,
      quantity: 50,
      min_stock: 20,
      status: 'IN_STOCK',
      created_at: '2026-10-25 09:30:00'
    },
    {
      id: 8,
      sku: 'GV-003',
      name: 'Đường trắng 1kg',
      category_id: 3,
      category_name: 'Gia vị',
      price: 25000,
      quantity: 80,
      min_stock: 25,
      status: 'IN_STOCK',
      created_at: '2026-10-25 09:35:00'
    },
    {
      id: 9,
      sku: 'GD-001',
      name: 'Nước rửa chén 750ml',
      category_id: 4,
      category_name: 'Đồ gia dụng',
      price: 32000,
      quantity: 40,
      min_stock: 15,
      status: 'IN_STOCK',
      created_at: '2026-10-25 09:40:00'
    },
    {
      id: 10,
      sku: 'GD-002',
      name: 'Khăn giấy hộp',
      category_id: 4,
      category_name: 'Đồ gia dụng',
      price: 18000,
      quantity: 13,
      min_stock: 20,
      status: 'LOW_STOCK', // 13 <= 20
      created_at: '2026-10-25 09:45:00'
    }
  ],

  // Tiện ích tính toán KPI
  getStats: function () {
    const totalProducts = this.products.length;
    const totalCategories = this.categories.length;
    const lowStockCount = this.products.filter(p => p.quantity > 0 && p.quantity <= p.min_stock).length;
    const outOfStockCount = this.products.filter(p => p.quantity === 0).length;
    const totalInventoryValue = this.products.reduce((acc, p) => acc + (p.price * p.quantity), 0);

    return {
      totalProducts,
      totalCategories,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue
    };
  },

  // Định dạng tiền tệ VND
  formatCurrency: function (amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  },

  // Định dạng số
  formatNumber: function (num) {
    return new Intl.NumberFormat('vi-VN').format(num);
  }
};
