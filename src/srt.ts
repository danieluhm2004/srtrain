import axios, { AxiosInstance } from 'axios';
import moment, { Moment } from 'moment';

import { wrapper } from 'axios-cookiejar-support';
import _ from 'lodash';
import { getRandom } from 'random-useragent';
import { CookieJar } from 'tough-cookie';
import { SRTErrorCode } from './constants/errorCode';
import { SRTLoginMethod } from './constants/loginMethod';
import { SRTStationCode } from './constants/station';
import { SRTError } from './error';
import { SRTReservation } from './reservation';
import { SRTStation } from './station';
import { SRTTrain } from './train';

export class SRT {
  isLoggined = false;
  axios: AxiosInstance;

  private userId?: string;
  private password?: string;
  private baseURL = 'https://app.srail.or.kr';
  private userAgent = this.generateUserAgent();
  private cookieJar = new CookieJar();

  constructor(options?: { baseURL?: string; userAgent?: string }) {
    if (options) {
      const { baseURL, userAgent } = options;
      if (baseURL) this.baseURL = baseURL;
      if (userAgent) this.userAgent = userAgent;
    }

    this.axios = this.initAxios();
  }

  private initAxios(): AxiosInstance {
    this.axios = wrapper(
      axios.create({
        jar: this.cookieJar,
        baseURL: this.baseURL,
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      }),
    );

    this.axios.interceptors.response.use(async (res: any) => {
      if (_.get(res.data, 'resultMap[0].msgCd') !== 'S111') return res;
      const { userId, password } = this;
      if (!userId || !password || res.retry) {
        throw new SRTError(
          SRTErrorCode.LOGIN_REQUIRED,
          '로그인 후 사용하십시요.',
        );
      }

      res.retry = true;
      this.isLoggined = false;
      await this.login({ userId, password });
      return this.axios(res.config);
    });

    return this.axios;
  }

  async login(options: {
    userId: string;
    password: string;
    accessToken?: string;
    referer?: string;
  }) {
    const { userId, password, accessToken } = options;
    this.userId = userId;
    this.password = password;
    if (accessToken) {
      this.isLoggined = true;
      const json = JSON.parse(accessToken);
      this.cookieJar = await CookieJar.deserialize(json);
      this.initAxios();
      return;
    }

    const method = this.detectUserMethod(userId);
    const referer = options.referer || 'https://app.srail.or.kr/main/main.do';

    const { data } = await this.axios.post('/apb/selectListApb01080_n.do', {
      'auto': 'Y',
      'check': 'Y',
      'page': 'menu',
      'deviceKey': '-',
      'customerYn': '',
      'login_referer': referer,
      'srchDvCd': method,
      'srchDvNm': userId.replace(/-/g, ''),
      'hmpgPwdCphd': password,
    });

    const message = data.MSG || '';
    if (message.includes('존재하지않는 회원입니다')) {
      throw new SRTError(SRTErrorCode.USER_NOT_FOUND, message);
    }

    if (message.includes('비밀번호 오류')) {
      throw new SRTError(SRTErrorCode.PASSWORD_INCORRECT, message);
    }

    this.isLoggined = true;
  }

  getStation(name: keyof typeof SRTStationCode): SRTStation {
    const code = SRTStationCode[name];
    if (!code) {
      throw new SRTError(
        SRTErrorCode.STATION_NOT_FOUND,
        '해당 역을 찾을 수 없습니다.',
      );
    }

    return new SRTStation(code);
  }

  async find(options: {
    departureStation: SRTStation;
    arrivalStation: SRTStation;
    date?: Moment;
    all?: boolean;
  }): Promise<SRTTrain[]> {
    const { departureStation, arrivalStation, date, all } = options;
    const actualDate = (date || moment()).format('YYYYMMDD');
    const actualTime = date?.format('HHmmss') || '000000';

    const { data } = await this.axios.post('/ara/selectListAra10007_n.do', {
      'chtnDvCd': '1',
      'arriveTime': 'N',
      'seatAttCd': '015',
      'psgNum': 1,
      'trnGpCd': 109,
      'stlbTrnClsfCd': '05',
      'dptDt': actualDate,
      'dptTm': actualTime,
      'arvRsStnCd': arrivalStation.code,
      'dptRsStnCd': departureStation.code,
    });

    if (!all) this.parseResponse(data);
    const message = data.resultMap[0]?.msgTxt;
    if (message && message === '조회 결과가 없습니다.') return [];
    const output = data.outDataSets.dsOutput1;
    const trains = output.map((train: any) => new SRTTrain(this, train));
    if (!all) return trains;

    const lastDepartureDate = trains[trains.length - 1].departureDate;
    const nextDepartureDate = lastDepartureDate.clone().add(1, 'seconds');
    const nextTrains = await this.find({
      departureStation,
      arrivalStation,
      date: nextDepartureDate,
      all: true,
    });

    trains.push(...nextTrains);
    return trains;
  }

  async getReservationById(
    reservationId: string,
  ): Promise<SRTReservation | undefined> {
    const reservations = await this.getReservations();
    return reservations.find((r) => r.reservationId === reservationId);
  }

  async getReservations(): Promise<SRTReservation[]> {
    if (!this.isLoggined) {
      throw new SRTError(
        SRTErrorCode.LOGIN_REQUIRED,
        '로그인이 필요한 서비스입니다.',
      );
    }

    const { data } = await this.axios.post('/atc/selectListAtc14016_n.do', {
      pageNo: '0',
    });

    this.parseResponse(data);
    const reservations = _.zip(data['trainListMap'], data['payListMap']).map(
      ([trainData, payData]) =>
        new SRTReservation(this, { trainData, payData }),
    );

    return reservations;
  }

  parseResponse(data: any): any {
    if (data.resultMap?.length !== 1) {
      throw new SRTError(SRTErrorCode.UNKNOWN, '오류가 발생하였습니다.');
    }

    const [firstOfResult] = data.resultMap;
    const resultCode = firstOfResult.strResult;
    const errorCode = firstOfResult.msgCd;
    const message = firstOfResult.msgTxt;

    if (resultCode !== 'SUCC') {
      let code = SRTErrorCode.UNKNOWN;
      if (errorCode === 'S111') code = SRTErrorCode.LOGIN_REQUIRED;
      if (errorCode === 'ERR800052') code = SRTErrorCode.ALREADY_CANCELLED;
      throw new SRTError(code, message);
    }

    return data;
  }

  private detectUserMethod(userId: string) {
    if (userId.match(/[^@]+@[^@]+\.[^@]+/g)) return SRTLoginMethod.EMAIL;
    if (userId.match(/^\d{3}-\d{3,4}-\d{4}$/g)) {
      return SRTLoginMethod.PHONE_NUMBER;
    }

    return SRTLoginMethod.MEMBERSHIP_ID;
  }

  private generateUserAgent() {
    const ua = getRandom((ua) => ua.osName === 'Android');
    return `${ua} SRT-APP-Android V.1.0.6`;
  }

  async getAccessToken() {
    return this.cookieJar.serialize().then((r) => JSON.stringify(r));
  }
}
