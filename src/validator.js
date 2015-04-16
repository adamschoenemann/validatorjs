var Validator = function(input, rules, customMessages) {
	this.input = input;
	this.rules = rules;
	this.messages = extend({}, messages, customMessages || {});

	this.errors = new ValidatorErrors();

	this.errorCount = 0;
	this.check();
};

Validator.prototype = {
	constructor: Validator,

	// replaces placeholders in tmpl with actual data
	_createMessage: function(tmpl, data) {
		var message, key;

		if (typeof tmpl === 'string' && typeof data === 'object') {
			message = tmpl;

			for (key in data) {
				if (data.hasOwnProperty(key)) {
					message = message.replace(':' + key, data[key]);
				}
			}
		}

		return message;
	},

	check: function() {
		var self = this;

		this._each(this.rules, function(attributeToValidate) {

			var rulesArray = this.rules[attributeToValidate];
			if( typeof rulesArray === "string" ) {
        rulesArray = this.rules[attributeToValidate].split('|');
      }

			var inputValue = this.input[attributeToValidate]; // if it doesnt exist in input, it will be undefined

			rulesArray.forEach(function(ruleString) {
				var ruleExtraction = self._extractRuleAndRuleValue(ruleString);
				var rule = ruleExtraction.rule;
				var ruleValue = ruleExtraction.ruleValue;
				var passes, dataForMessageTemplate, msgTmpl, msg;

				passes = self.validate[rule].call(self, inputValue, ruleValue, attributeToValidate);

				if (!passes) {
					if ( !self.errors.hasOwnProperty(attributeToValidate) ) {
						self.errors[attributeToValidate] = [];
					}

					dataForMessageTemplate = self._createErrorMessageTemplateData(attributeToValidate, rule, ruleValue);
					msgTmpl = self._selectMessageTemplate(rule, inputValue, attributeToValidate);
					msg = self._createMessage(msgTmpl, dataForMessageTemplate);
					self._addErrorMessage(attributeToValidate, msg);
				}
			});
		}, this); // end of _each()
	},

	_each: function(obj, cb, context) {
		for (var key in obj) {
			cb.call(context, key);
		}
	},

	/**
	 * Extract a rule and a rule value from a ruleString (i.e. min:3), rule = min, ruleValue = 3
	 * @param  {string} ruleString min:3
	 * @return {object} object containing the rule and ruleValue
	 */
	_extractRuleAndRuleValue: function(ruleString) {
		var obj = {}, ruleArray;

		obj.rule = ruleString;

		if (ruleString.indexOf(':') >= 0) {
			ruleArray = ruleString.split(':');
			obj.rule = ruleArray[0];
			obj.ruleValue = ruleArray.slice(1).join(":");
		}

		return obj;
	},

	_addErrorMessage: function(key, msg) {
		this.errors[key].push(msg);
		this.errorCount++;
	},

	_createErrorMessageTemplateData: function(key, rule, ruleVal) {
		var dataForMessageTemplate = { attribute: this.messages.attributes[key] || key };
		dataForMessageTemplate[rule] = ruleVal; // if no rule value, then this will equal to null

		return dataForMessageTemplate;
	},

	// selects the correct message template from the messages variable based on the rule and the value
	_selectMessageTemplate: function(rule, val, key) {
		var msgTmpl, messages = this.messages;

		// if the custom error message template exists in messages variable
		if (messages.hasOwnProperty(rule + '.' + key)) {
			msgTmpl = messages[rule + '.' + key];
		} else if (messages.hasOwnProperty(rule)) {
			msgTmpl = messages[rule];

			if (typeof msgTmpl === 'object') {
				switch (typeof val) {
					case 'number':
						msgTmpl = msgTmpl['numeric'];
						break;
					case 'string':
						msgTmpl = msgTmpl['string'];
						break;
				}
			}
		} else { // default error message
			msgTmpl = messages.def;
		}

		return msgTmpl;
	},

	passes: function() {
		return this.errorCount === 0 ? true : false;
	},

	fails: function() {
		return this.errorCount > 0 ? true : false;
	},

	// validate functions should return T/F
	validate: {
		required: function(val) {
			var str;

			if (val === undefined || val === null) {
				return false;
			}

			str = String(val).replace(/\s/g, "");
			return str.length > 0 ? true : false;
		},

		// compares the size of strings
		// with numbers, compares the value
		size: function(val, req) {
			if (val) {
				req = parseFloat(req);

				if (typeof val === 'number') {
					return val === req ? true : false;
				}

				return val.length === req ? true : false;
			}

			return true;
		},

		/**
		 * Compares the size of strings or the value of numbers if there is a truthy value
		 */
		min: function(val, req) {
			if (val === undefined || val === '' || val === null) { return true; }

			if (typeof val === 'number') {
				return val >= req ? true : false;
			} else {
				return val.length >= req ? true : false;
			}
		},

		/**
		 * Compares the size of strings or the value of numbers if there is a truthy value
		 */
		max: function(val, req) {
			if (val === undefined || val === '' || val === null) { return true; }

			if (typeof val === 'number') {
				return val <= req ? true : false;
			} else {
				return val.length <= req ? true : false;
			}
		},

		email: function(val) {
			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

			if (val === undefined || val === '' || val === null) {
				return true;
			}

			return re.test(val);
		},

		numeric: function(val) {
			var num;

			if (val === undefined || val === '' || val === null) { return true; }

			num = Number(val); // tries to convert value to a number. useful if value is coming from form element

			if (typeof num === 'number' && !isNaN(num) && typeof val !== 'boolean') {
				return true;
			} else {
				return false;
			}
		},

		url: function(url) {
			if (url === undefined || url === '' || url === null) { return true; }

			return (/^https?:\/\/\S+/).test(url);
		},

		alpha: function(val) {
			if (val === undefined || val === '' || val === null) { return true; }

			return (/^[a-zA-Z]+$/).test(val);
		},

		alpha_dash: function(val) {
			if (val === undefined || val === '' || val === null) { return true; }
			return (/^[a-zA-Z0-9_\-]+$/).test(val);
		},

		alpha_num: function(val) {
			if (val === undefined || val === '' || val === null) { return true; }

			return (/^[a-zA-Z0-9]+$/).test(val);
		},

		same: function(val, req) {
			var val1 = this.input[req];
			var val2 = val;

			if (val1 === val2) {
				return true;
			}

			return false;
		},

		different: function(val, req) {
			var val1 = this.input[req];
			var val2 = val;

			if (val1 !== val2) {
				return true;
			}

			return false;
		},

		"in": function(val, req) {
			var list, len, returnVal;

			if (val) {
				list = req.split(',');
				len = list.length;
				returnVal = false;

				val = String(val); // convert val to a string if it is a number

				for (var i = 0; i < len; i++) {
					if (val === list[i]) {
						returnVal = true;
						break;
					}
				}

				return returnVal;
			}

			return true;
		},

		not_in: function(val, req) {
			var list = req.split(',');
			var len = list.length;
			var returnVal = true;

			val = String(val); // convert val to a string if it is a number

			for (var i = 0; i < len; i++) {
				if (val === list[i]) {
					returnVal = false;
					break;
				}
			}

			return returnVal;
		},

		accepted: function(val) {
			if (val === 'on' || val === 'yes' || val === 1 || val === '1') {
				return true;
			}

			return false;
		},

		confirmed: function(val, req, key) {
			var confirmedKey = key + '_confirmation';

			if (this.input[confirmedKey] === val) {
				return true;
			}

			return false;
		},

		integer: function(val) {
			if (val === undefined || val === '' || val === null) { return true; }
			val = String(val);
			return String(parseInt(val)) === String(val);

		},

		digits: function(val, req) {
			if (this.validate.numeric(val) && String(val).length === parseInt(req)) {
				return true;
			}

			return false;
		},

		digits_between: function(val, req){
			var splits = req.split(','),
				min = parseInt(splits[0]), max = parseInt(splits[1]),
				strVal = String(val);
			return (this.validate.numeric(val) && strVal.length >= 3 && strVal.length <= max);
		},

        regex: function(val, req) {
    	    var mod = /[g|i|m]{1,3}$/;
		    var flag = req.match(mod);
		    flag = flag ? flag[0] : "i";
		    req = req.replace(mod,"").slice(1,-1);
		    req = new RegExp(req,flag);
            return !!val.match(req);
        }
	}
};

// static methods
Validator.register = function(rule, fn, errMsg) {
	this.prototype.validate[rule] = fn;
	messages[rule] = (typeof errMsg === 'string') ? errMsg : messages['def'];
};

Validator.make = function(input, rules, customMessages) {
	return new Validator(input, rules, customMessages);
};
