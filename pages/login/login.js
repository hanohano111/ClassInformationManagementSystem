Page({
  data: {
    isCheck: false,
    radioValue: '',
  },

  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      radioValue: value,
      isCheck: value === 'agree',
    });
  },

  async login() {
    if (!this.data.isCheck) {
      wx.showToast({
        title: '请先同意《协议条款》',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({
        title: '登录中...',
        mask: true,
      });

      // 直接调用云函数 login（不需要传账号密码，云函数会自动用 openid）
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {}, // 不需要传任何参数，云函数会自动获取 openid
      });
      const result = res.result || {};

      if (result.code === 200) {
        const { userId, role } = result.data || {};

        // 保存用户信息到本地
        if (userId) {
          wx.setStorageSync('userId', userId);
        }
        if (role !== undefined) {
          wx.setStorageSync('userRole', role);
        }

        wx.hideLoading();
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/index',
          });
        }, 1500);
      } else {
        wx.hideLoading();
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000,
      });
    }
  },
});