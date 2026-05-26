import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: '.env' });

const schemaPath = 'prisma/schema.prisma';

export default defineConfig({
  schema: schemaPath,
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
