import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  issuePhonePinTicket,
  phoneExists,
  registerAccount,
  type PhoneLoginTicket,
} from "@/lib/auth.server";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number")
  .regex(/^[+0-9\s()-]+$/, "Enter a valid phone number");

const pinSchema = z.string().regex(/^\d{4}$/, "Your PIN must be exactly 4 digits");

const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name").max(40),
  lastName: z.string().trim().min(2, "Enter your last name").max(40),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  pin: pinSchema,
  referralCode: z.string().trim().max(24).optional(),
});

const phonePinSchema = z.object({ phone: phoneSchema, pin: pinSchema });

export const signUpWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) => registerSchema.parse(data))
  .handler(async ({ data }): Promise<{ email: string }> => registerAccount(data));

export const checkPhoneRegistered = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ phone: phoneSchema }).parse(data))
  .handler(async ({ data }): Promise<{ exists: boolean }> => ({
    exists: await phoneExists(data.phone),
  }));

export const signInWithPhonePin = createServerFn({ method: "POST" })
  .inputValidator((data) => phonePinSchema.parse(data))
  .handler(async ({ data }): Promise<PhoneLoginTicket> => issuePhonePinTicket(data));
