var app = angular.module("openctf", [ "ngRoute" ]);

app.config(["$compileProvider", function($compileProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|javascript):/);
}]);
app.config(function($routeProvider, $locationProvider) {
	$routeProvider.when("/", {
		templateUrl: "pages/home.html",
		controller: "mainController"
	})
	.when("/about", {
		templateUrl: "pages/about.html",
		controller: "mainController"
	})
	.when("/chat", {
		templateUrl: "pages/chat.html",
		controller: "mainController"
	})
	.when("/help", {
		templateUrl: "pages/help.html",
		controller: "mainController"
	})
	.when("/learn", {
		templateUrl: "pages/learn.html",
		controller: "mainController"
	})
	.when("/login", {
		templateUrl: "pages/login.html",
		controller: "mainController"
	})
	.when("/logout", {
		templateUrl: "pages/blank.html",
		controller: "logoutController"
	})
	.when("/problems", {
		templateUrl: "pages/problems.html",
		controller: "problemsController"
	})
	.when("/profile", {
		templateUrl: "pages/profile.html",
		controller: "profileController"
	})
	.when("/profile/:username", {
		templateUrl: "pages/profile.html",
		controller: "profileController"
	})
	.when("/programming", {
		templateUrl: "pages/programming.html",
		controller: "programmingController"
	})
	.when("/register", {
		templateUrl: "pages/register.html",
		controller: "mainController"
	})
	.when("/scoreboard", {
		templateUrl: "pages/scoreboard.html",
		controller: "scoreboardController"
	})
	.when("/settings", {
		templateUrl: "pages/settings.html",
		controller: "settingsController"
	})
	.when("/settings/twofactor", {
		templateUrl: "pages/twofactor.html",
		controller: "twofactorController"
	})
	.when("/settings/verify", {
		templateUrl: "pages/verify.html",
		controller: "verifyEmailController"
	})
	.when("/setup", {
		templateUrl: "pages/setup.html",
		controller: "setupController"
	})
	.when("/tickets", {
		templateUrl: "pages/tickets.html",
		controller: "ticketsController"
	})
	.when("/tickets/:ticket", {
		templateUrl: "pages/tickets.html",
		controller: "ticketsController"
	})
	.when("/forgot", {
		templateUrl: "pages/forgot.html",
		controller: "resetController"
	})
	.when("/forgot/:token", {
		templateUrl: "pages/forgot.html",
		controller: "resetController"
	})
	.when("/team", {
		templateUrl: "pages/team.html",
		controller: "teamController"
	})
	.when("/team/:teamname", {
		templateUrl: "pages/team.html",
		controller: "teamController"
	})
	.when("/admin/problems", {
		templateUrl: "pages/admin/problems.html",
		controller: "adminProblemsController"
	})
	.when("/admin/stats", {
		templateUrl: "pages/admin/statistics.html",
		controller: "adminStatisticsController"
	})
	.when("/admin/settings", {
		templateUrl: "pages/admin/settings.html",
		controller: "adminSettingsController"
	})
	.when("/admin/teams", {
		templateUrl: "pages/admin/teams.html",
		controller: "adminTeamsController"
	})
	.otherwise({
		templateUrl: "pages/404.html",
		controller: "mainController"
	});
	$locationProvider.html5Mode(true);
});

function api_call(method, url, data, callback_success, callback_fail) {
	if (method.toLowerCase() == "post") {
		data["csrf_token"] = $.cookie("csrf_token");
	}
	$.ajax({
		"type": method,
		"datatype": "json",
		"data": data,
		"url": url,
		"cache": false
	}).done(function(result) {
		if (result && result["redirect"] && location.pathname != result["redirect"]) {
			location.href = result["redirect"];
		} else {
			callback_success(result);
		}
	}).fail(function(jqXHR) {
		callback_fail(jqXHR);
	});
}

function permanent_message(containerId, alertType, message, callback) {
	$("#" + containerId).html("<div class=\"alert alert-" + alertType + "\" style=\"margin:0;\">" + message + "</div>");
	$("#" + containerId).hide().slideDown("fast", "swing");
};

