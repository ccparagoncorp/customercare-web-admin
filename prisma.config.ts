/**
 * Prisma datasource configuration for Prisma 7
 * directUrl is defined here instead of schema.prisma
 * This file is automatically read by Prisma Migrate
 */
export default {
  datasource: {
    db: {
      directUrl: process.env.DIRECT_URL,
    },
  },
}
