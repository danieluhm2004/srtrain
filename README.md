# Srtrain

Node.js SRT train unofficial SDK

## Install

Use NPM

```sh
$ npm install srtrain
```

Or Yarn

```sh
$ yarn add srtrain
```

## Usage:

```javascript
import moment from 'moment';
import { SRT, SRTPassengers, SRTPrioritySeatType } from 'srtrain';

async function main() {
  const srt = new SRT();
  await srt.login({
    userId: '010-0000-0000',
    password: 'P4ssw0rd',
  });

  const trains = await srt.find({
    departureStation: srt.getStation('수서'),
    arrivalStation: srt.getStation('부산'),
    date: moment().add(1, 'days').startOf('day'),
    all: true,
  });

  if (trains.length <= 0) {
    console.log('No trains found.');
    return;
  }

  const [train] = trains;
  const passengers = [SRTPassengers.Adult(1)];

  const prioritySeatType = SRTPrioritySeatType.GENERAL_FIRST;
  const reservation = await train.reserve({ passengers, prioritySeatType });
  console.log('Successfully reserved train.');
  console.log(reservation);

  const tickets = await reservation.getTickets();
  console.log('Successfully fetched tickets.');
  console.log(tickets);

  await reservation.cancel();
  console.log('Successfully cancelled reservation.');
}

main();
```

## License

[MIT](LICENSE)

Copyright (c) 2023 [Daniel Uhm](htts://github.com/danieluhm2004).
