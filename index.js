const express = require('express');
const path = require('path');
const axios = require('axios');
const PORT = process.env.PORT || 5000;

AUTH_TOKEN = "lobSQee6r_TCdebGLQZQ04yLc6dJ3utIugNCno5_P4zLo-Odjs3m6QFScjmaWlCHaINDjfBOamOj9tYIqcwFB5hvcBQnF3yTGoV4zGAIdCBG2bwMkfRthQCh0N9YW3Yx"

express()
  .use(express.static(path.join(__dirname, 'public')))
  .get('/business_rating', function(req, res){
  		name = req.query.name;
  		address = req.query.address;
  		city = req.query.city;
  		state = req.query.state;
  		country = req.query.country;

  		business_id = null;

		yelpGetBusinessIdPromise(name, address, city, state, country)
			.then((response) => {
				business_id = response.data.businesses[0].id
				console.log(business_id);
			})
			.then(() => {
				yelpRatingPromise(business_id)
					.then((response) => {
						res.send({
							name: name,
							review_count: response.data.review_count,
							rating: response.data.rating
						})
					})
					.catch((error) => {throw error } )
			})
			.catch((error) => { throw error })

  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


function getRequestPromise(url, params){
	request_url = url
	if (params) {
		args = []
		for (key in params){
			args.push(key+"="+encodeURIComponent(params[key]))
		}

		request_url += "?"+args.join("&")
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