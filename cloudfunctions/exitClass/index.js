const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 从事件中获取课程ID
    const { classId } = event;
    
    if (!classId) {
      return { code: 400, success: false, message: '课程ID不能为空' };
    }
    
    // 从 users 集合获取用户信息
    const users = db.collection('users');
    const userRes = await users.where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 401, success: false, message: '用户不存在' };
    }
    const userId = userRes.data[0]._id;
    
    // 查找并删除课程成员记录
    const memberRes = await courseMembers
      .where({
        courseId: classId,
        openid: openid,
      })
      .get();
    
    if (memberRes.data.length === 0) {
      return { code: 404, success: false, message: '您未加入该课程' };
    }
    
    // 删除成员记录
    await courseMembers.doc(memberRes.data[0]._id).remove();
    
    return {
      code: 200,
      success: true,
      message: '退出成功',
    };
  } catch (e) {
    console.error('exitClass error:', e);
    return { code: 500, success: false, message: '退出失败', error: e.message };
  }
};
