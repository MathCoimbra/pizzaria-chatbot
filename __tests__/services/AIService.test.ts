import { AIService } from "../../src/services/AIService";

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockImplementation((prompt: any) => {
        if (prompt.includes('trocar')) {
          return {
            response: {
              text: () => '```json\n{"pizza":[{"sabor":"Pepperoni","tamanho":"Grande","borda":"Recheada"}],"fogazza":[{"sabor":"Calabresa","borda":"Tradicional"}],"bebida":[{"tipo":"Cerveja"}],"observacoes":"Sem alho","resumo":"1 Pizza Pepperoni Grande com borda recheada, 1 Fogazza de Calabresa com borda Tradicional, 1 Cerveja, Sem alho"}\n```'
            }
          };
        } else
          if (prompt.includes('Pizza') && prompt.includes('Fogazza')) {
            return {
              response: {
                text: () => '```json\n{"pizza":[{"sabor":"Pepperoni","tamanho":"Grande","borda":"Recheada"}],"fogazza":[{"sabor":"Calabresa","borda":"Tradicional"}],"bebida":[{"tipo":"Cerveja"}],"observacoes":"Sem alho","resumo":"1 Pizza Pepperoni Grande com borda recheada, 1 Fogazza de Calabresa com borda Tradicional, 1 Cerveja, Sem alho"}\n```'
              }
            };
          } else
            if (prompt.includes('Pizza')) {
              return {
                response: {
                  text: () => '```json\n{"pizza":[{"sabor":"Margherita","tamanho":"Média","borda":"Recheada"}],"bebida":[{"tipo":"Refrigerante"}],"observacoes":"Sem cebola","resumo":"1 Pizza Margherita Média com borda recheada, 1 Refrigerante, Sem cebola"}\n```'
                }
              };
            } else
              if (prompt.includes('Fogazza')) {
                return {
                  response: {
                    text: () => '```json\n{"fogazza":[{"sabor":"Queijo","borda":"Tradicional"}],"bebida":[{"tipo":"Suco"}],"observacoes":"Sem pimenta","resumo":"1 Fogazza de Queijo com borda Tradicional, 1 Suco, Sem pimenta"}\n```'
                  }
                };
              } else {
                return {
                  response: {
                    text: () => '```json\nInvalid JSON\n```'
                  }
                };
              }
      })
    })
  }))
}));
describe('AI Service', () => {

  describe('process order tests', () => {
    it('should return pizza order processed in json', async () => {
      const prompt = "Quero uma Pizza Margherita Média com borda recheada e um Refrigerante. Sem cebola.";
      expect(await AIService.processOrder(prompt, "PIZZA_MENU")).toEqual({
        pizza: [{ sabor: "Margherita", tamanho: "Média", borda: "Recheada" }],
        bebida: [{ tipo: "Refrigerante" }],
        observacoes: "Sem cebola",
        resumo: "1 Pizza Margherita Média com borda recheada, 1 Refrigerante, Sem cebola"
      });
    });

    it('should return fogazza order processed in json', async () => {
      const prompt = "Quero uma Fogazza de Queijo com borda Tradicional e um Suco. Sem pimenta.";
      expect(await AIService.processOrder(prompt, "FOGAZZA_MENU")).toEqual({
        fogazza: [{ sabor: "Queijo", borda: "Tradicional" }],
        bebida: [{ tipo: "Suco" }],
        observacoes: "Sem pimenta",
        resumo: "1 Fogazza de Queijo com borda Tradicional, 1 Suco, Sem pimenta"
      });
    });

    it('should return pizza and fogazza order processed in json', async () => {
      const prompt = "Quero uma Pizza Pepperoni Grande com borda recheada, uma Fogazza de Calabresa com borda Tradicional e uma Cerveja. Sem alho.";
      expect(await AIService.processOrder(prompt, "PF_PIZZA_MENU")).toEqual({
        pizza: [{ sabor: "Pepperoni", tamanho: "Grande", borda: "Recheada" }],
        fogazza: [{ sabor: "Calabresa", borda: "Tradicional" }],
        bebida: [{ tipo: "Cerveja" }],
        observacoes: "Sem alho",
        resumo: "1 Pizza Pepperoni Grande com borda recheada, 1 Fogazza de Calabresa com borda Tradicional, 1 Cerveja, Sem alho"
      });
    });

    it('should return null and error when try to convert order to json with empty prompt ', async () => {
      expect(await AIService.processOrder("", "")).toBeNull();
    });
  });

  describe('edit order tests', () => {
    it('should return edited order in json', async () => {
      const prompt = "Quero trocar a Pizza Margherita por uma Pepperoni Grande";
      expect(await AIService.editOrder(prompt, {
        pizza: [{ sabor: "Margherita", tamanho: "Média", borda: "Recheada" }], fogazza: [],
        bebida: [{ tipo: "Refrigerante" }],
        observacoes: "Sem cebola",
        resumo: "1 Pizza Margherita Média com borda recheada, 1 Refrigerante, Sem cebola"
      })).toEqual({
        pizza: [{ sabor: "Pepperoni", tamanho: "Grande", borda: "Recheada" }],
        fogazza: [{ sabor: "Calabresa", borda: "Tradicional" }],
        bebida: [{ tipo: "Cerveja" }],
        observacoes: "Sem alho",
        resumo: "1 Pizza Pepperoni Grande com borda recheada, 1 Fogazza de Calabresa com borda Tradicional, 1 Cerveja, Sem alho"
      });
    });
    it('should return null and error when try to convert edited order to json with empty prompt ', async () => {
      expect(await AIService.editOrder("", {
        pizza: [],
        fogazza: [],
        bebida: [],
        observacoes: "",
        resumo: ""
      } as any)).toBeNull();
    });
  });
});