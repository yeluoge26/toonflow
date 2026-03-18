export class ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;

  static success<T>(data: T, message = "成功"): ApiResponse<T> {
    return { code: 200, data, message };
  }

  static error(message: string, code = 400): ApiResponse<null> {
    return { code, data: null, message };
  }
}
