import getSendMessage from './getSendMessage';
import postCodeVerify from './postCodeVerify';
import postPasswordLogin from './postPasswordLogin';
import postWechatLogin from './postWechatLogin';
import postRegister from './postRegister';
import postSendResetCode from './postSendResetCode';
import postVerifyResetCode from './postVerifyResetCode';
import postResetPassword from './postResetPassword';

export default [
  getSendMessage,
  postCodeVerify,
  postPasswordLogin,
  postWechatLogin,
  postRegister,
  postSendResetCode,
  postVerifyResetCode,
  postResetPassword,
];
