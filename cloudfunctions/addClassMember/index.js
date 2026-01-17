const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { classId, classCode, studentNo } = event;

    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空' };
    }

    // 检查权限：是否为管理员
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
        console.error('addClassMember 查询班级信息失败:', e);
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限添加成员' };
    }

    let targetUser = null;

    // 通过班级码添加
    if (classCode) {
      const courseRes = await courses.where({ classCode: classCode.trim() }).get();
      if (courseRes.data.length === 0) {
        return { code: 404, success: false, message: '班级码不存在' };
      }
      const targetCourseId = courseRes.data[0]._id;
      // 获取该班级的所有成员
      const targetMembers = await courseMembers.where({ courseId: targetCourseId }).get();
      // 这里简化处理，实际可能需要更复杂的逻辑
      return { code: 400, success: false, message: '暂不支持通过班级码批量添加成员' };
    }

    // 通过学号添加
    if (studentNo) {
      // 查找学号匹配的用户（需要解密）
      const allUsersRes = await users.get();
      let targetUser = null;

      for (const user of allUsersRes.data) {
        if (user.studentNo && user.studentNo_iv) {
          // 解密学号进行匹配
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

      // 检查用户是否已经是班级成员
      const existingMember = await courseMembers
        .where({
          courseId: classId,
          openid: targetUser.openid,
        })
        .get();

      if (existingMember.data.length > 0) {
        return { code: 400, success: false, message: '该用户已经是班级成员' };
      }

      // 添加为班级成员
      await courseMembers.add({
        data: {
          courseId: classId,
          userId: targetUser._id,
          openid: targetUser.openid,
          role: 'member',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        },
      });

      return {
        code: 200,
        success: true,
        message: '添加成功',
      };
    }

    return { code: 400, success: false, message: '请提供学号' };
  } catch (e) {
    console.error('addClassMember error:', e);
    return { code: 500, success: false, message: '添加成员失败', error: e.message };
  }
};
