import { IPaymentGateway } from './paymentGateway.interface';
import { RazorpayGateway } from './razorpay.gateway';

const defaultGateway = new RazorpayGateway();

export function getPaymentGateway(): IPaymentGateway {
  return defaultGateway;
}
