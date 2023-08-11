import moment, { Moment } from 'moment';

import { SRTErrorCode } from './constants/errorCode';
import { SRTError } from './error';
import { SRT } from './srt';
import { SRTTicket } from './ticket';
import { SRTTrain } from './train';

export class SRTReservation {
  reservationId: string;
  totalPrice: number;
  seatCount: number;

  train: SRTTrain;
  paymentDate: Moment;
  paid: boolean;

  private tickets?: SRTTicket[];

  constructor(public srt: SRT, options: { trainData: any; payData: any }) {
    const { trainData, payData } = options;
    this.reservationId = trainData['pnrNo'];
    this.totalPrice = parseInt(trainData['rcvdAmt']);
    this.seatCount = parseInt(trainData['tkSpecNum']);
    this.train = new SRTTrain(srt, payData);
    this.paymentDate = moment(
      `${payData['iseLmtDt']} ${payData['iseLmtTm']}`,
      'YYYYMMDD HHmmss',
    );

    this.paid = payData['stlFlg'] === 'Y';
  }

  async getTickets() {
    if (this.tickets) return this.tickets;
    if (!this.srt.isLoggined) {
      throw new SRTError(
        SRTErrorCode.LOGIN_REQUIRED,
        '로그인 후 사용하십시요.',
      );
    }

    const { data } = await this.srt.axios.post('/ard/selectListArd02017_n.do', {
      pnrNo: this.reservationId,
      jrnySqno: '1',
    });

    this.srt.parseResponse(data);
    this.tickets = data['trainListMap'].map(
      (ticketData: any) => new SRTTicket(this.srt, ticketData),
    );

    return this.tickets;
  }

  async cancel() {
    if (!this.srt.isLoggined) {
      throw new SRTError(
        SRTErrorCode.LOGIN_REQUIRED,
        '로그인 후 사용하십시요.',
      );
    }

    const { data } = await this.srt.axios.post('/ard/selectListArd02045_n.do', {
      pnrNo: this.reservationId,
      jrnyCnt: '1',
      rsvChgTno: '0',
    });

    this.srt.parseResponse(data);
  }
}
