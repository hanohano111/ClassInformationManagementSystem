const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const notices = db.collection('notices');
const users = db.collection('users');

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

    // 解密发布人姓名
    let creatorName = noticeRes.data.creatorName || '';
    if (noticeRes.data.creatorId) {
      const userRes = await users.doc(noticeRes.data.creatorId).get();
      if (userRes.data) {
        const decrypted = decryptFieldsFromDB(
          {
            name: userRes.data.name || creatorName,
            name_iv: userRes.data.name_iv,
          },
          ['name'],
        );
        creatorName = decrypted.name || creatorName;
      }
    }

    const notice = {
      id: noticeRes.data._id,
      title: noticeRes.data.title || '',
      content: noticeRes.data.content || '',
      attachments: noticeRes.data.attachments || [],
      courseId: noticeRes.data.courseId,
      creatorId: noticeRes.data.creatorId,
      creatorName: creatorName,
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
