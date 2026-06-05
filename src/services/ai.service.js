const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const ChatSession = require('../models/chatSession.model');
const Voucher = require('../models/voucher.model');
const Customer = require('../models/customer.model');

// Sử dụng biến môi trường
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra .env');
}
// Debug: Log API key (không log full key, chỉ 10 ký tự đầu)
if (apiKey) {
  console.log('[AI Service] API Key loaded:', apiKey.substring(0, 10) + '...');
}
const genAI = new GoogleGenerativeAI(apiKey);

class AIService {
  static async chatWithProducts(userMessage, sessionId) {
    try {
      // 1. Lấy dữ liệu sản phẩm, khuyến mãi và thông tin khách hàng từ DB song song
      const isObjectId = mongoose.Types.ObjectId.isValid(sessionId);
      
      const [products, vouchers, customer] = await Promise.all([
        Product.find({ isActive: 1 }).populate('category', 'name').lean(),
        Voucher.find({ isActive: 1, endDate: { $gt: new Date() } }).lean(),
        isObjectId 
          ? Customer.findById(sessionId).lean() 
          : Customer.findOne({ $or: [{ customerId: sessionId }, { phone: sessionId }, { email: sessionId }] }).lean(),
      ]);

      // 2. Tạo catalog sản phẩm dạng text
      let productCatalog = 'Hiện tại cửa hàng đang cập nhật sản phẩm. Vui lòng quay lại sau.';
      if (products && products.length) {
        productCatalog = products
          .map((p) => {
            const price =
              typeof p.price === 'number' ? p.price.toLocaleString('vi-VN') + ' VNĐ' : 'Liên hệ';
            const category = p.category && p.category.name ? p.category.name : 'Chung';
            const stock =
              typeof p.stock === 'number' && p.stock > 0 ? `Còn ${p.stock} sản phẩm` : 'Hết hàng';
            return `- ${p.name} | Category: ${category} | Giá: ${price} | ${stock}`;
          })
          .join('\n');
      }

      // 3. Tạo danh sách Voucher khuyến mãi dạng text
      let voucherCatalog = 'Hiện tại cửa hàng không có mã giảm giá nào đang diễn ra.';
      if (vouchers && vouchers.length) {
        voucherCatalog = vouchers
          .map((v) => {
            const discountStr =
              v.discountType === 0
                ? `${v.discountValue}%`
                : `${v.discountValue.toLocaleString('vi-VN')} VNĐ`;
            const minOrder =
              v.minOrderValue > 0
                ? `Đơn tối thiểu: ${v.minOrderValue.toLocaleString('vi-VN')} VNĐ`
                : 'Mọi đơn hàng';
            const maxDiscount =
              v.discountType === 0 && v.maxDiscountLimit
                ? ` (Giảm tối đa: ${v.maxDiscountLimit.toLocaleString('vi-VN')} VNĐ)`
                : '';
            return `- Mã: **${v.code}** | ${v.title} (${v.description || ''}) | Giảm: ${discountStr}${maxDiscount} | ${minOrder}`;
          })
          .join('\n');
      }

      // 4. Tạo thông tin khách hàng nếu tìm thấy
      let customerInfoText = '';
      if (customer) {
        customerInfoText = `
THÔNG TIN KHÁCH HÀNG ĐANG TRÒ CHUYỆN:
- Tên đầy đủ: ${customer.fullName}
- Số điện thoại: ${customer.phone}
- Hạng thành viên: ${customer.tier}
- Điểm tích lũy hiện có (SipPoints): ${customer.currentPoints} điểm
- Tổng chi tiêu tích lũy: ${customer.totalSpent.toLocaleString('vi-VN')} VNĐ

HƯỚNG DẪN RIÊNG CHO KHÁCH HÀNG NÀY:
- Hãy chào khách hàng bằng tên riêng (${customer.fullName}) một cách lịch sự, thân mật (Ví dụ: "Dạ, SipPoint xin chào anh/chị ${customer.fullName} ạ!").
- Khi khách hàng hỏi về điểm số, hạng thành viên, hoặc tổng chi tiêu, hãy trả lời chính xác số liệu trên của họ.
`;
      }

      // 5. Định nghĩa System Instruction
      const systemInstruction = `
Bạn là một nhân viên tư vấn bán hàng (AI Assistant) vô cùng nhiệt tình, chuyên nghiệp, ấm áp và thân thiện tại cửa hàng đồ uống "SipPoint".
Nhiệm vụ của bạn là lắng nghe, hỗ trợ khách hàng và tư vấn các món nước uống cũng như các chương trình khuyến mãi phù hợp nhất dựa trên danh sách dữ liệu thực tế từ hệ thống.
${customerInfoText}
HÃY TUÂN THỦ CÁC NGUYÊN TẮC SAU:
1. XƯNG HÔ: Lịch sự, gần gũi, sử dụng các từ ngữ thân thiện như "Dạ", "ạ", xưng "SipPoint" hoặc "Em" và gọi khách hàng là "Anh/Chị" hoặc "Bạn". (Chào bằng tên riêng nếu có thông tin khách hàng ở trên).
2. TƯ VẤN SẢN PHẨM: Chỉ giới thiệu và tư vấn các sản phẩm có mặt trong DANH SÁCH SẢN PHẨM dưới đây. Tuyệt đối KHÔNG tự bịa ra sản phẩm mới. Nếu khách hỏi món nước không có trong danh sách, hãy khéo léo xin lỗi và gợi ý một món nước tương tự hoặc nổi bật của quán.
3. CHI TIẾT SẢN PHẨM: Khi khách hỏi về món nước nào đó, hãy giới thiệu tên món, giá cả (luôn dùng VNĐ kèm dấu phân cách hàng ngàn, ví dụ: 30.000 VNĐ) và tình trạng còn hàng hay hết hàng.
4. GỢI Ý ĐI KÈM (UP-SELL/CROSS-SELL):
   - Nếu khách chọn đồ uống, hãy chủ động gợi ý thêm các tùy chọn về size hoặc topping phù hợp (ví dụ: trân châu, thạch...) nếu sản phẩm đó hỗ trợ.
   - Thân thiện gợi ý khách hàng tích điểm thành viên (SipPoint) để nhận các ưu đãi hoặc đổi voucher hấp dẫn.
5. VOUCHER & KHUYẾN MÃI: Khi khách hỏi về khuyến mãi, giảm giá, hoặc ưu đãi, hãy giới thiệu các mã voucher đang hoạt động từ danh sách dưới đây. Giải thích rõ điều kiện sử dụng (như đơn tối thiểu, mức giảm tối đa) và hướng dẫn khách copy mã để áp dụng khi thanh toán.
6. TRÌNH BÀY: Định dạng câu trả lời gọn gàng bằng Markdown (dùng chữ in đậm cho tên đồ uống, mã voucher, sử dụng dấu gạch đầu dòng rõ ràng để khách hàng dễ đọc).

VÍ DỤ HỘI THOẠI MẪU (BẮT CHƯỚC PHONG CÁCH NÀY):
- Khách: "Quán có món nước nào ngon không em?"
- AI: "Dạ, SipPoint xin chào bạn! Hiện tại quán đang có món **Trà sữa Trân Châu Hoàng Gia** thơm ngon đậm vị trà, béo ngậy vị sữa với giá là 35.000 VNĐ ạ. Ngoài ra, bạn có thể gọi thêm topping trân châu đen (8.000 VNĐ) hoặc nâng lên Size L (+5.000 VNĐ) để uống cho đã hơn nha. Bạn có muốn đặt thử món này không ạ?"

- Khách: "Tôi đang tích lũy được bao nhiêu điểm rồi em?"
- AI: "Dạ thưa anh/chị, hiện tại tài khoản của anh/chị trên hệ thống đang có **150 điểm** tích lũy (SipPoints) và đạt hạng thành viên **BẠC** ạ. Anh/Chị chỉ cần tích thêm 50 điểm nữa là sẽ được nâng lên hạng **VÀNG** để nhận thêm nhiều voucher giảm 20% của quán đó ạ!"

- Khách: "Quán mình có chương trình khuyến mãi hay voucher nào áp dụng được không?"
- AI: "Dạ hiện tại SipPoint đang có ưu đãi cực hot dành cho bạn ạ! Quán đang có mã giảm giá sau đang hoạt động:
  - Mã: **SIPNEW** | Giảm 10% cho đơn hàng (Giảm tối đa: 20.000 VNĐ) | Áp dụng cho đơn tối thiểu từ 50.000 VNĐ trở lên.
  Bạn chỉ cần copy mã **SIPNEW** này nhập vào ô Khuyến mãi lúc đặt hàng để được giảm giá nhé ạ. Bạn có cần em tư vấn thêm đồ uống ngon nào để áp mã này không ạ?"

- Khách: "Tôi muốn đặt một ly nâu đá"
- AI: "Dạ, SipPoint xin chào bạn! Rất tiếc hiện tại quán chưa cập nhật món cà phê nâu đá vào thực đơn hôm nay ạ. Tuy nhiên, quán đang có món **Cà Phê Muối Biển** và **Bạc Xỉu Đá** cực kỳ đậm đà và được nhiều khách hàng yêu thích với giá chỉ từ 29.000 VNĐ thôi ạ. Bạn có muốn uống thử một trong hai món này thay thế không ạ?"

- Khách: "Cảm ơn em"
- AI: "Dạ không có gì ạ! SipPoint rất hân hạnh được phục vụ bạn. Nếu bạn cần tư vấn thêm món nước nào hay muốn kiểm tra điểm tích lũy thành viên, cứ nhắn em hỗ trợ nha. Chúc bạn một ngày tốt lành ạ! ✨"

DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA SIPPOINT:
${productCatalog}

DANH SÁCH VOUCHER KHUYẾN MÃI ĐANG HOẠT ĐỘNG:
${voucherCatalog}
      `;

      // Khởi tạo model
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        systemInstruction: systemInstruction,
      });

      // 3. Lấy hoặc tạo mới Session trong DB
      let chatSession = await ChatSession.findOne({ sessionId });
      if (!chatSession) {
        chatSession = new ChatSession({ sessionId, messages: [] });
      }

      // 4. Bắt đầu chat với lịch sử từ DB
      // Lưu ý: Lịch sử DB đã lưu theo chuẩn {role: 'user'/'model', parts: [{text: '...'}]}
      const chat = model.startChat({
        history: chatSession.messages.map((msg) => ({
          role: msg.role,
          parts: msg.parts.map((p) => ({ text: p.text })),
        })),
      });

      // 5. Gửi tin nhắn mới
      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      // 6. Lưu tin nhắn của User và AI vào DB
      chatSession.messages.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });
      chatSession.messages.push({
        role: 'model',
        parts: [{ text: text }],
      });

      await chatSession.save();

      return text;
    } catch (error) {
      console.error('Lỗi Gemini AI:', error);
      throw new Error(`Lỗi từ Google Gemini: ${error.message}`);
    }
  }
}

module.exports = AIService;
