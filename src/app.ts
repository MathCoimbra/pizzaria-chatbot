import express from 'express';
import dotenv from 'dotenv';
import router from './routes';

dotenv.config(); // carrega as variáveis do .env

const app = express();
app.use(express.json());
app.use(router);

export { app };