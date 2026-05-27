import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Chatbot from "@/components/ui/Chatbot";

export default function ChatbotPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-orange-500">
            ShopDoan Assistant
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Trợ lý mua sắm AI nội bộ
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Chatbot này dùng engine nội bộ có ghi nhớ sở thích, hiểu ngữ cảnh
            hội thoại và dữ liệu sản phẩm trong hệ thống. Bạn có thể tìm sản
            phẩm, hỏi giá, so sánh lựa chọn, thêm món vừa gợi ý vào giỏ, kiểm
            tra đơn hàng, hỏi thanh toán, vận chuyển và đăng ký bán hàng.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info
            title="Tìm sản phẩm"
            text="Ví dụ: tìm iPhone dưới 30 triệu, tai nghe bluetooth đang giảm giá."
          />
          <Info
            title="Hiểu câu nối tiếp"
            text="Ví dụ: so sánh mấy món này, thêm cái đầu tiên vào giỏ."
          />
          <Info
            title="Học sở thích"
            text="Ví dụ: gợi ý sản phẩm hợp với tôi, tìm món dưới 500k như lần trước."
          />
        </div>
      </main>
      <Footer />
      <Chatbot defaultOpen />
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
