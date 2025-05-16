export default {
  providers: {
    rexpay: {
      url: process.env.REXPAY_URL || 'https://api.rexpay.com',
      secret_key: process.env.REXPAY_SECRET_KEY || 'test-secret-key',
      encrption_key: process.env.REXPAY_ENCRYPTION_KEY || 'test-encryption-key',
      encryption_iv: process.env.REXPAY_ENCRYPTION_IV || 'test-encryption-iv',
    },
  },
  system: {
    url: process.env.SYSTEM_URL || 'https://api.system.com',
  },
  env: process.env.NODE_ENV || 'development',
};
