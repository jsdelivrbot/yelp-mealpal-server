// turn a params object into the form key=value&key=value&key=value
function paramStringify(params){
	args = [];
	for (key in params){
		args.push(key+"="+encodeURIComponent(params[key]));
	}
	return args.join("&");
}

module.exports = {
	paramStringify: paramStringify,
};