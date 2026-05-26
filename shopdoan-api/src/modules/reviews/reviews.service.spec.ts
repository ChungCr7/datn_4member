/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const userId = 1;

  const makeService = () => {
    const prisma = {
      orderDetail: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      menuItem: {
        findUnique: jest.fn(),
      },
      review: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
    };
    const cacheService = { del: jest.fn() };
    const service = new ReviewsService(prisma as any, cacheService as any);

    return { service, prisma, cacheService };
  };

  const purchasedDetail = (overrides: Record<string, any> = {}) => ({
    id: 10,
    orderId: 100,
    menuItemId: 5,
    quantity: 1,
    itemTitle: 'Com tam',
    review: null,
    menuItem: { id: 5, title: 'Com tam' },
    order: {
      id: 100,
      userId,
      status: 'delivered',
      paymentStatus: 'pending',
    },
    ...overrides,
  });

  const review = (overrides: Record<string, any> = {}) => ({
    id: 50,
    userId,
    menuItemId: 5,
    orderDetailId: 10,
    rating: 5,
    comment: 'Ngon',
    image: null,
    ...overrides,
  });

  it('rejects reviews when the user has not bought the product', async () => {
    const { service, prisma } = makeService();
    prisma.orderDetail.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ orderDetailId: 10, menuItemId: 5, rating: 5 }, userId),
    ).rejects.toThrow(new BadRequestException('Bạn chưa mua sản phẩm này'));
  });

  it('creates one review for the first valid purchase', async () => {
    const { service, prisma, cacheService } = makeService();
    prisma.orderDetail.findUnique.mockResolvedValue(purchasedDetail());
    prisma.review.create.mockResolvedValue(review());

    const result = await service.create(
      { orderDetailId: 10, menuItemId: 5, rating: 5, comment: 'Ngon' },
      userId,
    );

    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          menuItemId: 5,
          orderDetailId: 10,
        }),
      }),
    );
    expect(result.message).toBe('Đánh giá thành công');
    expect(cacheService.del).toHaveBeenCalledWith('reviews:all');
  });

  it('rejects duplicate reviews for the same purchase', async () => {
    const { service, prisma } = makeService();
    prisma.orderDetail.findUnique.mockResolvedValue(
      purchasedDetail({ review: review() }),
    );

    await expect(
      service.create({ orderDetailId: 10, menuItemId: 5, rating: 5 }, userId),
    ).rejects.toThrow(
      new BadRequestException('Bạn đã đánh giá cho lần mua này rồi'),
    );
  });

  it('allows another review when the product is bought again in another order', async () => {
    const { service, prisma } = makeService();
    prisma.orderDetail.findUnique.mockResolvedValue(
      purchasedDetail({ id: 11, orderId: 101 }),
    );
    prisma.review.create.mockResolvedValue(
      review({ id: 51, orderDetailId: 11 }),
    );

    const result = await service.create(
      { orderDetailId: 11, menuItemId: 5, rating: 4 },
      userId,
    );

    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderDetailId: 11, menuItemId: 5 }),
      }),
    );
    expect(result.review.orderDetailId).toBe(11);
  });

  it('updates the current user review without creating a new one', async () => {
    const { service, prisma } = makeService();
    prisma.review.findUnique.mockResolvedValue(review());
    prisma.review.update.mockResolvedValue(
      review({ rating: 4, comment: 'Tot' }),
    );

    const result = await service.update(
      50,
      { rating: 4, comment: 'Tot' },
      userId,
    );

    expect(prisma.review.create).not.toHaveBeenCalled();
    expect(prisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 50 },
        data: expect.objectContaining({ rating: 4, comment: 'Tot' }),
      }),
    );
    expect(result.message).toBe('Cập nhật đánh giá thành công');
  });

  it('rejects updates from another user', async () => {
    const { service, prisma } = makeService();
    prisma.review.findUnique.mockResolvedValue(review({ userId: 2 }));

    await expect(
      service.update(50, { rating: 4 }, userId, 'user'),
    ).rejects.toThrow(
      new ForbiddenException('Users can only update their own reviews'),
    );
  });
});
