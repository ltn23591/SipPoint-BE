const AIService = require('../services/ai.service');

exports.chatWithProducts = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

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

    const aiResponse = await AIService.chatWithProducts(message, sessionId);

    res.status(200).json({
      success: true,
      data: {
        reply: aiResponse,
      },
    });
  } catch (error) {
    next(error);
  }
};
