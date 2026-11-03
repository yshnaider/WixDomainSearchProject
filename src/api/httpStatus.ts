export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  CLIENT_ERROR_MIN: 400,
  SERVER_ERROR_MIN: 500,
} as const;

export const isClientError = (status: number) =>
  status >= HTTP_STATUS.CLIENT_ERROR_MIN && status < HTTP_STATUS.SERVER_ERROR_MIN;
