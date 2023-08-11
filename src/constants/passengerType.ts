import _ from 'lodash';

export const SRTPassengerCode = {
  '어른/청소년': '1',
  '장애 1~3급': '2',
  '장애 4~6급': '3',
  '경로': '4',
  '어린이': '5',
};

export const SRTPassengerName = _.invert(SRTPassengerCode);
