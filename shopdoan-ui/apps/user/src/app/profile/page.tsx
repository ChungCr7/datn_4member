'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { User, Mail, Phone, MapPin, Settings, LogOut, Upload, Lock } from 'lucide-react';
import { getCurrentUser, updateUserProfile, uploadProfileImage } from '@/services/usersService';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorField, setErrorField] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    if (!accessToken) return;

    getCurrentUser(accessToken)
      .then((user) => {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
        });
        if (user.image) {
          setImagePreview(user.image);
        }
      })
      .catch(() => setMessage('Không tải được thông tin hồ sơ.'));
  }, [accessToken]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrorField('');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setMessage('Vui lòng chọn file ảnh hợp lệ (JPEG, PNG, GIF, WebP)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Kích thước ảnh không được vượt quá 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!accessToken) return;

    setSaving(true);
    setMessage('');
    setErrorField('');

    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      };

      // Update profile data first
      const user = await updateUserProfile(accessToken, updateData);
      
      // Upload image if a new one was selected
      if (imageFile) {
        const userWithImage = await uploadProfileImage(accessToken, imageFile);
        setImagePreview(userWithImage.image || '');
      }
      
      setFormData({
        name: user.name || '',
        email: user.email || formData.email,
        phone: user.phone || '',
        address: user.address || '',
      });
      setImageFile(null);
      setIsEditing(false);
      setMessage('Đã cập nhật hồ sơ thành công!');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Không lưu được hồ sơ. Vui lòng thử lại.';
      setMessage(errorMsg);
      if (errorMsg.includes('email')) {
        setErrorField('email');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!accessToken) return;

    // Validate passwords
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage('Vui lòng điền đầy đủ mật khẩu');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('Mật khẩu mới không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await updateUserProfile(accessToken, {
        password: passwordData.newPassword,
        oldPassword: passwordData.oldPassword,
      });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      setMessage('Đã đổi mật khẩu thành công!');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không đổi được mật khẩu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {status === 'loading' ? (
          <div className="py-16 text-center text-gray-500">Đang tải thông tin tài khoản...</div>
        ) : session ? (
          <div>
            {message && (
              <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
                message.includes('thành công') || message.includes('Đã')
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {imagePreview ? (
                  <img src={imagePreview} alt="Avatar" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 text-4xl font-bold text-white">
                    {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold">{session.user?.name || 'Khách hàng'}</h1>
                  <p className="mt-1 text-gray-500">Thành viên ShopDoan</p>
                </div>
              </div>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
                >
                  <Settings className="mr-2 inline h-5 w-5" />
                  Chỉnh sửa hồ sơ
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Ảnh đại diện</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="h-4 w-4" />
                        Chọn ảnh
                      </button>
                      {imagePreview && (
                        <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Tên</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                    />
                    <p className="mt-1 text-xs text-gray-500">Không thể thay đổi email</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Điện thoại</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="0123456789"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Địa chỉ</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập địa chỉ giao hàng"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      disabled={saving} 
                      onClick={handleSaveProfile} 
                      className="rounded-lg bg-blue-500 px-6 py-3 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)} 
                      className="rounded-lg bg-gray-200 px-6 py-3 text-gray-800 hover:bg-gray-300"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
                    <User className="mt-1 h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Tên</p>
                      <p className="text-lg font-semibold">{session.user?.name || 'Khách hàng'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
                    <Mail className="mt-1 h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-lg font-semibold">{session.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
                    <Phone className="mt-1 h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Điện thoại</p>
                      <p className="text-lg font-semibold">{formData.phone || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
                    <MapPin className="mt-1 h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Địa chỉ</p>
                      <p className="text-lg font-semibold">{formData.address || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center justify-center gap-2 flex-1 rounded-lg bg-amber-500 px-6 py-3 text-white hover:bg-amber-600"
              >
                <Lock className="h-5 w-5" />
                Đổi mật khẩu
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center justify-center gap-2 flex-1 rounded-lg bg-red-500 px-6 py-3 text-white hover:bg-red-600"
              >
                <LogOut className="h-5 w-5" />
                Đăng xuất
              </button>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
              <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                  <h2 className="mb-4 text-xl font-bold">Đổi mật khẩu</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Mat khau hien tai</label>
                      <input
                        type="password"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Mật khẩu mới</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2"
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Xác nhận mật khẩu</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2"
                        placeholder="Xác nhận mật khẩu"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleChangePassword}
                        disabled={saving}
                        className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-60"
                      >
                        {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
                      </button>
                      <button
                        onClick={() => setShowPasswordModal(false)}
                        className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-white py-16 text-center">
            <p className="text-lg text-gray-600">Bạn chưa đăng nhập. Vui lòng đăng nhập để xem hồ sơ.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
