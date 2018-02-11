if (typeof Popup !== 'function') {
	Popup = function (window, document, chrome, $) {
		this.window = window;
		this.document = document;
		this.chrome = chrome;
		this.$ = $;
		this.init();
	};
	Popup.prototype = {
		constructor: Popup,
		activateColor: 'white',
		deactivateColor: '#d14836',
		$listDiv : this.$('div#scrappedInfo'),
		init: function() {
			var self = this;
			this.initMessageListener();
			this.chrome.storage.sync.get({
				buttonState: false
			}, function(items){
				self.buttonState = items.buttonState;
				self.setButton();
			});
		},
		initMessageListener: function(){
			var self = this;
			this.chrome.runtime.onMessage.addListener(function (message, sender, response) {
				if (!self[message.method]) {
					return;
				}
				var tab = sender;
				message.args = message.args || [];
				message.args.push(tab);
				message.args.push(response);
				self[message.method].apply(self, message.args || []);
				return true;
			});
		},
		initButtonListeners: function ($tglBtn) {
			var self = this;
			$tglBtn.click(function () {
				if(self.buttonState){	//if button is active -> deactivate
					self.deactivateFunctionality($tglBtn);
				}
				else {
					self.activateFunctionality($tglBtn);
				}
			});
		},
		setButton: function(){
			var $tglBtn = this.$('#tglBtn');
			if(this.buttonState){	//if button is active
				$tglBtn.css('background-color', this.deactivateColor);
				$tglBtn.text('Deactivate');
			}
			else {
				$tglBtn.css('background-color', this.activateColor);
				$tglBtn.text('Activate');
			}
			this.initButtonListeners($tglBtn);
		},
		deactivateFunctionality: function($tglBtn){
			var self =this;
			this.chrome.storage.sync.set({
				buttonState : false
			},function(){
				$tglBtn.css('background-color', self.activateColor);
				$tglBtn.text('Activate');
				self.buttonState = false;
				self.sendMessageToBg('deactivateFunc', null, null);
			});
		},
		activateFunctionality: function($tglBtn){
			var self =this;
			this.chrome.storage.sync.set({
				buttonState : true
			},function(){
				$tglBtn.css('background-color', self.deactivateColor);
				$tglBtn.text('Deactivate');
				self.buttonState = true;
				self.sendMessageToBg('activateFunc', null, null);
			});
		},
		sendMessageToBg: function(method, args, cb){
			this.chrome.runtime.sendMessage({
				method: method,
				args: [args]
			}, cb);
		}
	};
}

var popup = new Popup(window, document, chrome, jQuery);