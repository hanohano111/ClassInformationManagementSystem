const cloud = require('wx-server-sdk');
// 使用本函数目录下的 AES 工具，避免相对路径问题
const { encryptFieldsForDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

// 5 个学生 + 3 个老师
const seedUsers = [
  {
    openid: 'test-openid-s1',
    name: '测试学生-1',
    studentNo: '202200202001',
    role: 'student',
  },
  {
    openid: 'test-openid-s2',
    name: '测试学生-2',
    studentNo: '202200202002',
    role: 'student',
  },
  {
    openid: 'test-openid-s3',
    name: '测试学生-3',
    studentNo: '202200202003',
    role: 'student',
  },
  {
    openid: 'test-openid-s4',
    name: '测试学生-4',
    studentNo: '202200202004',
    role: 'student',
  },
  {
    openid: 'test-openid-s5',
    name: '测试学生-5',
    studentNo: '202200202005',
    role: 'student',
  },
  {
    openid: 'test-openid-t1',
    name: '李四',
    studentNo: '202102', // 工号沿用到 studentNo 便于按学号接口搜索
    role: 'teacher',
  },
  {
    openid: 'test-openid-t2',
    name: '王五',
    studentNo: '202103',
    role: 'teacher',
  },
  {
    openid: 'test-openid-t3',
    name: '赵六',
    studentNo: '202104',
    role: 'teacher',
  },
];

exports.main = async () => {
  const created = [];
  const skipped = [];

  for (const u of seedUsers) {
    // 已有同 openid 则跳过
    const exists = await users.where({ openid: u.openid }).get();
    if (exists.data.length > 0) {
      skipped.push(u.openid);
      continue;
    }

    // 加密姓名和学号存库，保持与业务解密逻辑兼容
    const data = encryptFieldsForDB(
      {
        openid: u.openid,
        name: u.name,
        studentNo: u.studentNo,
        role: u.role,
        createdAt: Date.now(),
      },
      ['name', 'studentNo']
    );

    const res = await users.add({ data });
    created.push({ openid: u.openid, _id: res._id });
  }

  return {
    code: 200,
    success: true,
    created,
    skipped,
  };
};
