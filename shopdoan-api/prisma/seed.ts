import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run destructive seed in production');
  }

  await resetData();

  const [rootRole, adminRole, sellerRole, buyerRole] = await Promise.all(
    ['ROOT', 'ADMIN', 'SELLER', 'USER'].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const [rootPassword, adminPassword, buyerPassword, sellerPassword] =
    await Promise.all([
      bcrypt.hash('Root@123456', 10),
      bcrypt.hash('Admin@123456', 10),
      bcrypt.hash('Buyer@123456', 10),
      bcrypt.hash('Seller@123456', 10),
    ]);

  await prisma.user.create({
    data: {
      email: 'root@system.com',
      name: 'System Root',
      fullName: 'System Root',
      password: rootPassword,
      roleId: rootRole.id,
      accountRole: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@shopdoan.com',
      name: 'Marketplace Admin',
      fullName: 'Marketplace Admin',
      password: adminPassword,
      roleId: adminRole.id,
      accountRole: 'ADMIN',
      isActive: true,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@shopdoan.com',
      name: 'Sample Buyer',
      fullName: 'Sample Buyer',
      password: buyerPassword,
      phone: '0900000000',
      address: 'Ho Chi Minh City',
      roleId: buyerRole.id,
      accountRole: 'BUYER',
      isActive: true,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: 'seller@shopdoan.com',
      name: 'Sample Seller',
      fullName: 'Sample Seller',
      password: sellerPassword,
      phone: '0911111111',
      address: 'Da Nang',
      roleId: sellerRole.id,
      accountRole: 'SELLER',
      isActive: true,
    },
  });

  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      shopName: 'ShopDoan Mall',
      shopSlug: 'shopdoan-mall',
      description: 'Gian hang mau cho san thuong mai dien tu ShopDoan.',
      logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
      banner:
        'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1400&q=80',
      address: 'Da Nang',
      phone: '0911111111',
      status: 'APPROVED',
    },
  });

  await prisma.shop.create({
    data: {
      ownerId: sellerUser.id,
      shopName: sellerProfile.shopName,
      slug: sellerProfile.shopSlug,
      description: sellerProfile.description,
      logo: sellerProfile.logo,
      banner: sellerProfile.banner,
      phone: sellerProfile.phone,
      address: sellerProfile.address,
      status: 'active',
      approvedAt: new Date(),
    },
  });

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Thoi trang',
        slug: 'thoi-trang',
        image:
          'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Dien tu',
        slug: 'dien-tu',
        image:
          'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Gia dung',
        slug: 'gia-dung',
        image:
          'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
        sortOrder: 3,
      },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        sellerId: sellerProfile.id,
        categoryId: categories[0].id,
        name: 'Ao thun nam basic',
        slug: 'ao-thun-nam-basic',
        description: 'Ao thun cotton form regular, de mac hang ngay.',
        price: 159000,
        salePrice: 129000,
        stock: 120,
        soldCount: 42,
        ratingAverage: 4.7,
        ratingCount: 18,
        status: 'ACTIVE',
        images: {
          create: [
            {
              imageUrl:
                'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
              sortOrder: 1,
            },
          ],
        },
        variants: {
          create: [
            { name: 'Size', value: 'M', stock: 40 },
            { name: 'Size', value: 'L', stock: 45 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        sellerId: sellerProfile.id,
        categoryId: categories[1].id,
        name: 'Tai nghe bluetooth',
        slug: 'tai-nghe-bluetooth',
        description: 'Tai nghe khong day, hop sac nho gon, pin lau.',
        price: 499000,
        salePrice: 399000,
        stock: 75,
        soldCount: 31,
        ratingAverage: 4.6,
        ratingCount: 22,
        status: 'ACTIVE',
        images: {
          create: [
            {
              imageUrl:
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
              sortOrder: 1,
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        sellerId: sellerProfile.id,
        categoryId: categories[2].id,
        name: 'Binh giu nhiet inox',
        slug: 'binh-giu-nhiet-inox',
        description: 'Binh giu nhiet 500ml, phu hop di hoc va di lam.',
        price: 189000,
        stock: 95,
        soldCount: 20,
        ratingAverage: 4.5,
        ratingCount: 12,
        status: 'ACTIVE',
        images: {
          create: [
            {
              imageUrl:
                'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
              sortOrder: 1,
            },
          ],
        },
      },
    }),
  ]);

  const cart = await prisma.cart.create({
    data: {
      userId: buyer.id,
      items: {
        create: [
          {
            userId: buyer.id,
            productId: products[0].id,
            cartKey: `product:${products[0].id}`,
            quantity: 1,
            priceAtTime: products[0].salePrice || products[0].price,
          },
        ],
      },
    },
  });

  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      orderCode: 'SDM-000001',
      totalPrice: 129000,
      totalAmount: 129000,
      shippingFee: 15000,
      discountAmount: 0,
      finalAmount: 144000,
      paymentMethod: 'COD',
      marketplacePaymentStatus: 'UNPAID',
      orderStatus: 'PENDING',
      status: 'ordered',
      paymentStatus: 'pending',
      paymentProvider: 'cash',
      customerName: buyer.fullName || buyer.name,
      receiverName: buyer.fullName || buyer.name,
      phone: buyer.phone,
      receiverPhone: buyer.phone,
      address: buyer.address,
      receiverAddress: buyer.address,
      note: 'Don hang mau marketplace.',
      orderItems: {
        create: [
          {
            sellerId: sellerProfile.id,
            productId: products[0].id,
            productName: products[0].name,
            productImage:
              'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
            quantity: 1,
            price: products[0].salePrice || products[0].price,
          },
        ],
      },
      payments: {
        create: [
          {
            method: 'COD',
            amount: 144000,
            status: 'UNPAID',
          },
        ],
      },
    },
  });

  await prisma.review.create({
    data: {
      userId: buyer.id,
      productId: products[0].id,
      rating: 5,
      comment: 'San pham mau chat luong tot.',
      orderItemId: (
        await prisma.orderItem.findFirstOrThrow({
          where: { orderId: order.id, productId: products[0].id },
        })
      ).id,
    },
  });

  await prisma.searchHistory.create({
    data: {
      userId: buyer.id,
      keyword: 'ao thun nam',
      query: 'ao thun nam',
      targetType: 'product',
      productId: products[0].id,
    },
  });

  await prisma.productViewHistory.create({
    data: {
      userId: buyer.id,
      productId: products[0].id,
    },
  });

  await prisma.recommendationLog.create({
    data: {
      userId: buyer.id,
      productId: products[1].id,
      reason: 'best_selling_same_marketplace_seed',
    },
  });

  await prisma.chatSession.create({
    data: {
      userId: buyer.id,
      messages: {
        create: [
          { sender: 'USER', message: 'toi muon mua ao nam' },
          {
            sender: 'BOT',
            message:
              'Minh tim thay ao thun nam basic dang giam gia. Ban co muon xem chi tiet khong?',
          },
        ],
      },
    },
  });

  console.log('Seeded marketplace data.');
  console.log('Admin:  admin@shopdoan.com / Admin@123456');
  console.log('Buyer:  buyer@shopdoan.com / Buyer@123456');
  console.log('Seller: seller@shopdoan.com / Seller@123456');
  console.log(`Sample cart id: ${cart.id}`);
}

async function resetData() {
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),
    prisma.recommendationLog.deleteMany(),
    prisma.productViewHistory.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.review.deleteMany(),
    prisma.orderDetail.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productAttribute.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.productEmbedding.deleteMany(),
    prisma.productView.deleteMany(),
    prisma.searchHistory.deleteMany(),
    prisma.menuItemOption.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.menu.deleteMany(),
    prisma.product.deleteMany(),
    prisma.sellerProfile.deleteMany(),
    prisma.shopCategory.deleteMany(),
    prisma.sellerRequest.deleteMany(),
    prisma.shop.deleteMany(),
    prisma.category.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.aiMemory.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
