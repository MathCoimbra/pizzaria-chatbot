export type Order = {
  pizza: {
    sabor: string | string[];
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
  summary: string;
};