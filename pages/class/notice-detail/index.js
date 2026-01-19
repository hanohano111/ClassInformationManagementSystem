// pages/class/notice-detail/index.js

Page({
  data: {
    noticeId: null,
    classId: null,
    notice: {},
  },

  onLoad(options) {
    const { noticeId, classId } = options;
    if (noticeId) {
      this.setData({
        noticeId: String(noticeId),
        classId: classId ? String(classId) : null,
      });
      this.loadNoticeDetail(String(noticeId));
    } else {
      wx.showToast({ title: '通知ID不能为空', icon: 'none' });
    }
  },

  /** 加载通知详情 */
  async loadNoticeDetail(noticeId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getNoticeDetail',
        data: { noticeId },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const notice = result.data || {};
      notice.createdAtText = this.formatTime(notice.createdAt);
      // 格式化附件大小
      if (notice.attachments) {
        notice.attachments = notice.attachments.map((att) => ({
          ...att,
          sizeText: this.formatFileSize(att.size),
        }));
      }

      this.setData({ notice });
      wx.hideLoading();
    } catch (error) {
      console.error('[通知详情] 加载失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '加载失败',
        icon: 'none',
      });
    }
  },

  /** 格式化时间 */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /** 格式化文件大小 */
  formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
  },

  /** 预览/下载附件，支持 cloud:// */
  async getTempUrl(fileID) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [fileID] });
      const fileInfo = res?.fileList?.[0];
      if (fileInfo?.tempFileURL) return fileInfo.tempFileURL;

      if (fileInfo?.errMsg && String(fileInfo.errMsg).includes('STORAGE_EXCEED_AUTHORITY')) {
        console.warn('[通知详情] getTempFileURL 无权限，改用云函数:', fileInfo);
        const cfRes = await wx.cloud.callFunction({
          name: 'getFileTempUrl',
          data: { fileID },
        });
        const r = cfRes?.result || {};
        if (r.code === 200 && r.data?.tempFileURL) return r.data.tempFileURL;
      }
    } catch (err) {
      console.error('[通知详情] 获取临时链接失败', err);
    }
    return '';
  },

  async previewAttachment(e) {
    const { url, name, fileid } = e.currentTarget.dataset;
    const rawUrl = url || fileid;
    console.log('[通知详情] 点击附件:', { name, url, fileid, rawUrl });
    if (!rawUrl) {
      wx.showToast({ title: '附件链接无效', icon: 'none' });
      return;
    }

    const lowerName = (name || '').toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const isImage = imageExts.some((ext) => lowerName.endsWith(ext));
    const isCloud = rawUrl.startsWith('cloud://');

    const handlePreview = async () => {
      if (isImage) {
        const tempUrl = isCloud ? await this.getTempUrl(rawUrl) : rawUrl;
        if (!tempUrl) throw new Error('无法获取附件链接');
        wx.previewImage({
          urls: [tempUrl],
          current: tempUrl,
        });
        return;
      }
      wx.showModal({
        title: '下载附件',
        content: `确定要下载 ${name || '附件'} 吗？`,
        success: async (res) => {
          if (!res.confirm) return;
          try {
            let filePath = '';
            if (isCloud) {
              try {
                const downloadRes = await wx.cloud.downloadFile({ fileID: rawUrl });
                filePath = downloadRes.tempFilePath;
              } catch (err) {
                console.error('[通知详情] cloud.downloadFile 失败，尝试临时链接:', err);
                const tempUrl = await this.getTempUrl(rawUrl);
                if (!tempUrl) throw err;
                const dl = await wx.downloadFile({ url: tempUrl });
                filePath = dl.tempFilePath || dl.filePath;
              }
            } else {
              const dl = await wx.downloadFile({ url: rawUrl });
              filePath = dl.tempFilePath || dl.filePath;
            }
            if (!filePath) throw new Error('无法获取文件');
            const fileType = this.getFileType(name, rawUrl, filePath);
            if (!fileType) {
              wx.showToast({ title: '不支持的文件类型', icon: 'none' });
              return;
            }
            wx.openDocument({
              filePath,
              fileType,
              showMenu: true,
              fail: (err) => {
                console.error('[通知详情] openDocument 失败:', err);
                wx.showToast({ title: '打开失败', icon: 'none' });
              },
            });
          } catch (err) {
            console.error('[通知详情] 下载失败:', err);
            wx.showToast({ title: '下载失败', icon: 'none' });
          }
        },
      });
    };

    try {
      await handlePreview();
    } catch (err) {
      wx.showToast({ title: '预览失败', icon: 'none' });
    }
  },

  /** 根据文件名/链接推断 fileType（仅返回小程序 openDocument 官方支持的类型） */
  getFileType(name = '', url = '', path = '') {
    const lower = (name || url || path || '').toLowerCase();
    const mapping = [
      { key: '.pdf', type: 'pdf' },
      { key: '.docx', type: 'docx' },
      { key: '.doc', type: 'doc' },
      { key: '.pptx', type: 'pptx' },
      { key: '.ppt', type: 'ppt' },
      { key: '.xlsx', type: 'xlsx' },
      { key: '.xls', type: 'xls' },
    ];
    // txt 在官方文档中未列入支持类型，这里不再强行映射，返回空交由上层提示“不支持”
    const hit = mapping.find((m) => lower.includes(m.key));
    return hit ? hit.type : '';
  },
});
