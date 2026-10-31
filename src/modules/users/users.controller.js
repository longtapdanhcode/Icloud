const usersService = require("./users.service");

async function create(req, res, next) {
  try {
    const { full_name, email, password } = req.body || {};

    // Kiểm tra dữ liệu bắt buộc
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ tên, email và mật khẩu",
      });
    }

    if (
      typeof full_name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu đầu vào không hợp lệ",
      });
    }

    const normalizedName = full_name.trim();
    const normalizedEmail = email.trim();

    if (normalizedName.length === 0 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Họ tên phải có từ 1 đến 100 ký tự",
      });
    }

    if (
      normalizedEmail.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 8 ký tự",
      });
    }

    const user = await usersService.createStaff({
      full_name: normalizedName,
      email: normalizedEmail,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản Staff thành công",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { create };
