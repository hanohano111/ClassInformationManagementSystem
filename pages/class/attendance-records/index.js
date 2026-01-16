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
      // 格式化时间和定位信息
      const checkInRecords = records.map((record) => ({
        ...record,
        createdAtText: this.formatTime(record.createdAt),
        memberStatusList: (record.memberStatusList || []).map((member) => ({
          ...member,
          latitudeText: member.latitude ? Number(member.latitude).toFixed(6) : '',
          longitudeText: member.longitude ? Number(member.longitude).toFixed(6) : '',
        })),
      }));

      wx.hideLoading();
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
});
