export type UserState = {
  step: string;
  pizza: {
    quantity: number;
    currentPizza: number;
    currentHalf: number;
  };
  fogazza: {
    quantity: number;
    currentFogazza: number;
  };
};