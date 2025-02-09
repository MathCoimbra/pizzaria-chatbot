import { whatsappApi } from "../config/whatsappApi";

// serviço de envio da mensagem pelo whatsapp
export class WhatsappService {
  static async sendMessage(to: string, message: string): Promise<void> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      };

      console.log("Whatsapp url ", process.env.WHATSAPP_API_URL)

      const response = await whatsappApi.post('/messages', payload);
      console.log("Mensagem enviada: ", response.data);

    } catch (error: any) {  
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  } 
}