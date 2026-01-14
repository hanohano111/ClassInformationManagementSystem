import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    personalInfo: {},
    settingList: [
      { name: '退出登录', icon: 'poweroff', type: 'logout' },
    ],
  },

  onLoad() {},

  async onShow() {
    // 兼容旧逻辑（access_token）和新云函数登录逻辑（userId）
    const token = wx.getStorageSync('access_token');
    const userId = wx.getStorageSync('userId');

    if (!token && !userId) {
      this.setData({
        isLoad: false,
        personalInfo: {},
      });
      return;
    }

    const personalInfo = await this.getPersonalInfo();
    this.setData({
      isLoad: true,
      personalInfo,
    });
  },

  async getPersonalInfo() {
    try {
      // 与资料编辑页保持一致，走云函数获取真实个人信息
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo',
      });
      const result = res.result || {};
      if (result.code === 200) {
        const info = result.data || {};
        // 适配当前「我的」页所需的字段结构
        return {
          // 头像：兼容 avatar / image，且保证传给组件的一定是字符串
          image: info.avatar || info.image || '',
          avatar: info.avatar || info.image || '',
          // 显示名称
          name: info.name || '',
          // 其他字段预留（目前 UI 里 star/city 没有真实数据也不会报错）
          star: info.star || '',
          city: info.city || '',
        };
      }
      return {};
    } catch (e) {
      console.error('获取个人信息失败：', e);
      return {};
    }
  },

  onLogin(e) {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  onNavigateTo() {
    wx.navigateTo({ url: `/pages/my/info-edit/index` });
  },

  onEleClick(e) {
    const { name, url, type } = e.currentTarget.dataset.data;
    if (type === 'logout') {
      wx.clearStorageSync();
      this.setData({
        isLoad: false,
        personalInfo: {},
      });
      this.onShowToast('#t-toast', '已退出登录');
      return;
    }
    if (url) {
      wx.navigateTo({ url });
      return;
    }
    this.onShowToast('#t-toast', name);
  },
});
