// pages/home/archived/index.js

Page({
  data: {
    archivedList: [],
    loading: false,
  },

  onLoad() {
    this.loadArchivedMessages();
  },

  onShow() {
    // 每次显示页面时刷新归档消息
    this.loadArchivedMessages();
  },

  /** 加载归档消息列表 */
  loadArchivedMessages() {
    this.setData({ loading: true });
    try {
      // 从本地存储获取归档消息
      const archived = wx.getStorageSync('archivedMessages') || [];
      
      const messages = archived.map((msg) => ({
        ...msg,
        timeText: this.formatTime(msg.timestamp),
        typeText: this.getTypeText(msg.type),
      }));

      this.setData({ archivedList: messages });
    } catch (error) {
      console.error('[归档消息] 加载失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
      this.setData({ archivedList: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 格式化时间 */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  },

  /** 获取消息类型文本 */
  getTypeText(type) {
    const typeMap = {
      assignment_submit: '作业提交',
      checkin: '签到情况',
      leave_request: '请假申请',
      checkin_notice: '签到通知',
      notice: '通知',
      assignment_notice: '作业通知',
    };
    return typeMap[type] || '消息';
  },

  /** 点击消息项 */
  onMessageTap(e) {
    const { index } = e.currentTarget.dataset;
    const message = this.data.archivedList[index];
    if (!message) return;

    const { type, courseId, relatedId, relatedType } = message;

    // 根据消息类型跳转到对应页面
    if (type === 'assignment_submit' || type === 'assignment_notice') {
      // 跳转到作业详情
      wx.navigateTo({
        url: `/pages/class/assignment-detail/index?assignmentId=${relatedId}&classId=${courseId}`,
      });
    } else if (type === 'checkin' || type === 'checkin_notice') {
      // 跳转到签到页面
      wx.navigateTo({
        url: `/pages/class/attendance/index?classId=${courseId}`,
      });
    } else if (type === 'leave_request') {
      // 跳转到请假详情
      wx.navigateTo({
        url: `/pages/class/leave-detail/index?leaveId=${relatedId}&classId=${courseId}`,
      });
    } else if (type === 'notice') {
      // 跳转到通知详情
      wx.navigateTo({
        url: `/pages/class/notice-detail/index?noticeId=${relatedId}&classId=${courseId}`,
      });
    }
  },

  /** 取消归档 */
  onUnarchive(e) {
    const { index } = e.currentTarget.dataset;
    const message = this.data.archivedList[index];
    if (!message) return;

    wx.showModal({
      title: '确认',
      content: '确定要取消归档吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            // 从归档列表中移除
            const archived = wx.getStorageSync('archivedMessages') || [];
            const messageId = this.getMessageId(message);
            const newArchived = archived.filter((msg) => this.getMessageId(msg) !== messageId);
            wx.setStorageSync('archivedMessages', newArchived);
            
            // 刷新列表
            this.loadArchivedMessages();
            wx.showToast({
              title: '已取消归档',
              icon: 'success',
            });
          } catch (error) {
            console.error('取消归档失败:', error);
            wx.showToast({
              title: '操作失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /** 获取消息唯一ID */
  getMessageId(message) {
    return `${message.type}_${message.courseId}_${message.relatedId}_${message.timestamp}`;
  },
});
