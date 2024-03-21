sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/m/MessageBox",
	"sap/f/library",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/ui/core/routing/History",
	'sap/m/ColumnListItem',
	'sap/m/Input',
	'sap/m/CheckBox',
	'sap/m/Text',
	'sap/base/util/deepExtend',
	'sap/m/Button'
], function (Controller, Filter, FilterOperator, Sorter, MessageBox, fioriLibrary, exportLibrary, Spreadsheet, History,
	ColumnListItem, Input, CheckBox, Text, deepExtend, Button) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	return Controller.extend("sbin.oi.controller.EmployeeDues", {
		onInit: function () {
			var oOwnerComponent = this.getOwnerComponent();
			this.getView().byId("Emp_Due_Table").setMode("None");
			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();
			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("EmployeeDues").attachPatternMatched(this._onProductMatched, this);
		},

		onAfterRendering: function () {
			this.oTable = this.getView().byId("Emp_Due_Table");
			//this.oReadOnlyTemplate = this.byId("Inventory_Table").getItems[0];
			this.oReadOnlyTemplate = new ColumnListItem({
				cells: [
					new Text({
						text: "{MainModel>EmpName}"
					}),
					new Text({
						text: "{MainModel>Amount}"
					}),
					new Button({
						icon: "sap-icon://credit-card",
						tooltip: "Clear Credit",
						press: this.onClearCreditPress.bind(this)
					}),
					new Text({
						text: "{= ${MainModel>/bDueCleared} ? 'true' : 'false'}"
					})

				]
			});

			this.rebindTable(this.oReadOnlyTemplate, "Navigation");
			this.oEditableTemplate = new ColumnListItem({
				cells: [
					new Input({
						value: "{MainModel>EmpName}"
					}),
					new Input({
						value: "{MainModel>Amount}"
					}),
					new Text({
						text: "{= ${MainModel>/bDueCleared} ? 'true' : 'false'}"
					})
				]
			});
		},

		onClearCreditPress: function (oEvent) {
			this.aProductCollection = deepExtend([], this.oModel.getProperty("/EmpDueSet"));
			var oButton = oEvent.getSource();
			var oContext = oButton.getBindingContext("MainModel");
			var oEmpId1 = oContext.getProperty("EmpId"); // Fetch EmpId directly from context
			var sDueAmount = oContext.getProperty("Amount");
			var sEmployee = oContext.getProperty("EmpName");

			var that = this;

			MessageBox.confirm("Has the due amount of ₹" + sDueAmount + " been cleared by " + sEmployee + "?", {
				title: "Confirmation",
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						// Perform backend request using AJAX
						$.ajax({
							url: "https://skybfr-office-inventory.glitch.me/duesTable",
							type: "POST",
							contentType: "application/json",
							data: JSON.stringify({
								oEmpId1: oEmpId1
							}), // Send data as object
							success: function () {
								console.log("Data sent successfully");
								sap.m.MessageToast.show("Data sent Successfully!");
								that._onProductMatched();
								// that.getOwnerComponent().getModel("MainModel").setProperty("/bDueCleared", true);
							},
							error: function (oError) {
								console.error("Error sending data:", oError);
							}
						});
					}
				}
			});
		},

		//      onDelimitedChange: function () {
		// 	this.onFilterItems();
		// },
		rebindTable: function (oTemplate, sKeyboardMode) {
			// var oDefaultFilter = [new Filter("DELIMITED", FilterOperator.EQ, this.getOwnerComponent().getModel("MainModel").getProperty(
			// 	"/bShowInventoryDelimited"))];
			this.oTable.bindItems({
				path: "MainModel>/EmpDueSet",
				template: oTemplate,
				templateShareable: true,
				key: "ID"
			});
		},

		updateTableData: function (oData) {
			var that = this

			// Send the PUT request
			$.ajax({
				url: "https://skybfr-office-inventory.glitch.me/duesTable",
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
			this.aProductCollection = deepExtend([], this.oModel.getProperty("/EmpDueSet"));
			this.getView().byId("Emp_Due_Table").setMode("None");
			var that = this;
			this.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", true);
			that.getView().getModel("newModel").setProperty("/add", true);
			that.getView().getModel("newModel").setProperty("/delete", true);
			that.getView().getModel("newModel").setProperty("/editable", true);
			this.rebindTable(this.oEditableTemplate, "Edit");

		},

		onSave: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oTable = this.getView().byId("Emp_Due_Table");
			var sBindingPath = oTable.getBinding("items").getPath();
			var aData = oModel.getProperty(sBindingPath);
			this.updateTableData(aData);
			oModel.setProperty("/bEditMode", false);
			this.rebindTable(this.oReadOnlyTemplate, "Navigation");
		},

		onDelete: function () {
			var that = this;
			var oTable = this.getView().byId("Emp_Due_Table");
			var oModel = this.getView().getModel("MainModel");
			// Enable multi-selection mode
			oTable.setMode("MultiSelect");
			var aSelectedItems = oTable.getSelectedItems();
			if (aSelectedItems.length === 0) {
				MessageToast.show("Please select at least one item to delete.");
				return;
			}

			MessageBox.confirm("Do you really want to delete the selected item(s)?", {
				title: "Confirm Delete",
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						var aData = oModel.getProperty("/EmpDueSet");

						aSelectedItems.forEach(function (oSelectedItem) {
							var sPath = oSelectedItem.getBindingContext("MainModel").getPath();
							var iIndex = parseInt(sPath.split("/")[2]);
							aData.splice(iIndex, 1);
						});

						// Update the model with the modified data
						oModel.setProperty("/EmpDueSet", aData);

						// Update the backend with the deletions (assuming OData service)
						aSelectedItems.forEach(function (oSelectedItem) {
							var sPath = oSelectedItem.getBindingContext("MainModel").getPath();
							var sID = oModel.getProperty(sPath + "/DuesId");

							// Send a DELETE request to your OData service
							jQuery.ajax({
								url: "https://your-odata-service-url/EmpDueSet(" + sID + ")",
								type: "DELETE",
								success: function (data) {
									console.log("Item deleted successfully:", data);
								},
								error: function (error) {
									console.error("Error deleting item:", error);
								}
							});
						});

						// Refresh the table to reflect the updated data
						that.rebindTable(that.oReadOnlyTemplate, "Navigation");
						oTable.setMode(aData.length > 0 ? "MultiSelect" : "None");
						MessageToast.show("Selected item(s) deleted successfully.");
					}
				}
			});

		},

		_onProductMatched: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
				oModel.setProperty("/busy", false);
			if (oModel.getProperty("/bShowClearedDues")) {
				var iCleared = 1;
			} else {
				iCleared = 0;
			}
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/duesTable/${iCleared}`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.EmpDueSet = data.data;
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
		},

		onAdd: function () {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oTable = this.getView().byId("Emp_Due_Table");
			var sBindingPath = oTable.getBinding("items").getPath();
			this.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", true)
			this.getView().getModel("newModel").setProperty("/add", true);
			this.getView().getModel("newModel").setProperty("/delete", true);
			this.getView().getModel("newModel").setProperty("/editable", true);
			this.rebindTable(this.oEditableTemplate, "Edit");
			var aData = oModel.getProperty("/EmpDueSet");
			var oEntry = {
				"DuesId": "",
				"EmpName": "",
				"Amount": 0
			};
			aData.push(oEntry);
			oModel.setProperty("/EmpDueSet", aData);
			oModel.refresh(true);
			oTable.getItems()[oTable.getItems().length - 1].getCells()[0].focus()
		},

		onCancel: function () {
			var that = this;
			var oModel = this.getView().getModel("MainModel");

			MessageBox.confirm("Do you really want to cancel the edits?", {
				title: "Confirm Cancel",
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						// Check if there's a new record being added
						var aData = oModel.getProperty("/EmpDueSet");
						if (aData.length > 0) {
							for (var i = aData.length - 1; i >= 0; i--) {
								var oItem = aData[i];
								if (oItem && !oItem.DuesId) {
									// Remove the new record from the model
									aData.splice(i, 1);
								}
							}
							oModel.setProperty("/EmpDueSet", aData);
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
			if (aSelectedItems && aSelectedItems.length > 0) {
			for (var i = 0; i < aSelectedItems.length; i++) {
				if (aSelectedItems[i].getBindingContext("MainModel") && aSelectedItems[i].getBindingContext("MainModel").getObject()) {
					aFilters.push(new Filter("EmpId", FilterOperator.EQ, aSelectedItems[i].getBindingContext("MainModel").getObject().EmpId));
				}
			}
			 }
			// aFilters.push(new Filter("DELIMITED", FilterOperator.EQ, this.getOwnerComponent().getModel("MainModel").getProperty(
			// 	"/bShowInventoryDelimited")));
			this.getView().byId("Emp_Due_Table").getBinding("items").filter(aFilters);
		},

		createColumnConfig: function () {
			var aCols = [];

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
				this._oTable = this.byId('Emp_Due_Table');
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
                    //TODO
                    oRouter.navTo("master", {
				layout: fioriLibrary.LayoutType.MidColumnFullScreen,
				user: oModel.getProperty("/LoginUserId") ? oModel.getProperty("/LoginUserId") : "t.bera"
			});
                }
		},
	});
});