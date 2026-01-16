// pages/class/assignments/index.js

Page({
  data: {
    classId: null,
    assignmentList: [],
    isAdmin: false,
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    if (classId) {
      this.setData({ classId: String(classId) });
      this.loadAssignments(String(classId));
      this.checkAdminStatus(String(classId));
    } else {
      wx.showToast({ title: '课程ID不能为空', icon: 'none' });
    }
  },

  onShow() {
    // 页面显示时刷新列表
    const { classId } = this.data;
    if (classId) {
      this.loadAssignments(classId);
    }
  },

  /** 加载作业列表 */
  async loadAssignments(classId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getAssignments',
        data: { classId },
      });

      if (!res || !res.result) {
        throw { message: '云函数调用失败，请检查云函数是否已上传', data: res };
      }

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const assignments = result.data || [];
      // 格式化时间（虽然不再显示，但保留以防需要）
      const assignmentList = assignments.map((assignment) => ({
        ...assignment,
        createdAtText: this.formatTime(assignment.createdAt),
        deadlineText: assignment.deadline ? this.formatDeadlineTime(assignment.deadline) : '',
      }));

      this.setData({ assignmentList });
      wx.hideLoading();
    } catch (error) {
      console.error('[作业列表] 加载失败:', error);
      wx.hideLoading();
      
      let errorMsg = '加载失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 getAssignments 云函数';
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
      this.setData({ assignmentList: [] });
    }
  },

  /** 格式化截止时间 */
  formatDeadlineTime(timestamp) {
    if (!timestamp) return '';
    const deadline = new Date(timestamp);
    const now = new Date();
    const diff = deadline - now;
    
    if (diff < 0) {
      return '已过期';
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟后截止';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时后截止';
    } else {
      const year = deadline.getFullYear();
      const month = String(deadline.getMonth() + 1).padStart(2, '0');
      const day = String(deadline.getDate()).padStart(2, '0');
      const hour = String(deadline.getHours()).padStart(2, '0');
      const minute = String(deadline.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
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

  /** 进入作业详情 */
  goToAssignmentDetail(e) {
    const assignmentId = e.currentTarget.dataset.assignmentId;
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/assignment-detail/index?assignmentId=${assignmentId}&classId=${classId}`,
    });
  },

  /** 进入创建作业页面 */
  goToCreateAssignment() {
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/assignment-create/index?classId=${classId}`,
    });
  },
});
