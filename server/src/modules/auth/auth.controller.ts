import { NextFunction, Request, Response, Router } from 'express';
import { validateRequest } from '../../core/middleware/validation.middleware';
import { createSuccessResponse } from '../../shared/types/api.types';
import authService from './auth.service';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerBusinessSchema,
  registerClientSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation';

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login korisnika
 *     description: Autentifikacija korisnika i vraćanje JWT tokena
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Uspešan login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Nevalidni podaci
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Neispravni kredencijali
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/login',
  validateRequest(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokens, user } = await authService.login(req.body);

      res.json(
        createSuccessResponse({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registracija klijenta
 *     description: Kreiranje novog korisničkog naloga sa ulogom klijenta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterClientRequest'
 *     responses:
 *       201:
 *         description: Registracija uspešna
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: integer
 *                           example: 1
 *       400:
 *         description: Nevalidni podaci ili email već postoji
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/register',
  validateRequest(registerClientSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = await authService.registerClient(req.body);

      res.status(201).json(
        createSuccessResponse(
          { userId },
          {
            message: 'Registracija uspešna. Proverite email za verifikacioni link.',
          },
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /api/auth/register/business:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registracija provajdera (vlasnika biznisa)
 *     description: Kreiranje novog provajder naloga za vlasnika biznisa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterProviderRequest'
 *     responses:
 *       201:
 *         description: Registracija biznisa uspešna
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: integer
 *                           example: 2
 *       400:
 *         description: Nevalidni podaci ili email već postoji
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/register/business',
  validateRequest(registerBusinessSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = await authService.registerBusiness(req.body);

      res.status(201).json(
        createSuccessResponse(
          { userId },
          {
            message: 'Registracija biznisa uspešna. Proverite email za verifikacioni link.',
          },
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Zahtev za reset lozinke
 *     description: Šalje email sa linkom za reset lozinke na zadatu adresu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Email sa instrukcijama poslat (uvek vraća success iz sigurnosnih razloga)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Nevalidni podaci
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.forgotPassword(req.body.email);

      res.json(
        createSuccessResponse(null, {
          message: 'Ako email postoji u sistemu, primićete link za reset lozinke.',
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset lozinke
 *     description: Postavlja novu lozinku koristeći reset token iz email-a
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Lozinka uspešno promenjena
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Nevalidni ili istekli token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);

      res.json(
        createSuccessResponse(null, {
          message: 'Lozinka uspešno promenjena.',
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verifikacija email adrese
 *     description: Verifikuje email adresu koristeći token iz email-a
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *     responses:
 *       200:
 *         description: Email uspešno verifikovan
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         description: Nevalidni ili istekli token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/verify-email',
  validateRequest(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = await authService.verifyEmail(req.body.token);

      res.json(
        createSuccessResponse(
          { user },
          {
            message: 'Email uspešno verifikovan.',
          },
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /api/auth/refresh-token:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Osvežavanje access tokena
 *     description: Generiše novi access i refresh token koristeći postojeći refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Novi tokeni uspešno generisani
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       401:
 *         description: Nevalidni ili istekli refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/refresh-token',
  validateRequest(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refreshAccessToken(req.body.refreshToken);

      res.json(
        createSuccessResponse({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;
