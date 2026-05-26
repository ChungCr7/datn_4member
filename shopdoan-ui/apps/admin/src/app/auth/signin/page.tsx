'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Form, Input, Spin } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

type SessionUser = {
  role?: string;
};

export default function AdminSignIn() {
  const { message: messageApi } = App.useApp();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const user = session.user as SessionUser;
      const role = user.role?.toLowerCase();
      if (role === 'admin' || role === 'root') router.push('/');
    }
  }, [status, session, router]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        messageApi.error('Email hoặc mật khẩu không đúng, hoặc tài khoản không có quyền quản trị.');
      } else if (result?.ok) {
        messageApi.success('Đăng nhập thành công');
        setRedirecting(true);
        window.setTimeout(() => router.push('/'), 500);
      }
    } catch {
      messageApi.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spin size="large" tip={redirecting ? 'Đang chuyển hướng...' : 'Đang tải...'} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-950">ShopDoAn Admin</h1>
          <p className="mt-2 text-slate-600">Đăng nhập hệ thống quản trị sàn thương mại</p>
        </div>

        <Form name="admin-signin" onFinish={onFinish} layout="vertical" size="large" autoComplete="on">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email.' },
              { type: 'email', message: 'Email không hợp lệ.' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email admin" disabled={loading || redirecting} autoComplete="email" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" disabled={loading || redirecting} autoComplete="current-password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full" loading={loading || redirecting}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
