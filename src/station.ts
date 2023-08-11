import { SRTStationName } from './constants/station';

export class SRTStation {
  code: string;
  name: string;

  constructor(code: string) {
    this.code = code;
    this.name = SRTStationName[code];
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }

  toString() {
    return `${this.name}역`;
  }
}
