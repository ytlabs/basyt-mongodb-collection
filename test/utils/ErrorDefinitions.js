function InputError(errors) {
    this.name = "Input Error";
    this.err = errors;
    this.statusCode = 200;
    Error.captureStackTrace(this, InputError);
}

InputError.prototype = Object.create(Error.prototype);
InputError.prototype.constructor = InputError;

function BasytError(err, statusCode) {
    this.name = "Basyt Internal Error";
    this.err = err;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, BasytError);
}

BasytError.prototype = Object.create(Error.prototype);
BasytError.prototype.constructor = BasytError;

module.exports = {
		InputError: InputError,
    	BasytError: BasytError
	};