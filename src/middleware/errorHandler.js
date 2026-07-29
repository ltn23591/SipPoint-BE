const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const handleCastErrorDB = err => {
  const message = `Dữ liệu ID hoặc tham số không hợp lệ: ${err.path}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  // Trích xuất giá trị gây lỗi duplicate
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : '';
  const message = `Dữ liệu bị trùng lặp: ${value}. Vui lòng sử dụng giá trị khác!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Dữ liệu đầu vào không hợp lệ. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Token không hợp lệ. Vui lòng đăng nhập lại!', 401);

const handleJWTExpiredError = () => new AppError('Token đã hết hạn! Vui lòng đăng nhập lại.', 401);

const handleMalformedJSON = () => new AppError('Dữ liệu JSON gửi lên không đúng định dạng.', 400);

const handlePayloadTooLarge = () => new AppError('Dữ liệu gửi lên (payload) quá lớn. Vui lòng giảm kích thước.', 413);

const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.statusCode,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.statusCode,
      message: err.message
    });
  }
  
  logger.error('ERROR 💥', err);
  return res.status(500).json({
    success: false,
    status: 500,
    message: 'Lỗi server hệ thống!'
  });
};

module.exports = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle malformed JSON body parse error from body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    err = handleMalformedJSON();
  }

  // Handle Payload Too Large error
  if (err.type === 'entity.too.large' || err.statusCode === 413) {
    err = handlePayloadTooLarge();
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = Object.assign(err);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
