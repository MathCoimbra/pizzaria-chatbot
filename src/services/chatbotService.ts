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
      }
      // validação para ignorar mensagens do bot e trazer somente mensagens externas
      else if (body.entry[0].changes[0].value.messages[0].from === process.env.BOT_NUMBER) {
        console.log("Mensagem recebida do bot, ignorando...");
        res.sendStatus(200);
      } else {
        const from = body.entry[0].changes[0].value.messages[0].from;
        const userText = body.entry[0].changes[0].value.messages[0].text?.body;
        const name = body.entry[0].changes[0].value.contacts[0].profile.name;
        const options = body.entry[0].changes[0].value.messages[0].interactive;
        console.log(`Mensagem recebida de ${name} com a mensagem: ${userText}`);

        const userKey = `user${from}:firstInteraction`;
        const userItemsQuantityKey = `user${from}:itemsChoice`;
        const userPizzaQuantityKey = `user${from}:pizzaChoice`;
        const userFogazzaQuantityKey = `user${from}:fogazzaChoice`;
        const userExtraChoiceKey = `user${from}:extraChoice`;
        console.log("userKey:::", userKey);
        console.log("userItemsQuantityKey:::", userItemsQuantityKey);
        console.log("userPizzaQuantityKey:::", userPizzaQuantityKey);
        console.log("userFogazzaQuantityKey:::", userFogazzaQuantityKey);
        console.log("extraChoice:::", userExtraChoiceKey);

        const hasInteracted = await redisClient.get(userKey); // Verifica se o usuário já interagiu
        const itemsQuantity = await redisClient.get(userItemsQuantityKey); // Verifica a quantidade de itens
        const pizzaQuantity = await redisClient.get(userPizzaQuantityKey); // Verifica a quantidade de pizzas
        const fogazzaQuantity = await redisClient.get(userFogazzaQuantityKey); // Verifica a quantidade de fogazzas
        const extraChoice = await redisClient.get(userExtraChoiceKey); // Verifica se o extra foi escolhido

        // verifica se é a primeira interação do usuário
        if (!hasInteracted) {
          // se não inclui, então inclui como a primeira interação 
          await redisClient.set(userKey, "true", 'EX', 86400);
          // e manda mensagem de boas vindas
          await WhatsappService.sendMessage(WhatsappService.mountItemChoiceMessage(from, this.welcomeMessage(name)));
          res.status(200).send('Mensagem de boas-vindas enviada com sucesso!');
          return;
        }

        if (!itemsQuantity) {
          const quantityMessage = this.getQuantityMessage(options, pizzaQuantity || '', fogazzaQuantity || '', userPizzaQuantityKey || "", userFogazzaQuantityKey || "");
          await WhatsappService.sendMessage(WhatsappService.mountQuantityMessage(from, quantityMessage, options, pizzaQuantity || '', fogazzaQuantity || ''));
        }

      }
    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }

  static getQuantityMessage(idItem: { button_reply: { id: string; }; }, pizzaQuantity: string, fogazzaQuantity: string, userPizzaQuantityKey: string, userFogazzaQuantityKey: string): string {
    if (!pizzaQuantity) {
      if (idItem.button_reply.id.toUpperCase() === "PIZZA-ID" || idItem.button_reply.id.toUpperCase() === "PIZZAFOGAZZA-ID") {
        redisClient.set(userPizzaQuantityKey, "true", 'EX', 86400);
        return "Quantas pizzas deseja pedir?";
      }
    }
    if (!fogazzaQuantity) {
      if (idItem.button_reply.id.toUpperCase() === "FOGAZZA-ID" || idItem.button_reply.id.toUpperCase() === "PIZZAFOGAZZA-ID") {
        redisClient.set(userFogazzaQuantityKey, "true", 'EX', 86400);
        return `Quantas fogazzas deseja pedir?`;
      }
    }
    return 'Não entendi sua solicitação, por favor selecione uma das opções 🙂';
  }

  static getExtraResponse(message: string, name: string): string {
    if (message === "1") {
      return "Adicionando refrigerante ao seu pedido 🥤";
    } else if (message === "2") {
      return "Adicionando borda recheada ao seu pedido 🧀";
    } else if (message === "3") {
      return this.orderSummaryMessage();
    } else return 'Não entendi sua solicitação, por favor selecione uma das opções 🙂';
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

  static welcomeMessage(name: string): string {
    return `👋 Olá ${name}!\n🍕 Bem-vindo à Pizzaria Sabores do Chef!\n😋 O que deseja hoje?`;
  }
}