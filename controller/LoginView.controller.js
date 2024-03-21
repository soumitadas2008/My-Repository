sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
	"use strict";

	return Controller.extend("sbin.oi.controller.LoginView", {

		onInit: function () {
			var oModel = new JSONModel({
				username: "",
				password: ""
			});
			this.getView().setModel(oModel, "loginModel");
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		},
		onLoginPress: function () {
			var oModel = this.getView().getModel("loginModel");
			var username = oModel.getProperty("/User");
			var password = oModel.getProperty("/Password");
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var that = this;
			// Perform backend login request using AJAX
			jQuery.ajax({
				type: "POST",
				url: "https://skybfr-office-inventory.glitch.me/userTable",
				contentType: "application/json",
				data: JSON.stringify({
					"User": username,
					"Password": password
				}),
				success: function (data) {
					if (data.success) {
						MessageToast.show("Login successful");
						var oLayout = "MidColumnFullScreen"
						oRouter.navTo("master", {
							layout: oLayout,
							user: username
						});
					} else {
						MessageBox.error("Login failed: " + data.error);
					}
				},
				error: function (jqXHR, textStatus, errorThrown) {
					// Handle login error
					MessageBox.error("Login failed: " + errorThrown);
				}
			});
		}
	});

});