import { SRTPassengerCode } from './constants/passengerType';

export class SRTPassenger {
  name: string;
  typeCode: string;
  count: number;

  constructor(name: keyof typeof SRTPassengerCode, count: number) {
    this.name = name;
    this.typeCode = SRTPassengerCode[name];
    this.count = count;
  }

  static [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }

  static getTotalCount(passengers: SRTPassenger[]) {
    let count = 0;
    passengers.forEach((passenger) => {
      count += passenger.count;
    });

    return count;
  }

  static toObject(passengers: SRTPassenger[]) {
    const passengerData: any = {};
    passengers.forEach((passenger, index) => {
      passengerData[`psgTpCd${index + 1}`] = passenger.typeCode;
      passengerData[`psgInfoPerPrnb${index + 1}`] = passenger.count;
      passengerData[`locSeatAttCd${index + 1}`] = '000';
      passengerData[`rqSeatAttCd${index + 1}`] = '015';
      passengerData[`dirSeatAttCd${index + 1}`] = '009';
      passengerData[`smkSeatAttCd${index + 1}`] = '000';
      passengerData[`etcSeatAttCd${index + 1}`] = '000';
      passengerData[`psrmClCd${index + 1}`] = '2';
    });

    return {
      totPrnb: `${SRTPassenger.getTotalCount(passengers)}`,
      psgGridcnt: `${passengers.length}`,
      ...passengerData,
    };
  }

  toString() {
    return `${this.name} ${this.count}명`;
  }
}

export const SRTPassengers = {
  Adult: (count = 1) => new SRTPassenger('어른/청소년', count),
  Child: (count = 1) => new SRTPassenger('어린이', count),
  Senior: (count = 1) => new SRTPassenger('경로', count),
  Disability1To3: (count = 1) => new SRTPassenger('장애 1~3급', count),
  Disability4To6: (count = 1) => new SRTPassenger('장애 4~6급', count),
};
