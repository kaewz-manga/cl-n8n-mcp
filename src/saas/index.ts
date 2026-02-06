// Database
export { initUsersDatabase, getUsersDatabase, closeUsersDatabase, initD1Database, runD1Migrations, getAsyncDatabase } from './database/init';
export { D1Adapter, SyncToAsyncAdapter, type AsyncDatabase } from './database/d1-adapter';
export { setDatabaseGetter } from './database/users-repository';
export {
  usersRepository,
  connectionsRepository,
  apiKeysRepository,
  plansRepository,
  usageRepository,
  type User,
  type N8nConnection,
  type ApiKey,
  type Plan
} from './database/users-repository';

// Services
export {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashApiKey
} from './services/encryption-service';

export {
  registerUser,
  loginUser,
  generateToken,
  verifyToken,
  getUserFromToken,
  changePassword,
  getUserProfile,
  deleteUser,
  configureJwt,
  type JWTPayload,
  type AuthResult
} from './services/auth-service';

export {
  generateApiKey,
  createApiKey,
  validateApiKey,
  checkRateLimits,
  getUserApiKeys,
  revokeApiKey,
  logApiUsage,
  type ApiKeyCreateResult,
  type ApiKeyValidationResult
} from './services/api-key-service';

export {
  getAuthorizationUrl,
  handleOAuthCallback,
  getEnabledProviders,
  configureOAuth
} from './services/oauth-service';
