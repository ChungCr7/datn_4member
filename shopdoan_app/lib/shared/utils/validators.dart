class Validators {
  Validators._();

  static String? required(
    String? value, {
    String message = 'Vui long nhap thong tin',
  }) {
    if (value == null || value.trim().isEmpty) return message;
    return null;
  }

  static String? email(String? value) {
    final requiredError = required(value, message: 'Vui long nhap email');
    if (requiredError != null) return requiredError;
    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(value!.trim())) return 'Email khong hop le';
    return null;
  }

  static String? password(String? value) {
    final requiredError = required(value, message: 'Vui long nhap mat khau');
    if (requiredError != null) return requiredError;
    if (value!.length < 6) return 'Mat khau toi thieu 6 ky tu';
    return null;
  }

  static String? strongPassword(String? value) {
    final requiredError = required(value, message: 'Vui long nhap mat khau');
    if (requiredError != null) return requiredError;
    final password = value!;
    if (password.length < 8) return 'Mat khau toi thieu 8 ky tu';
    if (!RegExp('[a-z]').hasMatch(password)) {
      return 'Mat khau can co chu thuong';
    }
    if (!RegExp('[A-Z]').hasMatch(password)) {
      return 'Mat khau can co chu hoa';
    }
    if (!RegExp(r'\d').hasMatch(password)) {
      return 'Mat khau can co chu so';
    }
    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>_\-+=;]').hasMatch(password)) {
      return 'Mat khau can co ky tu dac biet';
    }
    return null;
  }

  static String? phone(String? value) {
    final requiredError = required(
      value,
      message: 'Vui long nhap so dien thoai',
    );
    if (requiredError != null) return requiredError;
    if (value!.trim().length < 9) return 'So dien thoai khong hop le';
    return null;
  }
}
