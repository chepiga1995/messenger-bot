'use strict';
const url = require('url');
const qs = require('querystring');
const EventEmitter = require('events').EventEmitter;
const request = require('request');
const crypto = require('crypto');
const default_fields = 'first_name,last_name,profile_pic,locale,timezone,gender';

class Bot extends EventEmitter {
	constructor(opts) {
		super();

		opts = opts || {};
		if (!opts.token) {
			throw new Error('Missing page token. See FB documentation for details: https://developers.facebook.com/docs/messenger-platform/quickstart')
		}
		this.token = opts.token;
		this.fields = opts.fields || default_fields;
		this.app_secret = opts.app_secret || false;
		this.verify_token = opts.verify || false
	}

	getProfile(id) {
		return new Promise((resolve, reject) => {
			request({
				method: 'GET',
				uri: `https://graph.facebook.com/v2.6/${id}`,
				qs: {
					fields: this.fields,
					access_token: this.token
				},
				json: true
			}, (err, res, body) => {
				if (err) return reject(err);
				if (body.error) return reject(body.error);

				resolve(body);
			})
		});

	}

	sendMessage(recipient, payload) {
		return new Promise((resolve, reject) => {
			request({
				method: 'POST',
				uri: 'https://graph.facebook.com/v2.6/me/messages',
				qs: {
					access_token: this.token
				},
				json: {
					recipient: {id: recipient},
					message: payload
				}
			}, (err, res, body) => {
				if (err) return reject(err);
				if (body.error) return reject(body.error);

				resolve(body);
			})
		});
	}

	_handleMessage(json) {
		let entries = json.entry;

		entries.forEach((entry) => {
			let events = entry.messaging;

			events.forEach((event) => {
				// handle inbound messages
				if (event.message) {
					this._handleEvent('message', event);
				}

				// handle postbacks
				if (event.postback) {
					this._handleEvent('postback', event);
				}

				// handle read
				if (event.read) {
					this._handleEvent('read', event);
				}

				// handle message delivered
				if (event.delivery) {
					this._handleEvent('delivery', event);
				}

				// handle authentication
				if (event.optin) {
					this._handleEvent('authentication', event);
				}
			})
		})
	}

	_verify(req, res) {
		let query = qs.parse(url.parse(req.url).query);

		if (query['hub.verify_token'] === this.verify_token) {
			return res.end(query['hub.challenge']);
		}

		return res.end('Error, wrong validation token');
	}

	_handleEvent(type, event) {
		this.emit(type, event, this.sendMessage.bind(this, event.sender.id));
	}
}

module.exports = Bot;
