// pages/class/detail/index.js
Page({
  data: {
    classId: null,
    classInfo: {},
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ classId: id });
      this.loadClassInfo(id);
    }
  },

  loadClassInfo(id) {
    // TODO: 从后端获取班级详情
    // 暂时使用模拟数据
    this.setData({
      classInfo: {
        id: id,
        name: '离散数学',
        description: '离散数学课程班级',
        semester: '2024春季',
        memberCount: 45,
      },
    });
  },

  goToNotices() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  goToAssignments() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  goToAttendance() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  goToLeave() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },
});
