const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const notices = db.collection('notices');

exports.main = async (event) => {
  try {
    const { noticeId } = event;

    if (!noticeId) {
      return { code: 400, success: false, message: '通知ID不能为空' };
    }

    const noticeRes = await notices.doc(noticeId).get();

    if (!noticeRes.data) {
      return { code: 404, success: false, message: '通知不存在' };
    }

    const notice = {
      id: noticeRes.data._id,
      title: noticeRes.data.title || '',
      content: noticeRes.data.content || '',
      attachments: noticeRes.data.attachments || [],
      courseId: noticeRes.data.courseId,
      creatorId: noticeRes.data.creatorId,
      creatorName: noticeRes.data.creatorName || '',
      createdAt: noticeRes.data.createdAt,
      updatedAt: noticeRes.data.updatedAt,
    };

    return {
      code: 200,
      success: true,
      data: notice,
    };
  } catch (e) {
    console.error('getNoticeDetail error:', e);
    return { code: 500, success: false, message: '获取通知详情失败', error: e.message };
  }
};
