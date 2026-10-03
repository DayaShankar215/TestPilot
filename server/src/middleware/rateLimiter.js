import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

function build(windowMs, max, code) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down and try again shortly.',
        error: { code, message: 'Rate limit exceeded' },
      })
    },
  })
}

export const apiRateLimiter = build(env.rateLimitWindowMs, env.rateLimitMax, 'RATE_LIMITED')
export const authRateLimiter = build(env.rateLimitWindowMs, env.authRateLimitMax, 'AUTH_RATE_LIMITED')
export const aiRateLimiter = build(env.rateLimitWindowMs, env.aiRateLimitMax, 'AI_RATE_LIMITED')