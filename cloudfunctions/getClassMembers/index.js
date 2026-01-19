const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const courseMembers = db.collection('course_members');
const users = db.collection('users');
const courses = db.collection('courses');

exports.main = async (event) => {
  try {
    const { classId } = event;

    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空', data: [] };
    }

    // 获取班级创建者，用于标记 isCreator（并用于后续权限相关显示）
    let creatorOpenid = '';
    try {
      const courseRes = await courses.doc(classId).get();
      creatorOpenid = courseRes.data?.creatorOpenid || '';
    } catch (e) {
      console.warn('[getClassMembers] 获取班级信息失败（继续执行）:', e);
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
    console.log('[getClassMembers] 查询用户信息，openids:', openids);
    
    // 强制不使用缓存，每次都查询最新数据
    const userRes = await users
      .where({
        openid: _.in(openids),
      })
      .get();

    console.log('[getClassMembers] 查询到的用户数量:', userRes.data?.length || 0);
    console.log('[getClassMembers] 查询到的用户详细信息:', userRes.data?.map(u => ({
      openid: u.openid,
      _id: u._id,
      name: u.name,
      studentNo: u.studentNo ? '[已加密]' : undefined,
      studentNo_iv: u.studentNo_iv ? '[存在]' : undefined,
      updatedAt: u.updatedAt,
    })));

    const userMap = {};
    (userRes.data || []).forEach((u) => {
      userMap[u.openid] = u;
      console.log('[getClassMembers] 用户信息详情:', {
        openid: u.openid,
        name: u.name,
        hasStudentNo: !!u.studentNo,
        hasStudentNoIv: !!u.studentNo_iv,
      });
    });

    // 3. 组装返回数据，解密学号
    const memberList = members.map((m) => {
      const user = userMap[m.openid] || {};

      let userData = {
        memberId: m._id,
        openid: m.openid,
        isCreator: !!creatorOpenid && m.openid === creatorOpenid,
        userId: user._id,
        name: user.name || '',
        name_iv: user.name_iv,
        role: m.role || 'member',
        studentNo: user.studentNo || '',
        studentNo_iv: user.studentNo_iv,
      };

      console.log('[getClassMembers] 解密前用户数据:', {
        openid: m.openid,
        name: userData.name ? '[已加密]' : '[空]',
        hasStudentNo: !!userData.studentNo,
        hasStudentNoIv: !!userData.studentNo_iv,
      });

      // 解密 name 和 studentNo
      userData = decryptFieldsFromDB(userData, ['name', 'studentNo']);

      console.log('[getClassMembers] 解密后用户数据:', {
        openid: m.openid,
        name: userData.name,
        studentNo: userData.studentNo || '[空]',
      });

      return {
        memberId: userData.memberId,
        openid: userData.openid,
        isCreator: userData.isCreator,
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

