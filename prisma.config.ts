// Prisma 7 configuration file
// This file is used by Prisma Migrate to get the database connection URL
export default {
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
  },
}

