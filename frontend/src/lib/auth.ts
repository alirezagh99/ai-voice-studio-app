import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  polar,
  checkout,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { db } from "~/server/db";
import { env } from "~/env";

// If your Prisma file is located elsewhere, you can change the path

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Use 'sandbox' if you're using the Polar Sandbox environment
  // Remember that access tokens, products, etc. are completely separated between environments.
  // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
  server: "sandbox",
});

const prisma = new PrismaClient();
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "36499c4e-69ac-4f32-9556-99fb371a2a97",
              slug: "small",
            },
            {
              productId: "0b50b261-3114-4420-9b5a-e9a588ac36e6",
              slug: "medium",
            },
            {
              productId: "33572146-3797-4a5e-a119-5785646277cc",
              slug: "large",
            },
          ],
          successUrl: "/dashboard",
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          // onCustomerStateChanged: (payload) => // Triggered when anything regarding a customer changes
          onOrderPaid: async (order) => {
            const externalCustomerId = order.data.customer.externalId;

            if (!externalCustomerId) {
              console.error("No external customer ID found.");
              throw new Error("No external customer ID found.");
            }

            const productId = order.data.productId;

            let creditsToAdd = 0;

            switch (productId) {
              case "36499c4e-69ac-4f32-9556-99fb371a2a97":
                creditsToAdd = 50;
                break;
              case "0b50b261-3114-4420-9b5a-e9a588ac36e6":
                creditsToAdd = 200;
                break;
              case "33572146-3797-4a5e-a119-5785646277cc":
                creditsToAdd = 400;
                break;
            }

            await db.user.update({
              where: { id: externalCustomerId },
              data: {
                credits: {
                  increment: creditsToAdd,
                },
              },
            });
          },
          // ...  // Over 25 granular webhook handlers
          // onPayload: (payload) => // Catch-all for all events
        }),
      ],
    }),
  ],
});
