if (typeof ContentScript !== 'function') {
	ContentScript = function (window, document, $, chrome, selectors, whatsAppStatuses) {
		this.window = window;
		this.document = document;
		this.$ = $;
		this.chrome = chrome;
		this.selectors = selectors;
		this.initMessageListener();
	};
	ContentScript.prototype = {
		constructor: ContentScript,
		tabActive: true,
		status: 'inactive',
		initFunctionality: function () {
			if (this.tabActive) {
				var self = this;
				this.status = 'active';
				this.document.arrive(this.selectors.composeMailDiv, { existing: true }, function (e) {
					self.changeBtn($(e));
				});
			}
		},
		changeBtn: function ($element) {
			var self = this;
			self.$mailSendBtnDiv = $($element).find(self.selectors.mailSendBtnDiv);
			self.$mailSendBtn = $($element).find(self.selectors.mailSendBtn);
			self.$mailSendBtn.css('display', 'none')
			var $sendBtn = $('<div for="' + $element.attr('id') + '" class="T-I J-J5-Ji aoO T-I-atl L3"  role="button" tabindex="1" data-tooltip="Send ‪(Ctrl-Enter)‬" aria-label="Send ‪(Ctrl-Enter)‬" data-tooltip-delay="800" style="user-select: none;">Send with Mail Caller</div>')
			$sendBtn.click(function (e) {
				e.preventDefault();
				self.sendBtnClicked = $sendBtn.closest(self.selectors.composeMailDiv)
				self.sendMessageToBg('signInWithPopup', [], self.signedInSuccess.bind(self));
			})
			self.$mailSendBtnDiv.append($sendBtn)
		},
		initMessageListener: function () {
			var self = this;
			this.chrome.runtime.onMessage.addListener(function (message, sender, response) {
				if (!self[message.method]) {
					throw new Error('Method "' + message.method + '" does not exist');
				}
				var tab = sender;
				message.args = message.args || [];
				message.args.push(tab);
				message.args.push(response);
				self[message.method].apply(self, message.args || []);
				return true;
			});
		},
		stopScript: function () {
			this.tabActive = false;
			this.status = 'inactive';
		},
		startScript: function () {
			if (this.status === 'inactive') {
				this.tabActive = true;
				this.initFunctionality();
			}
		},
		sendMessageToBg: function (method, args, cb) {
			args = (args === null || typeof args === "undefined") ? [] : args;
			args = Array.isArray(args) ? args : [args];
			cb = typeof cb === "undefined" ? null : cb;
			if (typeof method === "undefined" || typeof method !== "string") {
				throw new Error("Missing required parameter 'method'");
			}
			this.chrome.runtime.sendMessage({
				method: method,
				args: args
			}, cb);
		},
		simulateClick: function (element) {
			this.triggerClickEvent(element, 'mousedown');
			this.triggerClickEvent(element, 'mouseup');
			this.triggerClickEvent(element, 'click');
		},
		triggerClickEvent: function (element, event) {
			element.focus();
			var self = this;
			var evt = new MouseEvent(event, {
				bubbles: true,
				cancelable: true,
				view: self.window
			});
			element.dispatchEvent(evt);
		},
		sendMail: function ($element) {
			var self = this;
			var receipients = "";
			var subject = "";
			var content = "";
			var $receipient = $($element).find(self.selectors.receipientDiv);
			var $subject = $($element).find(self.selectors.subjectInput);
			var $content = $($element).find(self.selectors.contentDiv);
			content = $($content).html();
			subject = $($subject).attr('value');
			// receipients = $(this).attr('email');
			$receipient.each(function () {
				receipients = $(this).attr('email');
			})
			var tempObj = {
				subject: subject,
				to: receipients,
				content: content
			}
			self.sendMessageToBg('postMail', tempObj);
		},
		signedInSuccess: function () {

			var self = this;
			self.sendMail($(self.sendBtnClicked));
		}
	}
}
var content = new ContentScript(window, document, jQuery, chrome, selectors);