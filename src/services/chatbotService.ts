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
        const text = body.entry[0].changes[0].value.messages[0].text.body;
        const name = body.entry[0].changes[0].value.contacts[0].profile.name;
        console.log(`Mensagem recebida de ${name} com a mensagem: ${text}`);

        const userKey = `user${from}:firstInteraction`;
        const hasInteracted = await redisClient.get(userKey);
        console.log("userKey:::", userKey)

        // verifica se é a primeira interação do usuário
        if (!hasInteracted) {
          // se não inclui, então inclui como a primeira interação 
          await redisClient.set(userKey, "true", 'EX', 86400);
          // e manda mensagem de boas vindas
          await WhatsappService.sendMessage(from, this.welcomeMessage());
          res.status(200).send('Mensagem de boas-vindas enviada com sucesso!');
          return;
        }

        const reply = this.getResponse(text, name);

        await WhatsappService.sendMessage(from, reply);
        res.status(200).send('Resposta enviada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }

  static getResponse(message: string, name: string): string {

    if (message === "1") {
      return "ok registrado";
    } else return 'Não entendi sua solicitação, por favor selecione uma das opções 🙂';
  }

  static welcomeMessage(): string {
    return "👋 Olá! Bem-vindo à Pizzaria! Nosso cardápio é o seguinte:\n\n" +
      "1️⃣ Pizza de Calabresa\n2️⃣ Pizza Portuguesa\n3️⃣ Pizza Frango com Catupiry\n" +
      "\nEscolha o número da pizza que deseja pedir! 🍕";
  }
}