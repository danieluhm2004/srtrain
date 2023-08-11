import _ from 'lodash';

export const SRTTrainCode = {
  'KTX-산천': '07',
  'SRT': '17',
  'KTX': '00',
  '무궁화': '02',
  '통근열차': '03',
  '누리로': '04',
  '전체': '05',
  'ITX-새마을': '08',
  'ITX-청춘': '09',
};

export const SRTTrainName = _.invert(SRTTrainCode);
