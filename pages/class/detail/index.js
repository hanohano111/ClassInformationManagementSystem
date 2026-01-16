// pages/class/detail/index.js

Page({
  data: {
    classId: null,
    classInfo: {},
    isAdmin: false, // 是否为管理员
  },

  onLoad(options) {
    // 兼容多种入参：id / classId
    const id = options.id || options.classId;
    if (id) {
      const classId = String(id);
      this.setData({ classId });
      this.loadClassInfo(classId);
      this.checkAdminStatus(classId);
    }
  },

  onShow() {
    // 页面显示时刷新数据
    const { classId } = this.data;
    if (classId) {
      this.loadClassInfo(classId);
      this.checkAdminStatus(classId);
    }
  },

  /** 加载课程信息 */
  async loadClassInfo(id) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getClassDetail',
        data: {
          classId: id,
        },
      });
      
      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }
      
      const classInfo = result.data || {};
      this.setData({
        classInfo: {
          id: classInfo.id || classInfo._id,
          name: classInfo.name || '',
          semester: classInfo.semester || '',
          teacherName: classInfo.teacherName || '',
          classCode: classInfo.classCode || '',
        },
      });
    } catch (error) {
      console.error('加载课程信息失败:', error);
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
        data: {
          classId: classId,
        },
      });
      
      const result = res.result || {};
      const isAdmin = result.data?.isAdmin || false;
      this.setData({ isAdmin });
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      // 默认不是管理员
      this.setData({ isAdmin: false });
    }
  },

  /** 进入课程信息页面 */
  goToClassInfo() {
    const classId = this.data.classId || this.data.classInfo?.id;
    wx.navigateTo({
      url: `/pages/class/info/index?classId=${classId}`,
    });
  },

  /** 进入课程成员页面 */
  goToClassMembers() {
    const classId = this.data.classId || this.data.classInfo?.id;
    wx.navigateTo({
      url: `/pages/class/members/index?classId=${classId}`,
    });
  },

  /** 进入签到页面 */
  goToAttendance() {
    wx.navigateTo({
      url: `/pages/class/attendance/index?classId=${this.data.classId}&courseId=${this.data.classId}`,
    });
  },

  /** 进入通知页面 */
  goToNotices() {
    const classId = this.data.classId || this.data.classInfo?.id;
    wx.navigateTo({
      url: `/pages/class/notices/index?classId=${classId}`,
    });
  },

  /** 进入作业页面 */
  goToAssignments() {
    const classId = this.data.classId || this.data.classInfo?.id;
    wx.navigateTo({
      url: `/pages/class/assignments/index?classId=${classId}`,
    });
  },

  /** 进入请假申请页面 */
  goToLeave() {
    const classId = this.data.classId || this.data.classInfo?.id;
    wx.navigateTo({
      url: `/pages/class/leave/index?classId=${classId}`,
    });
  },

  /** 进入管理员设置页面 */
  goToAdminSettings() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none',
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/class/admin/index?classId=${this.data.classId}`,
    });
  },
});
