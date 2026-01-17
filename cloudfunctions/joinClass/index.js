const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 从事件中获取班级码
    const { classCode } = event;
    
    // 基本校验
    if (!classCode || !classCode.trim()) {
      return { code: 400, success: false, message: '班级码不能为空' };
    }
    
    // 从 users 集合获取用户信息
    const users = db.collection('users');
    const userRes = await users.where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 401, success: false, message: '用户不存在' };
    }
    const userId = userRes.data[0]._id;
    
    // 根据班级码查找班级
    const courseRes = await courses.where({ classCode: classCode.trim() }).get();
    if (courseRes.data.length === 0) {
      return { code: 404, success: false, message: '不存在该班级' };
    }
    
    const course = courseRes.data[0];
    const courseId = course._id;
    
    // 检查用户是否已经加入该班级
    const memberRes = await courseMembers
      .where({
        courseId: courseId,
        openid: openid,
      })
      .get();
    
    if (memberRes.data.length > 0) {
      return { code: 400, success: false, message: '您已加入该班级' };
    }
    
    // 添加用户到班级成员表
    await courseMembers.add({
      data: {
        courseId: courseId,
        userId: userId,
        openid: openid,
        role: 'member', // 普通成员
        joinedAt: Date.now(),
      },
    });
    
    return {
      code: 200,
      success: true,
      data: {
        classId: courseId,
        className: course.name,
        message: '加入成功',
      },
    };
  } catch (e) {
    console.error('joinClass error:', e);
    return { code: 500, success: false, message: '加入失败', error: e.message };
  }
};
