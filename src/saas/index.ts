// Database
export { initUsersDatabase, getUsersDatabase, closeUsersDatabase } from './database/init';
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
  getEnabledProviders
} from './services/oauth-service';
