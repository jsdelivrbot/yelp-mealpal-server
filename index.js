const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const PORT = process.env.PORT || 5000;
const NodeCache = require( "node-cache" );

AUTH_TOKEN = "lobSQee6r_TCdebGLQZQ04yLc6dJ3utIugNCno5_P4zLo-Odjs3m6QFScjmaWlCHaINDjfBOamOj9tYIqcwFB5hvcBQnF3yTGoV4zGAIdCBG2bwMkfRthQCh0N9YW3Yx"

// cached info expires hourly
const rating_cache = new NodeCache({ stdTTL: 3600 });

express()
  .use(cors())
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
  					throw NO_RATING_ERROR;
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

// turn a params object into the form key=value&key=value&key=value
function paramStringify(params){
	args = []
	for (key in params){
		args.push(key+"="+encodeURIComponent(params[key]))
	}
	return args.join("&");
}

// ERRORS
COULDNT_CONNECT_ERROR = {name: "CouldntConnectError", my_code: 500, message: "Error: Couldn't connect to Yelp"};
NO_BUSINESS_ERROR = {name: "NoBusinessError", my_code: 404, message: "Error: Couldn't find business on Yelp"};
NO_RATING_ERROR = {name: "NoRatingError", my_code: 400, message: "Error: Business does not have rating"};


function cachedYelpGetBusinessRatingInfoPromise(name, address, city="San Francisco", state="CA", country="US"){
	var req_key = paramStringify({name: name, address: address})

	// check cache first.
	cachedRatingResponse = rating_cache.get(req_key)
	if (cachedRatingResponse != undefined){
		return Promise.resolve(JSON.parse(cachedRatingResponse))
	} else {
		return yelpGetBusinessIdPromise(name, address, city, state, country)
			.then((response) => {
				if (response.data.businesses.length > 0){
					found_business = response.data.businesses[0]
					business_id = found_business.id
					return yelpRatingPromise(business_id)
						.then((response) => {
							rating_cache.set(req_key, JSON.stringify(response.data));
							return response.data;
						})
						.catch((error) => {
							throw COULDNT_CONNECT_ERROR;
						});
				} else {
					throw NO_BUSINESS_ERROR;
				}
			})
			.catch((error) => { throw error });
	}
}

function getRequestPromise(url, params){
	request_url = url
	if (params) {
		request_url += "?"+paramStringify(params)
	}

	console.log(request_url)

	return axios.get(request_url, {
	 		headers: {
	   			Authorization: 'Bearer ' + AUTH_TOKEN //the token is a variable which holds the token
			}
		});
}

function yelpRatingPromise(businessId){
	return getRequestPromise("https://api.yelp.com/v3/businesses/" + businessId);
}

function yelpGetBusinessIdPromise(bname, baddress, bcity="San Francisco", bstate="CA", bcountry="US"){
	return getRequestPromise("https://api.yelp.com/v3/businesses/matches",
		{
			"name": bname,
			"address1": baddress,
			"city": bcity,
			"state": bstate,
			"country": bcountry,
		}
	);
}