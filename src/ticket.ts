import { SRTPassengerName } from './constants/passengerType';
import { SRTSeatName } from './constants/seatType';
import { SRT } from './srt';

export class SRTTicket {
  car: string;
  seat: string;
  seatType: string;
  passengerType: string;
  price: number;
  originalPrice: number;
  discountPrice: number;

  constructor(public srt: SRT, data: any) {
    this.car = data['scarNo'];
    this.seat = data['seatNo'];
    this.seatType = SRTSeatName[data['psrmClCd'] as keyof typeof SRTSeatName];
    this.passengerType =
      SRTPassengerName[data['psgTpCd'] as keyof typeof SRTPassengerName];
    this.price = parseInt(data['rcvdAmt']);
    this.originalPrice = parseInt(data['stdrPrc']);
    this.discountPrice = parseInt(data['dcntPrc']);
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }

  toString() {
    return `${this.car}호차 ${this.seat} (${this.seatType}, ${this.passengerType}) [${this.price}원(${this.discountPrice}원 할인)]`;
  }
}
