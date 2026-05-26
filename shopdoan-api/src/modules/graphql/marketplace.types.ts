import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ShopType {
  @Field(() => ID)
  id!: number;

  @Field()
  shopName!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  logo?: string;

  @Field({ nullable: true })
  banner?: string;

  @Field()
  status!: string;

  @Field(() => Int)
  ownerId!: number;
}

@ObjectType()
export class ProductType {
  @Field(() => ID)
  id!: number;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float)
  basePrice!: number;

  @Field({ nullable: true })
  image?: string;

  @Field(() => Int)
  stock!: number;

  @Field()
  isAvailable!: boolean;

  @Field(() => Int, { nullable: true })
  shopId?: number;
}

@ObjectType()
export class PageMetaType {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType()
export class ProductPageType {
  @Field(() => [ProductType])
  items!: ProductType[];

  @Field(() => PageMetaType)
  meta!: PageMetaType;
}

@ObjectType()
export class ShopPageType {
  @Field(() => [ShopType])
  shops!: ShopType[];

  @Field(() => PageMetaType)
  meta!: PageMetaType;
}

@ObjectType()
export class SellerAnalyticsType {
  @Field(() => Int)
  products!: number;

  @Field(() => Int)
  orderItems!: number;

  @Field(() => Float)
  revenue!: number;

  @Field(() => Float)
  averageRating!: number;
}

@ObjectType()
export class AiAssistantResponseType {
  @Field()
  message!: string;

  @Field(() => [ProductType])
  recommendations!: ProductType[];

  @Field()
  intent!: string;
}
