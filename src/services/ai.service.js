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
Bạn là một nhân viên tư vấn bán hàng nhiệt tình, chuyên nghiệp và thân thiện của cửa hàng chúng tôi.
Nhiệm vụ của bạn là trả lời các câu hỏi của khách hàng dựa vào DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG dưới đây.
Tuyệt đối không bịa đặt sản phẩm không có trong danh sách. Nếu khách hỏi sản phẩm không có, hãy xin lỗi và gợi ý các sản phẩm tương tự có trong cửa hàng.
Luôn báo giá bằng VNĐ và thông báo tình trạng còn hàng nếu có thể.

DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG:
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
