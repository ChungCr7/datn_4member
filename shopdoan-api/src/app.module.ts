import { Module } from '@nestjs/common';
import { AppService } from '@/app.service';
import { AppController } from '@/app.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@/auth/auth.module';
import { SystemModule } from '@/system/system.module';
import { UsersModule } from '@/modules/users/users.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { ProductsModule } from '@/modules/products/products.module';
import { SearchModule } from '@/modules/search/search.module';
import { MenusModule } from '@/modules/menus/menus.module';
import { MenuItemsModule } from '@/modules/menu-items/menu-items.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { ChatbotModule } from '@/modules/chatbot/chatbot.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { CartModule } from '@/modules/cart/cart.module';
import { ShopsModule } from '@/modules/shops/shops.module';
import { SellersModule } from '@/modules/sellers/sellers.module';
import { SellerModule } from '@/modules/seller/seller.module';
import { RecommendationModule } from '@/modules/recommendation/recommendation.module';
import { AiModule } from '@/modules/ai/ai.module';
import { envValidationSchema } from '@/config/env.validation';
import { MailModule } from '@/mail/mail.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { AppThrottlerGuard } from '@/auth/guards/app-throttler.guard';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/modules/graphql/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req }: { req: any }) => ({ req }),
    }),
    PrismaModule,
    MailModule,

    SystemModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    SearchModule,
    MenusModule,
    MenuItemsModule,
    ReviewsModule,
    OrdersModule,
    ChatbotModule,
    PaymentsModule,
    CartModule,
    ShopsModule,
    SellersModule,
    SellerModule,
    RecommendationModule,
    AiModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
