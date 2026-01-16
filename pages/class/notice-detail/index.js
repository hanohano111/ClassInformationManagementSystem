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

  /** 预览附件 */
  previewAttachment(e) {
    const { url, name } = e.currentTarget.dataset;
    if (!url) {
      wx.showToast({ title: '附件链接无效', icon: 'none' });
      return;
    }

    // 如果是图片，使用预览图片
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const isImage = imageExts.some((ext) => name.toLowerCase().endsWith(ext));

    if (isImage) {
      wx.previewImage({
        urls: [url],
        current: url,
      });
    } else {
      // 其他文件类型，下载或打开
      wx.showModal({
        title: '下载附件',
        content: `确定要下载 ${name} 吗？`,
        success: (res) => {
          if (res.confirm) {
            wx.downloadFile({
              url: url,
              success: (downloadRes) => {
                wx.openDocument({
                  filePath: downloadRes.tempFilePath,
                  showMenu: true,
                });
              },
              fail: () => {
                wx.showToast({ title: '下载失败', icon: 'none' });
              },
            });
          }
        },
      });
    }
  },
});
