// Sistema de Autenticação Básica PIENG
// Proteção simples para área administrativa

import { NextApiRequest } from 'next';

// ⚠️ ATENÇÃO: Esta é uma autenticação BÁSICA para ambiente de desenvolvimento
// Para produção, use NextAuth.js ou similar com banco de dados

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'pieng';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pieng2025';

export interface AuthUser {
  username: string;
  authenticated: boolean;
}

/**
 * Verifica se o usuário está autenticado
 * Usa Basic Authentication simples
 */
export function checkAuth(req: NextApiRequest): AuthUser | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    // Decodificar credenciais Base64
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Verificar credenciais
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return {
        username,
        authenticated: true
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao verificar autenticação:', error);
    return null;
  }
}

/**
 * Middleware para proteger rotas admin
 * Retorna status 401 se não autenticado
 */
export function requireAuth(req: NextApiRequest): AuthUser | Response {
  const user = checkAuth(req);

  if (!user) {
    return new Response('Autenticação necessária', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="PIENG Admin"'
      }
    });
  }

  return user;
}

/**
 * Gera hash simples para senha (desenvolvimento apenas)
 * ⚠️ NÃO usar em produção!
 */
export function simpleHash(password: string): string {
  return Buffer.from(password).toString('base64');
}

/**
 * Verifica hash simples
 */
export function verifySimpleHash(password: string, hash: string): boolean {
  return simpleHash(password) === hash;
}
