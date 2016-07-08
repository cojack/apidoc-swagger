module.exports = function (text) {
	text = text || '';
	return text.replace(/(<([^>]+)>)/ig, '');
};