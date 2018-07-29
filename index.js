const express = require('express');
const dotenv = require('dotenv').config()
const cors = require('cors');
const PORT = process.env.PORT || 5000;
const NodeCache = require( "node-cache" );

const helpers = require('./helpers');
const yrequests = require('./yelp-requests');

// cached info expires after 23 hours
const rating_cache = new NodeCache({ stdTTL: 82800 });

// ERRORS
const COULDNT_CONNECT_ERROR = {name: "CouldntConnectError", my_code: 500, message: "Error: Couldn't connect to Yelp"};
const NO_BUSINESS_ERROR = {name: "NoBusinessError", my_code: 404, message: "Error: Couldn't find business on Yelp"};
const NO_RATING_ERROR = {name: "NoRatingError", my_code: 400, message: "Error: Business does not have rating"};

express()
  .use(cors({
  		origin: /chrome-extension:\/\//
    }))
  .get('/business_rating', function(req, res){
  		name = req.query.name;
  		address = req.query.address;
  		city = req.query.city;
  		state = req.query.state;
  		country = req.query.country;

  		business_id = null;

  		cachedYelpGetBusinessRatingInfoPromise(name, address, city, state, country)
  			.then((response_data) => {
  				if (!response_data.hasOwnProperty("rating")){
  					return Promise.reject(NO_RATING_ERROR);
  				}
  				business_rating_response = {
					name: name,
					alias: response_data.alias,
					review_count: response_data.review_count,	
					rating: response_data.rating
				}
				console.log(business_rating_response)
  				res.send(business_rating_response);
  			})
  			.catch((error) => {
  				console.log(error)
  				res.status(error.my_code).send(error.message)
  			})

  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

function cachedYelpGetBusinessRatingInfoPromise(name, address, city="San Francisco", state="CA", country="US"){
	var req_key = helpers.paramStringify({name: name, address: address})

	// check cache first. if it exists there, no need to get data from yelp
	cachedRatingResponse = rating_cache.get(req_key);
	if (cachedRatingResponse != undefined){
		return Promise.resolve(JSON.parse(cachedRatingResponse));
	}

	return yrequests.yelpGetBusinessIdPromise(name, address, city, state, country)
		.then((response) => {
			if (response.data.businesses.length == 0){
				rating_cache.set(req_key, JSON.stringify({}));
				return Promise.reject(NO_BUSINESS_ERROR);
			} else {
				business_id = response.data.businesses[0].id;
				return yrequests.yelpRatingPromise(business_id)
					.then((response) => {
						rating_cache.set(req_key, JSON.stringify(response.data));
						return response.data;
					})
					.catch((error) => {
						return Promise.reject(COULDNT_CONNECT_ERROR);
					});
			}
		})
		.catch((error) => { return Promise.reject(error) || Promise.reject(COULDNT_CONNECT_ERROR); });
}
