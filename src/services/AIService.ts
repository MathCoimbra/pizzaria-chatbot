import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {

  // Método para processar o pedido de pizza
  static async processOrder(userMessage: string): Promise<any> {
    
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "" });

    const prompt = `Interprete a seguinte mensagem do usuário e extraia os dados do pedido de pizza.Retorne apenas um JSON estruturado com os seguintes campos:
      - \`pizzas\`: Uma lista de objetos contendo \`sabor\`, \`tamanho\` e \`borda\`
      - \`fogazzas\`: Uma lista de objetos contendo \`sabor\` e \`borda\`
      - \`bebidas\`: Uma lista de objetos contendo \`tipo\` e \`quantidade\`
      - \`observacoes\`: Qualquer informação extra que o cliente mencionou
      Exemplo de entrada do usuário:"Quero uma pizza grande de calabresa com borda de catupiry e uma broto de portuguesa. Também quero duas cocas e uma fanta. Pode caprichar no recheio!".Agora gere o JSON correspondente para a seguinte mensagem do usuário, sem adicionar explicações ou texto extra:"${userMessage}"`;

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