function display_message(containerId, alertType, message, callback) {
	$("#" + containerId).html("<div class=\"alert alert-" + alertType + "\">" + message + "</div>");
	$("#" + containerId).hide().slideDown("fast", "swing", function() {
		window.setTimeout(function () {
			$("#" + containerId).slideUp("fast", "swing", callback);
		}, message.length * 55);
	});
};

app.controller("mainController", ["$scope", "$http", "$location", function($scope, $http, $location) {
	$scope.config = { navbar: { } };
	$scope.timestamp = Date.now();
	api_call("GET", "/api/user/status", {}, function(result) {
		if (result["success"] == 1) {
			delete result["success"];
			$scope.config.navbar = result;
			document.title = result["ctf_name"];
			$scope.$emit("loginStatus");

			if (result["competition"] !== true && result["admin"] !== true) {
				var path = $location.$$path.toLowerCase();
				var competition_only_paths = [ "/problems", "/programming", "/shell" ];
				if (competition_only_paths.indexOf(path) >= 0) {
					location.href = "/team";
				}
			}
		} else {
			$scope.config.navbar.logged_in = false;
		}
		$scope.$apply();
	}, function() {
		$scope.config.navbar.logged_in = false;
		$scope.$apply();
		permanent_message("site-message", "danger", "<div class='container'>The OpenCTF API is down. Please wait while we try to resolve this issue.</div>");
	});
}]);

app.controller("logoutController", function() {
	api_call("GET", "/api/user/logout", {}, function(result) {
		location.href = "/";
	});
});

app.controller("problemsController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("loginController", { $scope: $scope });
	api_call("GET", "/api/problem/data", {}, function(result) {
		if (result["success"] == 1) {
			$scope.problems = result["problems"];
		} else {
			display_message("problems_data_msg", "danger", result["message"], function() {
				if (result["message"].indexOf("finalized") > 0) {
					location.href = "/team";
				}
			});
		}
		$scope.$apply();
	});
}]);

app.controller("profileController", ["$controller", "$scope", "$http", "$routeParams", "$sce", function($controller, $scope, $http, $routeParams, $sce) {
	var data = { };
	if ("username" in $routeParams) data["username"] = $routeParams["username"];
	$controller("mainController", { $scope: $scope });
	api_call("GET", "/api/user/info", data, function(result) {
		if (result["success"] == 1) {
			$scope.user = result["user"];
			for(var i=0; i<$scope.user.activity.length; i++) {
				$scope.user.activity[i].message_clean = $sce.trustAsHtml($scope.user.activity[i].message);
			}
		}
		$scope.$apply();
		$(".timeago").timeago();
		var category_chart = c3.generate({
			bindto: "#category_chart",
			data: {
				columns: (function() {
					var categories = { };
					for(var i=0; i<result["user"]["stats"]["problems"].length; i++) {
						var problem = result["user"]["stats"]["problems"][i];
						if (!(problem["category"] in categories)) categories[problem["category"]] = 0;
						categories[problem["category"]] += 1;
					}
					var result2 = [ ];
					for(var key in categories) {
						result2.push([ key, categories[key] ]);
					}
					return result2;
				})(),
				type: "pie"
			}
		});
		var submissions_chart = c3.generate({
			bindto: "#submissions_chart",
			data: {
				columns: [
					[ "Successful", result["user"]["stats"]["correct_submissions"] ],
					[ "Failed", result["user"]["stats"]["total_submissions"] - result["user"]["stats"]["correct_submissions"] ]
				],
				colors: {
					Successful: "#090",
					Failed: "#C00"
				},
				type: "pie"
			}
		});
	});
}]);


app.controller("programmingController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("loginController", { $scope: $scope });
	$("#editor").height($(window).height()/2);
	var grader = ace.edit("editor");
	grader.setTheme("ace/theme/tomorrow");
	grader.getSession().setMode("ace/mode/python");
	grader.setOptions({
		fontFamily: "monospace",
		fontSize: "10pt"
	});
	grader.setValue("");

}]);

