import _ from 'lodash';

export const SRTSeatCode = {
  '일반실': '1',
  '특실': '2',
};

export const SRTSeatName = _.invert(SRTSeatCode);
