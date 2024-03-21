sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast",
	"sap/f/library",
	'sap/m/ColumnListItem',
	'sap/m/Input',
	'sap/m/CheckBox',
	'sap/m/Text',
	'sap/base/util/deepExtend',
	"sap/m/MessageBox"
], function (Controller, History, Filter, FilterOperator, exportLibrary, Spreadsheet, MessageToast, fioriLibrary, ColumnListItem, Input, CheckBox, Text,
	deepExtend, MessageBox) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	return Controller.extend("sbin.oi.controller.Employees", {
		onInit: function () {
			// Disable multi-selection mode
			this.getView().byId("Emp_Table").setMode("None");
			var oOwnerComponent = this.getOwnerComponent();

			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();

			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("Employees").attachPatternMatched(this._onProductMatched, this);

		},
		onAfterRendering: function () {
			this.oTable = this.getView().byId("Emp_Table");
			//this.oReadOnlyTemplate = this.byId("Emp_Table").getItems[0];
			this.oReadOnlyTemplate = new ColumnListItem({
				cells: [
					new Text({
						text: "{MainModel>EmpCode}"
					}),
					new Text({
						text: "{MainModel>name}"
					}),
					new Text({
						text: "{MainModel>address}"
					}),
					new Text({
						text: "{MainModel>phoneNo}"
					})
				]
			});

			this.rebindTable(this.oReadOnlyTemplate, "Navigation");
			this.oEditableTemplate = new ColumnListItem({
				cells: [

					new Input({
						value: "{MainModel>EmpCode}"
					}),
					new Input({
						value: "{MainModel>name}"
					}),
					new Input({
						value: "{MainModel>address}"
					}),
					new Input({
						value: "{MainModel>phoneNo}"
					})
					//for future version
					// new CheckBox({
					// 	text: "",
					// 	valueState: "{= ${MainModel>DELIMITED} ? 'Error' : 'Information' }",
					// 	selected: "{MainModel>DELIMITED}"
					// })
				]
			});
		},
		//for future version
		// onDelimitedChange: function () {
		// 	this.onFilterItems();
		// },
		rebindTable: function (oTemplate, sKeyboardMode) {
			//for future version
			// var oDefaultFilter = [new Filter("DELIMITED", FilterOperator.EQ, this.getOwnerComponent().getModel("MainModel").getProperty(
			// 	"/bShowInventoryDelimited"))];
			this.oTable.bindItems({
				path: "MainModel>/Employees",
				filters: [],
				template: oTemplate,
				templateShareable: true,
				key: "ID"
			});
		},

	
		updateTableData: function (oData) {
			var that = this;
			$.ajax({
				url: "https://skybfr-office-inventory.glitch.me/employee",
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
			this.aProductCollection = deepExtend([], this.oModel.getProperty("/Employees"));
			this.getView().byId("Emp_Table").setMode("None");
			var that = this;
			this.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", true);
			that.getView().getModel("newModel").setProperty("/add", true);
			that.getView().getModel("newModel").setProperty("/delete", true);
			that.getView().getModel("newModel").setProperty("/editable", true);
			this.rebindTable(this.oEditableTemplate, "Edit");
		},

		onSave: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oTable = this.getView().byId("Emp_Table");
			var sBindingPath = oTable.getBinding("items").getPath();
			var aData = oModel.getProperty(sBindingPath);
			this.updateTableData(aData);
			oModel.setProperty("/bEditMode", false);
			this.rebindTable(this.oReadOnlyTemplate, "Navigation");

		},
		
			createColumnConfig: function () {
			var aCols = [];

			aCols.push({
				label: 'Employee ID',
				property: 'EmpCode',
				type: EdmType.String,
				template: '{0}, {1}'
			});

			aCols.push({
				label: 'Name',
				type: EdmType.String,
				property: 'name',
				scale: 0
			});

			aCols.push({
				label: 'Address',
				property: 'address',
				type: EdmType.String
			});

			aCols.push({
				label: 'Phone No',
				property: 'phoneNo',
				type: EdmType.Number
			});
			return aCols;
		},


		onExcelPress: function () {
			var aCols, oRowBinding, oSettings, oSheet, oTable;

			if (!this._oTable) {
				this._oTable = this.byId('Emp_Table');
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
				fileName: 'Office inventory(Employees).xlsx',
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
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
						aFilters.push(new Filter("ID", FilterOperator.EQ, aSelectedItems[i].getBindingContext("MainModel").getObject().ID));
					}
				}
			}
			//This is for future version
			// aFilters.push(new Filter("DELIMITED", FilterOperator.EQ, this.getOwnerComponent().getModel("MainModel").getProperty(
			// 	"/bShowInventoryDelimited")));
			this.getView().byId("Emp_Table").getBinding("items").filter(aFilters);
		},

		_onProductMatched: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", false);
			jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/employee`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.Employees = data.data;
						//newEmpC for Employee count
						var empCount = data.data.length;
						oData.EmpC = empCount;
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

		},

		onEditToggleButtonPress: function () {
			var oObjectPage = this.getView().byId("ObjectPageLayout"),
				bCurrentShowFooterState = oObjectPage.getShowFooter();

			oObjectPage.setShowFooter(!bCurrentShowFooterState);
		},

		onExit: function () {
			this.oRouter.getRoute("master").detachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("Inventory").detachPatternMatched(this._onProductMatched, this);
		},

		onAdd: function () {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oTable = this.getView().byId("Emp_Table");
			var sBindingPath = oTable.getBinding("items").getPath();
			this.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", true)
			this.getView().getModel("newModel").setProperty("/add", true);
			this.getView().getModel("newModel").setProperty("/delete", true);
			this.getView().getModel("newModel").setProperty("/editable", true);
			this.rebindTable(this.oEditableTemplate, "Edit");
			var aData = oModel.getProperty("/Employees");
			var oEntry = {
				"ID": "",
				"name": "",
				"address": "",
				"phoneNo": 0
			};
			aData.push(oEntry);
			oModel.setProperty("/Employees", aData);
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
						var aData = oModel.getProperty("/Employees");
						if (aData.length > 0) {
							for (var i = aData.length - 1; i >= 0; i--) {
								var oItem = aData[i];
								if (oItem && !oItem.ID) {
									// Remove the new record from the model
									aData.splice(i, 1);
								}
							}
							oModel.setProperty("/Employees", aData);
						}
						that.rebindTable(that.oReadOnlyTemplate, "Navigation");
						oModel.setProperty("/bEditMode", false);
						MessageToast.show("Edit canceled");
					}

				}
			});
		},

		onNavPress1: function () {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			//TODO
			sPreviousHash = undefined;
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				//oRouter.navTo("Routemaster", true);
				oRouter.navTo("master", {
				layout: fioriLibrary.LayoutType.MidColumnFullScreen,
				user: oModel.getProperty("/LoginUserId") ? oModel.getProperty("/LoginUserId") : "t.bera"
			});
			}
		}
		
		// 	onNavPress1: function () {
		// 	// this.getModel("MainModel").setProperty("/busy", true);
		// 	var oHistory = History.getInstance();
		// 	var sPreviousHash = oHistory.getPreviousHash();
		// 	console.log("Previous hash:", sPreviousHash);

		// 	// Retrieve previous hash from local storage
		// 	var storedPreviousHash = localStorage.getItem("previousHash");

		// 	if (storedPreviousHash !== undefined && storedPreviousHash !== null && storedPreviousHash !== "") {
		// 		window.history.go(-1);
		// 	} else {
		// 		var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		// 		oRouter.navTo("Routemaster", true);
		// 	}
		// },

	});
});