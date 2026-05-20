const exceljs = require('exceljs');

const exportUsersToExcel = async (users, res) => {
  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet('Users');

  worksheet.columns = [
    { header: 'ID', key: '_id', width: 25 },
    { header: 'Họ và tên', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Quyền (Role)', key: 'role', width: 15 },
    { header: 'Ngày tạo', key: 'createdAt', width: 25 },
  ];

  users.forEach((user) => {
    worksheet.addRow({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=' + 'users.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  exportUsersToExcel,
};
