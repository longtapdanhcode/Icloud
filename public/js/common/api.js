/**
 * Cloud Inventory - Common API Helper (Client Middleware)
 * Quản lý Token (localStorage), tự động gắn Authorization Header và bắt lỗi 401 tập trung.
 */

(function () {
  const TOKEN_KEY = 'accessToken';

  const Api = {
    /**
     * Lấy token từ localStorage
     */
    getToken() {
      try {
        return localStorage.getItem(TOKEN_KEY) || '';
      } catch {
        return '';
      }
    },

    /**
     * Lưu token vào localStorage
     */
    setToken(token) {
      try {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          this.clearToken();
        }
      } catch (e) {
        console.error('Không thể lưu token:', e);
      }
    },

    /**
     * Xóa token khỏi localStorage
     */
    clearToken() {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch (e) {
        console.error('Không thể xóa token:', e);
      }
    },

    /**
     * Thực hiện HTTP request có middleware tự gắn token và xử lý 401
     * @param {string} endpoint
     * @param {object} [options]
     * @returns {Promise<{data: any, meta?: any, success: boolean}>}
     */
    async request(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : endpoint;
      const headers = {
        'Accept': 'application/json',
        ...(options.headers || {}),
      };

      const token = this.getToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchConfig = {
        method: options.method || 'GET',
        headers,
      };

      if (options.signal) {
        fetchConfig.signal = options.signal;
      }

      if (options.body !== undefined) {
        if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
          fetchConfig.body = JSON.stringify(options.body);
        } else {
          fetchConfig.body = options.body;
        }
      }

      let response;
      try {
        response = await fetch(url, fetchConfig);
      } catch (networkErr) {
        if (networkErr.name === 'AbortError') throw networkErr;
        const errObj = {
          status: 0,
          code: 'NETWORK_ERROR',
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc dịch vụ MySQL/Backend.',
        };
        throw errObj;
      }

      // 401 Unauthorized: token hết hạn hoặc chưa đăng nhập
      if (response.status === 401) {
        this.clearToken();
        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '/index.html') {
          window.location.href = '/index.html?reason=expired';
        }
        const errObj = {
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập',
        };
        throw errObj;
      }

      let json = {};
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok || json.success === false) {
        const errorInfo = json.error || {};
        const errObj = {
          status: response.status,
          code: errorInfo.code || json.code || 'REQUEST_FAILED',
          message: errorInfo.message || json.message || `Lỗi HTTP ${response.status}`,
          details: errorInfo.details || json.details || null,
        };
        throw errObj;
      }

      return json;
    },

    /**
     * Bắt buộc đăng nhập và kiểm tra phân quyền đầu trang
     * @param {object} [options]
     * @param {string[]} [options.roles] - Danh sách role cho phép (ví dụ: ['ADMIN', 'STAFF'])
     * @returns {Promise<object>} Thông tin user hiện tại
     */
    async requireLogin(options = {}) {
      const token = this.getToken();
      if (!token) {
        window.location.href = '/index.html?reason=unauthenticated';
        throw new Error('Chưa đăng nhập');
      }

      try {
        const res = await this.request('/api/auth/me');
        const user = res.data?.user || res.data;

        if (!user) {
          throw new Error('Dữ liệu người dùng không hợp lệ');
        }

        if (Array.isArray(options.roles) && options.roles.length > 0) {
          if (!options.roles.includes(user.role)) {
            alert(`Bạn không có quyền truy cập trang này (Yêu cầu: ${options.roles.join(', ')}).`);
            window.location.href = '/';
            throw new Error('Không đủ quyền truy cập');
          }
        }

        return user;
      } catch (err) {
        if (err.status === 401 || err.code === 'UNAUTHORIZED') {
          this.clearToken();
          window.location.href = '/index.html?reason=expired';
        }
        throw err;
      }
    },
  };

  window.Api = Api;
})();
