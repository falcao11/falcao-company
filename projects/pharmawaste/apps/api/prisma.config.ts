import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://pharma_user:pharma_password_dev_123@localhost:5433/pharmawaste_db?schema=public',
  },
});
