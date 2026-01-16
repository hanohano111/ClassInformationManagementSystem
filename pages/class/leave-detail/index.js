// pages/class/leave-detail/index.js

Page({
  data: {
    leaveId: null,
    classId: null,
    leave: {},
    isAdmin: false,
    showApprovePopup: false,
    approveComment: '',
  },

  onLoad(options) {
    const { leaveId, classId } = options;
    if (leaveId) {
      this.setData({
        leaveId: String(leaveId),
        classId: classId ? String(classId) : null,
      });
      this.loadLeaveDetail(String(leaveId));
      if (classId) {
        this.checkAdminStatus(String(classId));
      }
    } else {
      wx.showToast({ title: '请假ID不能为空', icon: 'none' });
    }
  },

  /** 加载请假详情 */
  async loadLeaveDetail(leaveId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getLeaveRequestDetail',
        data: { leaveRequestId: leaveId },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const leave = result.data || {};
      leave.dateText = this.formatDate(leave.date || leave.startTime);
      leave.statusText = this.getStatusText(leave.status);
      // 格式化附件大小
      if (leave.attachments) {
        leave.attachments = leave.attachments.map((att) => ({
          ...att,
          sizeText: this.formatFileSize(att.size),
        }));
      }

      this.setData({ leave });
      wx.hideLoading();
    } catch (error) {
      console.error('[请假详情] 加载失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '加载失败',
        icon: 'none',
      });
    }
  },

  /** 检查管理员状态 */
  async checkAdminStatus(classId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdminStatus',
        data: { classId },
      });
      const result = res.result || {};
      const isAdmin = result.data?.isAdmin || false;
      this.setData({ isAdmin });
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      this.setData({ isAdmin: false });
    }
  },

  /** 格式化日期 */
  formatDate(dateStr) {
    if (!dateStr) return '';
    // 如果是时间戳，转换为日期
    if (typeof dateStr === 'number') {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    // 如果是日期字符串，直接返回（格式：YYYY-MM-DD）
    if (typeof dateStr === 'string' && dateStr.length === 10) {
      return dateStr;
    }
    // 如果是其他格式，尝试解析
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  /** 获取状态文本 */
  getStatusText(status) {
    const statusMap = {
      0: '待审批',
      1: '已通过',
      2: '已拒绝',
    };
    return statusMap[status] || '未知';
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

  /** 显示审批弹窗 */
  showApproveModal() {
    this.setData({ showApprovePopup: true });
  },

  /** 关闭审批弹窗 */
  closeApprovePopup() {
    this.setData({ showApprovePopup: false, approveComment: '' });
  },

  /** 审批弹窗状态变化 */
  onApprovePopupChange(e) {
    this.setData({ showApprovePopup: e.detail.visible });
  },

  /** 审批意见输入 */
  onApproveCommentInput(e) {
    this.setData({
      approveComment: e.detail.value || '',
    });
  },

  /** 审批通过 */
  async approveLeave() {
    await this.submitApprove(1);
  },

  /** 审批拒绝 */
  async rejectLeave() {
    await this.submitApprove(2);
  },

  /** 提交审批 */
  async submitApprove(status) {
    const { leaveId, approveComment } = this.data;
    wx.showLoading({ title: '审批中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'approveLeaveRequest',
        data: {
          leaveRequestId: leaveId,
          status: status,
          comment: approveComment.trim(),
        },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '审批失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '审批成功',
        icon: 'success',
      });

      this.setData({ showApprovePopup: false, approveComment: '' });
      // 重新加载详情
      await this.loadLeaveDetail(leaveId);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '审批失败',
        icon: 'none',
      });
    }
  },
});
