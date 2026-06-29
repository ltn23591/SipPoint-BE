const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push(err.msg));

  // Ném lỗi 400 Bad Request
  return next(new AppError(extractedErrors.join(', '), 400));
};

module.exports = validate;
