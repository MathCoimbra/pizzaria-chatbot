import { Response } from 'express';
import { WhatsAppWebhookEvent } from "../types/whatsapp";
import { WhatsappService } from './whatsappService';

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

        console.log(`Mensagem recebida de ${from} com a mensagem: ${text}`);
        const reply = `Olá! Tudo bem e você ${name}?`;

        await WhatsappService.sendMessage(from, reply);
        res.status(200).send('Resposta enviada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }
}