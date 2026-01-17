// pages/class/attendance-records/index.js

Page({
  data: {
    classId: null,
    courseId: null,
    checkInRecords: [],
    touchStartX: 0,
    touchStartY: 0,
    currentIndex: -1, // 当前滑动的项索引
    isTouching: false, // 是否正在触摸滑动
  },

  onLoad(options) {
    const { classId, courseId } = options;
    if (classId && courseId) {
      this.setData({ classId, courseId });
      this.loadCheckInRecords(courseId);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onShow() {
    // 每次显示时刷新数据
    if (this.data.courseId) {
      this.loadCheckInRecords(this.data.courseId);
    }
  },

  /** 加载签到记录 */
  async loadCheckInRecords(courseId) {
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
      console.log(`[签到记录] 收到 ${records.length} 条记录`);
      
      // 格式化时间和定位信息，并重新计算签到人数
      const checkInRecords = records.map((record) => {
        const memberStatusList = (record.memberStatusList || []).map((member) => ({
          ...member,
          latitudeText: member.latitude ? Number(member.latitude).toFixed(6) : '',
          longitudeText: member.longitude ? Number(member.longitude).toFixed(6) : '',
        }));

        // 重新计算签到人数（基于实际的签到状态，与详情页面保持一致）
        const checkedInCount = memberStatusList.filter((m) => m.hasCheckedIn).length;

        return {
          ...record,
          createdAtText: this.formatTime(record.createdAt),
          memberStatusList: memberStatusList,
          checkedInCount: checkedInCount, // 使用重新计算的值
          translateX: 0, // 初始化滑动距离
        };
      });

      wx.hideLoading();
      console.log(`[签到记录] 格式化后 ${checkInRecords.length} 条记录`);
      this.setData({ checkInRecords });
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

  /** 点击签到记录 */
  onRecordTap(e) {
    const { code, index } = e.currentTarget.dataset;
    const record = this.data.checkInRecords[index];
    if (!record) return;

    // 如果当前项处于滑动状态，先恢复
    if (this.data.currentIndex === index) {
      this.setData({ currentIndex: -1 });
      return;
    }

    // 跳转到详情页面
    wx.navigateTo({
      url: `/pages/class/attendance-record-detail/index?courseId=${this.data.courseId}&code=${code}`,
    });
  },

  /** 触摸开始 */
  onTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      isTouching: true,
    });
  },

  /** 触摸移动 */
  onTouchMove(e) {
    const touch = e.touches[0];
    const { index } = e.currentTarget.dataset;
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = Math.abs(touch.clientY - this.data.touchStartY);

    // 如果是垂直滑动，不处理
    if (deltaY > 30) {
      return;
    }

    // 左滑：deltaX < 0，右滑：deltaX > 0
    // 按钮宽度：88rpx + 16rpx(间距) + 20rpx(右边距) = 124rpx
    let translateX = deltaX;
    if (translateX < -124) {
      translateX = -124; // 最大左滑距离（圆形按钮的宽度）
    } else if (translateX > 0) {
      translateX = 0; // 不允许右滑超过原始位置
    }

    // 关闭其他已打开的项
    const checkInRecords = this.data.checkInRecords.map((record, i) => {
      if (i === index) {
        return { ...record, translateX };
      } else if (i === this.data.currentIndex && this.data.currentIndex !== -1) {
        return { ...record, translateX: 0 };
      }
      return record;
    });

    this.setData({
      checkInRecords,
      currentIndex: translateX < -50 ? index : -1,
    });
  },

  /** 触摸结束 */
  onTouchEnd(e) {
    const { index } = e.currentTarget.dataset;
    const record = this.data.checkInRecords[index];
    if (!record) return;

    let translateX = record.translateX || 0;

    // 如果左滑超过62rpx（一半距离），自动展开到最大距离
    if (translateX < -62) {
      translateX = -124;
    } else {
      // 否则自动收起
      translateX = 0;
    }

    const checkInRecords = [...this.data.checkInRecords];
    checkInRecords[index] = { ...record, translateX };

    this.setData({
      checkInRecords,
      currentIndex: translateX < -50 ? index : -1,
      isTouching: false,
    });
  },

  /** 删除签到记录 */
  async onDeleteRecord(e) {
    const { code, index } = e.currentTarget.dataset;
    const record = this.data.checkInRecords[index];
    if (!record) return;

    // 确认删除
    const res = await wx.showModal({
      title: '提示',
      content: '确定要删除这条签到记录吗？删除后将无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff4757',
    });

    if (!res.confirm) {
      // 取消删除，恢复滑动状态
      this.setData({ currentIndex: -1 });
      return;
    }

    wx.showLoading({ title: '删除中...' });

    try {
      const cloudRes = await wx.cloud.callFunction({
        name: 'deleteCheckInCode',
        data: {
          courseId: this.data.courseId,
          code: code,
        },
      });

      if (!cloudRes || !cloudRes.result) {
        throw { message: '云函数调用失败', data: cloudRes };
      }

      const result = cloudRes.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '删除失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success',
      });

      // 关闭滑动状态
      this.setData({ currentIndex: -1 });

      // 重新加载签到记录列表，确保数据同步
      setTimeout(() => {
        this.loadCheckInRecords(this.data.courseId);
      }, 500);
    } catch (error) {
      wx.hideLoading();

      let errorMsg = '删除失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 deleteCheckInCode 云函数';
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

      // 恢复滑动状态
      this.setData({ currentIndex: -1 });
    }
  },
});
