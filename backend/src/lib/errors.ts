// Small typed error so route handlers can `throw` and the central error
// middleware maps it to the right HTTP status + Arabic-friendly message.
export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new AppError(400, message, code);
  }
  static unauthorized(message = "غير مصرح. الرجاء تسجيل الدخول.") {
    return new AppError(401, message, "UNAUTHORIZED");
  }
  static forbidden(message = "لا تملك صلاحية القيام بهذا الإجراء.") {
    return new AppError(403, message, "FORBIDDEN");
  }
  static notFound(message = "العنصر المطلوب غير موجود.") {
    return new AppError(404, message, "NOT_FOUND");
  }
  static conflict(message: string) {
    return new AppError(409, message, "CONFLICT");
  }
}
