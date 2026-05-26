import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  JWT_SECRET: Joi.string().required(),

  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)$/)
    .required(),

  JWT_REFRESH_SECRET: Joi.string().required(),

  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)$/)
    .required(),

  DATABASE_URL: Joi.string().required(),

  BREVO_API_KEY: Joi.string().allow('', null),
  BREVO_TIMEOUT_SECONDS: Joi.number().default(30),
  BREVO_MAX_RETRIES: Joi.number().default(2),
  MAIL_FROM: Joi.string()
    .allow('', null)
    .default('ShopDoan <no-reply@shopdoan.vn>'),

  STRIPE_SECRET_KEY: Joi.string().allow('', null),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('', null),
  USER_FRONTEND_URL: Joi.string().uri().allow('', null),
  FRONTEND_URL: Joi.string().uri().allow('', null),
  CORS_ORIGINS: Joi.string().allow('', null),
});
