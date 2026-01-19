const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courseMembers = db.collection('course_members');
const courses = db.collection('courses');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { classId, memberId } = event;

    if (!classId || !memberId) {
      return { code: 400, success: false, message: '班级ID和成员ID不能为空' };
    }

    // 权限校验：管理员 or 创建者
    let isAdmin = false;

    const selfMemberRes = await courseMembers.where({ courseId: classId, openid }).get();
    if (selfMemberRes.data.length > 0 && selfMemberRes.data[0].role === 'admin') {
      isAdmin = true;
    }

    let creatorOpenid = '';
    if (!isAdmin) {
      try {
        const courseRes = await courses.doc(classId).get();
        creatorOpenid = courseRes.data?.creatorOpenid || '';
        if (creatorOpenid && creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('[unsetClassAdmin] 查询班级信息失败:', e);
      }
    } else {
      try {
        const courseRes = await courses.doc(classId).get();
        creatorOpenid = courseRes.data?.creatorOpenid || '';
      } catch (e) {
        // ignore
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限删除管理员' };
    }

    // 查目标成员
    const targetRes = await courseMembers.doc(memberId).get();
    const target = targetRes.data;
    if (!target) {
      return { code: 404, success: false, message: '成员不存在' };
    }
    if (String(target.courseId) !== String(classId)) {
      return { code: 400, success: false, message: '成员不属于该班级' };
    }

    // 保护：不能取消创建者权限（创建者始终拥有管理员能力）
    if (creatorOpenid && target.openid === creatorOpenid) {
      return { code: 400, success: false, message: '不能取消创建者管理员身份' };
    }

    // 保护：不允许自己把自己降级（避免误操作导致无法管理）
    if (target.openid === openid) {
      return { code: 400, success: false, message: '不能取消自己的管理员身份' };
    }

    if (target.role !== 'admin') {
      return { code: 400, success: false, message: '该成员不是管理员' };
    }

    await courseMembers.doc(memberId).update({
      data: {
        role: 'member',
        updatedAt: Date.now(),
      },
    });

    return { code: 200, success: true, message: '已取消管理员' };
  } catch (e) {
    console.error('unsetClassAdmin error:', e);
    return { code: 500, success: false, message: '取消管理员失败', error: e.message };
  }
};

