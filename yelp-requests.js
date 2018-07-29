const axios = require('axios');
const helpers = require('./helpers');

function yelpGetRequestPromise(url, params){
	console.log(url);
	return axios.get(url, {
			params: params,
	 		headers: {
	   			Authorization: 'Bearer ' + process.env.YELP_AUTH
			}
		});
}

function yelpRatingPromise(businessId){
	return yelpGetRequestPromise("https://api.yelp.com/v3/businesses/" + businessId);
}

function yelpGetBusinessIdPromise(bname, baddress, bcity="San Francisco", bstate="CA", bcountry="US"){
	return yelpGetRequestPromise("https://api.yelp.com/v3/businesses/matches",
		{
			"name": bname,
			"address1": baddress,
			"city": bcity,
			"state": bstate,
			"country": bcountry,
		}
	);
}

module.exports = {
  yelpGetRequestPromise: yelpGetRequestPromise, 
  yelpRatingPromise: yelpRatingPromise, 
  yelpGetBusinessIdPromise: yelpGetBusinessIdPromise,
};