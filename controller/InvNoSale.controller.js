sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/m/MessageBox",
	"sap/f/library",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/ui/core/routing/History"
], function (Controller, Filter, FilterOperator, Sorter, MessageBox, fioriLibrary, exportLibrary, Spreadsheet, History) {
	"use strict";
var EdmType = exportLibrary.EdmType;
	return Controller.extend("sbin.oi.controller.InvNoSale", {
		onInit: function () {
			var oOwnerComponent = this.getOwnerComponent();

			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();
			this.oRouter.getRoute("EmployeeDues").attachPatternMatched(this._onProductMatched, this);
		},
		_onProductMatched: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", false);
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
			
				jQuery.ajax({
				url: `https://skybfr-office-inventory.glitch.me/duesTable`,
				type: "GET",
				dataType: "json",
				success: function (data) {
					if (data.success) {
						var oData = oModel.getData();
						oData.EmpDueSet = data.data;
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
		
		onFilterItems: function (oEvent) {
			var aSelectedItems = oEvent.getSource().getSelectedItems();
			var aFilters = [];
			for (var i = 0; i < aSelectedItems.length; i++) {
				if (aSelectedItems[i].getBindingContext("MainModel") && aSelectedItems[i].getBindingContext("MainModel").getObject()) {
					aFilters.push(new Filter("EmpName", FilterOperator.EQ, aSelectedItems[i].getBindingContext("MainModel").getObject().EmpName));
				}
			}
			this.getView().byId("Emp_Due_Table").getBinding("items").filter(aFilters);
		},
		
			createColumnConfig: function() {
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
		onExcelPress: function() {
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
			oSheet.build().finally(function() {
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

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("master", {
				layout: fioriLibrary.LayoutType.MidColumnFullScreen,
				user: oModel.getProperty("/LoginUserId") ? oModel.getProperty("/LoginUserId") : "t.bera"
			});
			}
		}
	});
});