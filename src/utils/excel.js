const exceljs = require('exceljs');

const exportEmployeesToExcel = async (employees, res) => {
  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet('Employees');

  worksheet.columns = [
    { header: 'ID', key: '_id', width: 25 },
    { header: 'Họ và tên', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Quyền (Role)', key: 'role', width: 15 },
    { header: 'Trạng thái', key: 'status', width: 15 },
    { header: 'Ngày tạo', key: 'createdAt', width: 25 },
  ];

  employees.forEach((employee) => {
    worksheet.addRow({
      _id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      status: employee.status,
      createdAt: employee.createdAt,
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=' + 'employees.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  exportEmployeesToExcel,
};
