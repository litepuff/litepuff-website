import helmet from "helmet";
import compression from "compression";
import crypto from "crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import { AppError } from "../utils/AppError.js";

/* ----------------------------------------------------------
   SANITIZER
---------------------------------------------------------- */

function sanitize(value) {
  if (typeof value === "string") {
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (key.startsWith("$") || key.includes(".")) {
          throw new AppError("Unsafe request key detected.", {
            status: 422,
            code: "UNSAFE_INPUT",
          });
        }

        return [key, sanitize(item)];
      })
    );
  }

  return value;
}

/* ----------------------------------------------------------
   SECURITY STACK
   (NO GLOBAL RATE LIMIT HERE)
---------------------------------------------------------- */

export const securityStack = [
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },

    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups",
    },

    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "https://checkout.razorpay.com",
          "https://connect.facebook.net",
        ],

        connectSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://*.razorpay.com",
          "https://www.facebook.com",
        ],

        frameSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://*.razorpay.com",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.razorpay.com",
          "https://www.facebook.com",
        ],

        styleSrc: [
          "'self'",
          "https:",
          "'unsafe-inline'",
        ],

        fontSrc: [
          "'self'",
          "https:",
          "data:",
        ],

        objectSrc: ["'none'"],

        baseUri: ["'self'"],

        formAction: ["'self'"],

        frameAncestors: ["'self'"],
      },
    },
  }),

  compression(),

  (req, res, next) => {
    res.removeHeader("X-Powered-By");
    next();
  },

  (req, res, next) => {
    if (req.body) req.body = sanitize(req.body);

    if (req.query) req.query = sanitize(req.query);

    next();
  },
];

/* ----------------------------------------------------------
   GENERAL API LIMITER
---------------------------------------------------------- */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max:
    process.env.NODE_ENV === "production"
      ? 1000
      : 10000,

  standardHeaders: true,

  legacyHeaders: false,

  skip(req) {
    return req.method === "OPTIONS";
  },

  handler(req, res) {
    res.status(429).json({
      success: false,
      code: "RATE_LIMIT",
      error:
        "Too many requests. Please wait a minute and try again.",
    });
  },
});

/* ----------------------------------------------------------
   AUTH LIMITER
---------------------------------------------------------- */

export const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator(req) {
    const rawIdentifier =
      req.body?.phone ||
      req.body?.email ||
      req.body?.identifier;
    if (!rawIdentifier) return `ip:${ipKeyGenerator(req.ip)}`;
    const value = String(rawIdentifier).trim();
    const normalized = value.includes("@")
      ? value.toLowerCase()
      : value
          .replace(/[\s().-]/g, "")
          .replace(/^00/, "+")
          .replace(/^(?!\+)/, "+");
    return `identifier:${crypto
      .createHash("sha256")
      .update(normalized)
      .digest("hex")}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      success: false,
      code: "OTP_REQUEST_RATE_LIMIT",
      error: "Too many verification-code requests. Please wait 10 minutes.",
      details: { retryAfterSeconds: 600 },
    });
  },
});

export const otpVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      success: false,
      code: "OTP_VERIFICATION_RATE_LIMIT",
      error: "Too many verification attempts. Please wait 10 minutes.",
    });
  },
});

export const sessionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Backward-compatible export for modules outside the customer OTP routes.
export const authLimiter = sessionLimiter;

/* ----------------------------------------------------------
   PAYMENT LIMITER
---------------------------------------------------------- */

export const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,

  max: 30,

  standardHeaders: true,

  legacyHeaders: false,

  handler(req, res) {
    res.status(429).json({
      success: false,
      code: "PAYMENT_RATE_LIMIT",
      error:
        "Too many payment requests. Please wait a moment.",
    });
  },
});

/* ----------------------------------------------------------
   WEBHOOK LIMITER
---------------------------------------------------------- */

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,

  max: 300,

  standardHeaders: true,

  legacyHeaders: false,

  handler(req, res) {
    res.status(429).json({
      success: false,
      code: "WEBHOOK_RATE_LIMIT",
      error: "Webhook rate limit exceeded.",
    });
  },
});

/* ----------------------------------------------------------
   CSRF
---------------------------------------------------------- */

export function csrfArchitectureGuard(req, res, next) {
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(
    req.method
  );

  const usesCookies = Boolean(
    req.signedCookies?.lp_access ||
      req.signedCookies?.lp_refresh
  );

  const origin = req.get("origin");

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
  ].filter(Boolean);

  if (
    unsafe &&
    usesCookies &&
    origin &&
    !allowedOrigins.includes(origin)
  ) {
    return next(
      new AppError("Request origin is not allowed.", {
        status: 403,
        code: "CSRF_ORIGIN_REJECTED",
      })
    );
  }

  next();
}
