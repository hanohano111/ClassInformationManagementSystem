// pages/class/notices/index.js

Page({
  data: {
    classId: null,
    noticeList: [],
    isAdmin: false,
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    if (classId) {
      this.setData({ classId: String(classId) });
      this.loadNotices(String(classId));
      this.checkAdminStatus(String(classId));
    } else {
      wx.showToast({ title: '课程ID不能为空', icon: 'none' });
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
      // 格式化时间
      const noticeList = notices.map((notice) => ({
        ...notice,
        createdAtText: this.formatTime(notice.createdAt),
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
