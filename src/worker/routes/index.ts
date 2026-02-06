import { Hono } from 'hono';
import type { Env } from '../env';
import auth from './auth';
import oauth from './oauth';
import connections from './connections';
import apiKeys from './api-keys';
import user from './user';

const api = new Hono<{ Bindings: Env }>();

// Mount SaaS routes
api.route('/auth', auth);
api.route('/auth/oauth', oauth);
api.route('/connections', connections);
api.route('/api-keys', apiKeys);
api.route('/user', user);

export default api;
