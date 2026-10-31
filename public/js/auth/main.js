
import { initNavigation } from "./ui.js";

import {
    initLogin,
    initCreateStaff,
    initLogout,
    initAuth
} from "./handlers.js";

// Khởi tạo các sự kiện giao diện
initNavigation();
initLogin();
initCreateStaff();
initLogout();

// Kiểm tra và khôi phục phiên đăng nhập
initAuth();
