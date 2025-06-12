import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log('Base URL configurada:', process.env.WHATSAPP_API_URL);

export const whatsappApi = axios.create({
  baseURL: process.env.WHATSAPP_API_URL,
  headers: {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
});
