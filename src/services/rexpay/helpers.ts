import { PaymentStatus } from '@/dal';

export enum RexpayStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PROCESSING = 'PROCESSING',
}

export const handleRexpayResponseStatus = (status: RexpayStatus): PaymentStatus => {
  switch (status) {
    case RexpayStatus.SUCCESS:
      return PaymentStatus.SUCCESS;
    case RexpayStatus.FAILED:
      return PaymentStatus.FAILED;
    case RexpayStatus.PENDING:
    case RexpayStatus.PROCESSING:
    default:
      return PaymentStatus.PENDING;
  }
};