app.controller("setupController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("mainController", { $scope: $scope });
	api_call("GET", "/api/admin/setup/init", { }, function(result) {
		$scope["ready"] = result["success"] == 1;
		if (result["verification"]) console.log("Verification code:", result["verification"]);
		$scope.$apply();
	});
}]);

app.controller("loginController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("mainController", { $scope: $scope });
	$scope.$on("loginStatus", function() {
		if ($scope.config["navbar"].logged_in != true) {
			location.href = "/login";
			return;
		}
	});
}]);

app.controller("teamController", ["$controller", "$scope", "$http", "$routeParams", function($controller, $scope, $http, $routeParams) {
	var data = { };
	if ("teamname" in $routeParams) {
		data["teamname"] = $routeParams["teamname"];
	} else {
		$controller("loginController", { $scope: $scope });
	}
	api_call("GET", "/api/team/info", data, function(result) {
		if (result["success"] == 1) {
			$scope.team = result["team"];
		}
		$scope.$apply();
		$(".timeago").timeago();
		
		$("#teamname_edit").on("blur keyup paste", function() {
			var data = { "new_teamname": $("#teamname_edit").text() }
			api_call("POST", "/api/team/edit", data);
		});
		$("#school_edit").on("blur keyup paste", function() {
			var data = { "new_school": $("#school_edit").text() }
			api_call("POST", "/api/team/edit", data);
		});
	});
}]);

app.controller("ticketsController", ["$controller", "$scope", "$http", "$routeParams", function($controller, $scope, $http, $routeParams) {
	$controller("mainController", { $scope: $scope });
	ticket = "";
	$scope.view = false;
	if ("ticket" in $routeParams) {
		ticket = "/" + $routeParams["ticket"];
		$scope.view = true;
	}
	api_call("GET", "/api/tickets/data" + ticket, {}, function(result) {
		if (result["success"] == 1) {
			$scope.data = result["data"];
		} else {
			$scope.data = [];
		}
		$scope.$apply();
	});
}]);

app.controller("scoreboardController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("mainController", { $scope: $scope });
	api_call("GET", "/api/stats/scoreboard", { }, function(result) {
		if (result["success"] == 1) {
			$scope.scoreboard = result["scoreboard"];
			$scope.$apply();
		}
	});
}]);

app.controller("resetController", ["$controller", "$scope", "$http", "$routeParams", function($controller, $scope, $http, $routeParams) {
	var data = { };
	$scope.token = false;
	data["csrf_token"] = $.cookie("csrf_token");
	if ("token" in $routeParams) {
		$scope.token = true;
		token = $routeParams["token"];
		api_call("GET", "/api/user/forgot/" + token, data, function(data) {
			$scope.body = data["message"];
			$scope.success = data["success"]
			$scope.$apply();
		});
	} else {
		$controller("mainController", { $scope: $scope });
	}
}]);

app.controller("adminController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("mainController", { $scope: $scope });
	$scope.$on("loginStatus", function() {
		if ($scope.config["navbar"].logged_in != true) {
			location.href = "/login";
			return;
		}
		if ($scope.config["navbar"].admin != true) {
			location.href = "/profile";
			return;
		}
	});
}]);

app.controller("adminProblemsController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("adminController", { $scope: $scope });
	api_call("GET", "/api/problem/data", {}, function(result) {
		if (result["success"] == 1) {
			$scope.problems = result["problems"];
		} else {
			$scope.problems = [];
		}
		$scope.$apply();
		$scope.problems.forEach(function(problem) {
			var grader = ace.edit(problem.pid + "_grader");
			grader.setTheme("ace/theme/tomorrow");
			grader.getSession().setMode("ace/mode/python");
			grader.setValue(problem.grader_contents);
		});
	});
}]);

app.controller("adminStatisticsController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("adminController", { $scope: $scope });
	api_call("GET", "/api/admin/stats/overview", {}, function(result) {
		if (result["success"] == 1) {
			$scope.overview = result["overview"];
		} else {
			$scope.overview = [];
		}
		$scope.$apply();
	});
}]);

