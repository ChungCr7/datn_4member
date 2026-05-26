﻿'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import {
  AppstoreOutlined,
  DashboardOutlined,
  MessageOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Layout, Menu, Modal, Popconfirm, Rate, Select, Space, Statistic, Switch, Table, Tabs, Tag, Upload } from 'antd';
import { getConversations, getConversation, sendReply } from '@/services/chatbotService';
import { createMenu, deleteMenu, getMenus, updateMenu } from '@/services/menusService';
import { createMenuItem, createMenuItemOption, deleteMenuItem, deleteMenuItemOption, getMenuItems, updateMenuItem, updateMenuItemOption } from '@/services/menuItemsService';
import { deleteOrder, getOrders, getSellerAnalytics, getSellerOrderItems, updateOrder } from '@/services/ordersService';
import { deleteReview, getReviews, updateReview } from '@/services/reviewsService';
import { createUser, deleteUser, getUsers, updateUser } from '@/services/usersService';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { API_BASE_URL } from '@/lib/config';

const { Header, Sider, Content } = Layout;
const orderStatuses = ['ordered', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'];
const paymentStatuses = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];

export default function AdminDashboard() {
  const { message: messageApi } = App.useApp();
  const { data: session, status } = useSession();
  const router = useRouter();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const currentRole = ((session?.user as any)?.role || '').toLowerCase();
  const isRoot = currentRole === 'root';
  const isAdmin = currentRole === 'admin' || isRoot;

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '', filter: 'all', sortBy: 'createdAt', sortOrder: 'desc' });
  const [meta, setMeta] = useState<any>({});

  const [menus, setMenus] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [sellerAnalytics, setSellerAnalytics] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [details, setDetails] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [menuForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [optionForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || (currentRole !== 'admin' && currentRole !== 'seller' && currentRole !== 'root')) router.push('/auth/signin');
  }, [session, status, router, currentRole]);

  useEffect(() => {
    setQuery((value) => ({ ...value, page: 1, search: '', filter: 'all', sortBy: 'createdAt', sortOrder: 'desc' }));
    setMeta({});
  }, [currentPage]);

  const params = useMemo(() => ({
    search: query.search || undefined,
    filter: query.filter === 'all' ? undefined : query.filter,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  }), [query]);

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      if (currentPage === 'dashboard') {
        const [ordersData, usersData, chatData, analyticsData] = await Promise.all([
          isAdmin ? getOrders(accessToken, 1, 10) : getSellerOrderItems(accessToken, 1, 10),
          isAdmin ? getUsers(accessToken, 1, 10) : Promise.resolve({ users: [], meta: {} }),
          getConversations(accessToken),
          getSellerAnalytics(accessToken),
        ]);
        setOrders(withKeys(isAdmin ? (ordersData as any).orders : (ordersData as any).orderItems));
        setUsers(withKeys(usersData.users));
        setConversations(chatData || []);
        setSellerAnalytics(analyticsData);
      }
      if (currentPage === 'menus') {
        const data = await getMenus(accessToken, query.page, query.limit, params);
        setMenus(withKeys(data.menus));
        setMeta(data.meta);
      }
      if (currentPage === 'items') {
        const [itemsData, menusData] = await Promise.all([
          getMenuItems(accessToken, query.page, query.limit, params),
          getMenus(accessToken, 1, 100),
        ]);
        setMenuItems(withKeys(itemsData.items));
        setMenus(withKeys(menusData.menus));
        setMeta(itemsData.meta);
      }
      if (currentPage === 'orders') {
        const data = isRoot
          ? await getOrders(accessToken, query.page, query.limit, params)
          : await getSellerOrderItems(accessToken, query.page, query.limit, params);
        setOrders(withKeys(isAdmin ? (data as any).orders : (data as any).orderItems));
        setMeta(data.meta);
      }
      if (currentPage === 'users') {
        if (!isAdmin) return;
        const data = await getUsers(accessToken, query.page, query.limit, params);
        setUsers(withKeys(data.users));
        setMeta(data.meta);
      }
      if (currentPage === 'reviews') {
        const data = await getReviews(accessToken, query.page, query.limit, params);
        setReviews(withKeys(data.reviews));
        setMeta(data.meta);
      }
      if (currentPage === 'chat') {
        const data = await getConversations(accessToken);
        setConversations(data || []);
      }
    } catch (err: any) {
      console.error('Admin load failed:', err);
      messageApi.error(`Không t?i đư?c d? li?u. ${err?.message ? String(err.message) : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const withHandledNetworkError = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err: any) {
      console.error('Admin action failed:', err);
      messageApi.error(`Co loi ket noi. ${err?.message ? String(err.message) : ''}`);
    }
  };


  useEffect(() => {
    const timer = window.setTimeout(load, query.search ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [currentPage, accessToken, query.page, query.limit, query.search, query.filter, query.sortBy, query.sortOrder]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${API_BASE_URL}/chatbot`, {
      transports: ['websocket'],
      withCredentials: true,
      auth: { token: accessToken },
    });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('seller_join'));
    socket.on('conversations', (items: any[]) => setConversations(items || []));
    socket.on('conversation', (item: any) => setConversation(item));
    socket.on('conversation_updated', (payload: any) => {
      setConversations(payload?.conversations || []);
      if (payload?.conversation?.conversationId === selectedConversation) {
        setConversation(payload.conversation);
      }
    });
    socket.on('new-message', (payload: any) => {
      if (payload?.conversation?.conversationId === selectedConversation) {
        setConversation(payload.conversation);
      }
    });
    socket.on('seller_message', (payload: any) => {
      if (payload?.conversation?.conversationId === selectedConversation) {
        setConversation(payload.conversation);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, selectedConversation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length]);

  const stats = useMemo(() => ({
    orders: sellerAnalytics?.orderItems ?? orders.length,
    users: users.length,
    revenue: sellerAnalytics?.revenue ?? orders.reduce((sum, order) => sum + Number(order.totalPrice || order.totalPrice || 0), 0),
    chats: conversations.length,
  }), [orders, users, conversations, sellerAnalytics]);

  const tablePagination = {
    current: meta.page || query.page,
    pageSize: meta.limit || query.limit,
    total: meta.total || 0,
    showSizeChanger: true,
    onChange: (page: number, limit: number) => setQuery((value) => ({ ...value, page, limit })),
  };

  const saveMenu = async () => {
    if (!accessToken) return;
    const values = await menuForm.validateFields();
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, value instanceof File ? value : String(value));
    });
    if (editingMenu) await updateMenu(accessToken, editingMenu.id, formData);
    else await createMenu(accessToken, formData);
    afterSave('Da luu menu', setMenuModalOpen, setEditingMenu, menuForm);
  };

  const saveItem = async () => {
    if (!accessToken) return;
    const values = await itemForm.validateFields();
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, value instanceof File ? value : String(value));
    });
    if (editingItem) await updateMenuItem(accessToken, editingItem.id, formData);
    else await createMenuItem(accessToken, formData);
    afterSave('Da luu mon', setItemModalOpen, setEditingItem, itemForm);
  };

  const saveOption = async () => {
    if (!accessToken) return;
    const values = await optionForm.validateFields();
    if (editingOption?.id) await updateMenuItemOption(accessToken, editingOption.id, values);
    else await createMenuItemOption(accessToken, values);
    afterSave('Da luu tuy chon', setOptionModalOpen, setEditingOption, optionForm);
  };

  const saveUser = async () => {
    if (!accessToken) return;
    const values = await userForm.validateFields();
    const payload = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => key !== 'password' || Boolean(String(value || '').trim())),
    );
    const finalPayload = isRoot
      ? payload
      : Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'roleId' && key !== 'roleName'));
    if (editingUser) await updateUser(accessToken, editingUser.id, finalPayload);
    else await createUser(accessToken, finalPayload);
    afterSave('Da luu nguoi dung', setUserModalOpen, setEditingUser, userForm);
  };

  const saveReview = async () => {
    if (!accessToken) return;
    const values = await reviewForm.validateFields();
    await updateReview(accessToken, editingReview.id, values);
    afterSave('Da cap nhat danh gia', setReviewModalOpen, setEditingReview, reviewForm);
  };

  const afterSave = (text: string, close: (value: boolean) => void, setEditing: (value: any) => void, form: any) => {
    messageApi.success(text);
    close(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const toolbar = (filters: Array<{ value: string; label: string }> = []) => (
    <Card className="mb-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_140px]">
        <Input prefix={<SearchOutlined />} allowClear placeholder="Tìm kiếm..." value={query.search} onChange={(event) => setQuery((value) => ({ ...value, page: 1, search: event.target.value }))} />
        <Select value={query.filter} options={[{ value: 'all', label: 'Tất cả' }, ...filters]} onChange={(filter) => setQuery((value) => ({ ...value, page: 1, filter }))} />
        <Select value={query.sortBy} options={sortOptions(currentPage)} onChange={(sortBy) => setQuery((value) => ({ ...value, sortBy }))} />
        <Select value={query.sortOrder} options={[{ value: 'desc', label: 'Giảm dần' }, { value: 'asc', label: 'Tăng dần' }]} onChange={(sortOrder) => setQuery((value) => ({ ...value, sortOrder }))} />
      </div>
    </Card>
  );

  const renderContent = () => {
    if (currentPage === 'dashboard') {
      return (
        <>
          <PageTitle eyebrow="Tổng quan" title="Dashboard" />
          <div className="grid gap-4 md:grid-cols-4">
            <Card><Statistic title="Đơn hàng gần đây" value={stats.orders} /></Card>
            <Card><Statistic title="Doanh thu gần đây" value={stats.revenue} formatter={(value) => formatCurrency(Number(value))} /></Card>
            <Card><Statistic title="Người dùng" value={stats.users} /></Card>
            <Card><Statistic title="Cuộc chat" value={stats.chats} /></Card>
          </div>
        </>
      );
    }

    if (currentPage === 'menus') {
      return (
        <>
          <PageTitle title="Quản lý menu" action={<Button type="primary" onClick={() => openForm(setEditingMenu, menuForm, setMenuModalOpen)}>Thêm menu</Button>} />
          {toolbar([{ value: 'active', label: 'Đang hiển' }, { value: 'inactive', label: 'Đang ẩn' }])}
          <Table loading={loading} dataSource={menus} pagination={tablePagination} scroll={{ x: 760 }} columns={[
            { title: 'ID', dataIndex: 'id', width: 70 },
            { title: 'Tên menu', dataIndex: 'title' },
            { title: 'Mô tả', dataIndex: 'description' },
            { title: 'Thứ tự', dataIndex: 'sortOrder' },
            { title: 'Trạng thái', dataIndex: 'isActive', render: (value) => <StatusTag active={value} activeText="Đang hiển" inactiveText="Ẩn" /> },
            { title: 'Món', dataIndex: ['_count', 'menuItems'] },
            { title: 'Thao tác', fixed: 'right', render: (_, record: any) => (
              <Space>
                <Button size="small" onClick={() => setDetails(record)}>Chi tiết</Button>
                <Button size="small" onClick={() => openForm(setEditingMenu, menuForm, setMenuModalOpen, record)}>Sử a</Button>
                <Popconfirm title="Xóa menu?" onConfirm={async () => { if (!accessToken) return; await deleteMenu(accessToken, record.id); messageApi.success('Đã xóa'); load(); }}>
                  <Button danger size="small">Xóa</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'items') {
      return (
        <>
          <PageTitle title="Quản lý món ăn" action={<Button type="primary" onClick={() => openForm(setEditingItem, itemForm, setItemModalOpen)}>Thêm món</Button>} />
          {toolbar([{ value: 'available', label: 'Đang bán' }, { value: 'hidden', label: 'Tạm ẩn' }])}
          <Table loading={loading} dataSource={menuItems} pagination={tablePagination} expandable={{ expandedRowRender: renderOptions }} scroll={{ x: 960 }} columns={[
            { title: 'ID', dataIndex: 'id', width: 70 },
            { title: 'Tên món', dataIndex: 'title' },
            { title: 'Menu', dataIndex: ['menu', 'title'] },
            { title: 'Giá', dataIndex: 'basePrice', render: (value) => formatCurrency(Number(value)) },
            { title: 'Trạng thái', dataIndex: 'isAvailable', render: (value) => <StatusTag active={value} activeText="Đang bán" inactiveText="Tạm ẩn" /> },
            { title: 'Thao tác', fixed: 'right', render: (_, record: any) => (
              <Space>
                <Button size="small" onClick={() => setDetails(record)}>Chi tiết</Button>
                <Button size="small" onClick={() => openForm(setEditingItem, itemForm, setItemModalOpen, { ...record, image: undefined })}>Sửa</Button>
                <Popconfirm title="Xóa món?" onConfirm={async () => { if (!accessToken) return; await deleteMenuItem(accessToken, record.id); messageApi.success('Đã xóa'); load(); }}>
                  <Button danger size="small">Xóa</Button>
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
          <PageTitle title="Quản lý đơn hàng" />
          {toolbar([...orderStatuses.map((value) => ({ value, label: value })), ...paymentStatuses.map((value) => ({ value: `payment:${value}`, label: `Payment: ${value}` }))])}
          <Table loading={loading} dataSource={orders} pagination={tablePagination} scroll={{ x: 980 }} columns={[
            { title: 'Mã', dataIndex: 'id', render: (id) => `#${id}` },
            { title: 'Khách', render: (_, record: any) => record.customerName || record.user?.name || record.user?.email },
            { title: 'Tổng', dataIndex: 'totalPrice', render: (value) => formatCurrency(Number(value)) },
            { title: 'Thanh toán', render: (_, record: any) => <Tag color={record.paymentStatus === 'paid' ? 'green' : 'orange'}>{record.paymentProvider || 'cash'} - {record.paymentStatus || 'pending'}</Tag> },
            { title: 'Ngày', dataIndex: 'createdAt', render: formatDate },
            { title: 'Trạng thái', dataIndex: 'status', render: (value, record: any) => <InlineSelect value={value} options={orderStatuses} onChange={(statusValue) => updateOrderField(record.id, { status: statusValue })} /> },
            { title: 'Thao tác', fixed: 'right', render: (_, record: any) => (
              <Space>
                <Button size="small" onClick={() => setDetails(record)}>Chi tiết</Button>
                <InlineSelect value={record.paymentStatus || 'pending'} options={paymentStatuses} onChange={(paymentStatus) => updateOrderField(record.id, { paymentStatus })} />
                <Popconfirm title="Xóa đơn hàng?" onConfirm={async () => { if (!accessToken) return; await deleteOrder(accessToken, record.id); messageApi.success('Đã xóa'); load(); }}>
                  <Button danger size="small">Xóa</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'users') {
      return (
        <>
          <PageTitle title="Người dùng" action={<Button type="primary" onClick={() => openForm(setEditingUser, userForm, setUserModalOpen)}>Thêm user</Button>} />
          <Card className="mb-4">
            <Space wrap>
              <Tag color={isRoot ? 'red' : 'blue'}>{isRoot ? 'ROOT' : currentRole === 'admin' ? 'ADMIN' : 'SELLER'}</Tag>
              <span className="text-sm text-slate-600">
                {isRoot
                  ? 'ROOT có quyền đổi ADMIN/SELLER/USER và xóa user. Không thể tạo thêm ROOT.'
                  : 'ADMIN quản lý marketplace; SELLER quản lý shop, sản phẩm, đơn hàng của shop và chat khách hàng.'}
              </span>
            </Space>
          </Card>
          {toolbar()}
          <Table loading={loading} dataSource={users} pagination={tablePagination} scroll={{ x: 800 }} columns={[
            { title: 'ID', dataIndex: 'id' },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Role', dataIndex: ['role', 'name'], render: (value) => <Tag color={String(value).toLowerCase() === 'root' ? 'red' : String(value).toLowerCase() === 'admin' ? 'purple' : String(value).toLowerCase() === 'seller' ? 'blue' : 'default'}>{value || 'USER'}</Tag> },
            { title: 'Điện thoại', dataIndex: 'phone' },
            { title: 'Địa chỉ', dataIndex: 'address' },
            { title: 'Ngày tạo', dataIndex: 'createdAt', render: formatDate },
            { title: 'Thao tác', fixed: 'right', render: (_, record: any) => (
              <Space>
                <Button size="small" onClick={() => openForm(setEditingUser, userForm, setUserModalOpen, record)}>Sửa</Button>
                {isRoot && record.id !== (session?.user as any)?.id && (
                  <Popconfirm title="Xóa người dùng?" onConfirm={async () => { if (!accessToken) return; await deleteUser(accessToken, record.id); messageApi.success('Đã xóa'); load(); }}>
                    <Button danger size="small">Xóa</Button>
                  </Popconfirm>
                )}
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'reviews') {
      return (
        <>
          <PageTitle title="Đánh giá" />
          {toolbar()}
          <Table loading={loading} dataSource={reviews} pagination={tablePagination} scroll={{ x: 820 }} columns={[
            { title: 'ID', dataIndex: 'id' },
            { title: 'Món', dataIndex: ['menuItem', 'title'] },
            { title: 'Khách', render: (_, record: any) => record.user?.name || record.user?.email },
            { title: 'Đi?m', dataIndex: 'rating', render: (value) => <Rate disabled value={value} /> },
            { title: 'B?nh lu?n', dataIndex: 'comment' },
            { title: 'Thao tác', fixed: 'right', render: (_, record: any) => (
              <Space>
                <Button size="small" onClick={() => setDetails(record)}>Chi ti?t</Button>
                <Button size="small" onClick={() => openForm(setEditingReview, reviewForm, setReviewModalOpen, record)}>S?a</Button>
                <Popconfirm title="Xóa đánh giá?" onConfirm={async () => { if (!accessToken) return; await deleteReview(accessToken, record.id); messageApi.success('Đ? xóa'); load(); }}>
                  <Button danger size="small">Xóa</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
        </>
      );
    }

    if (currentPage === 'chat') {
      return (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card title="Cu?c chat">
            <Input className="mb-3" prefix={<SearchOutlined />} placeholder="L?c nhanh cu?c chat" onChange={(event) => setQuery((value) => ({ ...value, search: event.target.value }))} />
            <div className="space-y-2">
              {conversations.filter((item) => JSON.stringify(item).toLowerCase().includes(query.search.toLowerCase())).map((item) => (
                <button key={item.conversationId} className={`w-full rounded-lg border p-3 text-left ${selectedConversation === item.conversationId ? 'border-blue-400 bg-blue-50' : 'bg-white'}`} onClick={() => selectConversation(item.conversationId)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{item.title || `User #${item.user?.id || item.conversationId}`}</span>
                    {item.unreadCount ? <Tag color="red">{item.unreadCount}</Tag> : null}
                  </div>
                  <div className="truncate text-xs text-gray-500">{item.lastMessage}</div>
                </button>
              ))}
            </div>
          </Card>
          <Card title={selectedConversation ? `Chat ${conversation?.user?.name || conversation?.user?.email || `#${selectedConversation}`}` : 'Ch?n cu?c chat'}>
            {conversation?.user ? (
              <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="font-semibold">{conversation.user.name || 'Khách hàng'}</div>
                <div className="text-slate-600">{conversation.user.email}</div>
                <div className="text-slate-600">{conversation.user.phone || 'Chưa có s? đi?n tho?i'} · {conversation.user.address || 'Chưa có đ?a ch?'}</div>
              </div>
            ) : null}
            <div className="h-[460px] space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
              {(conversation?.messages || []).map((item: any) => (
                <div key={item.id || `${item.role}-${item.timestamp}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-lg px-3 py-2 text-sm ${item.role === 'user' ? 'bg-blue-600 text-white' : item.role === 'admin' ? 'bg-purple-100' : item.role === 'seller' ? 'bg-emerald-100' : 'bg-white'}`}>
                    <p>{item.text}</p>
                    <p className="mt-1 text-[11px] opacity-70">{formatDateTime(item.timestamp)}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="mt-4 flex gap-2">
              <Input.TextArea placeholder="Trả lời khách..." value={reply} onChange={(e) => setReply(e.target.value)} rows={2} />
              <Button type="primary" disabled={!selectedConversation || !reply.trim()} onClick={sendSellerReply}>G?i</Button>
            </div>
          </Card>
        </div>
      );
    }

    return null;
  };

  const renderOptions = (record: any) => (
    <div>
      <Button className="mb-3" size="small" onClick={() => openForm(setEditingOption, optionForm, setOptionModalOpen, { menuItemId: record.id, isAvailable: true })}>Thêm option</Button>
      <Table size="small" pagination={false} dataSource={withKeys(record.options || [])} columns={[
        { title: 'Tên', dataIndex: 'title' },
        { title: 'Giá thêm', dataIndex: 'additionalPrice', render: (value) => formatCurrency(Number(value)) },
        { title: 'Mô t?', dataIndex: 'optionalDescription' },
        { title: 'Tr?ng thái', dataIndex: 'isAvailable', render: (value) => <StatusTag active={value !== false} activeText="Đang bán" inactiveText="T?m ?n" /> },
        { title: 'Thao tác', render: (_, option: any) => (
          <Space>
            <Button size="small" onClick={() => openForm(setEditingOption, optionForm, setOptionModalOpen, { ...option, menuItemId: record.id })}>S?a</Button>
            <Popconfirm title="Xóa option?" onConfirm={async () => { if (!accessToken) return; await deleteMenuItemOption(accessToken, option.id); messageApi.success('Đ? xóa'); load(); }}>
              <Button danger size="small">Xóa</Button>
            </Popconfirm>
          </Space>
        ) },
      ]} />
    </div>
  );

  const updateOrderField = async (orderId: number, data: any) => {
    if (!accessToken) return;
    await updateOrder(accessToken, orderId, data);
    messageApi.success('Đ? c?p nh?t đơn hàng');
    load();
  };

  const selectConversation = async (conversationId: number) => {
    if (!accessToken) return;
    setSelectedConversation(conversationId);
    socketRef.current?.emit('seller_join_conversation', { conversationId });
    setConversation(await getConversation(conversationId, accessToken));
  };

  const sendSellerReply = async () => {
    if (!accessToken || !selectedConversation || !reply.trim()) return;
    const text = reply;
    setReply('');
    if (socketRef.current?.connected) {
      socketRef.current.emit('seller_reply', { conversationId: selectedConversation, text });
    } else {
      await sendReply(selectedConversation, text, accessToken);
      await selectConversation(selectedConversation);
      load();
    }
  };

  if (status === 'loading') return <div className="grid min-h-screen place-items-center">Loading...</div>;
  if (!session?.user || (currentRole !== 'admin' && currentRole !== 'seller' && currentRole !== 'root')) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg">
        <div className="grid h-16 place-items-center border-b border-white/10 font-bold text-white">{collapsed ? 'SD' : 'ShopDoAn Seller'}</div>
        <Menu theme="dark" mode="inline" selectedKeys={[currentPage]} onClick={({ key }) => setCurrentPage(String(key))} items={[
          { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
          { key: 'menus', icon: <AppstoreOutlined />, label: 'Menu' },
          { key: 'items', icon: <AppstoreOutlined />, label: 'Món ăn' },
          { key: 'orders', icon: <ShoppingCartOutlined />, label: 'Đơn hàng' },
          ...(isAdmin ? [{ key: 'users', icon: <UserOutlined />, label: 'Người dùng' }] : []),
          { key: 'reviews', icon: <StarOutlined />, label: 'Đánh giá' },
          { key: 'chat', icon: <MessageOutlined />, label: 'Chat' },
        ]} />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <span className="font-semibold text-slate-800">ĐỒ ÁN TỐT NGHIỆP</span>
          <Space>
            <span>{session.user?.name}</span>
            <Button onClick={() => signOut({ callbackUrl: '/auth/signin' })}>Đăng xuất</Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>{renderContent()}</Content>
      </Layout>

      <MenuModal open={menuModalOpen} editing={editingMenu} form={menuForm} onOk={saveMenu} onCancel={() => setMenuModalOpen(false)} />
      <ItemModal open={itemModalOpen} editing={editingItem} form={itemForm} menus={menus} onOk={saveItem} onCancel={() => setItemModalOpen(false)} />
      <OptionModal open={optionModalOpen} editing={editingOption} form={optionForm} onOk={saveOption} onCancel={() => setOptionModalOpen(false)} />
      <UserModal open={userModalOpen} editing={editingUser} form={userForm} canManageRoles={isRoot} onOk={saveUser} onCancel={() => setUserModalOpen(false)} />
      <ReviewModal open={reviewModalOpen} form={reviewForm} onOk={saveReview} onCancel={() => setReviewModalOpen(false)} />
      <Drawer title="Chi tiết" open={Boolean(details)} onClose={() => setDetails(null)} size="large">
        <Descriptions bordered column={1} size="small">
          {Object.entries(details || {}).filter(([_, value]) => typeof value !== 'object' || value === null).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>{String(value ?? '')}</Descriptions.Item>
          ))}
        </Descriptions>
        {details?.details ? <Tabs className="mt-4" items={[{ key: 'items', label: 'Món trong đơn', children: <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">{JSON.stringify(details.details, null, 2)}</pre> }]} /> : null}
      </Drawer>
    </Layout>
  );
}

function PageTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-medium text-teal-700">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
      </div>
      {action}
    </div>
  );
}

function StatusTag({ active, activeText, inactiveText }: { active: boolean; activeText: string; inactiveText: string }) {
  return <Tag color={active ? 'green' : 'red'}>{active ? activeText : inactiveText}</Tag>;
}

function InlineSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <Select size="small" value={value} style={{ minWidth: 130 }} onChange={onChange} options={options.map((item) => ({ value: item, label: item }))} />;
}

function MenuModal({ open, editing, form, onOk, onCancel }: any) {
  return (
    <Modal title={editing ? 'Sửa menu' : 'Thêm menu'} open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Tên menu" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} className="w-full" /></Form.Item>
        <Form.Item name="isActive" label="Hiển thị" valuePropName="checked" initialValue><Switch /></Form.Item>
        <Form.Item name="image" label="Ảnh menu" valuePropName="file" getValueFromEvent={(event) => event?.fileList?.[0]?.originFileObj}>
          <Upload beforeUpload={() => false} maxCount={1} accept="image/*" listType="picture">
            <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ItemModal({ open, editing, form, menus, onOk, onCancel }: any) {
  return (
    <Modal title={editing ? 'Sửa món' : 'Thêm món'} open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Tên món" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="menuId" label="Menu" rules={[{ required: true }]}><Select options={menus.map((menu: any) => ({ value: menu.id, label: menu.title }))} /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="basePrice" label="Giá" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} className="w-full" /></Form.Item>
        <Form.Item name="isAvailable" label="Đang bán" valuePropName="checked" initialValue><Switch /></Form.Item>
        <Form.Item name="image" label="Ảnh món" valuePropName="file" getValueFromEvent={(event) => event?.fileList?.[0]?.originFileObj}>
          <Upload beforeUpload={() => false} maxCount={1} accept="image/*" listType="picture">
            <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function OptionModal({ open, editing, form, onOk, onCancel }: any) {
  return (
    <Modal title={editing?.id ? 'Sửa option' : 'Thêm option'} open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="menuItemId" hidden><InputNumber /></Form.Item>
        <Form.Item name="title" label="Tên option" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="additionalPrice" label="Giá thêm" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item>
        <Form.Item name="optionalDescription" label="Mô tả"><Input /></Form.Item>
        <Form.Item name="isAvailable" label="Đang bán" valuePropName="checked" initialValue><Switch /></Form.Item>
      </Form>
    </Modal>
  );
}

function UserModal({ open, editing, form, canManageRoles, onOk, onCancel }: any) {
  const isRootAccount = String(editing?.role?.name || editing?.roleName || '').toLowerCase() === 'root';
  return (
    <Modal title={editing ? 'Sửa người dùng' : 'Thêm người dùng'} open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}><Input /></Form.Item>
        <Form.Item name="password" label="Mật khẩu"><Input.Password placeholder={editing ? 'Bỏ trống nếu không đổi' : 'Mặc định User@123456 nếu bỏ trống'} /></Form.Item>
        <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
        <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
        {canManageRoles ? (
          <Form.Item name="roleName" label="Quyền" initialValue="USER">
            <Select
              disabled={isRootAccount}
              options={[
                { value: 'USER', label: 'USER' },
                { value: 'SELLER', label: 'SELLER' },
                { value: 'ADMIN', label: 'ADMIN' },
              ]}
            />
          </Form.Item>
        ) : null}
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue><Switch /></Form.Item>
      </Form>
    </Modal>
  );
}

function ReviewModal({ open, form, onOk, onCancel }: any) {
  return (
    <Modal title="Sửa đánh giá" open={open} onOk={onOk} onCancel={onCancel} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="rating" label="Điểm" rules={[{ required: true }]}><InputNumber min={1} max={5} className="w-full" /></Form.Item>
        <Form.Item name="comment" label="Bình luận"><Input.TextArea rows={4} /></Form.Item>
        <Form.Item name="image" label="Ảnh"><Input /></Form.Item>
      </Form>
    </Modal>
  );
}

function openForm(setEditing: (value: any) => void, form: any, setOpen: (value: boolean) => void, record?: any) {
  setEditing(record || null);
  form.resetFields();
  if (record) form.setFieldsValue(record);
  setOpen(true);
}

function sortOptions(page: string) {
  const common = [{ value: 'createdAt', label: 'Ngày tạo' }];
  if (page === 'menus') return [{ value: 'sortOrder', label: 'Thứ tự' }, { value: 'title', label: 'Tên' }, ...common];
  if (page === 'items') return [{ value: 'sortOrder', label: 'Thứ tự' }, { value: 'title', label: 'Tên' }, { value: 'basePrice', label: 'Giá' }, ...common];
  if (page === 'orders') return [{ value: 'totalPrice', label: 'Tổng tiền' }, { value: 'status', label: 'Trạng thái' }, { value: 'paymentStatus', label: 'Thanh toán' }, ...common];
  return common;
}

function withKeys(items: any[] = []) {
  return items.map((item) => ({ key: item.id, ...item }));
}