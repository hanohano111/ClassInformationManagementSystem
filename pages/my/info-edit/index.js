import { encryptFields } from '~/utils/crypto';

Page({
  data: {
    personInfo: {
      avatar: '',
      image: '',
      name: '',
      studentNo: '',
      gender: 0,
      birth: '',
      introduction: '',
    },
    genderOptions: [
      { label: '男', value: 0 },
      { label: '女', value: 1 },
      { label: '保密', value: 2 },
    ],
    birthVisible: false,
    birthStart: '1970-01-01',
    birthEnd: '2025-03-01',
    birthTime: 0,
    birthFilter: (type, options) => (type === 'year' ? options.sort((a, b) => b.value - a.value) : options),
  },

  async onLoad() {
    await this.getPersonalInfo();
  },

  async getPersonalInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo',
      });
      const result = res.result || {};
      if (result.code === 200) {
        const info = result.data || {};
        this.setData({
          personInfo: {
            avatar: info.avatar || info.image || '',
            image: info.image || info.avatar || '',
            name: info.name || '',
            studentNo: info.studentNo || '',
            gender: info.gender ?? 0,
            birth: info.birth || '',
            introduction: info.introduction || info.brief || '',
          },
        });
      }
    } catch (e) {
      console.error('获取个人信息失败：', e);
    }
  },

  showPicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      [`${mode}Visible`]: true,
    });
  },

  hidePicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      [`${mode}Visible`]: false,
    });
  },

  onPickerChange(e) {
    const { value } = e.detail;
    const { mode } = e.currentTarget.dataset;

    this.setData({
      [`personInfo.${mode}`]: value,
    });
  },

  personInfoFieldChange(field, e) {
    const { value } = e.detail;
    this.setData({
      [`personInfo.${field}`]: value,
    });
  },

  onNameChange(e) {
    this.personInfoFieldChange('name', e);
  },

  onStudentNoChange(e) {
    this.personInfoFieldChange('studentNo', e);
  },

  onGenderChange(e) {
    this.personInfoFieldChange('gender', e);
  },

  onIntroductionChange(e) {
    this.personInfoFieldChange('introduction', e);
  },

  onAvatarChange() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'personInfo.avatar': tempFilePath,
          'personInfo.image': tempFilePath,
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
        });
      },
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  async onSaveInfo() {
    const { personInfo } = this.data;
    const payload = {
      avatar: personInfo.avatar || personInfo.image,
      name: personInfo.name,
      studentNo: personInfo.studentNo,
      gender: personInfo.gender,
      birth: personInfo.birth,
      introduction: personInfo.introduction,
    };

    try {
      // 对敏感字段 AES，加密 studentNo（phone 如需要也可加）
      const encrypted = await encryptFields(
        payload,
        ['studentNo'], // 这里如果你个人信息里也允许改手机号，就把 phone 也加进来
      );

      const res = await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: encrypted,
      });
      const result = res.result || {};

      if (result.code === 200) {
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500,
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.message || '保存失败，请重试',
          icon: 'none',
        });
      }
    } catch (e) {
      console.error('保存失败：', e);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
    }
  },
});