const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const courseMembers = db.collection('course_members');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const { classId } = event;

    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空', data: [] };
    }

    // 1. 查班级成员表
    const memberRes = await courseMembers
      .where({
        courseId: classId,
      })
      .get();

    const members = memberRes.data || [];
    if (members.length === 0) {
      return { code: 200, success: true, data: [] };
    }

    // 2. 根据 openid 批量查用户信息
    const openids = members.map((m) => m.openid);
    const userRes = await users
      .where({
        openid: _.in(openids),
      })
      .get();

    const userMap = {};
    (userRes.data || []).forEach((u) => {
      userMap[u.openid] = u;
    });

    // 3. 组装返回数据，解密学号
    const memberList = members.map((m) => {
      const user = userMap[m.openid] || {};

      let userData = {
        userId: user._id,
        name: user.name || '',
        role: m.role || 'member',
        studentNo: user.studentNo || '',
        studentNo_iv: user.studentNo_iv,
      };

      userData = decryptFieldsFromDB(userData, ['studentNo']);

      return {
        userId: userData.userId,
        name: userData.name,
        role: userData.role,
        studentNo: userData.studentNo,
      };
    });

    // 4. 按加入时间排序（管理员在前）
    memberList.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return 0;
    });

    return {
      code: 200,
      success: true,
      data: memberList,
    };
  } catch (e) {
    console.error('getClassMembers error:', e);
    return { code: 500, success: false, message: '获取班级成员失败', error: e.message, data: [] };
  }
};

