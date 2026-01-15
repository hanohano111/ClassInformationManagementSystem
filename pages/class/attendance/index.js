// pages/class/attendance/index.js
import request from '~/api/request';
import { generateClassCode } from '~/utils/util';

Page({
  data: {
    classId: null,
    courseId: null,
    classInfo: {},
    isAdmin: false,
    currentCheckInCode: null, // 当前签到码
    checkInCodeExpireTime: null, // 签到码过期时间（时间戳）
    remainTimeText: '', // 剩余时间文本
    checkInCodeInput: '', // 输入的签到码
    location: null, // 定位信息
  },

  onLoad(options) {
    const { classId, courseId } = options;
    if (classId && courseId) {
      this.setData({ classId, courseId });
      this.loadClassInfo(classId);
      this.checkAdminStatus(classId);
      this.loadCurrentCheckInCode().then(() => {
        this.startTimer();
      });
    }
  },

  /** 加载课程信息 */
  async loadClassInfo(classId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getClassDetail',
        data: {
          classId: classId,
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
      
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: `签到 - ${classInfo.name || '课程'}`,
      });
    } catch (error) {
      console.error('加载课程信息失败:', error);
      wx.setNavigationBarTitle({
        title: '签到 - 课程',
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

  /** 加载当前签到码 */
  async loadCurrentCheckInCode() {
    try {
      const res = await request(`/api/course/${this.data.courseId}/checkin/current`, 'GET');
      const data = res.data?.data || {};
      if (data.code && data.expireTime) {
        this.setData({
          currentCheckInCode: data.code,
          checkInCodeExpireTime: data.expireTime,
        });
      }
    } catch (error) {
      console.error('加载签到码失败:', error);
    }
  },

  /** 生成签到码（管理员） */
  async generateCheckInCode() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '生成中...' });

    try {
      // 生成6位签到码
      const checkInCode = generateClassCode();
      // 设置5分钟过期时间
      const expireTime = Date.now() + 5 * 60 * 1000;

      const res = await request(`/api/course/${this.data.courseId}/checkin/generate`, 'POST', {
        code: checkInCode,
        expireTime,
      });

      wx.hideLoading();

      // 计算初始剩余时间
      const minutes = Math.floor(5);
      const seconds = 0;

      this.setData({
        currentCheckInCode: checkInCode,
        checkInCodeExpireTime: expireTime,
        remainTimeText: `${minutes}分${seconds}秒`,
      });

      // 启动定时器更新剩余时间
      this.startTimer();

      wx.showToast({
        title: '签到码已生成',
        icon: 'success',
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '生成失败',
        icon: 'none',
      });
    }
  },

  /** 签到码输入 */
  onCheckInCodeInput(e) {
    this.setData({
      checkInCodeInput: e.detail.value.toUpperCase(),
    });
  },

  /** 签到码签到 */
  async checkInByCode() {
    const { checkInCodeInput, courseId } = this.data;

    if (!checkInCodeInput || checkInCodeInput.length !== 6) {
      wx.showToast({
        title: '请输入6位签到码',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '签到中...' });

    try {
      const res = await request(`/api/course/${courseId}/checkin/code`, 'POST', {
        code: checkInCodeInput,
      });

      wx.hideLoading();
      wx.showToast({
        title: '签到成功',
        icon: 'success',
      });

      // 清空输入
      this.setData({
        checkInCodeInput: '',
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '签到失败',
        icon: 'none',
      });
    }
  },

  /** 定位签到 */
  async checkInByLocation() {
    wx.showLoading({ title: '获取定位中...' });

    try {
      // 获取精确定位
      const location = await this.getPreciseLocation();
      
      wx.hideLoading();

      if (!location) {
        wx.showToast({
          title: '获取定位失败',
          icon: 'none',
        });
        return;
      }

      wx.showLoading({ title: '签到中...' });

      const res = await request(`/api/course/${this.data.courseId}/checkin/location`, 'POST', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });

      wx.hideLoading();
      wx.showToast({
        title: '签到成功',
        icon: 'success',
      });
    } catch (error) {
      wx.hideLoading();
      
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '需要位置权限',
          content: '定位签到需要获取您的位置信息，请在设置中开启位置权限',
          showCancel: false,
        });
      } else {
        wx.showToast({
          title: error.data?.message || error.message || '签到失败',
          icon: 'none',
        });
      }
    }
  },

  /** 获取精确定位 */
  getPreciseLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02', // 返回可以用于wx.openLocation的经纬度
        altitude: true, // 传入 true 会返回高度信息
        isHighAccuracy: true, // 开启高精度定位
        highAccuracyExpireTime: 4000, // 高精度定位超时时间
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            altitude: res.altitude,
          });
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  },


  /** 定时更新剩余时间 */
  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      if (this.data.checkInCodeExpireTime) {
        const now = Date.now();
        const remain = this.data.checkInCodeExpireTime - now;
        
        if (remain <= 0) {
          this.setData({
            currentCheckInCode: null,
            checkInCodeExpireTime: null,
            remainTimeText: '已过期',
          });
          clearInterval(this.timer);
        } else {
          const minutes = Math.floor(remain / 60000);
          const seconds = Math.floor((remain % 60000) / 1000);
          this.setData({
            remainTimeText: `${minutes}分${seconds}秒`,
          });
        }
      }
    }, 1000);
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
});
