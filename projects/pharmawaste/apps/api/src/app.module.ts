import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InventoryModule } from './inventory/inventory.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
    }),
    PrismaModule,
    NotificationsModule,
    InventoryModule,
    AdminModule,
  ],
})
export class AppModule {}
