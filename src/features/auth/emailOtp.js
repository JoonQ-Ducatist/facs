/** Email template and client verification must always use the same OTP length. */
export const EMAIL_OTP_LENGTH = 8;

export function sanitizeEmailOtp(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH);
}

export function isCompleteEmailOtp(value) {
  return sanitizeEmailOtp(value).length === EMAIL_OTP_LENGTH;
}
