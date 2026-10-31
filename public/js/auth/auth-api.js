// Lấy thông tin người dùng từ backend
export async function loadCurrentUser(token) {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
        result.error?.message ||
        "Phiên đăng nhập không hợp lệ.",
    );
  }

  const user = result.data?.user || result.data;

  if (!user || !user.email || !["ADMIN", "STAFF"].includes(user.role)) {
    throw new Error("Thông tin tài khoản không hợp lệ.");
  }

  return user;
}
