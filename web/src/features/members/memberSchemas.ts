import * as z from "zod";
import { ASSIGNABLE_ROLES } from "./roles";

export const addMemberSchema = z.object({
  // Mirrors the API's @IsEmail(); the server remains the real boundary.
  email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email")),
  role: z.enum(ASSIGNABLE_ROLES),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;