app.controller("adminSettingsController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("adminController", { $scope: $scope });
	api_call("GET", "/api/admin/settings", {}, function(result) {
		if (result["success"] == 1) {
			$scope.settings = result["settings"];
		} else {
			$scope.settings = {};
		}
		$scope.$apply();
		handler();
	});
}]);

app.controller("adminTeamsController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("adminController", { $scope: $scope });
	api_call("GET", "/api/admin/teams/overview", {}, function(result) {
		if (result["success"] == 1) {
			$scope.teams = result["teams"];
		} else {
			$scope.teams = {};
		}
		$scope.$apply();
		$(".timeago").timeago();
	});
}]);

app.controller("settingsController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("loginController", { $scope: $scope });
	api_call("GET", "/api/user/info", {}, function(result) {
		if (result["success"] == 1) {
			$scope.user = result["user"];
		}
		$scope.$apply();
		$(".timeago").timeago();
	});
}]);

app.controller("twofactorController", ["$controller", "$scope", "$http", function($controller, $scope, $http) {
	$controller("loginController", { $scope: $scope });
	api_call("GET", "/api/user/info", {}, function(result) {
		if (result["success"] == 1) {
			$scope.user = result["user"];
		}
		$scope.$apply();
	});
}]);

app.controller("verifyEmailController", ["$controller", "$scope", "$http", "$location", "$window", function($controller, $scope, $http, $location, $window) {
	$controller("loginController", { $scope: $scope });
	var token = $location.search().token;
	var data = { };
	data["token"] = token;
	api_call("GET", "/api/user/verify", data, function(result) {
		if (result["success"] == 1) {
			$window.location.href = "/settings";
		}
		$scope.body = result["message"];
		$scope.success = result["success"]
		$scope.$apply();
	});
}]);

$.fn.serializeObject = function() {
	var a, o;
	o = {};
	a = this.serializeArray();
	$.each(a, function() {
		if (o[this.name]) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			return o[this.name].push(this.value || "");
		} else {
			return o[this.name] = this.value || "";
		}
	});
	return o;
};

// register page

