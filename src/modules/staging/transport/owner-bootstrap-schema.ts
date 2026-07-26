import { z } from "zod";

const bootstrapIdentitySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(12).max(128),
  })
  .strict();

export const ownerBootstrapRequestSchema = z
  .object({
    owner: bootstrapIdentitySchema,
    isolationUser: bootstrapIdentitySchema,
    operatorReference: z.string().trim().min(1).max(160).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.owner.email === value.isolationUser.email) {
      context.addIssue({
        code: "custom",
        path: ["isolationUser", "email"],
        message: "Isolation-test email must differ from the owner email.",
      });
    }
  });

const authenticationUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
});

const authenticationUserResponseSchema = z.union([
  authenticationUserSchema,
  z.object({ user: authenticationUserSchema }),
  z.object({ data: authenticationUserSchema }),
]);

export function parseCreatedAuthenticationUser(value: unknown): Readonly<{
  id: string;
  name: string;
  email: string;
}> {
  const parsed = authenticationUserResponseSchema.parse(value);
  if ("user" in parsed) {
    return parsed.user;
  }
  if ("data" in parsed) {
    return parsed.data;
  }
  return parsed;
}
