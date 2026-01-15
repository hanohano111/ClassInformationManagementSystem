// pages/class/settings/index.js
Page({
  data: {},

  onLoad() {},

  editClassInfo() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  manageMembers() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  permissionSettings() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  exitClass() {
    wx.showModal({
      title: '退出课程',
      content: '确定要退出该课程吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用退出课程接口
          wx.showToast({
            title: '已退出课程',
            icon: 'success',
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
    });
  },

  dissolveClass() {
    wx.showModal({
      title: '解散课程',
      content: '确定要解散该课程吗？此操作不可恢复！',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用解散课程接口
          wx.showToast({
            title: '课程已解散',
            icon: 'success',
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
    });
  },
});
