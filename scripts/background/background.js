if (typeof Background !== 'function') {
	Background = function (chrome, $, window) {
		this.chrome = chrome;
		this.$ = $;
		this.window = window;
		this.init();
	};
	Background.prototype = {
		constructor: Background,
		activeTabId: null,
		token: "",
		user: Object,
		init: function () {
			var self = this;
			this.initMessageListener();
			// this.chrome.storage.sync.get({
			// 	buttonState: false
			// }, function(items){
			// 	if(items.buttonState){
			self.initTabListener();
			self.initFirebase();
			// 	}
			// });
		},
		initMessageListener: function () {
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
		onUpdatedListener: function (tabId, changeInfo) {
			var self = this;
			if (changeInfo.status === 'complete') {
				this.chrome.tabs.get(tabId, function (tab) {
					if (tab.url && tab.url.indexOf("https://mail.google.com/mail/") > -1) {
						if (!self.activeTabId) {
							self.activeTabId = tabId;
							self.activateTab();
						}
						else {
							self.activateTab();
						}
					}
				});
			}
			else {
				if (this.activeTabId && this.activeTabId !== tabId) {
					this.deactivateTab();
				}
			}
		},
		onActivatedListener: function (tabInfo) {
			if (this.activeTabId && tabInfo.tabId === this.activeTabId) {
				this.activateTab();
			}
			else {
				this.deactivateTab();
			}
		},
		onRemovedListener: function (tabId) {
			if (this.activeTabId && tabId === this.activeTabId) {
				this.activeTabId = null;
			}
		},
		initTabListener: function () {
			this.updateListener = this.onUpdatedListener.bind(this);
			this.activateListener = this.onActivatedListener.bind(this);
			this.tabRemoveListener = this.onRemovedListener.bind(this);
			this.chrome.tabs.onUpdated.addListener(this.updateListener);
			this.chrome.tabs.onActivated.addListener(this.activateListener);
			this.chrome.tabs.onRemoved.addListener(this.tabRemoveListener);
		},
		removeTabListener: function () {
			this.chrome.tabs.onUpdated.removeListener(this.updateListener);
			this.chrome.tabs.onActivated.removeListener(this.activateListener);
			this.chrome.tabs.onRemoved.removeListener(this.tabRemoveListener);
		},
		activateTab: function () {
			if (this.activeTabId) {
				this.sendMessageToTab('startScript', null, null, this.activeTabId);
			}
		},
		deactivateTab: function () {
			if (this.activeTabId) {
				this.sendMessageToTab('stopScript', null, null, this.activeTabId);
			}
		},
		activateFunc: function () {
			this.initTabListener();
			this.activateIfTabActive();
		},
		deactivateFunc: function () {
			this.deactivateTab();
			this.removeTabListener();
		},
		activateIfTabActive: function () {
			var self = this;
			this.chrome.tabs.query({ active: true }, function (tab) {
				if (self.activeTabId) {
					if (tab[0].id === self.activeTabId) {
						self.activateTab();
					}
				}
				else if (tab[0].url.indexOf("https://mail.google.com/mail/") > -1) {
					self.activeTabId = tab[0].id;
					self.activateTab();
				}
			});
		},
		// storeData: function (data, tab) {
		// 	var self = this;
		// 	this.db.addScrappedInfo(data).done(function () {
		// 		self.sendMessageToPopup('updateList', {
		// 			start: data.initTimeStamp,
		// 			end: data.endTimeStamp
		// 		}, null);
		// 	}).fail(function (err) {
		// 		console.error(err);
		// 	});
		// },
		sendMessageToTab: function (method, args, cb, tabId) {
			args = (args === null || typeof args === "undefined") ? [] : args;
			args = Array.isArray(args) ? args : [args];
			cb = typeof cb === "undefined" ? null : cb;
			if (typeof tabId === "undefined" || typeof method === "undefined") {
				throw new Error(
					"Missing required parameter " +
					(typeof tabId === "undefined" ? "'tabId'" : "'method'")
				);
			}
			this.chrome.tabs.sendMessage(tabId, {
				method: method,
				args: args
			}, cb);
		},
		sendMessageToPopup: function (method, args, cb) {
			this.chrome.runtime.sendMessage({
				method: method,
				args: [args]
			}, cb);
		},
		initFirebase: function () {
			firebase.initializeApp({
				apiKey: 'AIzaSyABS5l0ydcMXUpqEY2ZvFH8JhyWeM8XWSU',
				authDomain: 'mailcaller-9ba94.firebaseapp.com',
				databaseURL: 'https://mailcaller-9ba94.firebaseio.com',
				projectId: 'mailcaller-9ba94',
				storageBucket: 'mailcaller-9ba94.appspot.com',
				messageSenderId: '190451168256'
			});
		},
		signInWithPopup: function (sender, response) {
			var self = this;
			// ​var to = "";
			// self.chrome.storage.sync.get({
			// 	token: ""
			// }, function(items){
			// 	self.token = items.token;
			// });
			// if (self.token === "") {
			const provider = new firebase.auth.GoogleAuthProvider();
			firebase.auth().signInWithPopup(provider).then(function (result) {
				// This gives you a Facebook Access Token. You can use it to access the Facebook API.
				result.user.getIdToken().then(idToken => {
					console.log(idToken)
					self.token = idToken
					self.chrome.storage.sync.set({
						token: idToken
					});
					response();
				})
					.catch(error => (token = 'error token ${error}'));
				// user.getIdToken() or firebase.auth.currentUser.getIdToken() 
				// The signed-in user info.
				self.user = result.user;
				// ...
			}).catch(function (error) {
				// Handle Errors here.
				var errorCode = error.code;
				var errorMessage = error.message;
				// The email of the user's account used.
				var email = error.email;
				// The firebase.auth.AuthCredential type that was used.
				var credential = error.credential;
				debugger
				// ...
			});
			// }
		},
		postMail: function (args, method) {
			var self = this;
			var temObject = { terminal: 'mac os or android, browser', app: 'gmail' }
			args.metadata = temObject;
			self.$.ajax({
				url: 'https://us-central1-mailcaller-9ba94.cloudfunctions.net/users/me/messages',
				type: 'POST',
				dataType: 'json',
				contentType:'application/json',
				data: JSON.stringify(args),
				success: function (data, status) {
					// return console.log("The returned data", data);
					self.window.alert('Message ID generated Succesfully Id:' + data.message_id)
				},
				beforeSend: function (xhr, settings) {
					xhr.setRequestHeader(
						'Authorization', 'Bearer ' + self.token
					);
				} //set tokenString before send
			});
		}
	}
}
var background = new Background(chrome, jQuery, window);

// okmfljneofglihkmdlghclmejgcbomno
// 

// okmfljneofglihkmdlghclmejgcbomno


// okmfljneofglihkmdlghclmejgcbomno

// ya29.GltdBfVjgajaDbdNgUkIo-jdGV83KKeHj9XKsBGgvcTV7k5Xr_W-0RB8UMlX-05I5CAWxmalCnXsh1t0B-xjahthBJw0lxPHMzK-oZE1l4qbWXm3PKRx-u6HhMMl


// ya29.GltdBWkgAYFw5QNl0-7dEVMUDxZUh9VP0bvL3hn-3D0s0Oz60L8DEdOr2VU_OP3YJzocICs3F-f64ThpDtpwkgC8wSZxns_L-ZMQ5Fx_0xxTAh7gzz_h6PzjjQ0S



// ya29.GltdBfVjgajaDbdNgUkIo-jdGV83KKeHj9XKsBGgvcTV7k5Xr_W-0RB8UMlX-05I5CAWxmalCnXsh1t0B-xjahthBJw0lxPHMzK-oZE1l4qbWXm3PKRx-u6HhMMl