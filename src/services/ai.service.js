const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const ChatSession = require('../models/chatSession.model');
const Voucher = require('../models/voucher.model');
const Customer = require('../models/customer.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const Order = require('../models/order.model');
const { OrderItem } = require('../models/orderItem.model');

// Sử dụng biến môi trường Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra .env');
}
if (apiKey) {
  console.log('[AI Service] API Key loaded:', apiKey.substring(0, 10) + '...');
}
const genAI = new GoogleGenerativeAI(apiKey);

// Sử dụng biến môi trường Gemini dự phòng
const apiKeyBackup = process.env.GEMINI_API_KEY_BACKUP;
let genAIBackup = null;
if (apiKeyBackup) {
  console.log('[AI Service] API Key Backup loaded:', apiKeyBackup.substring(0, 10) + '...');
  genAIBackup = new GoogleGenerativeAI(apiKeyBackup);
} else {
  console.warn('GEMINI_API_KEY_BACKUP chưa được cấu hình. Chỉ sử dụng 1 khóa Gemini chính.');
}

// Sử dụng biến môi trường OpenAI làm dự phòng
const openaiApiKey = process.env.OPENAI_API_KEY;
let openai = null;
if (openaiApiKey) {
  console.log('[AI Service] OpenAI API Key loaded:', openaiApiKey.substring(0, 10) + '...');
  openai = new OpenAI({ apiKey: openaiApiKey });
} else {
  console.warn('OPENAI_API_KEY chưa được cấu hình. Chế độ dự phòng OpenAI sẽ không khả dụng nếu Gemini hết token.');
}

