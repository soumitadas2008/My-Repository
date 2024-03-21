sap.ui.define([
	'sap/ui/core/UIComponent',
	'sap/ui/model/json/JSONModel',
	'sap/f/library'
], function(UIComponent, JSONModel, fioriLibrary) {
	'use strict';

	return UIComponent.extend('sbin.oi.Component', {

		metadata: {
			manifest: 'json'
		},

		init: function () {
			var oModel,
				oProductsModel,
				oRouter;

			UIComponent.prototype.init.apply(this, arguments);

			var oModel = new JSONModel();
			this.setModel(oModel);
				var oModel2 = new JSONModel({
			    busy: false,
				username: "",
				password: "",
				bEditMode: false,
				enableInventorySave: true,
				bShowInventoryDelimited: false,
                bDueCleared: false,
                bShowDelimitedClearedDue: false,
                bShowClearedDues: false,
                LoginUserId: ""
			});
			oModel2.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
			this.setModel(oModel2, "MainModel");
			var newModel1 = new JSONModel({
				visibleHeader: true,
				"editable": false,
				"valueState": "None",
				"add": true,
				"edit": true,
				"delete": true

			});
			this.setModel(newModel1, "newModel");


			// set products demo model on this sample
			oProductsModel = new JSONModel(sap.ui.require.toUrl('sbin/oi/mock/products.json'));
			oProductsModel.setSizeLimit(1000);
			this.setModel(oProductsModel, 'products');

			oRouter = this.getRouter();
			oRouter.attachBeforeRouteMatched(this._onBeforeRouteMatched, this);
			oRouter.initialize();
		},

		_onBeforeRouteMatched: function(oEvent) {
			var oModel = this.getModel(),
				sLayout = oEvent.getParameters().arguments.layout;

			// If there is no layout parameter, set a default layout (normally OneColumn)
			if (!sLayout) {
				sLayout = fioriLibrary.LayoutType.OneColumn;
			}

			oModel.setProperty("/layout", sLayout);
		}
	});
});