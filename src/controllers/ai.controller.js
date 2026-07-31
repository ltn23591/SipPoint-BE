const catchAsync = require('../utils/catchAsync');
const AIService = require('../services/ai.service');

class AiController {
  static chatWithProducts = catchAsync(async (req, res, next) => {
  const { message, sessionId, cart } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp câu hỏi (message) để AI trả lời.',
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp sessionId để duy trì lịch sử trò chuyện.',
      });
    }

    const aiResponse = await AIService.chatWithProducts(message, sessionId, cart);

    res.status(200).json({
      success: true,
      data: {
        reply: aiResponse,
      },
    });
});;

  static recommendTopProduct = catchAsync(async (req, res, next) => {
  const result = await AIService.recommendTopProduct();
    res.status(200).json(result);
});;


}

module.exports = AiController;
