import { encryptFields } from '~/utils/crypto';

Page({
  data: {
    isCheck: false,
    isSubmit: false,
    registerInfo: {
      password: '',
      confirmPassword: '',
      phone: '',
    },
    radioValue: '',
    passwordError: '',
    phoneError: '',
  },

  changeSubmit() {
    const { password, confirmPassword, phone } = this.data.registerInfo;
    const isValid =
      password !== '' &&
      confirmPassword !== '' &&
      phone !== '' &&
      password === confirmPassword &&
      this.data.isCheck;

    this.setData({ isSubmit: isValid });
  },

  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      radioValue: value,
      isCheck: value === 'agree',
    });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    const password = e.detail.value;
    const { confirmPassword } = this.data.registerInfo;

    this.setData({
      registerInfo: { ...this.data.registerInfo, password },
      passwordError: this.checkPasswordMatch(password, confirmPassword),
    });
    this.changeSubmit();
  },

  onConfirmPasswordChange(e) {
    const confirmPassword = e.detail.value;
    const { password } = this.data.registerInfo;

    this.setData({
      registerInfo: { ...this.data.registerInfo, confirmPassword },
      passwordError: this.checkPasswordMatch(password, confirmPassword),
    });
    this.changeSubmit();
  },

  checkPasswordMatch(password, confirmPassword) {
    if (!password || !confirmPassword) return '';
    if (password !== confirmPassword) return '两次密码输入不一致';
    return '';
  },

  onPhoneChange(e) {
    const phone = e.detail.value;
    this.setData({
      registerInfo: { ...this.data.registerInfo, phone },
      phoneError: '',
    });
    this.changeSubmit();
  },

  onPhoneBlur(e) {
    const phone = e.detail.value;
    const phoneError = this.validatePhone(phone);
    this.setData({ phoneError });
  },

  validatePhone(phone) {
    if (!phone) return '';
    const phoneReg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
    if (!phoneReg.test(phone)) {
      return '请输入正确的手机号';
    }
    return '';
  },

  goToLogin() {
    wx.navigateBack();
  },

  async register() {
    console.log('【前端】点击了注册按钮');  // 👉 新增
    console.log('当前 registerInfo = ', this.data.registerInfo);  // 👉 新增
  
    
    if (!this.data.isCheck) {
      wx.showToast({
        title: '请先同意《协议条款》',
        icon: 'none',
      });
      return;
    }

    const { password, confirmPassword, phone } = this.data.registerInfo;

    const phoneReg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
    if (!phoneReg.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none',
      });
      return;
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码长度至少6位',
        icon: 'none',
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码输入不一致',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({
        title: '注册中...',
        mask: true,
      });

      // 1. 前端 AES 加密
      const encrypted = await encryptFields(
        { phone, password },
        ['phone', 'password'],
      );

      // 2. 调用云函数 register
      const res = await wx.cloud.callFunction({
        name: 'register',
        data: encrypted,
      });
      const result = res.result || {};
      // 调试日志，方便排查云函数返回
      // eslint-disable-next-line no-console
      console.log('【云函数 register 返回】', res);
      // eslint-disable-next-line no-console
      console.log('【result】', result);

      if (result.code === 200) {
        wx.hideLoading();
        wx.showToast({
          title: '注册成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.hideLoading();
        wx.showToast({
          title: result.message || '注册失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('注册失败:', error);
      wx.showToast({
        title: error.message || '注册失败，请重试',
        icon: 'none',
        duration: 2000,
      });
    }
  },
});