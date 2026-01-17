// pages/class/notices/index.js

Page({
  data: {
    classId: null,
    noticeList: [],
    isAdmin: false,
    touchStartX: 0,
    touchStartY: 0,
    currentIndex: -1, // 当前滑动的项索引
    isTouching: false, // 是否正在触摸滑动
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    if (classId) {
      this.setData({ classId: String(classId) });
      this.loadNotices(String(classId));
      this.checkAdminStatus(String(classId));
    } else {
      wx.showToast({ title: '班级ID不能为空', icon: 'none' });
    }
  },

  onShow() {
    // 页面显示时刷新列表
    const { classId } = this.data;
    if (classId) {
      this.loadNotices(classId);
    }
  },

  /** 加载通知列表 */
  async loadNotices(classId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getNotices',
        data: { classId },
      });

      if (!res || !res.result) {
        throw { message: '云函数调用失败，请检查云函数是否已上传', data: res };
      }

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const notices = result.data || [];
      // 格式化时间和内容摘要
      const noticeList = notices.map((notice) => ({
        ...notice,
        createdAtText: this.formatTime(notice.createdAt),
        contentPreview: this.getContentPreview(notice.content || ''),
        translateX: 0, // 初始化滑动距离
      }));

      this.setData({ noticeList });
      wx.hideLoading();
    } catch (error) {
      console.error('[通知列表] 加载失败:', error);
      wx.hideLoading();
      
      let errorMsg = '加载失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 getNotices 云函数';
      } else if (error.data?.message) {
        errorMsg = error.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000,
      });
      this.setData({ noticeList: [] });
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

  /** 格式化时间 */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    } else if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前';
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  },

  /** 获取内容摘要 */
  getContentPreview(content) {
    if (!content) return '';
    // 去除 HTML 标签和换行符
    const text = content.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
    // 限制长度，最多显示 80 个字符
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  },

  /** 点击通知 */
  onNoticeTap(e) {
    const { noticeId, index } = e.currentTarget.dataset;
    const notice = this.data.noticeList[index];
    if (!notice) return;

    // 如果当前项处于滑动状态，先恢复
    if (this.data.currentIndex === index) {
      this.setData({ currentIndex: -1 });
      return;
    }

    // 跳转到详情页面
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/notice-detail/index?noticeId=${noticeId}&classId=${classId}`,
    });
  },

  /** 触摸开始 */
  onTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      isTouching: true,
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

    // 只有管理员才能滑动删除
    if (!this.data.isAdmin) {
      return;
    }

    // 左滑：deltaX < 0，右滑：deltaX > 0
    // 按钮宽度：88rpx + 16rpx(间距) + 20rpx(右边距) = 124rpx
    let translateX = deltaX;
    if (translateX < -124) {
      translateX = -124; // 最大左滑距离（圆形按钮的宽度）
    } else if (translateX > 0) {
      translateX = 0; // 不允许右滑超过原始位置
    }

    // 关闭其他已打开的项
    const noticeList = this.data.noticeList.map((notice, i) => {
      if (i === index) {
        return { ...notice, translateX };
      } else if (i === this.data.currentIndex && this.data.currentIndex !== -1) {
        return { ...notice, translateX: 0 };
      }
      return notice;
    });

    this.setData({
      noticeList,
      currentIndex: translateX < -50 ? index : -1,
    });
  },

  /** 触摸结束 */
  onTouchEnd(e) {
    const { index } = e.currentTarget.dataset;
    const notice = this.data.noticeList[index];
    if (!notice) return;

    let translateX = notice.translateX || 0;

    // 如果左滑超过62rpx（一半距离），自动展开到最大距离
    if (translateX < -62) {
      translateX = -124;
    } else {
      // 否则自动收起
      translateX = 0;
    }

    const noticeList = [...this.data.noticeList];
    noticeList[index] = { ...notice, translateX };

    this.setData({
      noticeList,
      currentIndex: translateX < -50 ? index : -1,
      isTouching: false,
    });
  },

  /** 删除通知 */
  async onDeleteNotice(e) {
    const { noticeId, index } = e.currentTarget.dataset;
    const notice = this.data.noticeList[index];
    if (!notice) return;

    // 确认删除
    const res = await wx.showModal({
      title: '提示',
      content: '确定要删除这条通知吗？删除后将无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff4757',
    });

    if (!res.confirm) {
      // 取消删除，恢复滑动状态
      this.setData({ currentIndex: -1 });
      return;
    }

    wx.showLoading({ title: '删除中...' });

    try {
      const cloudRes = await wx.cloud.callFunction({
        name: 'deleteNotice',
        data: {
          noticeId: noticeId,
        },
      });

      if (!cloudRes || !cloudRes.result) {
        throw { message: '云函数调用失败', data: cloudRes };
      }

      const result = cloudRes.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '删除失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success',
      });

      // 关闭滑动状态
      this.setData({ currentIndex: -1 });

      // 重新加载通知列表，确保数据同步
      setTimeout(() => {
        this.loadNotices(this.data.classId);
      }, 500);
    } catch (error) {
      wx.hideLoading();

      let errorMsg = '删除失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 deleteNotice 云函数';
      } else if (error.data?.message) {
        errorMsg = error.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000,
      });

      // 恢复滑动状态
      this.setData({ currentIndex: -1 });
    }
  },

  /** 进入通知详情 */
  goToNoticeDetail(e) {
    const noticeId = e.currentTarget.dataset.noticeId;
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/notice-detail/index?noticeId=${noticeId}&classId=${classId}`,
    });
  },

  /** 进入创建通知页面 */
  goToCreateNotice() {
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/notice-create/index?classId=${classId}`,
    });
  },
});
