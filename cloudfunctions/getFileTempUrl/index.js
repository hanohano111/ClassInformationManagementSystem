const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 获取云存储文件的临时访问链接（服务端权限兜底）
 * @param {string} event.fileID cloud://... 文件ID
 * @param {number} event.maxAge 临时链接有效期（秒），默认 86400
 */
exports.main = async (event) => {
  try {
    const fileID = event?.fileID || event?.fileId || '';
    const maxAge = Number(event?.maxAge || 86400);

    if (!fileID || typeof fileID !== 'string' || !fileID.startsWith('cloud://')) {
      return { code: 400, success: false, message: 'fileID 无效（必须为 cloud:// 开头）' };
    }

    const res = await cloud.getTempFileURL({
      fileList: [{ fileID, maxAge }],
    });

    const info = res?.fileList?.[0] || {};
    if (info.tempFileURL) {
      return {
        code: 200,
        success: true,
        data: {
          fileID: info.fileID,
          tempFileURL: info.tempFileURL,
          maxAge: info.maxAge,
        },
      };
    }

    // 兼容：云 API 可能返回 status/errMsg，但 tempFileURL 为空
    return {
      code: 403,
      success: false,
      message: info.errMsg || '无法获取临时链接（可能无权限或文件不存在）',
      data: {
        fileID: info.fileID || fileID,
        status: info.status,
        errMsg: info.errMsg,
      },
    };
  } catch (e) {
    console.error('getFileTempUrl error:', e);
    return { code: 500, success: false, message: '获取临时链接失败', error: e.message };
  }
};