class AIService {
  static async chatWithProducts(userMessage, sessionId, cart) {
    try {
      let cartInfoText = '';
      if (cart && Array.isArray(cart) && cart.length > 0) {
        cartInfoText = `
GIỎ HÀNG HIỆN TẠI CỦA KHÁCH HÀNG (Lấy từ Local Storage của Trình duyệt):
${cart.map(item => `- **${item.name}** | Số lượng: ${item.qty || 1} | Đơn giá: ${item.price ? item.price.toLocaleString('vi-VN') + ' VNĐ' : 'Chưa rõ'}`).join('\n')}

HƯỚNG DẪN RIÊNG VỀ GIỎ HÀNG:
- Khách hàng đã thêm các sản phẩm trên vào giỏ hàng của họ.
- Bạn có thể tham khảo giỏ hàng này để gợi ý thêm topping, nâng size cho món trong giỏ, hoặc đề xuất các món nước/đồ ăn kèm hợp vị để up-sell.
`;
      }

      // 1. Lấy dữ liệu sản phẩm, khuyến mãi và thông tin khách hàng từ DB song song
      const isObjectId = mongoose.Types.ObjectId.isValid(sessionId);
      
      const [products, vouchers, customer] = await Promise.all([
        Product.find({ isActive: 'active', isDeleted: false }).populate('category', 'name').lean(),
        Voucher.find({ isActive: 'active', endDate: { $gt: new Date() } }).lean(),
        isObjectId 
          ? Customer.findById(sessionId).lean() 
          : Customer.findOne({ $or: [{ customerId: sessionId }, { phone: sessionId }, { email: sessionId }] }).lean(),
      ]);

      // 1.5. Lấy danh sách ví voucher riêng của khách hàng nếu tìm thấy khách hàng
      let customerVouchers = [];
      if (customer) {
        customerVouchers = await CustomerVoucher.find({
          customerId: customer._id,
          isUsed: false,
          expiryDate: { $gt: new Date() },
        })
          .populate('voucherId')
          .lean();
      }

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

      // 4. Tạo thông tin khách hàng và ví voucher cá nhân nếu tìm thấy
      let customerInfoText = '';
      if (customer) {
        let personalVouchersText = 'Hiện tại khách hàng không có voucher cá nhân nào chưa dùng trong ví.';
        if (customerVouchers && customerVouchers.length) {
          personalVouchersText = customerVouchers
            .map((cv) => {
              const code = cv.voucherId ? cv.voucherId.code : 'VOUCHER';
              const expStr = new Date(cv.expiryDate).toLocaleDateString('vi-VN');
              return `- Mã cá nhân: **${code}** | ${cv.title} | Hạn dùng: ${expStr}`;
            })
            .join('\n');
        }

        customerInfoText = `
THÔNG TIN KHÁCH HÀNG ĐANG TRÒ CHUYỆN:
- Tên đầy đủ: ${customer.fullName}
- Số điện thoại: ${customer.phone}
- Hạng thành viên: ${customer.tier}
- Điểm tích lũy hiện có (SipPoints): ${customer.currentPoints} điểm
- Tổng chi tiêu tích lũy: ${customer.totalSpent.toLocaleString('vi-VN')} VNĐ

VÍ VOUCHER SỞ HỮU CỦA KHÁCH HÀNG:
${personalVouchersText}

HƯỚNG DẪN RIÊNG CHO KHÁCH HÀNG NÀY:
- Hãy chào khách hàng bằng tên riêng (${customer.fullName}) một cách lịch sự, thân mật (Ví dụ: "Dạ, SipPoint xin chào anh/chị ${customer.fullName} ạ!").
- Khi khách hàng hỏi về điểm số, hạng thành viên, hoặc tổng chi tiêu, hãy trả lời chính xác số liệu trên của họ.
- Nếu khách hỏi về các voucher cá nhân họ đang sở hữu (ví voucher riêng), hãy đọc chính xác danh sách VÍ VOUCHER SỞ HỮU ở trên. Nhắc nhở họ sử dụng trước hạn dùng.
`;
      }

      // 5. Định nghĩa System Instruction
      const systemInstruction = `
Bạn là một nhân viên tư vấn bán hàng (AI Assistant) vô cùng nhiệt tình, chuyên nghiệp, ấm áp và thân thiện tại cửa hàng đồ uống "SipPoint".
Nhiệm vụ của bạn là lắng nghe, hỗ trợ khách hàng và tư vấn các món nước uống cũng như các chương trình khuyến mãi phù hợp nhất dựa trên danh sách dữ liệu thực tế từ hệ thống.
${customerInfoText}
${cartInfoText}

Thời gian hệ thống hiện tại: ${new Date().toLocaleString('vi-VN')}

HÃY TUÂN THỦ CÁC NGUYÊN TẮC SAU:
1. XƯNG HÔ: Lịch sự, gần gũi, sử dụng các từ ngữ thân thiện như "Dạ", "ạ", xưng "SipPoint" hoặc "Em" và gọi khách hàng là "Anh/Chị" hoặc "Bạn". (Chào bằng tên riêng nếu có thông tin khách hàng ở trên).
2. TƯ VẤN SẢN PHẨM: Chỉ giới thiệu và tư vấn các sản phẩm có mặt trong DANH SÁCH SẢN PHẨM dưới đây. Tuyệt đối KHÔNG tự bịa ra sản phẩm mới. Nếu khách hỏi món nước không có trong danh sách, hãy khéo léo xin lỗi và gợi ý một món nước tương tự hoặc nổi bật của quán.
3. CHI TIẾT SẢN PHẨM: Khi khách hỏi về món nước nào đó, hãy giới thiệu tên món, giá cả (luôn dùng VNĐ kèm dấu phân cách hàng ngàn, ví dụ: 30.000 VNĐ) và tình trạng còn hàng hay hết hàng.
4. GỢI Ý ĐI KÈM (UP-SELL/CROSS-SELL):
   - Nếu khách chọn đồ uống, hãy chủ động gợi ý thêm các tùy chọn về size hoặc topping phù hợp (ví dụ: trân châu, thạch...) nếu sản phẩm đó hỗ trợ.
   - Thân thiện gợi ý khách hàng tích điểm thành viên (SipPoint) để nhận các ưu đãi hoặc đổi voucher hấp dẫn.
5. VOUCHER & KHUYẾN MÃI: Khi khách hỏi về khuyến mãi, giảm giá, hoặc ưu đãi chung, hãy giới thiệu các mã voucher đang hoạt động từ danh sách dưới đây. Giải thích rõ điều kiện sử dụng (như đơn tối thiểu, mức giảm tối đa) và hướng dẫn khách copy mã để áp dụng khi thanh toán. Nếu khách hỏi về voucher cá nhân trong ví, hãy kiểm tra danh sách ví voucher riêng ở trên và báo cho khách.
6. TRÌNH BÀY: Định dạng câu trả lời gọn gàng bằng Markdown (dùng chữ in đậm cho tên đồ uống, mã voucher, sử dụng dấu gạch đầu dòng rõ ràng để khách hàng dễ đọc).
7. CHẶN CÂU HỎI NGOÀI LỀ: Bạn chỉ trả lời các câu hỏi liên quan đến cửa hàng SipPoint, sản phẩm nước uống, khuyến mãi, đặt hàng, giỏ hàng hoặc tích điểm. Nếu khách hàng hỏi các chủ đề ngoài lề không liên quan (như viết code, làm văn, giải toán, kiến thức chung khác...), hãy lịch sự từ chối và khéo léo hướng họ quay lại menu đồ uống của quán.

VÍ DỤ HỘI THOẠI MẪU (BẮT CHƯỚC PHONG CÁCH NÀY):
- Khách: "Quán có món nước nào ngon không em?"
- AI: "Dạ, SipPoint xin chào bạn! Hiện tại quán đang có món **Trà sữa Trân Châu Hoàng Gia** thơm ngon đậm vị trà, béo ngậy vị sữa với giá là 35.000 VNĐ ạ. Ngoài ra, bạn có thể gọi thêm topping trân châu đen (8.000 VNĐ) hoặc nâng lên Size L (+5.000 VNĐ) để uống cho đã hơn nha. Bạn có muốn đặt thử món này không ạ?"

- Khách: "Tôi đang tích lũy được bao nhiêu điểm rồi em?"
- AI: "Dạ thưa anh/chị, hiện tại tài khoản của anh/chị trên hệ thống đang có **150 điểm** tích lũy (SipPoints) và đạt hạng thành viên **BẠC** ạ. Anh/Chị chỉ cần tích thêm 50 điểm nữa là sẽ được nâng lên hạng **VÀNG** để nhận thêm nhiều voucher giảm 20% của quán đó ạ!"

- Khách: "Tôi có voucher riêng nào chưa dùng không em?"
- AI: "Dạ thưa anh/chị, em kiểm tra ví cá nhân của mình đang có 1 mã giảm giá **SIPGOLD20** - Giảm 20% tổng hóa đơn, hạn sử dụng đến ngày 20/06/2026 đó ạ. Anh/Chị nhớ sử dụng mã này khi thanh toán để được nhận ưu đãi đặc quyền nha!"

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

      // 3. Lấy hoặc tạo mới Session trong DB
      let chatSession = await ChatSession.findOne({ sessionId });
      if (!chatSession) {
        chatSession = new ChatSession({ sessionId, messages: [] });
      }

      // 4. Gửi tin nhắn mới với cơ chế Gemini chính -> Gemini phụ (giới hạn 12 tin nhắn gần nhất)
      let text;
      const recentHistory = chatSession.messages.slice(-12);
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: systemInstruction,
        });
        const chat = model.startChat({
          history: recentHistory.map((msg) => ({
            role: msg.role,
            parts: msg.parts.map((p) => ({ text: p.text })),
          })),
        });
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        text = response.text();
      } catch (geminiError) {
        console.warn('[AI Service] Lỗi Gemini chính, thử chuyển sang Gemini dự phòng:', geminiError.message);
        if (genAIBackup) {
          try {
            const modelBackup = genAIBackup.getGenerativeModel({
              model: 'gemini-2.5-flash',
              systemInstruction: systemInstruction,
            });
            const chatBackup = modelBackup.startChat({
              history: recentHistory.map((msg) => ({
                role: msg.role,
                parts: msg.parts.map((p) => ({ text: p.text })),
              })),
            });
            const resultBackup = await chatBackup.sendMessage(userMessage);
            const responseBackup = await resultBackup.response;
            text = responseBackup.text();
          } catch (geminiBackupError) {
            console.warn('[AI Service] Lỗi cả Gemini dự phòng, chuyển sang OpenAI:', geminiBackupError.message);
            throw geminiBackupError;
          }
        } else {
          console.warn('[AI Service] Không có cấu hình Gemini dự phòng, chuyển sang OpenAI');
          throw geminiError;
        }
      }

      // 5. Lưu tin nhắn của User và AI vào DB
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
      console.warn('[AI Service] Lỗi Gemini AI, thử chuyển sang OpenAI:', error.message);
      if (!openaiApiKey) {
        console.error('[AI Service] Không thể chuyển sang OpenAI: Chưa cấu hình OPENAI_API_KEY trong .env');
        throw new Error(`Lỗi Gemini AI: ${error.message}. Hơn nữa, OPENAI_API_KEY chưa được cấu hình làm dự phòng.`);
      }

      try {
        if (!openai) {
          openai = new OpenAI({ apiKey: openaiApiKey });
        }

        // 1. Tái lập lịch sử cuộc trò chuyện theo định dạng OpenAI
        const isObjectId = mongoose.Types.ObjectId.isValid(sessionId);
        const [products, vouchers, customer] = await Promise.all([
          Product.find({ isActive: 'active', isDeleted: false }).populate('category', 'name').lean(),
          Voucher.find({ isActive: 'active', endDate: { $gt: new Date() } }).lean(),
          isObjectId 
            ? Customer.findById(sessionId).lean() 
            : Customer.findOne({ $or: [{ customerId: sessionId }, { phone: sessionId }, { email: sessionId }] }).lean(),
        ]);

        let customerVouchers = [];
        if (customer) {
          customerVouchers = await CustomerVoucher.find({
            customerId: customer._id,
            isUsed: false,
            expiryDate: { $gt: new Date() },
          })
            .populate('voucherId')
            .lean();
        }

        let productCatalog = 'Hiện tại cửa hàng đang cập nhật sản phẩm. Vui lòng quay lại sau.';
        if (products && products.length) {
          productCatalog = products
            .map((p) => {
              const price = typeof p.price === 'number' ? p.price.toLocaleString('vi-VN') + ' VNĐ' : 'Liên hệ';
              const category = p.category && p.category.name ? p.category.name : 'Chung';
              const stock = typeof p.stock === 'number' && p.stock > 0 ? `Còn ${p.stock} sản phẩm` : 'Hết hàng';
              return `- ${p.name} | Category: ${category} | Giá: ${price} | ${stock}`;
            })
            .join('\n');
        }

        let voucherCatalog = 'Hiện tại cửa hàng không có mã giảm giá nào đang diễn ra.';
        if (vouchers && vouchers.length) {
          voucherCatalog = vouchers
            .map((v) => {
              const discountStr = v.discountType === 0 ? `${v.discountValue}%` : `${v.discountValue.toLocaleString('vi-VN')} VNĐ`;
              const minOrder = v.minOrderValue > 0 ? `Đơn tối thiểu: ${v.minOrderValue.toLocaleString('vi-VN')} VNĐ` : 'Mọi đơn hàng';
              const maxDiscount = v.discountType === 0 && v.maxDiscountLimit ? ` (Giảm tối đa: ${v.maxDiscountLimit.toLocaleString('vi-VN')} VNĐ)` : '';
              return `- Mã: **${v.code}** | ${v.title} (${v.description || ''}) | Giảm: ${discountStr}${maxDiscount} | ${minOrder}`;
            })
            .join('\n');
        }

        let customerInfoText = '';
        if (customer) {
          let personalVouchersText = 'Hiện tại khách hàng không có voucher cá nhân nào chưa dùng trong ví.';
          if (customerVouchers && customerVouchers.length) {
            personalVouchersText = customerVouchers
              .map((cv) => {
                const code = cv.voucherId ? cv.voucherId.code : 'VOUCHER';
                const expStr = new Date(cv.expiryDate).toLocaleDateString('vi-VN');
                return `- Mã cá nhân: **${code}** | ${cv.title} | Hạn dùng: ${expStr}`;
              })
              .join('\n');
          }

          customerInfoText = `
THÔNG TIN KHÁCH HÀNG ĐANG TRÒ CHUYỆN:
- Tên đầy đủ: ${customer.fullName}
- Số điện thoại: ${customer.phone}
- Hạng thành viên: ${customer.tier}
- Điểm tích lũy hiện có (SipPoints): ${customer.currentPoints} điểm
- Tổng chi tiêu tích lũy: ${customer.totalSpent.toLocaleString('vi-VN')} VNĐ

VÍ VOUCHER SỞ HỮU CỦA KHÁCH HÀNG:
${personalVouchersText}

HƯỚNG DẪN RIÊNG CHO KHÁCH HÀNG NÀY:
- Hãy chào khách hàng bằng tên riêng (${customer.fullName}) một cách lịch sự, thân mật (Ví dụ: "Dạ, SipPoint xin chào anh/chị ${customer.fullName} ạ!").
- Khi khách hàng hỏi về điểm số, hạng thành viên, hoặc tổng chi tiêu, hãy trả lời chính xác số liệu trên của họ.
- Nếu khách hỏi về các voucher cá nhân họ đang sở hữu (ví voucher riêng), hãy đọc chính xác danh sách VÍ VOUCHER SỞ HỮU ở trên. Nhắc nhở họ sử dụng trước hạn dùng.
`;
        }

        const systemInstruction = `
Bạn là một nhân viên tư vấn bán hàng (AI Assistant) vô cùng nhiệt tình, chuyên nghiệp, ấm áp và thân thiện tại cửa hàng đồ uống "SipPoint".
Nhiệm vụ của bạn là lắng nghe, hỗ trợ khách hàng và tư vấn các món nước uống cũng như các chương trình khuyến mãi phù hợp nhất dựa trên danh sách dữ liệu thực tế từ hệ thống.
${customerInfoText}
${cartInfoText}

Thời gian hệ thống hiện tại: ${new Date().toLocaleString('vi-VN')}

HÃY TUÂN THỦ CÁC NGUYÊN TẮC SAU:
1. XƯNG HÔ: Lịch sự, gần gũi, sử dụng các từ ngữ thân thiện như "Dạ", "ạ", xưng "SipPoint" hoặc "Em" và gọi khách hàng là "Anh/Chị" hoặc "Bạn". (Chào bằng tên riêng nếu có thông tin khách hàng ở trên).
2. TƯ VẤN SẢN PHẨM: Chỉ giới thiệu và tư vấn các sản phẩm có mặt trong DANH SÁCH SẢN PHẨM dưới đây. Tuyệt đối KHÔNG tự bịa ra sản phẩm mới. Nếu khách hỏi món nước không có trong danh sách, hãy khéo léo xin lỗi và gợi ý một món nước tương tự hoặc nổi bật của quán.
3. CHI TIẾT SẢN PHẨM: Khi khách hỏi về món nước nào đó, hãy giới thiệu tên món, giá cả (luôn dùng VNĐ kèm dấu phân cách hàng ngàn, ví dụ: 30.000 VNĐ) và tình trạng còn hàng hay hết hàng.
4. GỢI Ý ĐI KÈM (UP-SELL/CROSS-SELL):
   - Nếu khách chọn đồ uống, hãy chủ động gợi ý thêm các tùy chọn về size hoặc topping phù hợp (ví dụ: trân châu, thạch...) nếu sản phẩm đó hỗ trợ.
   - Thân thiện gợi ý khách hàng tích điểm thành viên (SipPoint) để nhận các ưu đãi hoặc đổi voucher hấp dẫn.
5. VOUCHER & KHUYẾN MÃI: Khi khách hỏi về khuyến mãi, giảm giá, hoặc ưu đãi chung, hãy giới thiệu các mã voucher đang hoạt động từ danh sách dưới đây. Giải thích rõ điều kiện sử dụng (như đơn tối thiểu, mức giảm tối đa) và hướng dẫn khách copy mã để áp dụng khi thanh toán. Nếu khách hỏi về voucher cá nhân trong ví, hãy kiểm tra danh sách ví voucher riêng ở trên và báo cho khách.
6. TRÌNH BÀY: Định dạng câu trả lời gọn gàng bằng Markdown (dùng chữ in đậm cho tên đồ uống, mã voucher, sử dụng dấu gạch đầu dòng rõ ràng để khách hàng dễ đọc).
7. CHẶN CÂU HỎI NGOÀI LỀ: Bạn chỉ trả lời các câu hỏi liên quan đến cửa hàng SipPoint, sản phẩm nước uống, khuyến mãi, đặt hàng, giỏ hàng hoặc tích điểm. Nếu khách hàng hỏi các chủ đề ngoài lề không liên quan (như viết code, làm văn, giải toán, kiến thức chung khác...), hãy lịch sự từ chối và khéo léo hướng họ quay lại menu đồ uống của quán.

DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA SIPPOINT:
${productCatalog}

DANH SÁCH VOUCHER KHUYẾN MÃI ĐANG HOẠT ĐỘNG:
${voucherCatalog}
`;

        let chatSession = await ChatSession.findOne({ sessionId });
        if (!chatSession) {
          chatSession = new ChatSession({ sessionId, messages: [] });
        }

        const messagesForOpenAI = [{ role: 'system', content: systemInstruction }];
        const recentHistoryOpenAI = chatSession.messages.slice(-12);
        recentHistoryOpenAI.forEach((msg) => {
          messagesForOpenAI.push({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts.map((p) => p.text).join('\n'),
          });
        });
        messagesForOpenAI.push({ role: 'user', content: userMessage });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messagesForOpenAI,
        });

        const reply = completion.choices[0].message.content;

        // Lưu lịch sử
        chatSession.messages.push({ role: 'user', parts: [{ text: userMessage }] });
        chatSession.messages.push({ role: 'model', parts: [{ text: reply }] });
        await chatSession.save();

        return reply;
      } catch (openaiError) {
        console.error('[AI Service] Lỗi cả OpenAI fallback:', openaiError);
        throw new Error(`Cả Gemini AI và OpenAI dự phòng đều gặp lỗi. Chi tiết lỗi OpenAI: ${openaiError.message}`);
      }
    }
  }

  static async recommendTopProduct() {
    let systemInstruction = '';
    let userContent = '';
    let productSalesData = [];
    try {
     

      // 1. Lấy tất cả sản phẩm đang hoạt động
      const products = await Product.find({ isActive: 'active', isDeleted: false }).populate('category', 'name').lean();

      // 2. Thống kê số lượng bán ra của từng sản phẩm từ các đơn hàng hoàn thành
      const completedOrders = await Order.find({ status: 'completed' }).select('_id');
      const orderIds = completedOrders.map(o => o._id);

      const salesStats = await OrderItem.aggregate([
        { $match: { orderId: { $in: orderIds } } },
        {
          $group: {
            _id: '$productId',
            qty: { $sum: '$qty' },
            revenue: { $sum: '$subtotal' }
          }
        }
      ]);

      // Map statistics to products
      const statsMap = new Map(salesStats.map(item => [item._id.toString(), item]));
      
      productSalesData = products.map(p => {
        const stats = statsMap.get(p._id.toString()) || { qty: 0, revenue: 0 };
        return {
          name: p.name,
          category: p.category ? p.category.name : 'Khác',
          price: p.price,
          qtySold: stats.qty,
          revenue: stats.revenue,
          stock: p.stock
        };
      });

      // Sắp xếp theo số lượng bán giảm dần
      productSalesData.sort((a, b) => b.qtySold - a.qtySold);

      // 3. Chuẩn bị prompt gửi tới Gemini AI
      const promptData = productSalesData.map(p => 
        `- **${p.name}** (${p.category}) - Giá: ${p.price ? p.price.toLocaleString('vi-VN') : 0} VNĐ - Đã bán: ${p.qtySold} ly - Doanh thu: ${p.revenue ? p.revenue.toLocaleString('vi-VN') : 0} VNĐ - Tồn kho: ${p.stock}`
      ).join('\n');

      systemInstruction = `
Bạn là một chuyên gia phân tích dữ liệu bán hàng và tư vấn chiến lược kinh doanh của chuỗi cửa hàng đồ uống "SipPoint".
Nhiệm vụ của bạn là phân tích dữ liệu bán hàng thực tế từ hệ thống và đưa ra đề xuất/dự đoán xem món nước nào sẽ được mua nhiều nhất trong thời gian tới (Sản phẩm bán chạy nhất / Best-seller).

HÃY TUÂN THỦ NGUYÊN TẮC QUAN TRỌNG:
- Tuyệt đối KHÔNG sử dụng đánh giá sao (star rating), số sao, hay điểm đánh giá trung bình trong báo cáo này.
- Đề xuất của bạn phải dựa hoàn toàn vào số liệu số lượng đã bán thực tế (số lượng ly bán được) và doanh thu, cùng với xu hướng/hương vị của đồ uống.

Hãy thực hiện phân tích theo các khía cạnh sau:
1. Đề xuất rõ ràng món nước nào sẽ được mua nhiều nhất dựa trên số lượng đã bán thực tế.
2. Giải thích lý do vì sao món đó được ưa chuộng (về hương vị, giá cả, xu hướng, hoặc tính tiện lợi).
3. Đưa ra các gợi ý chiến lược cho quán để thúc đẩy doanh số hơn nữa (ví dụ: khuyến mãi đi kèm, combo, hay tối ưu hóa tồn kho).
4. Trình bày kết quả phân tích bằng tiếng Việt một cách chuyên nghiệp, rõ ràng, sử dụng định dạng Markdown đẹp mắt với các tiêu đề, danh sách, và chữ in đậm.
`;

      userContent = `
Dưới đây là danh sách sản phẩm và số liệu bán hàng thực tế của SipPoint:
${promptData}

Dựa trên dữ liệu trên, hãy phân tích và đề xuất món nước nào sẽ được mua nhiều nhất, đồng thời dự báo xu hướng bán hàng tiếp theo.
`;

      let analysisText;
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: systemInstruction,
        });
        const result = await model.generateContent(userContent);
        const response = await result.response;
        analysisText = response.text();
      } catch (geminiError) {
        console.warn('[AI Service] Lỗi Gemini chính trong recommendTopProduct, thử chuyển sang Gemini dự phòng:', geminiError.message);
        if (genAIBackup) {
          try {
            const modelBackup = genAIBackup.getGenerativeModel({
              model: 'gemini-2.5-flash',
              systemInstruction: systemInstruction,
            });
            const resultBackup = await modelBackup.generateContent(userContent);
            const responseBackup = await resultBackup.response;
            analysisText = responseBackup.text();
          } catch (geminiBackupError) {
            console.warn('[AI Service] Lỗi cả Gemini dự phòng trong recommendTopProduct, chuyển sang OpenAI:', geminiBackupError.message);
            throw geminiBackupError;
          }
        } else {
          console.warn('[AI Service] Không có Gemini dự phòng trong recommendTopProduct, chuyển sang OpenAI');
          throw geminiError;
        }
      }

      return {
        success: true,
        recommendation: analysisText,
        salesStats: productSalesData
      };
    } catch (error) {
      if (!systemInstruction || !userContent) {
        throw error;
      }
      console.warn('[AI Service] Lỗi Gemini AI trong recommendTopProduct, chuyển sang OpenAI:', error.message);
      if (!openaiApiKey) {
        console.error('[AI Service] Không thể chuyển sang OpenAI: Chưa cấu hình OPENAI_API_KEY trong .env');
        throw new Error(`Lỗi Gemini AI: ${error.message}. Hơn nữa, OPENAI_API_KEY chưa được cấu hình làm dự phòng.`);
      }

      try {
        if (!openai) {
          openai = new OpenAI({ apiKey: openaiApiKey });
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userContent }
          ],
        });

        const reply = completion.choices[0].message.content;

        return {
          success: true,
          recommendation: reply,
          salesStats: productSalesData,
          fallback: 'openai'
        };
      } catch (openaiError) {
        console.error('[AI Service] Lỗi cả OpenAI fallback trong recommendTopProduct:', openaiError);
        throw new Error(`Cả Gemini AI và OpenAI dự phòng đều gặp lỗi. Chi tiết lỗi OpenAI: ${openaiError.message}`);
      }
    }
  }
}

module.exports = AIService;
