'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  AppstoreOutlined,
  DashboardOutlined,
  MessageOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Layout, Menu, Modal, Popconfirm, Select, Space, Statistic, Switch, Table, Tag } from 'antd';
import { getConversation, getConversations, normalizeConversation, normalizeConversations, sendReply } from '@/services/chatbotService';
import {
  AdminUser,
  Category,
  Product,
  SellerProfile,
  approveSeller,
  createCategory,
  createUser,
  deleteCategory,
  deleteUser,
  getCategories,
  getOrders,
  getProducts,
  getSellers,
  getUsers,
  rejectSeller,
  updateCategory,
  updateOrder,
  updateProduct,
  updateUser,
  uploadImage as uploadAdminImage,
} from '@/services/marketplaceAdminService';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

const { Header, Sider, Content } = Layout;
const orderStatuses = ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const productStatuses = ['ACTIVE', 'DRAFT', 'INACTIVE', 'BANNED'];
const sellerStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const defaultQuery = { page: 1, limit: 10, search: '', filter: 'all', sortBy: 'createdAt', sortOrder: 'desc' };

export default function AdminDashboard() {
  const { message: messageApi, modal } = App.useApp();
  const { data: session, status } = useSession();
  const router = useRouter();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const currentRole = ((session?.user as any)?.role || '').toLowerCase();
  const isAdmin = currentRole === 'admin' || currentRole === 'root';

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [stats, setStats] = useState({ sellers: 0, pendingSellers: 0, products: 0, orders: 0, users: 0, chats: 0 });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [uploadingField, setUploadingField] = useState<'category' | 'product' | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [categoryForm] = Form.useForm();
  const [productForm] = Form.useForm();
  const [userForm] = Form.useForm();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || !isAdmin) router.push('/auth/signin');
  }, [status, session, isAdmin, router]);

  useEffect(() => {
    setQuery(defaultQuery);
    setMeta({ total: 0, page: 1, limit: 10, totalPages: 1 });
  }, [currentPage]);

  const params = useMemo(() => ({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    keyword: query.search || undefined,
    filter: query.filter,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  }), [query]);

  const load = async () => {
    if (!accessToken || !isAdmin) return;
    setLoading(true);
    try {
      if (currentPage === 'dashboard') {
        const [sellerData, pendingSellerData, productData, orderData, userData, chatData] = await Promise.all([
          getSellers(accessToken, { page: 1, limit: 5 }),
          getSellers(accessToken, { page: 1, limit: 5, filter: 'pending' }),
          getProducts(accessToken, { page: 1, limit: 5 }),
          getOrders(accessToken, { page: 1, limit: 5 }),
          getUsers(accessToken, { page: 1, limit: 5 }),
          getConversations(accessToken),
        ]);
        setSellers(withKeys(sellerData.sellers));
        setProducts(withKeys(productData.products));
        setOrders(withKeys(orderData.orders));
        setUsers(withKeys(userData.users));
        const chats = normalizeConversations(chatData);
        setConversations(chats);
        setStats({
          sellers: sellerData.meta.total,
          pendingSellers: pendingSellerData.meta.total,
          products: productData.meta.total,
          orders: orderData.meta.total,
          users: userData.meta.total,
          chats: chats.length,
        });
      }

      if (currentPage === 'sellers') {
        const data = await getSellers(accessToken, params);
        setSellers(withKeys(data.sellers));
        setMeta(data.meta);
      }

      if (currentPage === 'categories') {
        const data = await getCategories(accessToken, params);
        setCategories(withKeys(data.categories));
        setMeta(data.meta);
      }

      if (currentPage === 'products') {
        const data = await getProducts(accessToken, params);
        setProducts(withKeys(data.products));
        setMeta(data.meta);
      }

      if (currentPage === 'orders') {
        const data = await getOrders(accessToken, params);
        setOrders(withKeys(data.orders));
        setMeta(data.meta);
      }

      if (currentPage === 'users') {
        const data = await getUsers(accessToken, params);
        setUsers(withKeys(data.users));
        setMeta(data.meta);
      }

      if (currentPage === 'chat') {
        setConversations(normalizeConversations(await getConversations(accessToken)));
      }
    } catch (error: any) {
      messageApi.error(error?.message || 'Không tải được dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, query.search ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [currentPage, accessToken, isAdmin, query.page, query.limit, query.search, query.filter, query.sortBy, query.sortOrder]);

  const tablePagination = {
    current: meta.page || query.page,
    pageSize: meta.limit || query.limit,
    total: meta.total || 0,
    showSizeChanger: true,
    onChange: (page: number, limit: number) => setQuery((value) => ({ ...value, page, limit })),
  };

  const toolbar = (filters: Array<{ value: string; label: string }> = [], extra?: ReactNode) => (
    <Card className="mb-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]">
        <Input.Search allowClear placeholder="Tìm kiếm..." value={query.search} onChange={(event) => setQuery((value) => ({ ...value, page: 1, search: event.target.value }))} />
        <Select value={query.filter} options={[{ value: 'all', label: 'Tất cả' }, ...filters]} onChange={(filter) => setQuery((value) => ({ ...value, page: 1, filter }))} />
        <Select value={query.sortOrder} options={[{ value: 'desc', label: 'Mới nhất' }, { value: 'asc', label: 'Cũ nhất' }]} onChange={(sortOrder) => setQuery((value) => ({ ...value, sortOrder }))} />
        {extra || <span />}
      </div>
    </Card>
  );

  const saveCategory = async () => {
    if (!accessToken) return;
    const values = await categoryForm.validateFields();
    if (editingCategory) await updateCategory(accessToken, editingCategory.id, values);
    else await createCategory(accessToken, values);
    closeForm('Đã lưu danh mục', setCategoryModalOpen, setEditingCategory, categoryForm);
  };

  const saveProduct = async () => {
    if (!accessToken || !editingProduct) return;
    const values = await productForm.validateFields();
    const { imageUrl, ...productValues } = values;
    await updateProduct(accessToken, editingProduct.id, {
      ...productValues,
      salePrice: productValues.salePrice ?? null,
      images: imageUrl?.trim() ? [{ imageUrl: imageUrl.trim(), sortOrder: 1 }] : [],
    } as any);
    closeForm('Đã cập nhật sản phẩm', setProductModalOpen, setEditingProduct, productForm);
  };

  const saveUser = async () => {
    if (!accessToken) return;
    const values = await userForm.validateFields();
    const payload = Object.fromEntries(Object.entries(values).filter(([key, value]) => key !== 'password' || Boolean(String(value || '').trim())));
    if (editingUser) await updateUser(accessToken, editingUser.id, payload as any);
    else await createUser(accessToken, payload as any);
    closeForm('Đã lưu người dùng', setUserModalOpen, setEditingUser, userForm);
  };

  const closeForm = (text: string, close: (value: boolean) => void, setEditing: (value: any) => void, form: any) => {
    messageApi.success(text);
    close(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const uploadFormImage = async (target: 'category' | 'product', fieldName: string, folder: string, file?: File) => {
    if (!accessToken || !file) return;
    setUploadingField(target);
    try {
      const result = await uploadAdminImage(accessToken, file, folder);
      const form = target === 'category' ? categoryForm : productForm;
      form.setFieldValue(fieldName, result.imageUrl);
      messageApi.success('Đã upload ảnh lên Cloudinary.');
    } catch (error: any) {
      messageApi.error(error?.message || 'Không upload được ảnh.');
    } finally {
      setUploadingField(null);
    }
  };

  const renderContent = () => {
    if (currentPage === 'dashboard') {
      return (
        <>
          <PageTitle eyebrow="Marketplace" title="Tổng quan sàn thương mại" />
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Stat title="Shop" value={stats.sellers} />
            <Stat title="Chờ duyệt" value={stats.pendingSellers} />
            <Stat title="Sản phẩm" value={stats.products} />
            <Stat title="Đơn hàng" value={stats.orders} />
            <Stat title="Người dùng" value={stats.users} />
            <Stat title="Cuộc chat" value={stats.chats} />
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <Card title="Shop mới nhất">
              <Table size="small" pagination={false} dataSource={sellers} columns={[
                { title: 'Shop', dataIndex: 'shopName' },
                { title: 'Chủ shop', render: (_, record: SellerProfile) => record.user?.email },
                { title: 'Trạng thái', dataIndex: 'status', render: sellerStatusTag },
              ]} />
            </Card>
            <Card title="Đơn hàng mới nhất">
              <Table size="small" pagination={false} dataSource={orders} columns={[
                { title: 'Mã đơn', render: (_, record) => record.orderCode || `#${record.id}` },
                { title: 'Khách', render: (_, record) => record.receiverName || record.user?.email },
                { title: 'Tổng', render: (_, record) => formatCurrency(record.finalAmount || record.totalAmount || record.totalPrice || 0) },
                { title: 'Trạng thái', dataIndex: 'orderStatus', render: orderStatusTag },
              ]} />
            </Card>
          </div>
        </>
      );
    }

    if (currentPage === 'sellers') {
      return (
        <>
          <PageTitle title="Duyệt và quản lý shop" />
          {toolbar(sellerStatuses.map((value) => ({ value: value.toLowerCase(), label: sellerStatusText[value] || value })))}
          <Table loading={loading} dataSource={sellers} pagination={tablePagination} scroll={{ x: 980 }} columns={[
            { title: 'Shop', render: (_, record) => <ShopCell seller={record} /> },
            { title: 'Chủ shop', render: (_, record) => record.user?.email },
            { title: 'Sản phẩm', render: (_, record) => record._count?.products || 0 },
            { title: 'Trạng thái', dataIndex: 'status', render: sellerStatusTag },
            { title: 'Ngày gửi', dataIndex: 'createdAt', render: formatDate },
            { title: 'Thao tác', fixed: 'right', render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => setDetails(record)}>Chi tiết</Button>
                {record.status !== 'APPROVED' ? <Button size="small" type="primary" onClick={() => approveSellerAction(record.id)}>Duyệt</Button> : null}
                {record.status === 'PENDING' ? <Button size="small" danger onClick={() => rejectSellerAction(record.id)}>Từ chối</Button> : null}
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'categories') {
      return (
        <>
          <PageTitle title="Danh mục sản phẩm" action={<Button type="primary" onClick={() => openCategory()}>Thêm danh mục</Button>} />
          {toolbar([{ value: 'active', label: 'Đang hiển thị' }, { value: 'inactive', label: 'Đang ẩn' }])}
          <Table loading={loading} dataSource={categories} pagination={tablePagination} scroll={{ x: 900 }} columns={[
            { title: 'Tên danh mục', dataIndex: 'name' },
            { title: 'Slug', dataIndex: 'slug' },
            { title: 'Sản phẩm', render: (_, record) => record._count?.marketplaceProducts || 0 },
            { title: 'Thứ tự', dataIndex: 'sortOrder' },
            { title: 'Trạng thái', dataIndex: 'isActive', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Đang hiển thị' : 'Đang ẩn'}</Tag> },
            { title: 'Thao tác', fixed: 'right', render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => openCategory(record)}>Sửa</Button>
                <Popconfirm title="Xóa hoặc ẩn danh mục?" onConfirm={() => deleteCategoryAction(record.id)}>
                  <Button size="small" danger>Xóa</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'products') {
      return (
        <>
          <PageTitle title="Kiểm duyệt sản phẩm" />
          {toolbar(productStatuses.map((value) => ({ value, label: productStatusText[value] || value })))}
          <Table loading={loading} dataSource={products} pagination={tablePagination} scroll={{ x: 1100 }} columns={[
            { title: 'Sản phẩm', render: (_, record) => <ProductCell product={record} /> },
            { title: 'Shop', render: (_, record) => record.seller?.shopName },
            { title: 'Danh mục', render: (_, record) => record.category?.name },
            { title: 'Giá', render: (_, record) => formatCurrency(record.salePrice || record.price) },
            { title: 'Tồn', dataIndex: 'stock' },
            { title: 'Đã bán', dataIndex: 'soldCount' },
            { title: 'Trạng thái', dataIndex: 'status', render: productStatusTag },
            { title: 'Thao tác', fixed: 'right', render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => openProduct(record)}>Sửa</Button>
                <Popconfirm title="Ẩn sản phẩm này?" onConfirm={() => updateProductStatus(record.id, 'INACTIVE')}>
                  <Button size="small">Ẩn</Button>
                </Popconfirm>
                <Popconfirm title="Khóa sản phẩm vi phạm?" onConfirm={() => updateProductStatus(record.id, 'BANNED')}>
                  <Button size="small" danger>Khóa</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'orders') {
      return (
        <>
          <PageTitle title="Đơn hàng marketplace" />
          {toolbar(orderStatuses.map((value) => ({ value, label: orderStatusText[value] || value })))}
          <Table loading={loading} dataSource={orders} pagination={tablePagination} scroll={{ x: 1100 }} columns={[
            { title: 'Mã đơn', render: (_, record) => record.orderCode || `#${record.id}` },
            { title: 'Người nhận', render: (_, record) => `${record.receiverName || ''} ${record.receiverPhone ? `- ${record.receiverPhone}` : ''}` },
            { title: 'Địa chỉ', dataIndex: 'receiverAddress', ellipsis: true },
            { title: 'Tổng thanh toán', render: (_, record) => formatCurrency(record.finalAmount || record.totalAmount || record.totalPrice || 0) },
            { title: 'Thanh toán', render: (_, record) => `${record.paymentMethod || 'COD'} - ${record.marketplacePaymentStatus || record.paymentStatus || 'UNPAID'}` },
            { title: 'Trạng thái', dataIndex: 'orderStatus', render: orderStatusTag },
            { title: 'Ngày tạo', dataIndex: 'createdAt', render: formatDate },
            { title: 'Thao tác', fixed: 'right', render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => setDetails(record)}>Chi tiết</Button>
                <Select size="small" value={record.orderStatus || 'PENDING'} style={{ width: 145 }} options={orderStatuses.map((value) => ({ value, label: orderStatusText[value] }))} onChange={(orderStatus) => updateOrderStatus(record.id, orderStatus)} />
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'users') {
      return (
        <>
          <PageTitle title="Người dùng" action={<Button type="primary" onClick={() => openUser()}>Thêm người dùng</Button>} />
          {toolbar()}
          <Table loading={loading} dataSource={users} pagination={tablePagination} scroll={{ x: 980 }} columns={[
            { title: 'Tên', render: (_, record) => record.fullName || record.name || 'Chưa có tên' },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Vai trò', render: (_, record) => <Tag color={roleColor(record.role?.name || record.accountRole)}>{record.role?.name || record.accountRole || 'USER'}</Tag> },
            { title: 'Điện thoại', dataIndex: 'phone' },
            { title: 'Trạng thái', dataIndex: 'isActive', render: (value) => <Tag color={value === false ? 'red' : 'green'}>{value === false ? 'Tạm khóa' : 'Hoạt động'}</Tag> },
            { title: 'Ngày tạo', dataIndex: 'createdAt', render: formatDate },
            { title: 'Thao tác', fixed: 'right', render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => openUser(record)}>Sửa</Button>
                <Popconfirm title="Xóa người dùng?" onConfirm={() => deleteUserAction(record.id)}>
                  <Button size="small" danger>Xóa</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'chat') {
      const chatItems = normalizeConversations(conversations).filter((item) => JSON.stringify(item).toLowerCase().includes(query.search.toLowerCase()));
      return (
        <>
          <PageTitle title="Chat khách hàng" />
          <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
            <Card title="Cuộc trò chuyện">
              <Input.Search className="mb-3" allowClear placeholder="Tìm cuộc chat" value={query.search} onChange={(event) => setQuery((value) => ({ ...value, search: event.target.value }))} />
              <div className="space-y-2">
                {chatItems.map((item) => (
                  <button key={item.conversationId || item.sessionId || item.id} className={`w-full rounded-lg border p-3 text-left ${selectedConversation === (item.conversationId || item.sessionId || item.id) ? 'border-orange-400 bg-orange-50' : 'bg-white'}`} onClick={() => selectConversation(item.conversationId || item.sessionId || item.id)}>
                    <div className="truncate font-semibold">{item.user?.fullName || item.user?.name || item.user?.email || `Khách #${item.conversationId || item.id}`}</div>
                    <div className="truncate text-xs text-slate-500">{item.lastMessage || 'Chưa có tin nhắn'}</div>
                  </button>
                ))}
                {!chatItems.length ? <div className="py-8 text-center text-sm text-slate-500">Chưa có cuộc chat.</div> : null}
              </div>
            </Card>
            <Card title={conversation ? `Chat #${conversation.conversationId || conversation.sessionId || conversation.id}` : 'Chọn cuộc chat'}>
              <div className="h-[460px] space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
                {(conversation?.messages || []).map((item: any) => (
                  <div key={item.id || `${item.role}-${item.timestamp || item.createdAt}`} className={`flex ${item.role === 'user' || item.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-lg px-3 py-2 text-sm ${item.role === 'user' || item.sender === 'USER' ? 'bg-orange-500 text-white' : 'bg-white'}`}>
                      <p>{item.text || item.message}</p>
                      <p className="mt-1 text-[11px] opacity-70">{formatDateTime(item.timestamp || item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input.TextArea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} placeholder="Trả lời khách hàng..." />
                <Button type="primary" disabled={!selectedConversation || !reply.trim()} onClick={sendAdminReply}>Gửi</Button>
              </div>
            </Card>
          </div>
        </>
      );
    }

    return null;
  };

  const approveSellerAction = async (id: number) => {
    if (!accessToken) return;
    await approveSeller(accessToken, id);
    messageApi.success('Đã duyệt shop.');
    load();
  };

  const rejectSellerAction = (id: number) => {
    let reason = '';
    modal.confirm({
      title: 'Từ chối hồ sơ shop',
      content: <Input.TextArea rows={3} placeholder="Lý do từ chối" onChange={(event) => { reason = event.target.value; }} />,
      okText: 'Từ chối',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        if (!accessToken) return;
        await rejectSeller(accessToken, id, reason);
        messageApi.success('Đã từ chối hồ sơ shop.');
        load();
      },
    });
  };

  const deleteCategoryAction = async (id: number) => {
    if (!accessToken) return;
    await deleteCategory(accessToken, id);
    messageApi.success('Đã xóa hoặc ẩn danh mục.');
    load();
  };

  const updateProductStatus = async (id: number, status: Product['status']) => {
    if (!accessToken) return;
    await updateProduct(accessToken, id, { status });
    messageApi.success('Đã cập nhật trạng thái sản phẩm.');
    load();
  };

  const updateOrderStatus = async (id: number, orderStatus: string) => {
    if (!accessToken) return;
    await updateOrder(accessToken, id, { orderStatus } as any);
    messageApi.success('Đã cập nhật trạng thái đơn.');
    load();
  };

  const deleteUserAction = async (id: number) => {
    if (!accessToken) return;
    await deleteUser(accessToken, id);
    messageApi.success('Đã xóa người dùng.');
    load();
  };

  const openCategory = (record?: Category) => {
    setEditingCategory(record || null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue(record || { isActive: true, sortOrder: 0 });
    setCategoryModalOpen(true);
  };

  const openProduct = (record: Product) => {
    setEditingProduct(record);
    productForm.resetFields();
    productForm.setFieldsValue({ ...record, imageUrl: record.images?.[0]?.imageUrl || '' });
    setProductModalOpen(true);
  };

  const openUser = (record?: AdminUser) => {
    setEditingUser(record || null);
    userForm.resetFields();
    userForm.setFieldsValue(record ? { ...record, roleName: record.role?.name || record.accountRole } : { roleName: 'USER', isActive: true });
    setUserModalOpen(true);
  };

  const selectConversation = async (conversationId: number) => {
    if (!accessToken) return;
    setSelectedConversation(conversationId);
    setConversation(normalizeConversation(await getConversation(conversationId, accessToken)));
  };

  const sendAdminReply = async () => {
    if (!accessToken || !selectedConversation || !reply.trim()) return;
    const text = reply.trim();
    setReply('');
    await sendReply(selectedConversation, text, accessToken);
    await selectConversation(selectedConversation);
  };

  if (status === 'loading') return <div className="grid min-h-screen place-items-center">Đang tải...</div>;
  if (!session?.user || !isAdmin) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg">
        <div className="grid h-16 place-items-center border-b border-white/10 font-bold text-white">{collapsed ? 'SD' : 'ShopDoAn Admin'}</div>
        <Menu theme="dark" mode="inline" selectedKeys={[currentPage]} onClick={({ key }) => setCurrentPage(String(key))} items={[
          { key: 'dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
          { key: 'sellers', icon: <ShopOutlined />, label: 'Duyệt shop' },
          { key: 'categories', icon: <TagsOutlined />, label: 'Danh mục' },
          { key: 'products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
          { key: 'orders', icon: <ShoppingCartOutlined />, label: 'Đơn hàng' },
          { key: 'users', icon: <UserOutlined />, label: 'Người dùng' },
          { key: 'chat', icon: <MessageOutlined />, label: 'Chat' },
        ]} />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <span className="font-semibold text-slate-800">Quản trị sàn ShopDoAn</span>
          <Space>
            <Tag color={currentRole === 'root' ? 'red' : 'purple'}>{currentRole.toUpperCase()}</Tag>
            <span>{session.user?.name || session.user?.email}</span>
            <Button onClick={() => signOut({ callbackUrl: '/auth/signin' })}>Đăng xuất</Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>{renderContent()}</Content>
      </Layout>

      <CategoryModal
        open={categoryModalOpen}
        form={categoryForm}
        editing={editingCategory}
        uploading={uploadingField === 'category'}
        onUpload={(file?: File) => uploadFormImage('category', 'image', 'categories', file)}
        onOk={saveCategory}
        onCancel={() => setCategoryModalOpen(false)}
      />
      <ProductModal
        open={productModalOpen}
        form={productForm}
        product={editingProduct}
        uploading={uploadingField === 'product'}
        onUpload={(file?: File) => uploadFormImage('product', 'imageUrl', 'products', file)}
        onOk={saveProduct}
        onCancel={() => setProductModalOpen(false)}
      />
      <UserModal open={userModalOpen} form={userForm} editing={editingUser} onOk={saveUser} onCancel={() => setUserModalOpen(false)} />
      <Drawer title="Chi tiết" open={Boolean(details)} onClose={() => setDetails(null)} size="large">
        <Descriptions bordered column={1} size="small">
          {Object.entries(details || {}).filter(([, value]) => typeof value !== 'object' || value === null).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>{String(value ?? '')}</Descriptions.Item>
          ))}
        </Descriptions>
        <pre className="mt-4 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">{JSON.stringify(details, null, 2)}</pre>
      </Drawer>
    </Layout>
  );
}

function PageTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-medium text-orange-600">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
      </div>
      {action}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <Card><Statistic title={title} value={value} /></Card>;
}

function ShopCell({ seller }: { seller: SellerProfile }) {
  return (
    <div className="flex items-center gap-3">
      {seller.logo ? <img src={seller.logo} alt={seller.shopName} className="h-10 w-10 rounded object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded bg-orange-50 font-bold text-orange-600">S</div>}
      <div>
        <div className="font-semibold">{seller.shopName}</div>
        <div className="text-xs text-slate-500">{seller.shopSlug}</div>
      </div>
    </div>
  );
}

function ProductCell({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-3">
      {product.images?.[0]?.imageUrl ? <img src={product.images[0].imageUrl} alt={product.name} className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-slate-100" />}
      <div>
        <div className="font-semibold">{product.name}</div>
        <div className="text-xs text-slate-500">{product.slug}</div>
      </div>
    </div>
  );
}

function CategoryModal({ open, editing, form, uploading, onUpload, onOk, onCancel }: any) {
  return (
    <Modal title={editing ? 'Sửa danh mục' : 'Thêm danh mục'} open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục' }]}><Input /></Form.Item>
        <Form.Item name="image" label="Ảnh danh mục">
          <ImageField uploading={uploading} onUpload={onUpload} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} className="w-full" /></Form.Item>
        <Form.Item name="isActive" label="Hiển thị" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>
  );
}

function ProductModal({ open, product, form, uploading, onUpload, onOk, onCancel }: any) {
  return (
    <Modal title="Cập nhật sản phẩm" open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="imageUrl" label="Ảnh sản phẩm">
          <ImageField uploading={uploading} onUpload={onUpload} />
        </Form.Item>
        <Form.Item name="price" label="Giá bán" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
        <Form.Item name="salePrice" label="Giá khuyến mãi"><InputNumber min={0} className="w-full" /></Form.Item>
        <Form.Item name="stock" label="Tồn kho"><InputNumber min={0} className="w-full" /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={productStatuses.map((value) => ({ value, label: productStatusText[value] }))} /></Form.Item>
        <p className="text-xs text-slate-500">Shop: {product?.seller?.shopName || 'Không rõ'}</p>
      </Form>
    </Modal>
  );
}

function ImageField({ value, onChange, uploading, onUpload }: any) {
  return (
    <div className="space-y-3">
      {value ? <img src={value} alt="Ảnh đã upload" className="h-24 w-24 rounded object-cover" /> : null}
      <Input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder="URL ảnh Cloudinary" />
      <div className="flex items-center gap-3">
        <input type="file" accept="image/*" disabled={uploading} onChange={(event) => onUpload(event.target.files?.[0])} />
        {uploading ? <span className="text-sm text-orange-600">Đang upload...</span> : null}
      </div>
    </div>
  );
}

function UserModal({ open, editing, form, onOk, onCancel }: any) {
  return (
    <Modal title={editing ? 'Sửa người dùng' : 'Thêm người dùng'} open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}><Input /></Form.Item>
        <Form.Item name="password" label="Mật khẩu"><Input.Password placeholder={editing ? 'Bỏ trống nếu không đổi' : 'Mặc định User@123456 nếu bỏ trống'} /></Form.Item>
        <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
        <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
        <Form.Item name="roleName" label="Vai trò"><Select options={[{ value: 'USER', label: 'BUYER/USER' }, { value: 'SELLER', label: 'SELLER' }, { value: 'ADMIN', label: 'ADMIN' }]} /></Form.Item>
        <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>
  );
}

const sellerStatusText: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  SUSPENDED: 'Tạm khóa',
};

const productStatusText: Record<string, string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Nháp',
  INACTIVE: 'Tạm ẩn',
  BANNED: 'Bị khóa',
};

const orderStatusText: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

function sellerStatusTag(value: string) {
  const color: Record<string, string> = { PENDING: 'gold', APPROVED: 'green', REJECTED: 'red', SUSPENDED: 'default' };
  return <Tag color={color[value] || 'default'}>{sellerStatusText[value] || value}</Tag>;
}

function productStatusTag(value: string) {
  const color: Record<string, string> = { ACTIVE: 'green', DRAFT: 'blue', INACTIVE: 'default', BANNED: 'red' };
  return <Tag color={color[value] || 'default'}>{productStatusText[value] || value}</Tag>;
}

function orderStatusTag(value: string) {
  const color: Record<string, string> = { PENDING: 'gold', CONFIRMED: 'blue', PACKING: 'cyan', SHIPPING: 'purple', DELIVERED: 'green', CANCELLED: 'red' };
  return <Tag color={color[value] || 'default'}>{orderStatusText[value] || value || 'Chờ xác nhận'}</Tag>;
}

function roleColor(value?: string | null) {
  const role = String(value || '').toUpperCase();
  if (role === 'ROOT') return 'red';
  if (role === 'ADMIN') return 'purple';
  if (role === 'SELLER') return 'blue';
  return 'default';
}

function withKeys<T extends { id?: number }>(items: T[] = []) {
  return Array.isArray(items) ? items.map((item) => ({ key: item.id, ...item })) : [];
}
