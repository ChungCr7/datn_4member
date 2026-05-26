import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Chatbot from '@/components/ui/Chatbot';

export default function ChatbotPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold">AI Chatbot</h1>
        <p className="mt-2 text-slate-600">Hỏi menu, gợi ý món và thêm món vào giỏ hàng bằng ngôn ngữ tự nhiên.</p>
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Bấm nút chat ở góc phải để bắt đầu. Chatbot sẽ lưu lịch sử hỏi đáp và gợi ý món từ menu hiện tại.
        </div>
      </main>
      <Footer />
      <Chatbot defaultOpen />
    </div>
  );
}
