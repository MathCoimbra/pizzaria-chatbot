import { Response } from 'express';
import { Interactive, WhatsAppWebhookEvent } from "../types/whatsapp";
import { WhatsappService } from './whatsappService';
import redisClient from '../../utils/redisClient';
import { UserState } from '../types/userState';
import { findBestMatch } from '../../utils/stringSimilarity';
import { AIService } from './AIService';
import { Order } from '../types/order';

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
          await WhatsappService.sendMessage(WhatsappService.mountItemChoiceMessage(from, WhatsappService.getWelcomeMessage(name)));
          await redisClient.set(userStateKey, JSON.stringify({ "step": "CHOOSE_ITEM" }), 'EX', 86400);
          res.status(200).send('Mensagem de boas-vindas enviada com sucesso!');
          return;
        } else {
          await this.handleUserState(from, options, res, userText);
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }

  static async handleUserState(from: string, interactive: Interactive, res: Response, userText: string): Promise<void> {

    const userStateKey = `user${from}:state`;
    const userState = await redisClient.get(userStateKey);

    if (!interactive && !userText) {
      res.status(200).send('Nenhuma mensagem recebida. Aguardando resposta do usuário.');
      return; // NÃO avança no fluxo sem resposta válida
    }
    if (userState) {

      const userStateJson: UserState = JSON.parse(userState);

      if (userStateJson.step.toUpperCase() === "CHOOSE_ITEM") {

        await this.handleItemSelection(interactive?.button_reply?.id, userText, userStateJson, userStateKey);

        await WhatsappService.sendMessage(await WhatsappService.mountMenuMessage(from));
        await WhatsappService.sendMessage(await WhatsappService.getExtraMessage(from));
        await WhatsappService.sendMessage(await WhatsappService.getOrderMessage(from));
        res.status(200).send('Mensagens de cardápio e extra enviadas com sucesso!');
        return;
      }

      if (userStateJson.step.toUpperCase() === "PIZZA_MENU" || userStateJson.step.toUpperCase() === "FOGAZZA_MENU" || userStateJson.step.toUpperCase() === "PF_PIZZA_MENU" || userStateJson.step.toUpperCase() === "PF_FOGAZZA_MENU") {

        const AIResponse: Order = await AIService.processOrder(userText);
        console.log("AIResponse", AIResponse);

        if (userStateJson.step.toUpperCase() === "PIZZA_MENU" || userStateJson.step.toUpperCase() === "PF_PIZZA_MENU") {

          if (AIResponse.pizzas && AIResponse.pizzas.length > 0) {
            for (const item of AIResponse.pizzas) {
              if (!item.tamanho || !item.sabor) {
                await WhatsappService.sendMessage(await WhatsappService.getFlavorSizeErrorMessage(from));
                res.status(200).send('Mensagem de falta de tamanho enviada com sucesso!');
                return;
              }
            }
            await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from));
            res.status(200).send('Pedido processado com sucesso!');
            return;
          }
        }

        if (userStateJson.step.toUpperCase() === "FOGAZZA_MENU" || userStateJson.step.toUpperCase() === "PF_FOGAZZA_MENU") {

          if (AIResponse.fogazzas && AIResponse.fogazzas.length > 0) {
            for (const item of AIResponse.fogazzas) {
              if (!item.sabor) {
                await WhatsappService.sendMessage(await WhatsappService.getSizeErrorMessage(from));
                res.status(200).send('Mensagem de falta de tamanho enviada com sucesso!');
                return;
              }
            }
            await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from));
            res.status(200).send('Pedido processado com sucesso!');
            return;
          }
        }
      }
    }
  }

  static async handleItemSelection(idItem: string, userText: string, userStateJson: UserState, userStateKey: string): Promise<void> {
    try {
      // método para identificar a melhor correspondência de texto, em caso de digitação errada
      const userOrder = findBestMatch(userText, ['Pizza', 'Fogazza', 'Pizza e Fogazza']);

      if (userStateJson.step.toUpperCase() === "CHOOSE_ITEM") {
        if (idItem?.toUpperCase() === "PIZZA-ID" || userOrder?.toUpperCase() === "PIZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ "step": "PIZZA_MENU" }), 'EX', 86400);
        }
        if (idItem?.toUpperCase() === "FOGAZZA-ID" || userOrder?.toUpperCase() === "FOGAZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ "step": "FOGAZZA_MENU" }), 'EX', 86400);
        }
        if (idItem?.toUpperCase() === "PIZZAFOGAZZA-ID" || userOrder?.toUpperCase() === "PIZZA E FOGAZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ "step": "PF_PIZZA_MENU" }), 'EX', 86400);
        }
      }
      if (userStateJson.step.toUpperCase() === "PF_PIZZA_MENU") {
        redisClient.set(userStateKey, JSON.stringify({ "step": "PF_FOGAZZA_MENU" }), 'EX', 86400);
      }
    } catch (error: any) {
      throw new Error('Não entendi sua solicitação, por favor selecione uma das opções ou digite 🙂');
    }
  }
}