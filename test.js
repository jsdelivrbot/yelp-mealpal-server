var assert = require('assert');
var axios = require('axios');
var MockAdapter = require('axios-mock-adapter');
var sinon = require('sinon');

var yrequests = require('./yelp-requests');
var app = require('./index');
var mock = new MockAdapter(axios);

// unit tests: yelp requests get called correctly
describe('Yelp Get Request Creation', function() {
	axiosStub = null;
	beforeEach(function(){
		axiosStub = sinon.stub(axios, 'get');
	});
	afterEach(function(){
		axiosStub.restore();
	});

	it('calls business_match with minimal parameters', function(){
		yrequests.yelpGetBusinessIdPromise('testname', 'testaddress');
		get_request_args = axiosStub.getCall(0).args;
		assert.equal(get_request_args[0], "https://api.yelp.com/v3/businesses/matches");
		assert.deepEqual(get_request_args[1].params, {
			"name": 'testname',
			"address1": 'testaddress',
			"city": 'San Francisco',
			"state": 'CA',
			"country": 'US',
		});
	});

	it('calls business_match with exact parameters', function(){
		yrequests.yelpGetBusinessIdPromise(
			'testname', 'testaddress', 'testcity', 'teststate', 'testcountry');
		get_request_args = axiosStub.getCall(0).args;
		assert.equal(get_request_args[0], "https://api.yelp.com/v3/businesses/matches");
		assert.deepEqual(get_request_args[1].params, {
			"name": 'testname',
			"address1": 'testaddress',
			"city": 'testcity',
			"state": 'teststate',
			"country": 'testcountry',
		});
	});

	it('calls business with biz id', function(){
		yrequests.yelpRatingPromise('fakebizid');
		get_request_args = axiosStub.getCall(0).args;
		assert.equal(get_request_args[0], "https://api.yelp.com/v3/businesses/fakebizid");
	});
});


function assertPromiseError(promise, expectedError, done){
	promise.then(response => {
		console.log(response);
		assert(false);
		done();
	})
	.catch(err => {
		assert.equal(err, expectedError);
		done();
	});
}

function assertPromiseSuccess(promise, expectedResponse, done){
	promise.then(response => {
		assert.deepEqual(response, expectedResponse);
		done();
	})
	.catch(err => {
		assert(false);
		done();
	});
}


describe('Yelp request response testing', function(){
	after(() => mock.restore())
	afterEach(() => mock.reset());

	describe('Yelp auth not set up correctly', function(){
		const env = Object.assign({}, process.env);
		after(() => process.env = env );

		it('throws connection error if Yelp auth does not work', function(done){
			process.env.YELP_AUTH = '';
			assertPromiseError(
				app.cachedYelpGetBusinessRatingInfoPromise('testname', 'testaddress'),
				app.COULDNT_CONNECT_ERROR,
				done
			);
		});
	});

	describe('error handling from yelp api response', function(){
		it('throws no business error if business cannot be matched', function(done){
			mock.onGet('/https://api.yelp.com/v3/businesses/matches').reply(200, {
				"businesses": []
			});

			assertPromiseError(
				app.cachedYelpGetBusinessRatingInfoPromise('testname', 'testaddress'),
				app.NO_BUSINESS_ERROR,
				done
			);
		});

		it('is successful if business match and business id are successful', function(done){
			mock.onGet('/https://api.yelp.com/v3/businesses/matches').reply(200, {
				    "businesses": [
				        {
				            "id": "fakebizid1",
				            "alias": "fakealias1",
				            "name": "tesetname1",
				            "coordinates": {
				                "latitude": 37.78165,
				                "longitude": -122.39911
				            },
				            "location": {
				                "address1": "testaddress1",
				                "address2": "",
				                "address3": null,
				                "city": "San Francisco",
				                "zip_code": "94107",
				                "country": "US",
				                "state": "CA",
				                "display_address": [
				                    "testaddress",
				                    "San Francisco, CA 94107"
				                ]
				            },
				            "phone": "+14152229988",
				            "display_phone": "(415) 222-9988"
				        }
				    ]
				});

			mock.onGet('/https://api.yelp.com/v3/businesses/fakebizid1').reply(200,
				{
				    "id": "fakebizid1",
				    "alias": "fakealias1",
				    "name": "fakename1",
				    "image_url": "https://s3-media1.fl.yelpcdn.com/bphoto/KcdHe5OTB6BgSfgN4CNfrw/o.jpg",
				    "is_claimed": true,
				    "is_closed": false,
				    "url": "https://www.yelp.com/biz/zen-izakaya-san-francisco-3?adjust_creative=ndOpf78W1TstZyAtJ7uThA&utm_campaign=yelp_api_v3&utm_medium=api_v3_business_lookup&utm_source=ndOpf78W1TstZyAtJ7uThA",
				    "phone": "+14152229988",
				    "display_phone": "(415) 222-9988",
				    "review_count": 149,
				    "categories": [
				        {
				            "alias": "sushi",
				            "title": "Sushi Bars"
				        },
				        {
				            "alias": "izakaya",
				            "title": "Izakaya"
				        }
				    ],
				    "rating": 4
				}
			);
			assertPromiseSuccess(
				app.cachedYelpGetBusinessRatingInfoPromise('testname1', 'testaddress1'),
				{
					name: "fakename1",
					alias: "fakealias1",
					review_count: 149,
					rating: 4
				},
				done
			);
		});

		it('throws no rating error if rating not found', function(done){
			mock.onGet('/https://api.yelp.com/v3/businesses/matches').reply(200, {
				    "businesses": [
				        {
				            "id": "fakebizid2",
				            "alias": "fakealias2",
				            "name": "tesetname2",
				            "coordinates": {
				                "latitude": 37.78165,
				                "longitude": -122.39911
				            },
				            "location": {
				                "address1": "testaddress2",
				                "address2": "",
				                "address3": null,
				                "city": "San Francisco",
				                "zip_code": "94107",
				                "country": "US",
				                "state": "CA",
				                "display_address": [
				                    "testaddress",
				                    "San Francisco, CA 94107"
				                ]
				            },
				            "phone": "+14152229988",
				            "display_phone": "(415) 222-9988"
				        }
				    ]
				});

			mock.onGet('/https://api.yelp.com/v3/businesses/fakebizid2').reply(200,
				{
				    "id": "fakebizid2",
				    "alias": "fakealias2",
				    "name": "fakename2"
				}
			);

			assertPromiseError(
				app.cachedYelpGetBusinessRatingInfoPromise('testname2', 'testaddress2'),
				app.NO_RATING_ERROR,
				done
			);
		});

	});
});
