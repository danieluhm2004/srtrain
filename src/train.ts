import moment, { Moment } from 'moment';
import { SRTTrainCode, SRTTrainName } from './constants/train';
import { SRTPassenger, SRTPassengers } from './passenger';

import { SRTErrorCode } from './constants/errorCode';
import { SRTPrioritySeatType } from './constants/prioritySeatType';
import { SRTError } from './error';
import { SRT } from './srt';
import { SRTStation } from './station';

export class SRTTrain {
  code: string;
  name: string;
  number: string;

  departureDate: Moment;
  arrivalDate: Moment;

  departureStation: SRTStation;
  arrivalStation: SRTStation;

  hasGeneralSeat: boolean;
  hasSpecialSeat: boolean;

  constructor(public srt: SRT, options: any) {
    this.code = options['stlbTrnClsfCd'];
    this.name = SRTTrainName[this.code];
    this.number = options['trnNo'];
    this.departureDate = moment(
      `${options['dptDt']} ${options['dptTm']}`,
      'YYYYMMDD HHmmss',
    );

    this.arrivalDate = moment(
      `${options['arvDt'] || options['dptDt']} ${options['arvTm']}`,
      'YYYYMMDD HHmmss',
    );

    this.departureStation = new SRTStation(options.dptRsStnCd);
    this.arrivalStation = new SRTStation(options.arvRsStnCd);
    this.hasGeneralSeat = options['gnrmRsvPsbStr']?.includes('예약가능');
    this.hasSpecialSeat = options['sprmRsvPsbStr']?.includes('예약가능');
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }

  async reserve(options: {
    passengers?: SRTPassenger[];
    prioritySeatType?: SRTPrioritySeatType;
  }) {
    const { passengers, prioritySeatType } = options;
    if (!this.srt.isLoggined) {
      throw new SRTError(
        SRTErrorCode.LOGIN_REQUIRED,
        '로그인 후 사용하십시요.',
      );
    }

    if (this.code !== SRTTrainCode.SRT) {
      throw new SRTError(
        SRTErrorCode.ONLY_SRT_TRAIN,
        'SRT 열차만 예약할 수 있습니다.',
      );
    }

    const actualPassengers = passengers || [SRTPassengers.Adult()];
    let isSpecialSeat = null;
    switch (prioritySeatType) {
      default:
      case SRTPrioritySeatType.GENERAL_ONLY:
        isSpecialSeat = false;
        break;
      case SRTPrioritySeatType.SPECIAL_ONLY:
        isSpecialSeat = true;
        break;
      case SRTPrioritySeatType.GENERAL_FIRST:
        isSpecialSeat = !this.hasGeneralSeat;
        break;
      case SRTPrioritySeatType.SPECIAL_FIRST:
        isSpecialSeat = !this.hasSpecialSeat;
        break;
    }

    const { data } = await this.srt.axios.post('/arc/selectListArc05013_n.do', {
      'reserveType': '11',
      'jobId': '1101',
      'jrnyCnt': '1',
      'jrnyTpCd': '11',
      'jrnySqno1': '001',
      'stndFlg': 'N',
      'trnGpCd1': '300',
      'stlbTrnClsfCd1': this.code,
      'dptDt1': this.departureDate.format('YYYYMMDD'),
      'dptTm1': this.departureDate.format('HHmmss'),
      'runDt1': this.departureDate.format('YYYYMMDD'),
      'trnNo1': this.number.padStart(5, '0'),
      'dptRsStnCd1': this.departureStation.code,
      'dptRsStnCdNm1': this.departureStation.name,
      'arvRsStnCd1': this.arrivalStation.code,
      'arvRsStnCdNm1': this.arrivalStation.name,
      ...SRTPassenger.toObject(actualPassengers),
    });

    this.srt.parseResponse(data);
    const reservationId = data['reservListMap'][0]['pnrNo'];
    const reservation = await this.srt.getReservationById(reservationId);
    if (!reservation) {
      throw new SRTError(
        SRTErrorCode.FAIL_TO_RESERVE,
        '알 수 없는 원인으로 인해 예약에 실패하였습니다.',
      );
    }

    return reservation;
  }

  toString() {
    const hasGeneralSeat = this.hasGeneralSeat ? '예약가능' : '예약불가';
    const hasSpecialSeat = this.hasSpecialSeat ? '예약가능' : '예약불가';

    return `[${this.name} ${
      this.number
    }] ${this.departureStation.toString()} -> ${this.arrivalStation.toString()} (${this.departureDate.format(
      'YYYY년 M월 D일 H시 m분',
    )} -> ${this.arrivalDate.format(
      'YYYY년 M월 D일 H시 m분',
    )}) 특실: ${hasSpecialSeat} 일반실: ${hasGeneralSeat}`;
  }
}
