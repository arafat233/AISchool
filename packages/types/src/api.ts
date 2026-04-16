export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
  traceId?: string;
}

export type SortOrder = "asc" | "desc";

export interface DateRangeFilter {
  from?: Date | string;
  to?: Date | string;
}

export interface TenantScoped {
  tenantId: string;
}

export interface SchoolScoped extends TenantScoped {
  schoolId: string;
}
