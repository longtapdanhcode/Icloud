// Lưu thông tin người dùng đang đăng nhập
export let currentUser = null;

// Cập nhật thông tin người dùng
export function setCurrentUser(user) {
  currentUser = user;
}
