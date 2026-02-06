import { Router } from 'express';
import authRoutes from './auth-routes';
import oauthRoutes from './oauth-routes';
import connectionsRoutes from './connections-routes';
import apiKeysRoutes from './api-keys-routes';
import userRoutes from './user-routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth/oauth', oauthRoutes);
router.use('/connections', connectionsRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/user', userRoutes);

export default router;
