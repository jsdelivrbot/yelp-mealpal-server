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
const COULDNT_CONNECT_ERROR = {
	name: "CouldntConnectError",
	my_code: 500,
	message: "Error: Couldn't connect to Yelp"
};
const NO_BUSINESS_ERROR = {
	name: "NoBusinessError",
	my_code: 404,
	message: "Error: Couldn't find business on Yelp"
};
const NO_RATING_ERROR = {
	name: "NoRatingError",
	my_code: 400,
	message: "Error: Business does not have rating"
};

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
				console.log(response_data);
  				res.send(response_data);
  			})
  			.catch((error) => {
  				console.log(error);
  				res.status(error.my_code).send(error.message);
  			});

  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

function addToRatingCache(key, object={}){
	rating_cache.set(key, JSON.stringify(object));
}

function cachedYelpGetBusinessRatingInfoPromise(
	name, address, city="San Francisco", state="CA", country="US"){

	var req_key = helpers.paramStringify({name: name, address: address});

	// check cache first. if it exists there, no need to get data from yelp
	cachedRatingResponse = rating_cache.get(req_key);
	if (cachedRatingResponse != undefined){
		return Promise.resolve(JSON.parse(cachedRatingResponse));
	}

	return yrequests.yelpGetBusinessIdPromise(name, address, city, state, country)
		.then((response) => {
			if (response.data.businesses.length == 0)
				return Promise.reject(NO_BUSINESS_ERROR);

			business_id = response.data.businesses[0].id

			return Promise.all([
				business_id,
				yrequests.yelpRatingPromise(business_id)
			]);
		})
		.then(results_of_both => {
			business_info_response = results_of_both[1].data;
			//for now, Fusion API guarantees that only
			// businesses with ratings are reurned; this is a safeguard.
			if (!business_info_response.hasOwnProperty("rating"))
				return Promise.reject(NO_RATING_ERROR);

			business_rating_response = {
				name: business_info_response.name,
				alias: business_info_response.alias,
				review_count: business_info_response.review_count,
				rating: business_info_response.rating
			}
			addToRatingCache(req_key, business_rating_response);

			return business_rating_response;

		})
		.catch((error) => {
			return Promise.reject((error.hasOwnProperty('my_code') ?
				error : COULDNT_CONNECT_ERROR));
		})
}


module.exports = {
	cachedYelpGetBusinessRatingInfoPromise: cachedYelpGetBusinessRatingInfoPromise,
	COULDNT_CONNECT_ERROR: COULDNT_CONNECT_ERROR,
	NO_BUSINESS_ERROR: NO_BUSINESS_ERROR,
	NO_RATING_ERROR: NO_RATING_ERROR,
}
