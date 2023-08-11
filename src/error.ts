import { SRTErrorCode } from './constants/errorCode';

export class SRTError extends Error {
  code: SRTErrorCode;

  constructor(code: SRTErrorCode, message: string) {
    super(`${code} / ${message}`);
    this.name = 'SRTError';
    this.code = code;
    this.message = message;
  }
}
