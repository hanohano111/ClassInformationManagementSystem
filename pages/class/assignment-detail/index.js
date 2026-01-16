// pages/class/assignment-detail/index.js

Page({
  data: {
    assignmentId: null,
    classId: null,
    assignment: {},
  },

  onLoad(options) {
    const { assignmentId, classId } = options;
    if (assignmentId) {
      this.setData({
        assignmentId: String(assignmentId),
        classId: classId ? String(classId) : null,
      });
      this.loadAssignmentDetail(String(assignmentId));
    } else {
      wx.showToast({ title: '作业ID不能为空', icon: 'none' });
    }
  },

  onShow() {
    // 页面显示时刷新详情
    const { assignmentId } = this.data;
    if (assignmentId) {
      this.loadAssignmentDetail(assignmentId);
    }
  },

  /** 加载作业详情 */
  async loadAssignmentDetail(assignmentId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getAssignmentDetail',
        data: { assignmentId },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const assignment = result.data || {};
      assignment.createdAtText = this.formatTime(assignment.createdAt);
      assignment.deadlineText = assignment.deadline ? this.formatDeadlineTime(assignment.deadline) : '';
      // 检查是否过期
      if (assignment.deadline) {
        assignment.isOverdue = Date.now() > assignment.deadline;
      }
      // 格式化附件大小
      if (assignment.attachments) {
        assignment.attachments = assignment.attachments.map((att) => ({
          ...att,
          sizeText: this.formatFileSize(att.size),
        }));
      }

      this.setData({ assignment });
      wx.hideLoading();
    } catch (error) {
      console.error('[作业详情] 加载失败:', error);
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

  /** 格式化截止时间 */
  formatDeadlineTime(timestamp) {
    if (!timestamp) return '';
    const deadline = new Date(timestamp);
    const now = new Date();
    const diff = deadline - now;
    
    const year = deadline.getFullYear();
    const month = String(deadline.getMonth() + 1).padStart(2, '0');
    const day = String(deadline.getDate()).padStart(2, '0');
    const hour = String(deadline.getHours()).padStart(2, '0');
    const minute = String(deadline.getMinutes()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day} ${hour}:${minute}`;
    
    if (diff < 0) {
      return `${timeStr} (已过期)`;
    } else if (diff < 3600000) {
      return `${timeStr} (${Math.floor(diff / 60000)}分钟后截止)`;
    } else if (diff < 86400000) {
      return `${timeStr} (${Math.floor(diff / 3600000)}小时后截止)`;
    } else {
      return timeStr;
    }
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

  /** 进入提交作业页面 */
  goToSubmitAssignment() {
    const { assignmentId, classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/assignment-submit/index?assignmentId=${assignmentId}&classId=${classId}`,
    });
  },
});
