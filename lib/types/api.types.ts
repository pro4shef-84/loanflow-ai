export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function successResponse<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function errorResponse(error: string, code?: string): ApiError {
  return { data: null, error, code };
}
