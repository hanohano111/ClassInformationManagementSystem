// pages/class/attendance-records/index.js

Page({
  data: {
    classId: null,
    courseId: null,
    checkInRecords: [],
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

    // 跳转到详情页面
    wx.navigateTo({
      url: `/pages/class/attendance-record-detail/index?courseId=${this.data.courseId}&code=${code}`,
    });
  },
});
