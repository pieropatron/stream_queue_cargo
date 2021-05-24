"use strict";

const assert = require('assert');

const {Queue, Cargo} = require('../lib');

const run = async ()=>{
	let _artest = [];
	for (let i=0; i<1000; i++){
		_artest.push({value: i});
	}

	let queue = new Queue(async (item)=>{
		await new Promise(resolve=>{
			setTimeout(resolve, 10);
		});
		return item.value;
	}, 10);

	console.info('push queue per elements:');
	let _arresult = await Promise.all(_artest.map(el=>{
		return queue.push(el);
	}));

	const check_result = ()=>{
		assert(_arresult.length, _artest.length, 'Invalid result length');
		console.info('result length correct');
		_arresult.forEach((el, idx)=>{
			assert(el === _artest[idx].value, 'Invalid result for idx=' + idx);
		});
		console.info('result content correct');
	};

	check_result();

	console.info('push queue array:');

	_arresult = await queue.push(_artest);
	check_result();

	let cargo = new Cargo(async (_aritems)=>{
		return _aritems.map(el=>el.value);
	}, 10);

	console.info('push cargo per elements:');

	_arresult = await Promise.all(_artest.map(el=>{
		return cargo.push(el);
	}));
	check_result();

	console.info('push cargo array:');

	_arresult = await cargo.push(_artest);
	check_result();
};

run().then(()=>{
	console.log('test OK');
	process.exit(0);
}, err=>{
	console.error(err);
	process.exit(1);
});
