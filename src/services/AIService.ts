import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {

  // Método para processar o pedido de pizza
  static async processOrder(userMessage: string, userState: string): Promise<any> {

    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "" });

    let prompt = "";

    if (userState.toUpperCase() === "PIZZA_MENU") {
      prompt = `Interprete a seguinte mensagem do usuário e extraia os dados do pedido. Retorne apenas um JSON estruturado com os seguintes campos:
      - \`pizza\`: Uma lista de objetos contendo \`sabor\`, \`tamanho\` e \`borda\`(se for meia a meia, \`sabor\` será uma lista com 2 sabores)
      - \`bebida\`: Uma lista de objetos contendo \`tipo\`
      - \`observacoes\`: Qualquer informação extra que o cliente mencionou
      - \`resumo\`: Resumo amigável do pedido
      Exemplo de entrada do usuário: "Quero uma pizza grande de calabresa com borda de catupiry, uma broto de portuguesa. E um dolly coca. Pode caprichar no recheio!". Agora gere o JSON correspondente para a seguinte mensagem do usuário, sem adicionar explicações ou texto extra: "${userMessage}"`;
    } else if (userState.toUpperCase() === "FOGAZZA_MENU") {
      prompt = `Interprete a seguinte mensagem do usuário e extraia os dados do pedido. Retorne apenas um JSON estruturado com os seguintes campos:
      - \`fogazza\`: Uma lista de objetos contendo \`sabor\` e \`borda\`
      - \`bebida\`: Uma lista de objetos contendo \`tipo\`
      - \`observacoes\`: Qualquer informação extra que o cliente mencionou
      - \`resumo\`: Resumo amigável do pedido
      Exemplo de entrada do usuário: "Quero uma fogazza de portuguesa com borda de catupiry. E um guaraná. Pode caprichar no recheio!". Agora gere o JSON correspondente para a seguinte mensagem do usuário, sem adicionar explicações ou texto extra: "${userMessage}"`;
    } else if (userState.toUpperCase() === "PF_FOGAZZA_MENU" || userState.toUpperCase() === "PF_PIZZA_MENU") {
      prompt = `Interprete a seguinte mensagem do usuário e extraia os dados do pedido. Retorne apenas um JSON estruturado com os seguintes campos:
      - \`pizza\`: Uma lista de objetos contendo \`sabor\`, \`tamanho\` e \`borda\`(se for meia a meia, \`sabor\` será uma lista com 2 sabores)
      - \`fogazza\`: Uma lista de objetos contendo \`sabor\` e \`borda\`
      - \`bebida\`: Uma lista de objetos contendo \`tipo\`
      - \`observacoes\`: Qualquer informação extra que o cliente mencionou
      - \`resumo\`: Resumo amigável do pedido
      Classifique como **fogazza** apenas se a palavra "fogazza" for mencionada. Caso contrário, trate como pizza, mesmo que o sabor ou borda seja doce.
      Exemplo de entrada do usuário: "Quero uma pizza grande de mussarela com borda de catupiry, uma broto de atum e uma fogazza de bauru. Também quero duas cocas e uma fanta. Pode caprichar no recheio!". Agora gere o JSON correspondente para a seguinte mensagem do usuário, sem adicionar explicações ou texto extra: "${userMessage}"`;
    }

    // Fazendo a chamada para a IA
    const result = await model.generateContent(prompt);

    // Pegando o texto da resposta
    const responseText = result.response.text();

    // Removendo o markdown do responseText
    const cleanedResponse = responseText.replace(/```json\n|```/g, "");

    // Convertendo para JSON
    try {
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Erro ao converter resposta da IA para JSON:", error);
      return null;
    }
  }
}