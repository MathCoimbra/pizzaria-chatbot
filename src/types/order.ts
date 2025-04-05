export type Order = {
  pizzas: {
    sabor: string | string[];
    tamanho: string;
    borda: string;
  }[];
  fogazzas: {
    sabor: string;
    borda: string;
  }[];
  bebidas: {
    tipo: string;
    quantidade: number;
  }[];
  observacoes: string;
  summary: string;
};