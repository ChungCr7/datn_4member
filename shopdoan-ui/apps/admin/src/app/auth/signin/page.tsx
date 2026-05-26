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
      if (role === 'admin' || role === 'seller' || role === 'root') {
        router.push('/');
      }
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
        messageApi.error('Email hoac mat khau khong dung, hoac ban khong co quyen truy cap admin/seller/root');
      } else if (result?.ok) {
        messageApi.success('Đăng nhập thành công');
        setRedirecting(true);
        window.setTimeout(() => {
          router.push('/');
        }, 500);
      }
    } catch {
      messageApi.error('Co loi xay ra. Vui long thu lai.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Spin size="large" description={redirecting ? 'Đang chuyển hướng...' : 'Đang tải...'} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">ShopDoan Seller</h1>
          <p className="mt-2 text-gray-600">Đăng nhập vào hệ thống quản trị</p>
        </div>

        <Form name="admin-signin" onFinish={onFinish} layout="vertical" size="large" autoComplete="on">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui long nhap email!' },
              { type: 'email', message: 'Email khong hop le!' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email admin"
              disabled={loading || redirecting}
              autoComplete="email"
              suppressHydrationWarning
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui long nhap mat khau!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
              disabled={loading || redirecting}
              autoComplete="current-password"
              suppressHydrationWarning
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading || redirecting}
              suppressHydrationWarning
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-4 text-center">
          <Button
            type="link"
            onClick={() => router.push('/')}
            disabled={loading || redirecting}
            suppressHydrationWarning
          >
            Quay lai trang chu
          </Button>
        </div>
      </Card>
    </div>
  );
}
