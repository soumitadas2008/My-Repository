sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast",
	'sap/m/ColumnListItem',
	'sap/m/Input',
	'sap/m/CheckBox',
	'sap/m/Text',
	'sap/base/util/deepExtend',
	"sap/m/MessageBox",
    "sap/f/library"
], function (Controller, History, Filter, FilterOperator, exportLibrary, Spreadsheet, MessageToast, ColumnListItem, Input, CheckBox, Text,
	deepExtend, MessageBox, fioriLibrary) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	return Controller.extend("sbin.oi.controller.Inventory", {
		onInit: function () {
			// Disable multi-selection mode
			this.getView().byId("Inventory_Table").setMode("None");
			var oOwnerComponent = this.getOwnerComponent();

			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();

			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("Inventory").attachPatternMatched(this._onProductMatched, this);

		},
		onAfterRendering: function () {
			this.oTable = this.getView().byId("Inventory_Table");
			//this.oReadOnlyTemplate = this.byId("Inventory_Table").getItems[0];
			this.oReadOnlyTemplate = new ColumnListItem({
				cells: [
					new Text({
						text: "{MainModel>Items}"
					}), new Text({
						text: "{MainModel>Price}"
							// description: "{UoM}"
					}),
					new Text({
						text: "{MainModel>Qty}"
					}),
					new Text({
						text: "{MainModel>Reorder_Qty}"
					}),
					new Text({
						text: "{= ${MainModel>Qty} * ${MainModel>Price}}"
					}),
					new sap.m.ObjectStatus({
						text: "{= ${MainModel>DELIMITED} ? 'Delimited' : 'Available'}",
						icon: "{= ${MainModel>DELIMITED} ? 'sap-icon://error' : 'sap-icon://sys-enter-2'}",
						state: "{= ${MainModel>DELIMITED} ? 'Error' : 'Success'}"
					})
				]
			});

			this.rebindTable(this.oReadOnlyTemplate, "Navigation");
			this.oEditableTemplate = new ColumnListItem({
				cells: [
					new sap.m.Input({
						suggestionItems: {
							path: "MainModel>/InventorySet",
							template: new sap.ui.core.Item({
								text: '{MainModel>Items}',
								key: '{MainModel>ID}'
							}),
							templateShareable: true
						},
						value: "{MainModel>Items}",
						editable: "{= !${MainModel>ID}}",
						liveChange: this.onItemSelected.bind(this)
					}),
					new Input({
						value: "{MainModel>Price}"
					}),
					new Input({
						value: "{MainModel>Qty}"
					}),
					new Input({
						value: "{MainModel>Reorder_Qty}"
					}),
					new Input({
						value: "{= ${MainModel>Qty} * ${MainModel>Price}}",
						editable: false
					}),
					new CheckBox({
						text: "",
						valueState: "{= ${MainModel>DELIMITED} ? 'Error' : 'Success' }",
						selected: "{MainModel>DELIMITED}"
					})
				]
			});
		},
		onDelimitedChange: function () {
			this.onFilterItems();
		},
		onItemSelected: function (oEvent) {
			var sItemName = oEvent.getParameter("newValue");
			var sCheckArray = this.getOwnerComponent().getModel("MainModel").getProperty("/InventorySet");
			// var oTable = this.getView().byId("Inventory_Table");
			// var oColumn =oTable.getColumns()[0].Items;
			var oCombobox = oEvent.getSource();
			for (var i = 0; i < sCheckArray.length; i++) {
				if (sCheckArray[i].Items === sItemName) {
					oCombobox.setValueState("Error");
					oCombobox.setValueStateText("Item already exist");
					this.validateSaveEnabled();
					return;
				}
			}
			oCombobox.setValueState("None");
			oCombobox.setValueStateText();
			this.validateSaveEnabled();
		},

		validateSaveEnabled: function () {
			var aItems = this.byId("Inventory_Table").getItems();
			var aInputControls = [];
			for (var i = 0; i < aItems.length; i++) {
				aInputControls.push(aItems[i].getCells()[0])
			}
			for (var m = 0; m < aInputControls.length; m++) {
				if (aInputControls[m].getValueState() === 'Error') {
					this.getOwnerComponent().getModel("MainModel").setProperty("/enableInventorySave", false);
					return;
				}
			}
			this.getOwnerComponent().getModel("MainModel").setProperty("/enableInventorySave", true);
		},

		rebindTable: function (oTemplate, sKeyboardMode) {
			var oDefaultFilter = [];
			var bDelimited = this.getOwnerComponent().getModel("MainModel").getProperty("/bShowInventoryDelimited");
			if (!bDelimited) {
				oDefaultFilter.push(new Filter("DELIMITED", FilterOperator.EQ, false));
			}
			this.oTable.bindItems({
				path: "MainModel>/InventorySet",
				filters: oDefaultFilter,
				template: oTemplate,
				templateShareable: true,
				key: "ID"
			});
		},

		updateTableData: function (oData) {
			var that = this;
			$.ajax({
				url: "https://skybfr-office-inventory.glitch.me/inventory",
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
			this.aProductCollection = deepExtend([], this.oModel.getProperty("/InventorySet"));
			this.getView().byId("Inventory_Table").setMode("None");
			var that = this;
			this.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", true);
			that.getView().getModel("newModel").setProperty("/add", true);
			that.getView().getModel("newModel").setProperty("/delete", true);
			that.getView().getModel("newModel").setProperty("/editable", true);
			this.rebindTable(this.oEditableTemplate, "Edit");

			var oTable = this.getView().byId("Inventory_Table");
			var oItems = oTable.getItems();
			for (var i = 0; i < oItems.length; i++) {
				oItems[i].getCells()[4].setEnabled(false);

			}

		},

		onSave: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("MainModel");
			var oTable = this.getView().byId("Inventory_Table");
			var sBindingPath = oTable.getBinding("items").getPath();
			var aData = oModel.getProperty(sBindingPath);
			this.updateTableData(aData);
			oModel.setProperty("/bEditMode", false);
			this.rebindTable(this.oReadOnlyTemplate, "Navigation");

		},

		onDelete: function () {
			var that = this;
			var oTable = this.getView().byId("Inventory_Table");
			var oModel = this.getView().getModel("MainModel");
			// Enable multi-selection mode
			oTable.setMode("MultiSelect");
			var aSelectedItems = oTable.getSelectedItems();
			if (aSelectedItems.length === 0) {
				MessageToast.show("Please select at least one item to delimit.");
				return;
			}

			MessageBox.confirm("Do you really want to delimit the selected item(s)?", {
				title: "Confirm Delete",
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						var aData = oModel.getProperty("/InventorySet");

						aSelectedItems.forEach(function (oSelectedItem) {
							var sPath = oSelectedItem.getBindingContext("MainModel").getPath();
							var iIndex = parseInt(sPath.split("/")[2]);
							aData.splice(iIndex, 1);
						});

						// Update the model with the modified data
						oModel.setProperty("/InventorySet", aData);

						// Update the backend with the deletions (assuming OData service)
						aSelectedItems.forEach(function (oSelectedItem) {
							var sPath = oSelectedItem.getBindingContext("MainModel").getPath();
							var sID = oModel.getProperty(sPath + "/ID");

							// Send a DELETE request to your OData service
							jQuery.ajax({
								url: "https://your-odata-service-url/InventorySet(" + sID + ")",
								type: "DELETE",
								success: function (data) {
									console.log("Item delimited successfully:", data);
								},
								error: function (error) {
									console.error("Error in delimiting item:", error);
								}
							});
						});

						// Refresh the table to reflect the updated data
						that.rebindTable(that.oReadOnlyTemplate, "Navigation");
						oTable.setMode(aData.length > 0 ? "MultiSelect" : "None");
						MessageToast.show("Selected item(s) deleted successfully.");
					}
					// No action needed for Cancel
				}
			});

		},
		
		createColumnConfig: function () {
			var aCols = [];

			aCols.push({
				label: 'Items',
				property: 'Items',
				type: EdmType.String,
				template: '{0}, {1}'
			});

			aCols.push({
				label: 'Price(₹)',
				type: EdmType.String,
				property: 'Price',
				scale: 0
			});

			aCols.push({
				label: 'Quantity',
				property: 'Qty',
				type: EdmType.Number
			});

			aCols.push({
				label: 'Safety Stock (Qty)',
				property: 'Reorder_Qty',
				type: EdmType.Number
			});
			
			aCols.push({
				label: 'Total Value(₹)',
				property: ['Qty','Price'],
				type: EdmType.Number,
				template:  '{0}*{1}'
				
			});
			return aCols;
		},

		
		onExcelPress: function () {
			var aCols, oRowBinding, oSettings, oSheet, oTable;

			if (!this._oTable) {
				this._oTable = this.byId('Inventory_Table');
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
				fileName: 'Office Inventory.xlsx',
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
			var bDelimited = this.getOwnerComponent().getModel("MainModel").getProperty("/bShowInventoryDelimited");
			if (!bDelimited) {
				aFilters.push(new Filter("DELIMITED", FilterOperator.EQ, false));
			}
			this.getView().byId("Inventory_Table").getBinding("items").filter(aFilters);
		},

		_onProductMatched: function (oEvent) {
			// this._product = oEvent.getParameter("arguments").product || this._product || "0";
			// this.getView().bindElement({
			// 	path: "/ProductCollection/" + this._product,
			// 	model: "products"
			// });
			var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", false);
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
			oModel.setProperty("/enableInventorySave", false);
			var oTable = this.getView().byId("Inventory_Table");
			var sBindingPath = oTable.getBinding("items").getPath();
			this.getOwnerComponent().getModel("MainModel").setProperty("/bEditMode", true)
			this.getView().getModel("newModel").setProperty("/add", true);
			this.getView().getModel("newModel").setProperty("/delete", true);
			this.getView().getModel("newModel").setProperty("/editable", true);
			this.rebindTable(this.oEditableTemplate, "Edit");
			var aData = oModel.getProperty("/InventorySet");
			var oEntry = {
				"ID": "",
				"Items": "",
				"Price": 0,
				"Qty": 0,
				"Reorder_Qty": 0,
				"DELIMITED": false
			};
			aData.push(oEntry);
			oModel.setProperty("/InventorySet", aData);
			oModel.refresh(true);
			oTable.getItems()[oTable.getItems().length - 1].getCells()[0].focus();

			//var oItems = oTable.getItems();
			// for (var i = 0; i < oItems.length; i++) {
			// 	oItems[i].getCells()[4].setEnabled(false);

			// }

		},

		onCancel: function () {
			var that = this;
			var oModel = this.getView().getModel("MainModel");

			MessageBox.confirm("Do you really want to cancel the edits?", {
				title: "Confirm Cancel",
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						// Check if there's a new record being added
						var aData = oModel.getProperty("/InventorySet");
						if (aData.length > 0) {
							for (var i = aData.length - 1; i >= 0; i--) {
								var oItem = aData[i];
								if (oItem && !oItem.ID) {
									// Remove the new record from the model
									aData.splice(i, 1);
								}
							}
							oModel.setProperty("/InventorySet", aData);
						}
						that.rebindTable(that.oReadOnlyTemplate, "Navigation");
						oModel.setProperty("/bEditMode", false);
						MessageToast.show("Edit canceled");
					}
					// No action needed for Cancel
				}
			});
		},

		onNavPress1: function () {
				var oModel = this.getOwnerComponent().getModel("MainModel");
			oModel.setProperty("/busy", true);
				var oHistory = History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();

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