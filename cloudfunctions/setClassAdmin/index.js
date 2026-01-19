const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courseMembers = db.collection('course_members');
const courses = db.collection('courses');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { classId, userId, studentNo } = event;

    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空' };
    }

    if (!userId && !studentNo) {
      return { code: 400, success: false, message: '请提供用户ID或学号' };
    }

    // 检查当前用户是否为管理员
    const memberRes = await courseMembers
      .where({
        courseId: classId,
        openid: openid,
      })
      .get();

    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';

    if (!isAdmin) {
      try {
        const courseRes = await courses.doc(classId).get();
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('setClassAdmin 查询班级信息失败:', e);
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限设置管理员' };
    }

    // 查找目标用户
    let targetMember = null;

    if (userId) {
      // 通过userId查找
      const targetMemberRes = await courseMembers
        .where({
          courseId: classId,
          userId: userId,
        })
        .get();

      if (targetMemberRes.data.length === 0) {
        return { code: 404, success: false, message: '未找到该用户' };
      }

      targetMember = targetMemberRes.data[0];
    } else if (studentNo) {
      // 通过学号查找（需要查询users表）
      const users = db.collection('users');
      const { decryptFieldsFromDB } = require('./common/aes');
      
      const allUsersRes = await users.get();
      let targetUser = null;

      for (const user of allUsersRes.data) {
        if (user.studentNo && user.studentNo_iv) {
          const decryptedUser = decryptFieldsFromDB(user, ['studentNo']);
          if (decryptedUser.studentNo === studentNo.trim()) {
            targetUser = user;
            break;
          }
        }
      }

      if (!targetUser) {
        return { code: 404, success: false, message: '未找到该学号对应的用户' };
      }

      const targetMemberRes = await courseMembers
        .where({
          courseId: classId,
          openid: targetUser.openid,
        })
        .get();

      if (targetMemberRes.data.length === 0) {
        return { code: 404, success: false, message: '该用户不是班级成员' };
      }

      targetMember = targetMemberRes.data[0];
    }

    if (!targetMember) {
      return { code: 404, success: false, message: '未找到目标成员' };
    }

    // 如果已经是管理员，不需要重复设置
    if (targetMember.role === 'admin') {
      return { code: 400, success: false, message: '该用户已经是管理员' };
    }

    // 更新角色为管理员
    await courseMembers.doc(targetMember._id).update({
      data: {
        role: 'admin',
        updatedAt: Date.now(),
      },
    });

    return {
      code: 200,
      success: true,
      message: '设置管理员成功',
    };
  } catch (e) {
    console.error('setClassAdmin error:', e);
    return { code: 500, success: false, message: '设置管理员失败', error: e.message };
  }
};
