function initModel() {
	var sUrl = "/sap/opu/odata/skybfr/YAI_CC_TICKETS_SRV/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}