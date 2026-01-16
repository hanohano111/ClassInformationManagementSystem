const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const notices = db.collection('notices');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { classId } = event;

    if (!classId) {
      return { code: 400, success: false, message: '课程ID不能为空', data: [] };
    }

    const noticeRes = await notices
      .where({
        courseId: classId,
      })
      .orderBy('createdAt', 'desc')
      .get();

    const noticeList = (noticeRes.data || []).map((notice) => ({
      id: notice._id,
      title: notice.title || '',
      content: notice.content || '',
      attachments: notice.attachments || [],
      courseId: notice.courseId,
      creatorId: notice.creatorId,
      creatorName: notice.creatorName || '',
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
    }));

    return {
      code: 200,
      success: true,
      data: noticeList,
    };
  } catch (e) {
    console.error('getNotices error:', e);
    return { code: 500, success: false, message: '获取通知列表失败', error: e.message, data: [] };
  }
};
