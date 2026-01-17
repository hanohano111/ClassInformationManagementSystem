// pages/home/index.js

Page({
  data: {
    messageList: [],
    loading: false,
    touchStartX: 0,
    touchStartY: 0,
    currentIndex: -1, // 当前左滑的消息索引
    isBottomReached: false, // 是否已滑到底部
  },

  onLoad() {
    this.loadMessages();
  },

  onShow() {
    // 每次显示页面时刷新消息
    this.loadMessages();
  },

  /** 加载消息列表 */
  async loadMessages() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMessages',
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      // 获取已删除和已归档的消息ID
      const deletedIds = this.getDeletedMessageIds();
      const archivedIds = this.getArchivedMessageIds();

      const messages = (result.data || [])
        .filter((msg) => {
          const msgId = this.getMessageId(msg);
          return !deletedIds.includes(msgId) && !archivedIds.includes(msgId);
        })
        .map((msg) => ({
          ...msg,
          timeText: this.formatTime(msg.timestamp),
          typeText: this.getTypeText(msg.type),
          typeClass: this.getTypeClass(msg.type), // 添加类型类名用于样式
          translateX: 0, // 左滑距离
        }));

      this.setData({ messageList: messages });
    } catch (error) {
      console.error('[消息列表] 加载失败:', error);
      wx.showToast({
        title: error.data?.message || error.message || '加载失败',
        icon: 'none',
      });
      this.setData({ messageList: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 获取消息唯一ID */
  getMessageId(message) {
    return `${message.type}_${message.courseId}_${message.relatedId}_${message.timestamp}`;
  },

  /** 获取已删除的消息ID列表 */
  getDeletedMessageIds() {
    try {
      const deleted = wx.getStorageSync('deletedMessages') || [];
      return deleted;
    } catch (error) {
      return [];
    }
  },

  /** 获取已归档的消息ID列表 */
  getArchivedMessageIds() {
    try {
      const archived = wx.getStorageSync('archivedMessages') || [];
      return archived.map((msg) => this.getMessageId(msg));
    } catch (error) {
      return [];
    }
  },

  /** 触摸开始 */
  onTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
    });
  },

  /** 触摸移动 */
  onTouchMove(e) {
    const touch = e.touches[0];
    const { index } = e.currentTarget.dataset;
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = Math.abs(touch.clientY - this.data.touchStartY);

    // 如果是垂直滑动，不处理
    if (deltaY > 30) {
      return;
    }

    // 左滑：deltaX < 0，右滑：deltaX > 0
    // 两个圆形按钮宽度：88rpx * 2 + 16rpx(间距) + 48rpx(右边距) = 240rpx
    let translateX = deltaX;
    if (translateX < -240) {
      translateX = -240; // 最大左滑距离（两个圆形按钮的宽度）
    } else if (translateX > 0) {
      translateX = 0; // 不允许右滑超过原始位置
    }

    // 关闭其他已打开的消息
    const messageList = this.data.messageList.map((msg, i) => {
      if (i === index) {
        return { ...msg, translateX };
      } else if (i === this.data.currentIndex && this.data.currentIndex !== -1) {
        return { ...msg, translateX: 0 };
      }
      return msg;
    });

    this.setData({
      messageList,
      currentIndex: translateX < -50 ? index : -1,
    });
  },

  /** 触摸结束 */
  onTouchEnd(e) {
    const { index } = e.currentTarget.dataset;
    const message = this.data.messageList[index];
    if (!message) return;

    let translateX = message.translateX;

    // 如果左滑超过120rpx（一半距离），自动展开到最大距离
    if (translateX < -120) {
      translateX = -240;
    } else {
      // 否则自动收起
      translateX = 0;
    }

    const messageList = [...this.data.messageList];
    messageList[index] = { ...message, translateX };

    this.setData({
      messageList,
      currentIndex: translateX < -100 ? index : -1,
    });
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

  /** 获取消息类型类名用于样式 */
  getTypeClass(type) {
    // 签到相关：浅红色
    if (type === 'checkin' || type === 'checkin_notice') {
      return 'checkin';
    }
    // 通知：浅蓝色
    if (type === 'notice') {
      return 'notice';
    }
    // 作业：黄色
    if (type === 'assignment_submit' || type === 'assignment_notice') {
      return 'assignment';
    }
    // 请假：绿色
    if (type === 'leave_request') {
      return 'leave';
    }
    return 'default';
  },

  /** 滚动到底部 */
  onScrollToLower() {
    this.setData({
      isBottomReached: true,
    });
    // 3秒后隐藏提示
    setTimeout(() => {
      this.setData({
        isBottomReached: false,
      });
    }, 3000);
  },

  /** 点击消息项 */
  onMessageTap(e) {
    // 如果当前有展开的消息，先收起
    if (this.data.currentIndex !== -1) {
      const messageList = [...this.data.messageList];
      messageList[this.data.currentIndex] = {
        ...messageList[this.data.currentIndex],
        translateX: 0,
      };
      this.setData({
        messageList,
        currentIndex: -1,
      });
      return;
    }

    const { index } = e.currentTarget.dataset;
    const message = this.data.messageList[index];
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

  /** 归档消息 */
  onArchive(e) {
    const { index } = e.currentTarget.dataset;
    const message = this.data.messageList[index];
    if (!message) return;

    try {
      // 保存到归档列表
      const archived = wx.getStorageSync('archivedMessages') || [];
      const msgId = this.getMessageId(message);
      
      // 检查是否已归档
      const exists = archived.some((msg) => this.getMessageId(msg) === msgId);
      if (!exists) {
        archived.unshift(message); // 添加到开头
        wx.setStorageSync('archivedMessages', archived);
      }

      // 从当前列表移除
      const messageList = this.data.messageList.filter((_, i) => i !== index);
      this.setData({ messageList, currentIndex: -1 });

      wx.showToast({
        title: '已归档',
        icon: 'success',
      });
    } catch (error) {
      console.error('归档失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none',
      });
    }
  },

  /** 删除消息 */
  onDelete(e) {
    const { index } = e.currentTarget.dataset;
    const message = this.data.messageList[index];
    if (!message) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条消息吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            // 保存到已删除列表
            const deleted = wx.getStorageSync('deletedMessages') || [];
            const msgId = this.getMessageId(message);
            
            if (!deleted.includes(msgId)) {
              deleted.push(msgId);
              wx.setStorageSync('deletedMessages', deleted);
            }

            // 从当前列表移除
            const messageList = this.data.messageList.filter((_, i) => i !== index);
            this.setData({ messageList, currentIndex: -1 });

            wx.showToast({
              title: '已删除',
              icon: 'success',
            });
          } catch (error) {
            console.error('删除失败:', error);
            wx.showToast({
              title: '操作失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /** 跳转到归档页面 */
  goToArchived() {
    wx.navigateTo({
      url: '/pages/home/archived/index',
    });
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadMessages().finally(() => {
      wx.stopPullDownRefresh();
    });
  },
});
