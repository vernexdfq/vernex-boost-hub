import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  identifierExists,
  issueIdentifierPinTicket,
  issuePhonePinTicket,
  phoneExists,
  registerAccount,
  requestPinResetV2,
  completePinResetV2,
  updatePinForUser,
  resetPinWithPassword,
  type PhoneLoginTicket,
} from "@/lib/auth.server";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number")
  .regex(/^[+0-9\s()-]+$/, "Enter a valid phone number");

const pinSchema = z.string().regex(/^\d{4}$/, "Your PIN must be exactly 4 digits");

const identifierSchema = z
  .string()
  .trim()
  .min(5, "Enter your phone number or email")
  .max(255, "Enter your phone number or email");

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72)
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/\d/, "Password must include a number"),
  pin: pinSchema,
  referralCode: z.string().trim().max(24).optional(),
});

const phonePinSchema = z.object({ phone: phoneSchema, pin: pinSchema });
const identifierPinSchema = z.object({ identifier: identifierSchema, pin: pinSchema });

export const signUpWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) => registerSchema.parse(data))
  .handler(async ({ data }): Promise<{ email: string }> => registerAccount(data));

export const checkPhoneRegistered = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ phone: phoneSchema }).parse(data))
  .handler(async ({ data }): Promise<{ exists: boolean }> => ({
    exists: await phoneExists(data.phone),
  }));

export const checkIdentifierRegistered = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ identifier: identifierSchema }).parse(data))
  .handler(async ({ data }): Promise<{ exists: boolean }> => ({
    exists: await identifierExists(data.identifier),
  }));

export const signInWithPhonePin = createServerFn({ method: "POST" })
  .inputValidator((data) => phonePinSchema.parse(data))
  .handler(async ({ data }): Promise<PhoneLoginTicket> => issuePhonePinTicket(data));

export const signInWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) => identifierPinSchema.parse(data))
  .handler(async ({ data }): Promise<PhoneLoginTicket> => issueIdentifierPinTicket(data));

export const requestPinReset = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ identifier: identifierSchema }).parse(data))
  .handler(async ({ data }) => requestPinResetV2(data.identifier));

export const completePinReset = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ token: z.string().min(16), pin: pinSchema }).parse(data),
  )
  .handler(async ({ data }) => completePinResetV2(data.token, data.pin));

export const saveUserPin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), pin: pinSchema }).parse(data),
  )
  .handler(async ({ data }) => updatePinForUser(data.userId, data.pin));

/** Forgot PIN on login: password + new 4-digit PIN (no email link). */
export const forgotPinWithPassword = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        identifier: identifierSchema,
        password: z.string().min(8).max(72),
        pin: pinSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    resetPinWithPassword(data.identifier, data.password, data.pin),
  );
