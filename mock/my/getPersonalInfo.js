import { getLocalUrl } from '~/utils/util.js';

export default {
  path: '/api/genPersonalInfo',
  data: {
    code: 200,
    message: 'success',
    data: {
      avatar: '/static/avatar1.png',
      image: '/static/avatar1.png',
      name: '小小轩',
      studentNo: '2024001',
      star: '天枰座',
      gender: 0,
      birth: '1994-09-27',
      brief: '在你身边，为你设计',
      introduction: '在你身边，为你设计',
    },
  },
};
