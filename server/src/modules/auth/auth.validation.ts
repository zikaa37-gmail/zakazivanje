import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email mora biti validan',
    'any.required': 'Email je obavezan',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Lozinka mora imati najmanje 8 karaktera',
    'any.required': 'Lozinka je obavezna',
  }),
});

export const registerClientSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email mora biti validan',
    'any.required': 'Email je obavezan',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Lozinka mora imati najmanje 8 karaktera',
    'any.required': 'Lozinka je obavezna',
  }),
  firstName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Ime mora imati najmanje 2 karaktera',
    'string.max': 'Ime može imati najviše 100 karaktera',
    'any.required': 'Ime je obavezno',
  }),
  lastName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Prezime mora imati najmanje 2 karaktera',
    'string.max': 'Prezime može imati najviše 100 karaktera',
    'any.required': 'Prezime je obavezno',
  }),
  phone: Joi.string()
    .pattern(/^[\d\s\+\-\(\)]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Telefon mora biti validan',
      'any.required': 'Telefon je obavezan',
    }),
  whatsappNumber: Joi.string()
    .pattern(/^[\d\s\+\-\(\)]+$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'WhatsApp broj mora biti validan',
    }),
  preferredCommunication: Joi.string().valid('email', 'whatsapp', 'both').optional().messages({
    'any.only': 'Preferred communication mora biti email, whatsapp ili both',
  }),
});

export const registerBusinessSchema = registerClientSchema.keys({
  businessName: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Naziv biznisa mora imati najmanje 2 karaktera',
    'string.max': 'Naziv biznisa može imati najviše 200 karaktera',
    'any.required': 'Naziv biznisa je obavezan',
  }),
  businessCategory: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Kategorija mora imati najmanje 2 karaktera',
    'string.max': 'Kategorija može imati najviše 100 karaktera',
    'any.required': 'Kategorija je obavezna',
  }),
  pib: Joi.string().optional().allow(''),
  registrationNumber: Joi.string().optional().allow(''),
  businessPhone: Joi.string()
    .pattern(/^[\d\s\+\-\(\)]+$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Poslovni telefon mora biti validan',
    }),
  businessWhatsapp: Joi.string()
    .pattern(/^[\d\s\+\-\(\)]+$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Poslovni WhatsApp mora biti validan',
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email mora biti validan',
    'any.required': 'Email je obavezan',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token je obavezan',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Lozinka mora imati najmanje 8 karaktera',
    'any.required': 'Lozinka je obavezna',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Lozinke se ne poklapaju',
    'any.required': 'Potvrda lozinke je obavezna',
  }),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token je obavezan',
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token je obavezan',
  }),
});
