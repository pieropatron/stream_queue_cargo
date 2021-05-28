"use strict";

const stream = require('stream');

class Readable extends stream.Readable {
	/**
	 * @param {number} concurrency
	 */
	constructor(concurrency){
		super({
			objectMode: true,
			highWaterMark: concurrency,
			read: function(){}
		});
	}
}

/**
 * @typedef {import('stream').WritableOptions} WritableOptions
 */

/**
 * @callback Worker
 * @param {any} options
 * @returns {Promise}
 */

/**
 * @class
 */
class Writable extends stream.Writable {
	/**
	 * @param {WritableOptions} opts
	 * @param {Worker} worker
	 */
	constructor(opts={}, worker){
		opts.objectMode = true;
		super(opts);
		let _writevAsync = this._writevAsync;
		this._write = function(chunk, encoding, callback){
			this._writev([{chunk, encoding}], callback);
		};

		this._writev = function(chunks, callback){
			_writevAsync.call(this, chunks).then(()=>{
				process.nextTick(callback);
			}, error=>{
				process.nextTick(callback, error);
			});
		};
		this._worker = worker;
		// this.setMaxListeners(0);
	}
}

Writable.prototype._writevAsync = async function () { throw new Error('_writevAsync not defined'); };

/**
 * check if option is integer
 * @param {number} value
 * @param {string} key
 */
function check_is_integer_gt1(value, key){
	let type = typeof (value);
	if ((type !== 'bigint' && type !== 'number') || (value < 1) || (!isFinite(value)) || (Math.floor(value) != value)) throw new Error('Invalid ' + key);
}

function fatal(){
	return (err)=>{
		if (!err) return;
		console.error('fatal error', err);
		process.exit(1);
	}
}

class QueueBase {
	/**
	 * create new instance
	 * @param {Worker} worker
	 * @param {number} concurrency
	 * @param {Writable} writer
	 */
	constructor(worker, concurrency, writer){
		if (typeof (worker) !== 'function' || worker[Symbol.toStringTag] !== 'AsyncFunction') throw new Error('worker should be Async Function');

		check_is_integer_gt1(concurrency, 'concurrency');

		if (!(writer instanceof Writable)) throw new Error('Invalid writable');

		let reader = new Readable(concurrency);
		this._reader = reader;

		reader.on('error', fatal());
		writer.on('error', fatal());

		reader.pipe(writer, {end: false});
	}

	async push(options, callback){
		if (typeof(callback) === 'function'){
			let _callback = function(error, result){
				process.nextTick(callback, error, result);
			};
			__pushOptionsAny.call(this, options).then(result=>{
				_callback(null, result);
			}, _callback);
		} else {
			return __pushOptionsAny.call(this, options);
		}
	}
}

/**
 * @this {QueueBase}
 * @param {*} options
 */
async function __pushOptionsAny(options){
	return Array.isArray(options) ? Promise.all(options.map(element=>{
		return __pushOptionsElement.call(this, element);
	})) : __pushOptionsElement.call(this, options);
}

/**
 * @this {QueueBase}
 * @param {*} options
 */
async function __pushOptionsElement(options){
	return new Promise((resolve, reject)=>{
		let data = { options, resolve, reject };
		this._reader.push(data);
	});
}

/**
 * @typedef {Array<{chunk: {options: any, resolve: Function, reject: Function}}>} CHUNKS
 */

/**
 * @class
 */
class WriterQueue extends Writable {
	/**
	 * @param {CHUNKS} chunks
	 */
	async _writevAsync(chunks){
		await Promise.all(chunks.map(element=>{
			return new Promise(resolve=>{
				this._worker(element.chunk.options).then(result=>{
					element.chunk.resolve(result);
					resolve();
				}, error=>{
					element.chunk.reject(error);
					resolve();
				});
			});
		}));
	}
}

class Queue extends QueueBase {
	/**
	 * create new Queue
	 * @param {Worker} worker
	 * @param {number} concurrency
	 */
	constructor(worker, concurrency){
		let writer = new WriterQueue({
			highWaterMark: concurrency
		}, worker);
		super(worker, concurrency, writer);
	}
}

class WriterCargo extends Writable {
	/**
	 * @param {Worker} worker
	 * @param {number} batch_size
	 * @param {number} concurrency
	 */
	constructor(worker, batch_size, concurrency){
		super({
			highWaterMark: batch_size * concurrency
		}, worker);
		this.batch_size = batch_size;
		this.concurrency = concurrency;
	}

	/**
	 * @param {CHUNKS} chunks
	 */
	async _writevAsync(chunks) {
		let _arbatches = [];

		if (chunks.length > this.batch_size){
			while (chunks.length){
				_arbatches.push(chunks.splice(0, this.batch_size));
			}
		} else {
			_arbatches.push(chunks);
		}

		await Promise.all(_arbatches.map(chunks=>{
			return new Promise(resolve=>{
				let _aropts = chunks.map(chunk=>{
					return chunk.chunk.options;
				});
				this._worker(_aropts).then(result=>{
					if (Array.isArray(result) && result.length === chunks.length){
						chunks.forEach((chunk, idx) => {
							chunk.chunk.resolve(result[idx]);
						});
					} else {
						chunks.forEach(chunk=>{
							chunk.chunk.resolve(result);
						});
					}
					resolve();
				}, error=>{
					chunks.forEach(chunk=>{
						chunk.chunk.reject(error);
					});
					resolve();
				});
			});
		}));
	}
}

class Cargo extends QueueBase {
	/**
	 * create new Cargo
	 * @param {Worker} worker
	 * @param {number} batch_size
	 * @param {number=1} concurrency
	 */
	constructor(worker, batch_size, concurrency = 1) {
		check_is_integer_gt1(batch_size, 'batch_size');

		let writer = new WriterCargo(worker, batch_size, concurrency);

		super(worker, batch_size * concurrency, writer);
	}
}

module.exports = {
	Queue, Cargo
};