var register_form = function() {
	var input = "#register_form input";
	var data = $("#register_form").serializeObject();
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/user/register", data, function(result) {
		if (result["success"] == 1) {
			location.href = "/profile";
		} else {
			display_message("register_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR, status, error) {
		var result = jqXHR["responseText"];
		display_message("register_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

// password reset
var request_reset_form = function() {
	var input = $("#request_reset_form input");
	var data = $("#request_reset_form").serializeObject();
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/user/forgot", data, function(result) {
		if (result["success"] == 1) {
			display_message("reset_msg", "success", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		} else {
			display_message("reset_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR, status, error) {
		var result = jqXHR["responseText"];
		display_message("reset_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
}

var reset_form = function() {
	var input = $("#reset_form input");
	var data = $("#reset_form").serializeObject();
	data["csrf_token"] = $.cookie("csrf_token");
	var url = window.location.href;
	var token = url.substr(url.lastIndexOf("/")+1);
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/user/forgot/" + token, data, function(result) {
		if (result["success"] == 1) {
			display_message("reset_msg", "success", result["message"], function() {
				location.href = "/login";
			});
		} else {
			display_message("reset_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR, status, error) {
		var result = jqXHR["responseText"];
		display_message("reset_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
}


// setup page

var setup_form = function() {
	var input = "#setup_form input";
	var data = $("#setup_form").serializeObject();
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/admin/setup", data, function(result) {
		if (result["success"] == 1) {
			location.href = "/";
		} else {
			display_message("setup_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR, status, error) {
		var result = jqXHR["responseText"];
		display_message("setup_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

// login page

var login_form = function() {
	var input = "#login_form input";
	var data = $("#login_form").serializeObject();
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/user/login", data, function(result) {
		if (result["success"] == 1) {
			location.href = "/profile";
		} else {
			display_message("login_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR, status, error) {
		var result = jqXHR["responseText"];
		display_message("login_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

// team page
var create_team = function() {
	var input = "#create_team input";
	var data = $("#create_team").serializeObject();
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/team/create", data, function(result) {
		if (result["success"] == 1) {
			location.reload(true);
		} else {
			display_message("create_team_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR, status, error) {
		var result = JSON.parse(jqXHR["responseText"]);
		display_message("create_team_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

var add_member = function() {
	var input = "#add_member input";
	var data = $("#add_member").serializeObject();
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/team/invite", data, function(result) {
		if (result["success"] == 1) {
			display_message("add_member_msg", "success", result["message"], function() {
				location.reload(true);
				$(input).removeAttr("disabled");
			});
		} else {
			$(input).removeAttr("disabled");
			display_message("add_member_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR, status, error) {
		var result = jqXHR["responseText"];
		display_message("add_member_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

var rescind_invitation = function(uid) {
	var input = "#add_member input";
	var data = { "uid": uid };
	api_call("POST", "/api/team/invite/rescind", data, function(result) {
		if (result["success"] == 1) {
			location.reload(true);
		}
	});
};

var request_invitation = function(tid) {
	var input = "#add_member input";
	var data = { "tid": tid };
	api_call("POST", "/api/team/invite/request", data, function(result) {
		if (result["success"] == 1) {
			location.reload(true);
		}
	});
};

var accept_invitation = function(tid) {
	var data = { "tid": tid };
	api_call("POST", "/api/team/invite/accept", data, function(result) {
		if (result["success"] == 1) {
			location.reload(true);
		}
	});
};

var accept_invitation_request = function(uid) {
	var data = { "uid": uid };
	api_call("POST", "/api/team/invite/request/accept", data, function(result) {
		if (result["success"] == 1) {
			location.reload(true);
		}
	});
};

var finalize_team = function() {
	if (confirm("Are you sure you want to finalize your team? You won't be able to make changes or add members after this.")) {
		api_call("POST", "/api/team/finalize", { }, function(result) {
			if (result["success"] == 1) {
				location.reload(true);
			}
		});
	}
};

// twofactor page

var twofactor_form = function() {
	var input = $("#twofactor_form input");
	var data = $("#twofactor_form").serializeObject();
	data["csrf_token"] = $.cookie("csrf_token");
	$(input).attr("disabled", "disabled");
	api_call("POST", "/api/user/twofactor/verify", data, function(result) {
		if (result["success"] == 1) {
			location.href = "/settings";
		} else {
			display_message("twofactor_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR) {
		var result = jqXHR["responseText"];
		display_message("twofactor_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

// settings page

var remove_profile_picture = function() {
	api_call("POST", "/api/user/avatar/remove", { }, function(result) {
		if (result["success"] == 1) {
			location.reload(true);
		}
	});
};

var update_profile = function() {
	var input = $("#update_profile_form input");
	var data = $("#update_profile_form").serializeObject();
	data["csrf_token"] = $.cookie("csrf_token");
	$(input).attr("disabled", "disabled");

	api_call("POST", "/api/user/update_profile", data, function(result) {
		if (result["success"] == 1) {
			display_message("change_pass_msg", "success", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		} else {
			display_message("change_pass_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		}
	}, function(jqXHR) {
		var result = jqXHR["responseText"];
		display_message("change_pass_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

var verify_email = function() {
	data = {};
	var input = $("#verify_email_btn");
	$(input).attr("disabled", "disabled");
	data["csrf_token"] = $.cookie("csrf_token");

	api_call("POST", "/api/user/verify", {}, function(result) {
		if (result["success"] == 1) {
			display_message("verify_email_msg", "success", result["message"], function() {
				$(input).removeAttr("disabled");
			});
		} else {
			display_message("verify_email_msg", "danger", result["message"], function() {
				$(input).removeAttr("disabled");
			});

		}
	}, function(jqXHR) {
		var result = jqXHR["responseText"];
		display_message("verify_email_msg", "danger", "Error " + jqXHR["status"] + ": " + result["message"], function() {
			$(input).removeAttr("disabled");
		});
	});
};

var delete_session = function(sid) {
	var data = { "sid": sid };
	api_call("POST", "/api/user/session/delete", data, function(result) {
		if (result["success"] == 1) {
			location.reload(true);
		}
	});
};
