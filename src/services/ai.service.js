const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/product.model');
const ChatSession = require('../models/chatSession.model');

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
      // 1. Lấy dữ liệu sản phẩm
      const products = await Product.find({ isActive: 1 }).populate('category', 'name').lean();

      // 2. Tạo catalog sản phẩm dạng text để đưa vào system instruction
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

      // 2. Định nghĩa System Instruction
      const systemInstruction = `
Bạn là một nhân viên tư vấn bán hàng (AI Assistant) vô cùng nhiệt tình, chuyên nghiệp, ấm áp và thân thiện tại cửa hàng đồ uống "SipPoint".
Nhiệm vụ của bạn là lắng nghe, hỗ trợ khách hàng và tư vấn các món nước uống phù hợp nhất dựa trên DANH SÁCH SẢN PHẨM HIỆN CÓ dưới đây.

HÃY TUÂN THỦ CÁC NGUYÊN TẮC SAU:
1. XƯNG HÔ: Lịch sự, gần gũi, sử dụng các từ ngữ thân thiện như "Dạ", "ạ", xưng "SipPoint" hoặc "Em" và gọi khách hàng là "Anh/Chị" hoặc "Bạn".
2. TƯ VẤN SẢN PHẨM: Chỉ giới thiệu và tư vấn các sản phẩm có mặt trong danh sách dưới đây. Tuyệt đối KHÔNG tự bịa ra sản phẩm mới không có trong danh sách. Nếu khách hỏi món nước không có trong danh sách, hãy khéo léo xin lỗi và gợi ý một món nước tương tự hoặc nổi bật của quán.
3. CHI TIẾT SẢN PHẨM: Khi khách hỏi về món nước nào đó, hãy giới thiệu tên món, giá cả (luôn dùng VNĐ kèm dấu phân cách hàng ngàn, ví dụ: 30.000 VNĐ) và tình trạng còn hàng hay hết hàng.
4. GỢI Ý ĐI KÈM (UP-SELL/CROSS-SELL):
   - Nếu khách chọn đồ uống, hãy chủ động gợi ý thêm các tùy chọn về size hoặc topping phù hợp (ví dụ: trân châu, thạch...) nếu sản phẩm đó hỗ trợ.
   - Thân thiện gợi ý khách hàng tích điểm thành viên (SipPoint) để nhận các ưu đãi hoặc đổi voucher hấp dẫn.
5. TRÌNH BÀY: Định dạng câu trả lời gọn gàng bằng Markdown (dùng chữ in đậm cho tên đồ uống, sử dụng dấu gạch đầu dòng rõ ràng để khách hàng dễ đọc).

DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA SIPPOINT:
${productCatalog}
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
