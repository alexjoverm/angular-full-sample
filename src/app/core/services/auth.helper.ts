import {Inject} from '@angular/core';
import {ApiConfig} from '../models/api-config';
import {CommonUtil} from '../utilities/common.util';
import {AuthTypes} from '../factories/auth.type';
import {environment} from '../../../environments/environment';
import {AuthScheme} from '../models/auth-scheme.enum';
import {OauthToken} from '../models/oauth-token';
import {User} from '../models/user';
import {Md5} from 'ts-md5/dist/md5';

export class AuthHelper {

  /** The userId constant*/
  static USER_ID = 'user';

  /** The TOKEN_ID constant*/
  static TOKEN_ID = 'token';

  /** The TOKEN_TYPE constant*/
  static TOKEN_TYPE = 'token_type';

  /** The HOBA_CLIENT_RESULT constant*/
  static HOBA_CLIENT_RESULT = 'signedClientResult';

  constructor(@Inject('api.config') private apiConfig: ApiConfig) {
  }

  /**
   * Add user id to the cookie
   * @param value the value of the user id
   * @param expiredTime the total seconds after the page should expire
   */
  static addUserInfo(value: string, expiredTime: number) {
    const expiredTimeString = CommonUtil.changeExpiredTime(expiredTime);
    document.cookie = AuthHelper.USER_ID + '=' + value + '; expires=' + expiredTimeString + '; path=/';
  }

  /**
   * Add token to the cookie
   * @param token the token with all the info
   * @param expiredTime the total seconds after the page should expire
   */
  static addTokenInfo(token: OauthToken, expiredTime: number) {
    const expiredTimeString = CommonUtil.changeExpiredTime(expiredTime);
    document.cookie = AuthHelper.TOKEN_ID + '=' + token.access_token + '; expires=' + expiredTimeString + '; path=/';
    document.cookie = AuthHelper.TOKEN_TYPE + '=' + token.token_type + '; expires=' + expiredTimeString + '; path=/';
  }

  /**
   * Remove the user id from the cookie
   */
  static removeUserInfo() {
    const expiredTimeString = CommonUtil.changeExpiredTime(0);
    document.cookie = AuthHelper.USER_ID + '=; expires=' + expiredTimeString + '; path=/';
  }

  /**
   * Remove the token from the cookie
   */
  static removeTokenInfo() {
    const expiredTimeString = CommonUtil.changeExpiredTime(0);
    document.cookie = AuthHelper.TOKEN_ID + '=; expires=' + expiredTimeString + '; path=/';
    document.cookie = AuthHelper.TOKEN_TYPE + '=; expires=' + expiredTimeString + '; path=/';
  }

  /**
   * Clear the cookies related to authentication
   */
  static clearCookies() {
    this.removeUserInfo();
    this.removeTokenInfo();
  }

  /**
   * Determine if the current url require authentication before to be called
   * @param {string} url the url
   * @returns {boolean} true if required or false
   */
  needAuthBefore(url: string) {
    const apiUrl = CommonUtil.getApiByUrl(url, this.apiConfig);
    return apiUrl.requireAuthBefore;
  }

  /**
   * Add specific Authorization header depending of the authentication scheme defined.
   */
  addHeaderAuthorization(headers: Headers, user?: User, uri?: string, method?: string) {
    const authType = this.apiConfig.authService;
    let clientId, clientSecret;
    if (!CommonUtil.isEmpty(this.apiConfig.credentials)) {
      clientId = this.apiConfig.credentials.clientId;
      clientSecret = this.apiConfig.credentials.clientSecret;
    }
    switch (this.apiConfig.authScheme) {
      case AuthScheme.BASIC:
        if (!CommonUtil.isEmpty(user)) {
          headers.set('Authorization', 'Basic ' + btoa(user.username + ':' + user.password));
        } else if (!CommonUtil.isEmpty(clientId) && !CommonUtil.isEmpty(clientSecret) && authType === AuthTypes.OAUTH) {
          // return Oauth basic authentication
          headers.set('Authorization', 'Basic ' + btoa(clientId + ':' + clientSecret));
        }
        break;
      case AuthScheme.BEARER:
        const token = CommonUtil.getCookie(AuthHelper.TOKEN_ID);
        if (!CommonUtil.isEmpty(token)) {
          headers.set('Authorization', 'Bearer ' + token);
        }
        break;
      case AuthScheme.DIGEST:
        if (!CommonUtil.isEmpty(user)) {
          // TODO check from where arrive this fields
          const nonce = 'dcd98b7102dd2f0e8b11d0f600bfb0c093';
          const nc = '00000001';
          const cnonce = '0a4f113b';
          const opaque = '5ccc069c403ebaf9f0171e9517f40e41';
          const qop = 'auth';

          const HA1 = Md5.hashStr(user.username + ':' + user.email + ':' + user.password);
          const HA2 = Md5.hashStr(method + ':' + uri);
          const response = Md5.hashStr(HA1 + ':' + nonce + ':' + nc + ':' + cnonce + ':' + qop + ':' + HA2);

          headers.set('Authorization', 'Digest ' +
            ' username="' + user.username + '",' +
            ' realm="' + user.email + '",' +
            ' nonce="' + nonce + '",' +
            ' uri="' + uri + '",' +
            ' qop=auth,' +
            ' nc=' + nc + ',' +
            ' cnonce="' + cnonce + '",' +
            ' response="' + response + '",' +
            ' opaque="' + opaque + '"');
        }
        break;
      case AuthScheme.HOBA:
        const signedClientResult = CommonUtil.getCookie(AuthHelper.HOBA_CLIENT_RESULT);
        if (!CommonUtil.isEmpty(signedClientResult)) {
          headers.set('Authorized', signedClientResult);
        }
        break;
      case AuthScheme.AWS:
        // the clientId is the AWSAccessKeyId
        // the clientSecret is the AWSSecretAccessKey
        if (!CommonUtil.isEmpty(clientId) && !CommonUtil.isEmpty(clientSecret)) {
          headers.set('Authorization', 'AWS ' + clientId + ':' + clientSecret);
        }
        break;
    }
  }

  /**
   * Determine if there is a user correctly logged in the app
   */
  isUserLogged(): boolean {
    if (this.apiConfig.authService === AuthTypes.SKYP) {
      return true;
    }
    const userId = this.getUserLogged();
    const token = this.getToken();
    return (!CommonUtil.isEmpty(userId) && !CommonUtil.isEmpty(token));
  }

  /**
   * Returns the name of the user logged in the app
   */
  getUserLogged(): string {
    if (this.apiConfig.authService === AuthTypes.SKYP) {
      return null;
    }
    return CommonUtil.getCookie(AuthHelper.USER_ID);
  }

  /**
   * Returns the token stored after login
   */
  getToken(): string {
    if (this.apiConfig.authService === AuthTypes.SKYP) {
      return null;
    }
    return CommonUtil.getCookie(AuthHelper.TOKEN_ID);
  }

  /**
   * If user is not logged go to the login page
   */
  checkAuthentication() {
    if (!this.isUserLogged()) {
      location.href = location.pathname + '#/login';
    }
  }
}
