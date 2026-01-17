const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const notices = db.collection('notices');
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { noticeId } = event;

    if (!noticeId) {
      return { code: 400, success: false, message: '通知ID不能为空' };
    }

    // 先获取通知信息，以便检查权限
    const noticeRes = await notices.doc(noticeId).get();
    if (!noticeRes.data) {
      return { code: 404, success: false, message: '通知不存在' };
    }

    const notice = noticeRes.data;
    const courseId = notice.courseId;

    // 检查权限：是否为管理员或通知创建者
    const memberRes = await courseMembers
      .where({
        courseId: courseId,
        openid: openid,
      })
      .get();

    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';
    let isCreator = notice.creatorOpenid === openid;

    if (!isAdmin && !isCreator) {
      try {
        const courseRes = await courses.doc(courseId).get();
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('deleteNotice 查询课程信息失败:', e);
      }
    }

    if (!isAdmin && !isCreator) {
      return { code: 403, success: false, message: '无权限删除通知' };
    }

    // 删除通知
    await notices.doc(noticeId).remove();

    return {
      code: 200,
      success: true,
      message: '删除成功',
    };
  } catch (e) {
    console.error('deleteNotice error:', e);
    return { code: 500, success: false, message: '删除通知失败', error: e.message };
  }
};
