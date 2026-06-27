import { GoogleGenerativeAI } from "@google/generative-ai";
import { Order } from "../types/order";
import { AILimitService } from "./AILimitService";
import redisClient from "../middlewares/redisClient";

export class AIService {

  static async getMenuFromDatabase(userState: string): Promise<any> {
    try {
      const extractUniqueFlavors = async (prefix: string): Promise<any[]> => {
        const keys = await redisClient.keys(`${prefix}:*`);
        const uniqueFlavors = new Set<string>();

        keys.forEach((key) => {
          const parts = key.split(':');
          if (parts.length >= 2 && parts[2] !== 'available') {
            uniqueFlavors.add(parts[1]);
          }
        });

        // Para cada sabor, busca a disponibilidade no Redis
        const flavorsArray: any[] = [];
        for (const flavor of uniqueFlavors) {
          const availabilityKey = `${prefix}:${flavor}:available`;
          const availabilityValue = await redisClient.get(availabilityKey);
          const available = availabilityValue === '1' ? true : false;

          flavorsArray.push({
            id: flavor.toLowerCase(),
            name: flavor.charAt(0).toUpperCase() + flavor.slice(1),
            available,
          });
        }

        return flavorsArray;
      };

      // Filtra conforme o userState, mas sem retornar arrays vazios
      const menu: any = {};

      if (userState.toUpperCase().includes("PIZZA")) {
        menu.pizzas = await extractUniqueFlavors("pizza");
      }

      if (userState.toUpperCase().includes("FOGAZZA")) {
        menu.fogazzas = await extractUniqueFlavors("fogazza");
      }

      // Bebidas e bordas são sempre retornadas
      menu.bebidas = await extractUniqueFlavors("bebida");
      menu.bordas = await extractUniqueFlavors("borda");


      return menu;
    } catch (error) {
      console.error("Erro ao buscar menu do Redis:", error);
      return { bebidas: [] };
    }
  }

  // Método para processar o pedido de pizza
  static async processOrder(userMessage: string, userState: string, from?: string): Promise<any> {

    // Verificar limite de chamadas à IA
    if (from && await AILimitService.hasReachedLimit(from)) {
      return { limitAchieved: true };
    }

    if (process.env.MOCK_AI_PIZZA_MODA_CLIENTE === "true") {
      return {
        pizza: [
          {
            sabor: "moda do cliente",
            tamanho: "grande",
            borda: "catupiry",
            ingredientes: "mussarela, tomate, orégano"
          }
        ],
        fogazza: [],
        bebida: [
          {
            tipo: "coca"
          }
        ],
        observacoes: "Pedido simulado",
        resumo: "Pizza moda do cliente grande com borda catupiry e ingredientes mussarela, tomate, orégano + coca"
      };
    }

    if (process.env.MOCK_AI_PIZZA === "true") {
      return {
        pizza: [
          {
            sabor: "calabresa",
            tamanho: "grande",
            borda: "catupiry"
          }
        ],
        fogazza: [],
        bebida: [
          {
            tipo: "coca"
          }
        ],
        observacoes: "Pedido simulado",
        resumo: "Pizza calabresa grande com borda catupiry + coca"
      };
    }

    if (process.env.MOCK_AI_FOGAZZA === "true") {
      return {
        "fogazza": [
          {
            "sabor": "frango com catupiry",
            "borda": null
          }
        ],
        "bebida": [
          {
            "tipo": "Coca-Cola"
          }
        ],
        "observacoes": null,
        "resumo": "Uma fogazza de frango com catupiry e uma Coca-Cola."
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "" });

    const menu = await this.getMenuFromDatabase(userState);
    const menuJSON = JSON.stringify(menu, null, 2);
    console.log("Menu enviado para a IA:", menuJSON);

    let prompt = "";

    if (userState.toUpperCase() === "PIZZA_MENU") {
      prompt = `Interprete a seguinte mensagem do usuário e extraia os dados do pedido. 

CARDÁPIO DISPONÍVEL:
${menuJSON}

INSTRUÇÕES IMPORTANTES:
- APENAS use itens com "available": true
- Se um item com "available": false for solicitado, REJEITE e retorne: {"error": {"unavailableFlavor": true, "flavor": "array do sabor indisponível"}}
- Se não conseguir identificar o sabor exato, procure por similares disponíveis
- Se o tamanho não for especificado (broto, pequena, média ou variações), considere como "grande" por padrão
- Retorne apenas um JSON estruturado com os seguintes campos:
  - \`pizza\`: Uma lista de objetos contendo \`sabor\`, \`tamanho\`, \`borda\` (somente se for meia a meia, \`sabor\` será uma lista com 2 sabores), e se o sabor for "moda do cliente", inclua também a propriedade \`ingredientes\` (strings de ingredientes específicos dessa pizza mencionados pelo usuário)
  - \`bebida\`: Uma lista de objetos contendo \`tipo\`
  - \`observacoes\`: Qualquer informação extra que o cliente mencionou
  - \`resumo\`: Resumo amigável do pedido

Exemplo de entrada: "Quero uma pizza grande de calabresa com borda de catupiry, uma broto de portuguesa, uma pizza moda do cliente com mussarela, tomate e orégano. E um dolly coca. Pode caprichar no recheio!". 

Caso a mensagem seja incompreensível, esteja fora de contexto, ou não contenha nenhum dado de pedido, retorne apenas: {"error": {"unknown": true}}. 

Agora gere o JSON correspondente para a seguinte mensagem do usuário, sem adicionar explicações ou texto extra: "${userMessage}"`;
    } else if (userState.toUpperCase() === "FOGAZZA_MENU") {
      prompt = `Interprete a seguinte mensagem do usuário e extraia os dados do pedido.

CARDÁPIO DISPONÍVEL:
${menuJSON}

INSTRUÇÕES IMPORTANTES:
- APENAS use itens com "available": true
- Se um item com "available": false for solicitado, REJEITE e retorne: {"error": {"unavailableFlavor": true, "flavor": "array do sabor indisponível"}}
- Se não conseguir identificar o sabor exato, procure por similares disponíveis
- Retorne apenas um JSON estruturado com os seguintes campos:
  - \`fogazza\`: Uma lista de objetos contendo \`sabor\` e \`borda\`
  - \`bebida\`: Uma lista de objetos contendo \`tipo\`
  - \`observacoes\`: Qualquer informação extra que o cliente mencionou
  - \`resumo\`: Resumo amigável do pedido

Exemplo de entrada: "Quero uma fogazza de portuguesa com borda de catupiry. E um guaraná. Pode caprichar no recheio!". 

Caso a mensagem seja incompreensível, esteja fora de contexto, ou não contenha nenhum dado de pedido, retorne apenas: {"error": {"unknown": true}}. 

Agora gere o JSON correspondente para a seguinte mensagem do usuário, sem adicionar explicações ou texto extra: "${userMessage}"`;
    }/* else if (userState.toUpperCase() === "PF_FOGAZZA_MENU" || userState.toUpperCase() === "PF_PIZZA_MENU") {
      prompt = `Interprete a seguinte mensagem do usuário e extraia os dados do pedido. Retorne apenas um JSON estruturado com os seguintes campos:
      - \`pizza\`: Uma lista de objetos contendo \`sabor\`, \`tamanho\` e \`borda\`(somente se for meia a meia, \`sabor\` será uma lista com 2 sabores)
      - \`fogazza\`: Uma lista de objetos contendo \`sabor\` e \`borda\`
      - \`bebida\`: Uma lista de objetos contendo \`tipo\`
      - \`observacoes\`: Qualquer informação extra que o cliente mencionou
      - \`resumo\`: Resumo amigável do pedido
      Classifique como **fogazza** apenas se a palavra "fogazza" for mencionada. Caso contrário, trate como pizza, mesmo que o sabor ou borda seja doce.
      Exemplo de entrada: "Quero uma pizza grande de mussarela com borda de catupiry, uma broto de atum e uma fogazza de bauru. Também quero duas cocas e uma fanta. Pode caprichar no recheio!". Agora gere o JSON correspondente para a seguinte mensagem do usuário, sem adicionar explicações ou texto extra: "${userMessage}"`;
    } */

    // Fazendo a chamada para a IA
    const result = await model.generateContent(prompt);

    // Pegando o texto da resposta
    const responseText = result.response.text();

    // Removendo o markdown do responseText
    const cleanedResponse = responseText.replace(/```json\n|```/g, "");

    // Convertendo para JSON
    try {
      const parsedResponse = JSON.parse(cleanedResponse);
      // Incrementar contador apenas após resposta bem-sucedida
      if (from) {
        await AILimitService.incrementCallCount(from);
      }
      return parsedResponse;
    } catch (error) {
      console.error("Erro ao converter resposta da IA para JSON:", error);
      throw new Error('Erro ao converter resposta da IA para JSON');
    }
  }

