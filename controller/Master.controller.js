sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/library",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/m/MessageBox",
	"sap/f/library",
	"sap/m/Dialog",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/library",
	"sap/ui/core/Fragment"
], function (Controller, coreLibrary, Filter, FilterOperator, Sorter, MessageBox, fioriLibrary, Dialog, List, StandardListItem, Text,
	Button,
	mobileLibrary, Fragment) {
	"use strict";
	var ButtonType = mobileLibrary.ButtonType;
	var ValueState = coreLibrary.ValueState;
	var DialogType = mobileLibrary.DialogType;
	return Controller.extend("sbin.oi.controller.Master", {
		onInit: function () {
			this.oView = this.getView();
			this._bDescendingSort = false;
			this.oProdTable = this.oView.byId("createOrderDialog");
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);

		},

		onInvPress: function (eve) {
			sap.m.MessageToast.show("Tile clicked");

		},
		onCostPress: function (eve) {
			sap.m.MessageToast.show("Tile clicked");

		},
		onNoSalePress: function (oEvent) {
				var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
			this.oRouter.navTo("InvNoSale", {
				layout: fioriLibrary.LayoutType.EndColumnFullScreen,
				user: this._user
			});
		},
		onFunActivityTilePress: function () {
			sap.m.MessageToast.show("Coming Soon!!");
		},
		onOrderDialogPress: function (oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("MainModel");
			var oContext = oEvent.getSource().getBindingContext("MainModel");
			var oView = this.oView,
				oButton = oEvent.getSource();
			if (!this.oDefaultDialog) {
				this.oDefaultDialog = Fragment.load({
					id: oView.getId(),
					name: "sbin.oi.view.fragments.CreateOrderDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oDialog.setModel(this.getView().getModel("MainModel"));
					oDialog.setBindingContext(oContext, "MainModel");
					return oDialog;
				}.bind(this));

			}
			this.oDefaultDialog.then(function (oDialog) {
				oDialog.setModel(this.getView().getModel("MainModel"));
				oDialog.setBindingContext(oContext, "MainModel");
				oDialog.open(oButton);
			}.bind(this));

		},

		onDialogCancel: function (oEvent) {
			var oDialog = this.byId("createOrderDialog");
			oDialog.close();
		},

		_onProductMatched: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", false);
			if (!this._user && oEvent) {
				this._user = oEvent.getParameter("arguments").user;
				oModel.setProperty("/LoginUserId", this._user);
			}
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/userTable/${this._user}`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.LoginSet = data.data[0];
						oModel.setData(oData);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			var filterCriteria = "DELIMITED=false"
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/grid?filterCriteria=${encodeURIComponent(filterCriteria)}`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.GridSet = data.data[0];
						oModel.setData(oData);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/duesTable/0`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.EmpDueSet = data.data;
						var oDueSum = 0;
						for (var i = 0; i < data.data.length; i++) {
							oDueSum = oDueSum + Number(data.data[i].Amount);
						}
						oData.DueSum = oDueSum;
						oModel.setData(oData);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/inventory`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						for (var i = 0; i < data.data.length; i++) {
							if (data.data[i].DELIMITED === 0) {
								data.data[i].DELIMITED = false;
							} else {
								data.data[i].DELIMITED = true;
							}
						}
						oData.InventorySet = data.data;

						oModel.setData(oData);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/ExpenseType`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.ExpenseType = data.data;
						oModel.setData(oData);
						oModel.refresh(true);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/employee`,
				type: "GET",
				dataType: "json",
				success: function (data) {

					if (data.success) {
						var oData = oModel.getData();
						oData.Employees = data.data;
						oData.Employees = data.data;

						// Calculate EmpC and set it in the model data
						var empCount = data.data.length;
						oData.EmpC = empCount;
						oModel.setData(oData);
						// oModel.refresh(true);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/orderTable`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.orderTable = data.data;
						oModel.setData(oData);
						var oOrderId = data.data.length;
						oData.Order_Id = oOrderId;
						oModel.refresh(true);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			var oDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
			var sDate = oDate.toISOString().split('T')[0];
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/UnorderedItems/${sDate}`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						var iValue = 0;
						for (var i = 0; i < data.data.length; i++) {
							iValue = iValue + (parseInt(data.data[i].Price) * parseInt(data.data[i].Qty));
						}
						oData.UnorderedItemsValue = iValue;
						oData.UnorderedItems = data.data;
						oModel.setData(oData);
						console.log("Data fetched successfully:", data.data);
						// Process the fetched data as needed
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
		},
		onSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("query");

			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("Name", FilterOperator.Contains, sQuery)];
			}

			this.oProductsTable.getBinding("items").filter(oTableSearchState, "Application");
		},

		onAdd: function () {
			MessageBox.information("This functionality is not ready yet.", {
				title: "Aw, Snap!"
			});
		},
		onItemAdd: function () {
			var oTitle = this.getView().byId("OrderCreateItem1Qty");
			if (this.byId("OrderCreateItem1").getSelectedItem()) {
				var iQty = this.byId("OrderCreateItem1").getSelectedItem().getBindingContext("MainModel").getObject().Qty;
			}
			if (parseInt(oTitle.getText()) < iQty) {
				oTitle.setText(parseInt(oTitle.getText()) + 1);
			}
		},
		onItemLess: function () {
			var oTitle = this.getView().byId("OrderCreateItem1Qty");
			if (parseInt(oTitle.getText()) > 0) {
				oTitle.setText(parseInt(oTitle.getText()) - 1);
			}
		},
		//todo
		onPressDialogSave: function () {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oNewOrderData = {
				EmpId: this.byId("OrderCreateEmpSelect").getSelectedKey(),
				ExpenseType: this.byId("OrderCreateExpenseTypeSelect").getSelectedKey(),
				Credit: this.byId("OrderCreatePaymentType").getSelected(),
				Item1: this.byId("OrderCreateItem1").getSelectedKey(),
				Amount: parseInt(this.byId("OrderCreateItem1").getSelectedItem().getBindingContext("MainModel").getObject().Price) * parseInt(
					this.byId("OrderCreateItem1Qty").getText()),
				Qty: this.byId("OrderCreateItem1Qty").getText()
			};
			var that = this;
			$.ajax({
				url: "https://skybfr-office-inventory.glitch.me/order",
				type: "POST", // Change the request type to POST for creating new data
				contentType: "application/json",
				data: JSON.stringify(oNewOrderData),
				success: function () {
					console.log("Create successful");
					sap.m.MessageToast.show("Create Successful!");
					that._onProductMatched();
					var oDialog = that.byId("createOrderDialog");
					that.byId("OrderCreateItem1").setSelectedKey();
					that.byId("OrderCreateItem1Qty").setText("0");
					oDialog.close(); // Close the dialog
				},
				error: function (oError) {
					console.error("Create failed", oError);
				}
			});
		},

		onSort: function () {
			this._bDescendingSort = !this._bDescendingSort;
			var oBinding = this.oProductsTable.getBinding("items"),
				oSorter = new Sorter("Name", this._bDescendingSort);

			oBinding.sort(oSorter);
		},

		onEmpPress: function (oEvent) {
				var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
			this.oRouter.navTo("EmployeeDues", {
				layout: fioriLibrary.LayoutType.EndColumnFullScreen,
				user: this._user
			});
		},

		onOrderTilePress: function (oEvent) {
				var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
			this.oRouter.navTo("Order", {
				layout: fioriLibrary.LayoutType.EndColumnFullScreen,
				user: this._user
			});
		},

		onEmpTilePress: function (oEvent) {
				var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
			this.oRouter.navTo("Employees", {
				layout: fioriLibrary.LayoutType.EndColumnFullScreen,
				user: this._user
			});
		},

		onListItemPress: function (oEvent) {
			// var productPath = oEvent.getSource().getBindingContext("products").getPath(),
			// 	product = productPath.split("/").slice(-1).pop();
        	var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
			this.oRouter.navTo("Inventory", {
				layout: fioriLibrary.LayoutType.EndColumnFullScreen,
				user: this._user
			});
		},

		handleChange: function (oEvent) {
			var oValidatedComboBox = oEvent.getSource(),
				sSelectedKey = oValidatedComboBox.getSelectedKey(),
				sValue = oValidatedComboBox.getValue();

			if (!sSelectedKey && sValue) {
				oValidatedComboBox.setValueState(ValueState.Error);
				oValidatedComboBox.setValueStateText("Please enter a valid Item!");
			} else {
				oValidatedComboBox.setValueState(ValueState.None);
				var oTitle = this.getView().byId("OrderCreateItem1Qty");
				if (parseInt(oTitle.getText()) < 1) {
					oTitle.setText(parseInt(oTitle.getText()) + 1);
				}
			}
		}
	});
});