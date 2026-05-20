const { I18n } = require('i18n');
const path = require('path');

const i18n = new I18n({
  locales: ['en', 'vi'],
  directory: path.join(__dirname, '../../locales'),
  defaultLocale: 'vi',
  header: 'accept-language',
  objectNotation: true,
  updateFiles: false,
});

module.exports = i18n;
