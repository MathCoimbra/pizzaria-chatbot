import { Response } from 'express';
import { WhatsAppWebhookEvent } from "../types/whatsapp";
import { WhatsappService } from './whatsappService';
import redisClient from '../../utils/redisClient';

// serviço de envio da mensagem pelo whatsapp
export class ChatbotService {
  static async processMessage(body: WhatsAppWebhookEvent, res: Response): Promise<void> {
    try {
      // verifica se há entradas e mensagens válidas
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages?.[0];

      if (!entry || !changes || !messages) {
        console.log('Evento ignorado: Estrutura do corpo inválida ou sem mensagens.');
        res.sendStatus(200); // responde com sucesso para evitar novas tentativas do whatsapp
        return;
      }
      // validação para ignorar mensagens do bot e trazer somente mensagens externas
      else if (body.entry[0].changes[0].value.messages[0].from === process.env.BOT_NUMBER) {
        console.log("Mensagem recebida do bot, ignorando...");
        res.sendStatus(200);
        return;
      } else {
        const from = messages.from;
        const userText = messages.text?.body;
        const name = changes.value.contacts?.[0]?.profile?.name;
        const options = messages.interactive;
        console.log(`Mensagem recebida de ${name} com a mensagem: ${userText}`);

        // key para controle de estado do usuário
        const userStateKey = `user${from}:state`;
        const userState = await redisClient.get(userStateKey);

        // verifica se é a primeira interação do usuário
        if (!userState) {
          await WhatsappService.sendMessage(WhatsappService.mountItemChoiceMessage(from, this.getWelcomeMessage(name)));
          await redisClient.set(userStateKey, JSON.stringify({ "step": "CHOOSE_ITEM" }), 'EX', 86400);
          res.status(200).send('Mensagem de boas-vindas enviada com sucesso!');
          return;
        } else {
          await this.handleUserState(from, options, res);
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }

  static async handleUserState(from: string, options: any, res: Response): Promise<void> {

    const userStateKey = `user${from}:state`;
    const userState = await redisClient.get(userStateKey);

    if (!options) {
      res.status(200).send('Nenhuma opção interativa recebida. Aguardando resposta do usuário.');
      return; // NÃO avança no fluxo sem resposta válida
    }
    if (userState) {
      const userStateJson = JSON.parse(userState);
      const quantityMessage = await this.getQuantityMessage(options, userStateJson, userStateKey);

      await WhatsappService.sendMessage(await WhatsappService.mountQuantityMessage(from, quantityMessage));
      res.status(200).send('Mensagem enviada com sucesso!');
      return;
    }
  }

  static async getQuantityMessage(idItem: { button_reply: { id: string; }; }, userStateJson: { step: string }, userStateKey: string): Promise<string> {
    if (userStateJson.step.toUpperCase() === "CHOOSE_ITEM") {
      if (idItem?.button_reply?.id?.toUpperCase() === "PIZZA-ID") {
        await redisClient.set(userStateKey, JSON.stringify({ "step": "PIZZA_QUANTITY" }), 'EX', 86400);
        return "Quantas pizzas deseja pedir?";
      }
      if (idItem?.button_reply?.id?.toUpperCase() === "FOGAZZA-ID") {
        await redisClient.set(userStateKey, JSON.stringify({ "step": "FOGAZZA_QUANTITY" }), 'EX', 86400);
        return `Quantas fogazzas deseja pedir?`;
      }
      if (idItem?.button_reply?.id?.toUpperCase() === "PIZZAFOGAZZA-ID") {
        await redisClient.set(userStateKey, JSON.stringify({ "step": "PF_PIZZA_QUANTITY" }), 'EX', 86400);
        return "Quantas pizzas deseja pedir?";
      }
    }

    if (userStateJson.step.toUpperCase() === "PF_PIZZA_QUANTITY") {
      redisClient.set(userStateKey, JSON.stringify({ "step": "PF_FOGAZZA_QUANTITY" }), 'EX', 86400);
      return "Quantas fogazzas deseja pedir?";
    }

    return 'Não entendi sua solicitação, por favor selecione uma das opções 🙂';
  }

  static orderSummaryMessage(): string {
    return "Pedido finalizado com sucesso! 🎉\n\n" +
      "Resumo do pedido:\n\n" +
      "🍕 Pizza de Calabresa\n" +
      "🥤 Refrigerante: Coca Cola\n" +
      "🧀 Borda recheada: Catupiry\n\n" +
      "Valor total: R$ 50,00\n\n" +
      "Tempo médio de entrega: 30 minutos! 🚚\n\n" +
      "Obrigado por pedir na Pizzaria! 🍕";
  }

  static extraMessage(): string {
    return "Deseja algum extra? 🍕\n\n1️⃣ Adicionar refrigerante (Coca Cola, Guaraná ou Fanta)\n2️⃣ Adicionar borda recheada (Catupiry, Chocolate ou Cheddar)\n3️⃣ Nenhum extra";
  }

  static getWelcomeMessage(name: string): string {
    return `👋 Olá ${name}!\n🍕 Bem-vindo à Pizzaria Sabores do Chef!\n😋 O que deseja hoje?`;
  }

  static async getHalfAndHalfPizzaMessage(idItem: { button_reply: { id: string; }; }, userState: string, userStateKey: string): Promise<string> {
    if (userState === "CHOOSE_ITEM") {
      if (idItem?.button_reply?.id?.toUpperCase() === "PIZZA-ID") {
        await redisClient.set(userStateKey, "PIZZA_QUANTITY", 'EX', 86400);
        return "Quantas pizzas deseja pedir?";
      }
      if (idItem?.button_reply?.id?.toUpperCase() === "FOGAZZA-ID") {
        await redisClient.set(userStateKey, "FOGAZZA_QUANTITY", 'EX', 86400);
        return `Quantas fogazzas deseja pedir?`;
      }
      if (idItem?.button_reply?.id?.toUpperCase() === "PIZZAFOGAZZA-ID") {
        await redisClient.set(userStateKey, "PF_PIZZA_QUANTITY", 'EX', 86400);
        return "Quantas pizzas deseja pedir?";
      }
    }

    if (userState === "PF_PIZZA_QUANTITY") {
      redisClient.set(userStateKey, "PF_FOGAZZA_QUANTITY", 'EX', 86400);
      return "Quantas fogazzas deseja pedir?";
    }

    return 'Não entendi sua solicitação, por favor selecione uma das opções 🙂';
  }
}