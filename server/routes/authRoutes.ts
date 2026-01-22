import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth.js';

const authRouter = express.Router();

authRouter.post('/sign-in/email', toNodeHandler(auth));
authRouter.post('/sign-up/email', toNodeHandler(auth));

export default authRouter;
