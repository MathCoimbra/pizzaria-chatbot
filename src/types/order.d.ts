export type Order = {
  pizza: {
    sabor: string | string[];
    ingredientes?: string;
    tamanho: string;
    borda: string;
  }[];
  fogazza: {
    sabor: string;
    borda: string;
  }[];
  bebida: {
    tipo: string;
  }[];
  observacoes: string;
  resumo: string;
  error?: {
    unavailableFlavor?: boolean;
    flavor?: [string];
    unknown?: boolean;
  };
  limitAchieved: boolean;
};