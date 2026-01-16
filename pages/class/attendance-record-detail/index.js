// pages/class/attendance-record-detail/index.js

Page({
  data: {
    courseId: null,
    code: null,
    record: null,
    isAdmin: false,
    touchStartX: 0,
    touchStartY: 0,
    currentIndex: -1,
  },

  onLoad(options) {
    const { courseId, code } = options;
    if (courseId && code) {
      this.setData({ courseId, code });
      this.checkAdminStatus(courseId);
      this.loadRecordDetail(courseId, code);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /** 加载签到记录详情 */
  async loadRecordDetail(courseId, code) {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'getCheckInRecords',
        data: {
          courseId: courseId,
        },
      });

      if (!res || !res.result) {
        throw { message: '云函数调用失败，请检查云函数是否已上传', data: res };
      }

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const records = result.data || [];
      // 找到对应签到码的记录
      const record = records.find((r) => r.code === code);

      if (!record) {
        throw { message: '未找到该签到记录' };
      }

      // 格式化时间和定位信息
      const memberStatusList = (record.memberStatusList || []).map((member) => ({
        ...member,
        checkInTimeText: member.checkInTime ? this.formatTime(member.checkInTime) : '',
        latitudeText: member.latitude ? Number(member.latitude).toFixed(6) : '',
        longitudeText: member.longitude ? Number(member.longitude).toFixed(6) : '',
        translateX: 0, // 初始化左滑位置
      }));

      // 重新计算签到人数（基于实际的签到状态）
      const checkedInCount = memberStatusList.filter((m) => m.hasCheckedIn).length;

      const formattedRecord = {
        ...record,
        createdAtText: this.formatTime(record.createdAt),
        memberStatusList: memberStatusList,
        checkedInCount: checkedInCount, // 使用重新计算的值
      };

      wx.hideLoading();
      this.setData({ record: formattedRecord });
    } catch (error) {
      wx.hideLoading();
      
      let errorMsg = '加载失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 getCheckInRecords 云函数';
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

  /** 格式化时间 */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /** 检查管理员状态 */
  async checkAdminStatus(courseId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdminStatus',
        data: {
          classId: courseId,
        },
      });
      const result = res.result || {};
      const isAdmin = result.data?.isAdmin || false;
      this.setData({ isAdmin });
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      this.setData({ isAdmin: false });
    }
  },

  /** 触摸开始 */
  onTouchStart(e) {
    if (!this.data.isAdmin) return;
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
    });
  },

  /** 触摸移动 */
  onTouchMove(e) {
    if (!this.data.isAdmin) return;
    const { index } = e.currentTarget.dataset;
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = Math.abs(touch.clientY - this.data.touchStartY);

    // 如果是垂直滑动，不处理
    if (deltaY > 30) {
      return;
    }

    // 左滑：deltaX < 0，右滑：deltaX > 0
    // 按钮宽度：200rpx + 20rpx(右边距) = 220rpx
    let translateX = deltaX;
    if (translateX < -220) {
      translateX = -220; // 最大左滑距离
    } else if (translateX > 0) {
      translateX = 0; // 不允许右滑超过原始位置
    }

    // 关闭其他已打开的项
    const memberStatusList = this.data.record.memberStatusList.map((member, i) => {
      if (i === index) {
        return { ...member, translateX };
      } else if (i === this.data.currentIndex && this.data.currentIndex !== -1) {
        return { ...member, translateX: 0 };
      }
      return member;
    });

    this.setData({
      'record.memberStatusList': memberStatusList,
      currentIndex: translateX < -50 ? index : -1,
    });
  },

  /** 触摸结束 */
  onTouchEnd(e) {
    if (!this.data.isAdmin) return;
    const { index } = e.currentTarget.dataset;
    const member = this.data.record.memberStatusList[index];
    if (!member) return;

    let translateX = member.translateX || 0;

    // 如果左滑超过110rpx（一半距离），自动展开到最大距离
    if (translateX < -110) {
      translateX = -220;
    } else {
      // 否则自动收起
      translateX = 0;
    }

    const memberStatusList = [...this.data.record.memberStatusList];
    memberStatusList[index] = { ...member, translateX };

    this.setData({
      'record.memberStatusList': memberStatusList,
      currentIndex: translateX < -100 ? index : -1,
    });
  },

  /** 切换签到状态 */
  async onToggleStatus(e) {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'none' });
      return;
    }

    const { index } = e.currentTarget.dataset;
    const member = this.data.record.memberStatusList[index];
    if (!member) return;

    const { courseId, code } = this.data;
    const hasCheckedIn = !member.hasCheckedIn;

    wx.showLoading({ title: '修改中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'updateCheckInStatus',
        data: {
          courseId: courseId,
          checkInCode: code,
          userId: member.userId,
          hasCheckedIn: hasCheckedIn,
        },
      });

      if (!res || !res.result) {
        throw { message: '云函数调用失败', data: res };
      }

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '修改失败', data: result };
      }

      // 更新本地数据
      const memberStatusList = [...this.data.record.memberStatusList];
      memberStatusList[index] = {
        ...member,
        hasCheckedIn: hasCheckedIn,
        checkInTime: hasCheckedIn ? Date.now() : null,
        checkInTimeText: hasCheckedIn ? this.formatTime(Date.now()) : '',
        latitude: hasCheckedIn ? member.latitude : null,
        longitude: hasCheckedIn ? member.longitude : null,
        latitudeText: hasCheckedIn && member.latitude ? Number(member.latitude).toFixed(6) : '',
        longitudeText: hasCheckedIn && member.longitude ? Number(member.longitude).toFixed(6) : '',
        translateX: 0, // 收起
      };

      // 重新计算签到人数（基于实际的签到状态）
      const checkedInCount = memberStatusList.filter((m) => m.hasCheckedIn).length;

      this.setData({
        'record.memberStatusList': memberStatusList,
        'record.checkedInCount': checkedInCount,
      });

      wx.hideLoading();
      wx.showToast({
        title: hasCheckedIn ? '已标记为已签到' : '已标记为未签到',
        icon: 'success',
      });
    } catch (error) {
      wx.hideLoading();
      
      let errorMsg = '修改失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 updateCheckInStatus 云函数';
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
});