  // Método para editar o pedido de pizza
  static async editOrder(userMessage: string, order: Order, from?: string): Promise<any> {

    // Verificar limite de chamadas à IA
    if (from && await AILimitService.hasReachedLimit(from)) {
      return { limitAchieved: true };
    }

    if (process.env.MOCK_AI_EDIT === "true") {
      // Mock de edição: retorna o pedido sem alterações (ou com edição simples, se preferir)
      return order;
    }

    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "" });

    // Buscar o menu do banco de dados (enviar tudo para edição ter contexto completo)
    const menu = await this.getMenuFromDatabase("PIZZA_FOGAZZA_MENU");
    const menuJSON = JSON.stringify(menu, null, 2);
    console.log("Menu enviado para a IA na edição:", menuJSON);

    let prompt = `Você é responsável por atualizar um pedido em formato JSON

CARDÁPIO DISPONÍVEL:
${menuJSON}

INSTRUÇÕES IMPORTANTES:
- APENAS use itens com "available": true
- Se um item com "available": false for solicitado, REJEITE e retorne: {"error": {"unavailableFlavor": true, "flavor": "array do sabor indisponível"}}
- Se não conseguir identificar o sabor exato, procure por similares disponíveis

Pedido atual:
${JSON.stringify(order)}

Instrução do cliente para edição:
${userMessage}

Siga essa tipagem:
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
};

Retorne SOMENTE um JSON válido do tipo Order, sem explicações adicionais.
Caso a mensagem seja incompreensível, esteja fora de contexto, ou não contenha nenhum dado de pedido, retorne apenas: {"error": {"unknown": true}}.`;

    // Fazendo a chamada para a IA
    const result = await model.generateContent(prompt);

    // Pegando o texto da resposta
    const responseText = result.response.text();

    // Removendo o markdown do responseText
    const cleanedResponse = responseText.replace(/```json\n|```/g, "");

    // Convertendo para JSON
    try {
      const parsedResponse = JSON.parse(cleanedResponse);
      // Incrementar contador apenas após resposta bem-sucedida
      if (from) {
        await AILimitService.incrementCallCount(from);
      }
      return parsedResponse;
    } catch (error) {
      console.error("Erro ao converter resposta da IA para JSON:", error);
      throw new Error("Erro ao converter resposta da IA para JSON");
    }
  }
}