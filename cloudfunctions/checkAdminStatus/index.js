const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courseMembers = db.collection('course_members');
const courses = db.collection('courses');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { classId } = event;
    
    console.log('[checkAdminStatus] 请求参数:', { classId, openid });
    
    if (!classId) {
      return { code: 400, success: false, message: '课程ID不能为空', data: { isAdmin: false } };
    }
    
    // 1. 先看是否在课程成员表中被标记为管理员
    const memberRes = await courseMembers
      .where({
        courseId: classId,
        openid: openid,
      })
      .get();
    
    console.log('[checkAdminStatus] 成员查询结果:', { memberCount: memberRes.data.length, members: memberRes.data });
    
    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';
    console.log('[checkAdminStatus] 从成员表判断 isAdmin:', isAdmin);

    // 2. 如果不是管理员，再看是否是课程创建者（创建者也视为管理员）
    if (!isAdmin) {
      try {
        const courseRes = await courses.doc(classId).get();
        console.log('[checkAdminStatus] 课程查询结果:', { 
          hasData: !!courseRes.data, 
          creatorOpenid: courseRes.data?.creatorOpenid,
          currentOpenid: openid,
          match: courseRes.data?.creatorOpenid === openid
        });
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
          console.log('[checkAdminStatus] 通过创建者判断，isAdmin = true');
        }
      } catch (e) {
        console.error('checkAdminStatus 查询课程信息失败:', e);
      }
    }
    
    console.log('[checkAdminStatus] 最终结果 isAdmin:', isAdmin);
    
    return {
      code: 200,
      success: true,
      data: {
        isAdmin: isAdmin,
      },
    };
  } catch (e) {
    console.error('checkAdminStatus error:', e);
    return { code: 500, success: false, message: '检查管理员状态失败', data: { isAdmin: false } };
  }
};
