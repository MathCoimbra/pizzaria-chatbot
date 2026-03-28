import { Order } from "./order";

export type UserState = {
  step: string;
  order: Order;
  address: string;
  paymentMethod: string;
  orderPrice: number;
};