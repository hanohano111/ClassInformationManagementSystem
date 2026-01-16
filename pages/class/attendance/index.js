// pages/class/attendance/index.js

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
    showGeneratePopup: false, // 显示生成签到码弹窗
    generateForm: {
      note: '', // 签到提示
    },
  },

  onLoad(options) {
    const { classId, courseId } = options;
    if (classId && courseId) {
      this.setData({ classId, courseId });
      this.loadClassInfo(classId);
      this.checkAdminStatus(classId).then(() => {
        // 只有管理员才加载签到码
        if (this.data.isAdmin) {
          this.loadCurrentCheckInCode().then(() => {
            this.startTimer();
          });
        }
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
      return Promise.resolve(isAdmin);
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      // 默认不是管理员
      this.setData({ isAdmin: false });
      return Promise.resolve(false);
    }
  },

  /** 加载当前签到码（仅管理员） */
  async loadCurrentCheckInCode() {
    if (!this.data.isAdmin) {
      return;
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'getCheckInCode',
        data: {
          courseId: this.data.courseId,
        },
      });
      const result = res.result || {};
      if (result.code === 200 && result.data) {
        const { code, expireTime } = result.data;
        if (code && expireTime) {
          this.setData({
            currentCheckInCode: code,
            checkInCodeExpireTime: expireTime,
          });
        }
      }
    } catch (error) {
      // 如果签到码不存在，不显示错误
      console.log('当前无签到码');
    }
  },

  /** 生成4位随机数字签到码 */
  generateCheckInCode() {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  /** 显示生成签到码弹窗 */
  showGenerateCodePopup() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none',
      });
      return;
    }
    this.setData({
      showGeneratePopup: true,
      generateForm: {
        note: '',
      },
    });
  },

  /** 弹窗显示状态变化 */
  onGeneratePopupChange(e) {
    this.setData({
      showGeneratePopup: e.detail.visible,
    });
  },

  /** 签到提示输入 */
  onGenerateNoteInput(e) {
    this.setData({
      'generateForm.note': e.detail.value || '',
    });
  },

  /** 取消生成 */
  cancelGenerate() {
    this.setData({
      showGeneratePopup: false,
      generateForm: {
        note: '',
      },
    });
  },

  /** 确认生成签到码 */
  async confirmGenerate() {
    const { generateForm, courseId } = this.data;

    wx.showLoading({ title: '生成中...' });

    try {
      // 生成4位随机数字签到码
      const checkInCode = this.generateCheckInCode();
      // 设置5分钟过期时间
      const expireTime = Date.now() + 5 * 60 * 1000;

      const res = await wx.cloud.callFunction({
        name: 'generateCheckInCode',
        data: {
          courseId: courseId,
          code: checkInCode,
          expireTime: expireTime,
          note: (generateForm.note || '').trim(), // 签到提示
        },
      });

      if (!res || !res.result) {
        throw { message: '云函数调用失败，请检查云函数是否已上传', data: res };
      }

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '生成失败', data: result };
      }

      wx.hideLoading();

      // 计算初始剩余时间
      const minutes = Math.floor(5);
      const seconds = 0;

      this.setData({
        currentCheckInCode: checkInCode,
        checkInCodeExpireTime: expireTime,
        remainTimeText: `${minutes}分${seconds}秒`,
        showGeneratePopup: false,
        generateForm: {
          note: '',
        },
      });

      // 启动定时器更新剩余时间
      this.startTimer();

      wx.showToast({
        title: '签到码已生成',
        icon: 'success',
      });
    } catch (error) {
      wx.hideLoading();
      
      let errorMsg = '生成失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 generateCheckInCode 云函数';
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
    }
  },

  /** 签到码输入 */
  onCheckInCodeInput(e) {
    // t-input 的 bindchange 事件，value 在 e.detail.value 中
    let value = String(e.detail.value || '').replace(/\D/g, '');
    // 限制为4位数字
    value = value.slice(0, 4);
    this.setData({
      checkInCodeInput: value,
    });
    console.log('[签到码输入] 当前值:', value, '长度:', value.length);
  },

  /** 签到码签到（同时进行定位签到） */
  async checkInByCode() {
    const { checkInCodeInput, courseId } = this.data;

    // 验证签到码
    const code = String(checkInCodeInput || '').trim();
    console.log('[签到码签到] 输入的签到码:', code, '长度:', code.length);
    
    if (!code || code.length !== 4) {
      wx.showToast({
        title: '请输入4位签到码',
        icon: 'none',
      });
      return;
    }

    // 先获取定位
    wx.showLoading({ title: '获取定位中...' });
    let location = null;

    try {
      // 检查定位权限
      const settingRes = await wx.getSetting();
      if (!settingRes.authSetting['scope.userLocation']) {
        await wx.authorize({
          scope: 'scope.userLocation',
        });
      }

      // 获取精确定位
      location = await this.getPreciseLocation();
    } catch (authError) {
      wx.hideLoading();
      if (authError.errMsg && (authError.errMsg.includes('auth deny') || authError.errMsg.includes('authorize'))) {
        wx.showModal({
          title: '需要位置权限',
          content: '签到需要获取您的位置信息，请在设置中开启位置权限',
          showCancel: false,
        });
      } else {
        wx.showToast({
          title: '获取定位失败，请重试',
          icon: 'none',
        });
      }
      return;
    }

    if (!location) {
      wx.hideLoading();
      wx.showToast({
        title: '获取定位失败，请重试',
        icon: 'none',
      });
      return;
    }

    // 进行签到（同时提交签到码和定位信息）
    wx.showLoading({ title: '签到中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkInByCode',
        data: {
          courseId: courseId,
          code: code,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0,
        },
      });

      if (!res || !res.result) {
        throw { message: '云函数调用失败，请检查云函数是否已上传', data: res };
      }

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '签到失败', data: result };
      }

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
      
      let errorMsg = '签到失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 checkInByCode 云函数';
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
    }
  },

  /** 获取精确定位 */
  getPreciseLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02', // 返回可以用于wx.openLocation的经纬度
        altitude: true, // 传入 true 会返回高度信息
        isHighAccuracy: true, // 开启高精度定位
        highAccuracyExpireTime: 10000, // 高精度定位超时时间10秒
        success: (res) => {
          console.log('[定位签到] 获取定位成功:', res);
          resolve({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy || 0,
            altitude: res.altitude || 0,
          });
        },
        fail: (err) => {
          console.error('[定位签到] 获取定位失败:', err);
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

  /** 跳转到签到记录页面 */
  goToAttendanceRecords() {
    const { classId, courseId } = this.data;
    wx.navigateTo({
      url: `/pages/class/attendance-records/index?classId=${classId}&courseId=${courseId}`,
    });
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
});
