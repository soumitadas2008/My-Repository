sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/f/library",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/ui/core/routing/History",
	'sap/m/ColumnListItem',
	'sap/m/Input',
	'sap/m/CheckBox',
	'sap/m/Text',
	'sap/base/util/deepExtend',
	'sap/m/Button',
	"sap/ui/core/Fragment"
], function (Controller, Filter, FilterOperator, Sorter, MessageBox, MessageToast, fioriLibrary, exportLibrary, Spreadsheet, History,
	ColumnListItem, Input, CheckBox, Text, deepExtend, Button, Fragment) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	return Controller.extend("sbin.oi.controller.Order", {
		onInit: function () {
			var oOwnerComponent = this.getOwnerComponent();
			this.getView().byId("Emp_Order_Table").setMode("None");
			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();

			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("Order").attachPatternMatched(this._onProductMatched, this);
		},

		onAfterRendering: function () {
			this.oTable = this.getView().byId("Emp_Order_Table");
			this.oReadOnlyTemplate = new ColumnListItem({
				cells: [
					new Text({
						text: "{MainModel>Order_ID}"
					}), new sap.m.ObjectIdentifier({
						title: "{MainModel>name}",
						text: "{MainModel>EmpId}"
					}),
					new Text({
						text: "{MainModel>Amount}"
					}),
					new Text({
						text: "{MainModel>ExpenseType}"
					}),
					new Text({
						text: {
							path: 'MainModel>DateTime',
							formatter: this.formatDate.bind(this)
						}
					}),
					new sap.m.ObjectStatus({
						text: "{= ${MainModel>Credit} > 0 ? 'On Credit' : 'Payment Done' }",
						icon: "{= ${MainModel>Credit} > 0 ? 'sap-icon://alert' : 'sap-icon://sys-enter-2' }",
						state: "{= ${MainModel>Credit} > 0 ? 'Warning' : 'Success' }"
					}),
					new Button({
						icon: "sap-icon://display",
						press: this.onDisplayPress.bind(this)
					})
				]
			});

			this.rebindTable(this.oReadOnlyTemplate, "Navigation");
			this.oEditableTemplate = new ColumnListItem({
				cells: [
					new Input({
						value: "{MainModel>Order_ID}"
					}),
					new sap.m.Select({
						items: {
							path: 'MainModel>/Employees',
							template: new sap.ui.core.Item({
								text: '{MainModel>name}',
								key: '{MainModel>ID}'
							})
						},
						selectedKey: "{MainModel>EmpId}",
						forceSelection: true
					}),
					new Input({
						value: "{MainModel>Amount}"
					}),
					new sap.m.Select({
						items: {
							path: 'MainModel>/ExpenseType',
							template: new sap.ui.core.Item({
								text: '{MainModel>ExpenseType}',
								key: '{MainModel>ID}'
							})
						},
						selectedKey: "{MainModel>ExpenseID}",
						forceSelection: true
					}),
					new Input({
						value: "{MainModel>DateTime}"
					}),
					new CheckBox({
						text: "{= ${MainModel>Credit} > 0 ? 'On Credit' : 'Payment Done' }",
						// icon: "{= ${MainModel>Credit} > 0 ? 'sap-icon://alert' : 'sap-icon://sys-enter-2' }",
						valueState: "{= ${MainModel>Credit} > 0 ? 'Warning' : 'Success' }"
					})
				]
			});
		},

		onDisplayPress: function (oEvent) {
			var oButton = oEvent.getSource();
			var oView = this.getView();
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oContext = oEvent.getSource().getBindingContext("MainModel");
			var oOrderId = oButton.getParent().getBindingContext("MainModel").getObject("Order_ID");
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/OrderItems/${oOrderId}`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.OrderItems = data.data;
						oModel.setData(oData);
						console.log("Data fetched successfully:", data.data);
					} else {
						console.error("Error:", data.error);
					}
				},
				error: function (error) {
					console.error("Ajax error:", error);
				}
			});
			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					id: oView.getId(),
					name: "sbin.oi.view.fragments.Display",
					controller: this
				}).then(function (oPopover) {
					oView.addDependent(oPopover);
					oPopover.setModel(this.getView().getModel("MainModel"));
					return oPopover;
				}.bind(this));

			}
			this._pPopover.then(function (oPopover) {
				oPopover.setBindingContext(oContext, "MainModel");
				oPopover.openBy(oButton);
			});

		},

		rebindTable: function (oTemplate, sKeyboardMode) {
			// var oDefaultFilter = [new Filter("DELIMITED", FilterOperator.EQ, this.getOwnerComponent().getModel("MainModel").getProperty(
			// 	"/bShowInventoryDelimited"))];
			this.oTable.bindItems({
				path: "MainModel>/orderTable",
				template: oTemplate,
				templateShareable: true,
				key: "ID"
			});
		},

		updateTableData: function (oData) {
			var that = this
			$.ajax({
				url: "https://skybfr-office-inventory.glitch.me/orderTable",
				type: "PUT",
				contentType: "application/json",
				data: JSON.stringify(oData),
				success: function () {
					console.log("Update successful");
					sap.m.MessageToast.show("Update Successful!");
					that.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", false);
					that._onProductMatched();
					that.rebindTable(that.oReadOnlyTemplate, "Navigation");
				},
				error: function (oError) {
					console.error("Update failed", oError);
				}
			});
		},

		onEdit: function (oEvent) {
			this.aProductCollection = deepExtend([], this.oModel.getProperty("/orderTable"));
			this.getView().byId("Emp_Order_Table").setMode("None");
			var that = this;
			this.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", true);
			that.getView().getModel("newModel").setProperty("/add", true);
			that.getView().getModel("newModel").setProperty("/delete", true);
			that.getView().getModel("newModel").setProperty("/editable", true);
			this.rebindTable(this.oEditableTemplate, "Edit");

		},

		onSave: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oTable = this.getView().byId("Emp_Order_Table");
			var sBindingPath = oTable.getBinding("items").getPath();
			var aData = oModel.getProperty(sBindingPath);
			this.updateTableData(aData);
			oModel.setProperty("/bEditMode", false);
			this.rebindTable(this.oReadOnlyTemplate, "Navigation");
		},

		_onProductMatched: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", false);
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

		onItemAdd: function () {
			var oTitle = this.getView().byId("QuantityTitle");
			if (parseInt(oTitle.getText()) < 10) {
				oTitle.setText(parseInt(oTitle.getText()) + 1);
			}
		},

		onItemLess: function () {
			var oTitle = this.getView().byId("QuantityTitle");
			if (parseInt(oTitle.getText()) > 0) {
				oTitle.setText(parseInt(oTitle.getText()) - 1);
			}
		},

		onCancel: function () {
			var that = this;
			var oModel = this.getView().getModel("MainModel");

			MessageBox.confirm("Do you really want to cancel the edits?", {
				title: "Confirm Cancel",
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						// Check if there's a new record being added
						var aData = oModel.getProperty("/orderTable");
						if (aData.length > 0) {
							for (var i = aData.length - 1; i >= 0; i--) {
								var oItem = aData[i];
								if (oItem && !oItem.Order_ID) {
									// Remove the new record from the model
									aData.splice(i, 1);
								}
							}
							oModel.setProperty("/orderTable", aData);
						}
						that.rebindTable(that.oReadOnlyTemplate, "Navigation");
						oModel.setProperty("/bEditMode", false);
						MessageToast.show("Edit canceled");
					}
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

		onFilterItems: function (oEvent) {
			if (oEvent) {
				var aSelectedItems = oEvent.getSource().getSelectedItems();
			} else {
				aSelectedItems = this.getView().byId("FilterMCB").getSelectedItems();
			}
			var aFilters = [];
			//if (aSelectedItems && aSelectedItems.length > 0) {
			for (var i = 0; i < aSelectedItems.length; i++) {
				if (aSelectedItems[i].getBindingContext("MainModel") && aSelectedItems[i].getBindingContext("MainModel").getObject()) {
					aFilters.push(new Filter("EmpId", FilterOperator.EQ, aSelectedItems[i].getBindingContext("MainModel").getObject().EmpId));
				}
			}
			// }
			// aFilters.push(new Filter("DELIMITED", FilterOperator.EQ, this.getOwnerComponent().getModel("MainModel").getProperty(
			// 	"/bShowInventoryDelimited")));
			this.getView().byId("Emp_Order_Table").getBinding("items").filter(aFilters);
		},

		createColumnConfig: function () {
			var aCols = [];

			aCols.push({
				label: 'Id',
				property: 'DuesId',
				type: EdmType.Number,
				template: '{0}, {1}'
			});

			aCols.push({
				label: 'Employee Name',
				type: EdmType.String,
				property: 'EmpName',
				scale: 0
			});

			aCols.push({
				label: 'Due Amount (₹)',
				property: 'Amount',
				type: EdmType.Number
			});

			return aCols;
		},
		onExcelPress: function () {
			var aCols, oRowBinding, oSettings, oSheet, oTable;

			if (!this._oTable) {
				this._oTable = this.byId('Emp_Order_Table');
			}

			oTable = this._oTable;
			oRowBinding = oTable.getBinding('items');
			aCols = this.createColumnConfig();

			oSettings = {
				workbook: {
					columns: aCols,
					hierarchyLevel: 'Level'
				},
				dataSource: oRowBinding,
				fileName: 'Office inventory(Employee Dues).xlsx',
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
		},

		formatDate: function (sDate) {
			var oTable = this.getView().byId("Emp_Order_Table");
			var oBinding = oTable.getBinding("items");
			if (!sDate) {
				return "";
			}

			var oDate = new Date(sDate);
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "dd.MM.yyyy"
			});
			return oDateFormat.format(oDate);
		},

		onSort: function () {
			this._bDescendingSort = !this._bDescendingSort;
			var oBinding = this.oProductsTable.getBinding("items"),
				oSorter = new Sorter("Name", this._bDescendingSort);

			oBinding.sort(oSorter);
		},

		onNavPress1: function () {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
				var oHistory = History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();
				sPreviousHash = undefined;
                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                }
                else {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    	oRouter.navTo("master", {
				layout: fioriLibrary.LayoutType.MidColumnFullScreen,
				user: oModel.getProperty("/LoginUserId") ? oModel.getProperty("/LoginUserId") : "t.bera"
			});
                }
		},
	});
});