Asynchronous (async-await) queue and cargo functions.

## Example
``` javascript
const { Queue, Cargo } = require('stream_queue_cargo');

const queue = new Queue(async function (task) {
  return task;
}, 2);

const _aroptions = [1, 2, 3];

// add single option to the queue
const result_queue = await queue.push(_aroptions[0]);

// add array of options to the queue
const _arresult_queue = await queue.push(_aroptions);

// add single option to the queue using callback
queue.push(_aroptions[0], (err, _result)=>{
	if (err) console.error(err);
	else console.log(_result);
});

// add array of options to the queue using callback
queue.push(_aroptions, (err, _arresult)=>{
	if (err) console.error(err);
	else console.log(_arresult);
});

const cargo = new Cargo(async function (_artasks) {
  return _artasks.map(task=>{
	  return task;
  });
}, 2, 1);

// add single option to the queue
const result_cargo = await cargo.push(_aroptions[0]);

// add array of options to the queue
const _arresult_cargo = await cargo.push(_aroptions);

// add single option to the queue using callback
cargo.push(_aroptions[0], (err, _result)=>{
	if (err) console.error(err);
	else console.log(_result);
});

// add array of options to the queue using callback
cargo.push(_aroptions, (err, _arresult)=>{
	if (err) console.error(err);
	else console.log(_arresult);
});

```

## Install
`npm install https://github.com/pieropatron/stream_queue_cargo`

## API

### `const queue = new Queue(worker, concurrency)`
* `worker` function
* `concurrency` integer

## Instance methods
### `queue.push(task, callback)`
add new task(s) to the queue.
* `task` any or array of any
* `callback` callback, optional

### `const cargo = new Cargo(worker, batch_size, concurrency)`
* `worker` function
* `batch_size` integer
* `concurrency` integer, optional, default is 1

## Instance methods
### `cargo.push(task, callback)`
add new task(s) to the queue.
* `task` any or array of any
* `callback` callback, optional
