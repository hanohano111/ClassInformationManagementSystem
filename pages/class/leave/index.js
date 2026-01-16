// pages/class/leave/index.js

Page({
  data: {
    classId: null,
    leaveList: [],
    isAdmin: false,
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    if (classId) {
      this.setData({ classId: String(classId) });
      this.checkAdminStatus(String(classId));
      this.loadLeaveRequests(String(classId));
    } else {
      wx.showToast({ title: '课程ID不能为空', icon: 'none' });
    }
  },

  onShow() {
    // 页面显示时刷新列表
    const { classId, isAdmin } = this.data;
    if (classId) {
      this.loadLeaveRequests(classId);
    }
  },

  /** 加载请假列表 */
  async loadLeaveRequests(classId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getLeaveRequests',
        data: {
          classId,
          isAdmin: this.data.isAdmin,
        },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const leaves = result.data || [];
      // 格式化日期
      const leaveList = leaves.map((leave) => ({
        ...leave,
        dateText: this.formatDate(leave.date || leave.startTime),
        statusText: this.getStatusText(leave.status),
      }));

      this.setData({ leaveList });
      wx.hideLoading();
    } catch (error) {
      console.error('[请假列表] 加载失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '加载失败',
        icon: 'none',
      });
      this.setData({ leaveList: [] });
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

  /** 进入请假详情 */
  goToLeaveDetail(e) {
    const leaveId = e.currentTarget.dataset.leaveId;
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/leave-detail/index?leaveId=${leaveId}&classId=${classId}`,
    });
  },

  /** 进入创建请假页面 */
  goToCreateLeave() {
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/leave-create/index?classId=${classId}`,
    });
  },
});
